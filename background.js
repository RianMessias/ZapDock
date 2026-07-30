const EMBED_RULE_ID = 1;
const OFFSCREEN_DOCUMENT = "offscreen.html";
const DEFAULT_SOUND_ENABLED = true;

let initializationPromise = null;

async function configureWhatsAppEmbedding() {
  const extensionDomain = chrome.runtime.id;

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [EMBED_RULE_ID],
    addRules: [
      {
        id: EMBED_RULE_ID,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "sec-fetch-site",
              operation: "set",
              value: "same-origin"
            }
          ],
          responseHeaders: [
            {
              header: "content-security-policy",
              operation: "remove"
            },
            {
              header: "x-frame-options",
              operation: "remove"
            }
          ]
        },
        condition: {
          requestDomains: ["web.whatsapp.com"],
          topDomains: [extensionDomain],
          resourceTypes: ["sub_frame"]
        }
      }
    ]
  });
}

async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });

  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT,
    reasons: ["DOM_SCRAPING", "AUDIO_PLAYBACK"],
    justification:
      "Manter o contador de mensagens não lidas e reproduzir o alerta escolhido pelo usuário."
  });
}

async function initializeInfrastructure() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await configureWhatsAppEmbedding();
      await ensureOffscreenDocument();
      const { unreadCount = 0 } = await chrome.storage.local.get("unreadCount");
      await updateActionBadge(unreadCount);
    })()
      .catch((error) => {
        console.error("ZapDock não conseguiu iniciar o monitor:", error);
      })
      .finally(() => {
        initializationPromise = null;
      });
  }

  return initializationPromise;
}

function normalizeUnreadCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function badgeTextFor(count) {
  if (count <= 0) {
    return "";
  }

  return count > 99 ? "99+" : String(count);
}

async function updateActionBadge(count) {
  await Promise.all([
    chrome.action.setBadgeText({ text: badgeTextFor(count) }),
    chrome.action.setBadgeBackgroundColor({ color: "#f0445b" }),
    chrome.action.setBadgeTextColor({ color: "#ffffff" })
  ]);
}

async function getNotificationState() {
  const {
    unreadCount = 0,
    soundEnabled = DEFAULT_SOUND_ENABLED
  } = await chrome.storage.local.get(["unreadCount", "soundEnabled"]);

  return {
    unreadCount: normalizeUnreadCount(unreadCount),
    soundEnabled: Boolean(soundEnabled)
  };
}

async function broadcastState(state) {
  try {
    await chrome.runtime.sendMessage({
      type: "zapdock:state",
      state
    });
  } catch {
    // É normal não haver popup aberto para receber a atualização.
  }
}

async function playAlert() {
  await ensureOffscreenDocument();

  try {
    await chrome.runtime.sendMessage({ type: "zapdock:play-alert" });
  } catch (error) {
    console.warn("ZapDock não conseguiu reproduzir o alerta:", error);
  }
}

async function handleUnreadUpdate(message) {
  if (message.source !== "monitor") {
    return getNotificationState();
  }

  const previousState = await getNotificationState();
  const unreadCount = normalizeUnreadCount(message.count);
  const nextState = {
    unreadCount,
    soundEnabled: previousState.soundEnabled
  };

  await chrome.storage.local.set({ unreadCount });
  await updateActionBadge(unreadCount);
  await broadcastState(nextState);

  const isNewMessage =
    !message.initial && unreadCount > previousState.unreadCount;

  if (isNewMessage && previousState.soundEnabled) {
    await playAlert();
  }

  return nextState;
}

async function setSoundEnabled(value) {
  const soundEnabled = Boolean(value);
  await chrome.storage.local.set({ soundEnabled });

  const state = {
    ...(await getNotificationState()),
    soundEnabled
  };

  await broadcastState(state);

  if (soundEnabled) {
    await playAlert();
  }

  return state;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type?.startsWith("zapdock:")) {
    return false;
  }

  let task;

  if (message.type === "zapdock:unread") {
    task = handleUnreadUpdate(message);
  } else if (message.type === "zapdock:get-state") {
    task = getNotificationState();
  } else if (message.type === "zapdock:set-sound") {
    task = setSoundEnabled(message.soundEnabled);
  } else {
    return false;
  }

  task
    .then(sendResponse)
    .catch((error) => {
      console.error("Falha ao processar uma atualização do ZapDock:", error);
      sendResponse(null);
    });

  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local
      .set({
        unreadCount: 0,
        soundEnabled: DEFAULT_SOUND_ENABLED
      })
      .catch(console.error);
  }

  initializeInfrastructure();
});

chrome.runtime.onStartup.addListener(initializeInfrastructure);

initializeInfrastructure();
