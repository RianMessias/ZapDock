const WHATSAPP_URL = "https://web.whatsapp.com/";
const MINIMUM_LOADER_TIME_MS = 450;
const SLOW_LOAD_NOTICE_MS = 12000;

const frame = document.querySelector("#whatsappFrame");
const frameArea = document.querySelector("#frameArea");
const loader = document.querySelector("#loader");
const slowNotice = document.querySelector("#slowNotice");
const frameStatus = document.querySelector("#frameStatus");
const connectionText = document.querySelector("#connectionText");
const notificationStatus = document.querySelector("#notificationStatus");
const reloadButton = document.querySelector("#reloadButton");
const openTabButton = document.querySelector("#openTabButton");
const loginTabButton = document.querySelector("#loginTabButton");
const soundToggle = document.querySelector("#soundToggle");
const messageBadge = document.querySelector("#messageBadge");
const sidePanelToggle = document.querySelector("#sidePanelToggle");
const panelNotice = document.querySelector("#panelNotice");
const openSidePanelButton = document.querySelector("#openSidePanelButton");
const switchToPopupButton = document.querySelector("#switchToPopupButton");

let loadStartedAt = performance.now();
let slowNoticeTimer = null;
let notificationState = {
  unreadCount: 0,
  soundEnabled: true
};
let lastAnnouncedUnreadCount = null;
let hasUserInteractedWithSound = false;

function setConnectionState(state, label) {
  document.body.dataset.state = state;
  connectionText.textContent = label;
  connectionText.parentElement.setAttribute("aria-label", `Estado: ${label}`);

  if (state === "ready") {
    frameArea.setAttribute("aria-busy", "false");
    frameStatus.textContent = chrome.i18n.getMessage("statusReady");
  } else if (state === "offline") {
    frameArea.setAttribute("aria-busy", "true");
    frameStatus.textContent = chrome.i18n.getMessage("statusOffline");
  } else {
    frameArea.setAttribute("aria-busy", "true");
    frameStatus.textContent = chrome.i18n.getMessage("statusLoading");
  }
}

function scheduleSlowNotice() {
  clearTimeout(slowNoticeTimer);
  slowNotice.hidden = true;
  slowNoticeTimer = setTimeout(() => {
    if (document.body.dataset.state !== "ready") {
      slowNotice.hidden = false;
    }
  }, SLOW_LOAD_NOTICE_MS);
}

function loadWhatsApp() {
  loadStartedAt = performance.now();
  loader.classList.remove("is-hidden");
  loader.setAttribute("aria-busy", "true");
  setConnectionState(navigator.onLine ? "loading" : "offline", navigator.onLine ? chrome.i18n.getMessage("stateConnecting") : chrome.i18n.getMessage("stateOffline"));
  scheduleSlowNotice();
  frame.src = WHATSAPP_URL;
}

async function revealFrame() {
  try {
    if (frame.contentWindow.location.href === "about:blank") {
      return;
    }
  } catch {
    // O acesso falha quando a navegação já chegou ao WhatsApp, como esperado.
  }

  const elapsed = performance.now() - loadStartedAt;
  const remaining = Math.max(0, MINIMUM_LOADER_TIME_MS - elapsed);

  await new Promise((resolve) => setTimeout(resolve, remaining));
  clearTimeout(slowNoticeTimer);
  slowNotice.hidden = true;
  setConnectionState("ready", chrome.i18n.getMessage("stateReady"));
  loader.setAttribute("aria-busy", "false");
  loader.classList.add("is-hidden");
}

function openWhatsAppTab() {
  chrome.tabs.create({ url: WHATSAPP_URL });
}

function formatUnreadCount(count) {
  return count > 99 ? "99+" : String(count);
}

function applyNotificationState({ unreadCount = 0, soundEnabled = true }) {
  const normalizedCount = Math.max(0, Number(unreadCount) || 0);
  const countLabel = formatUnreadCount(normalizedCount);

  notificationState = {
    unreadCount: normalizedCount,
    soundEnabled: Boolean(soundEnabled)
  };

  messageBadge.textContent = countLabel;
  messageBadge.hidden = normalizedCount === 0;
  messageBadge.setAttribute(
    "aria-label",
    normalizedCount === 1 ? chrome.i18n.getMessage("unreadMessageSingularAria") : chrome.i18n.getMessage("unreadMessagePluralAria", [String(normalizedCount)])
  );

  soundToggle.setAttribute("aria-pressed", String(Boolean(soundEnabled)));
  soundToggle.setAttribute(
    "aria-label",
    soundEnabled ? chrome.i18n.getMessage("soundDisableAria") : chrome.i18n.getMessage("soundEnableAria")
  );
  soundToggle.title = soundEnabled ? chrome.i18n.getMessage("soundDisableTitle") : chrome.i18n.getMessage("soundEnableTitle");

  if (lastAnnouncedUnreadCount !== normalizedCount) {
    notificationStatus.textContent = normalizedCount === 0 ? chrome.i18n.getMessage("noUnreadText") : (normalizedCount === 1 ? chrome.i18n.getMessage("unreadMessageSingularText") : chrome.i18n.getMessage("unreadMessagePluralText", [countLabel]));
    lastAnnouncedUnreadCount = normalizedCount;
  }
}

function requestNotificationState() {
  chrome.runtime.sendMessage({ type: "zapdock:get-state" }, (state) => {
    if (chrome.runtime.lastError || !state) {
      return;
    }

    applyRemoteNotificationState(state);
  });
}

function applyRemoteNotificationState(state) {
  applyNotificationState({
    unreadCount: state.unreadCount,
    soundEnabled: hasUserInteractedWithSound
      ? notificationState.soundEnabled
      : state.soundEnabled
  });
}

function toggleSound() {
  hasUserInteractedWithSound = true;
  const soundEnabled = soundToggle.getAttribute("aria-pressed") !== "true";

  applyNotificationState({
    unreadCount: notificationState.unreadCount,
    soundEnabled
  });
  notificationStatus.textContent = soundEnabled ? chrome.i18n.getMessage("notificationSoundEnabled") : chrome.i18n.getMessage("notificationSoundDisabled");

  chrome.runtime.sendMessage(
    { type: "zapdock:set-sound", soundEnabled },
    (state) => {
      if (!chrome.runtime.lastError && state) {
        applyNotificationState(state);
      }
    }
  );
}

async function checkPanelMode() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "zapdock:get-panel-mode" });

    if (response?.mode === "sidepanel") {
      frame.hidden = true;
      loader.classList.add("is-hidden");
      loader.setAttribute("aria-busy", "false");
      setConnectionState("ready", chrome.i18n.getMessage("stateSidepanel"));
      sidePanelToggle.classList.add("active");
      panelNotice.hidden = false;
      return;
    }
  } catch {
  }

  startPopupMode();
}

function startPopupMode() {
  sidePanelToggle.classList.remove("active");
  panelNotice.hidden = true;
  frame.hidden = false;
  loadWhatsApp();
}

async function openSidePanel() {
  const response = await chrome.runtime.sendMessage({ type: "zapdock:open-sidepanel" });

  if (response?.opened) {
    sidePanelToggle.classList.add("active");
    frame.hidden = true;
    loader.classList.add("is-hidden");
    loader.setAttribute("aria-busy", "false");
    setConnectionState("ready", chrome.i18n.getMessage("stateSidepanel"));
    panelNotice.hidden = false;
  }
}

async function switchToPopup() {
  await chrome.runtime.sendMessage({ type: "zapdock:set-panel-mode", mode: "popup" });
  startPopupMode();
}

frame.addEventListener("load", revealFrame);
reloadButton.addEventListener("click", loadWhatsApp);
openTabButton.addEventListener("click", openWhatsAppTab);
loginTabButton.addEventListener("click", openWhatsAppTab);
soundToggle.addEventListener("click", toggleSound);
sidePanelToggle.addEventListener("click", openSidePanel);
openSidePanelButton.addEventListener("click", openSidePanel);
switchToPopupButton.addEventListener("click", switchToPopup);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "zapdock:state") {
    applyRemoteNotificationState(message.state);
  }
});

window.addEventListener("online", () => {
  if (document.body.dataset.state === "offline") {
    loadWhatsApp();
  }
});

window.addEventListener("offline", () => {
  setConnectionState("offline", "sem internet");
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && key === "r") {
    event.preventDefault();
    loadWhatsApp();
    reloadButton.focus();
    return;
  }

  if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && key === "s") {
    event.preventDefault();
    toggleSound();
    soundToggle.focus();
    return;
  }

  if (event.key === "Escape") {
    window.close();
  }
});

requestNotificationState();
checkPanelMode();
