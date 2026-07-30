const WHATSAPP_URL = "https://web.whatsapp.com/";
const MINIMUM_LOADER_TIME_MS = 450;
const SLOW_LOAD_NOTICE_MS = 12000;

const frame = document.querySelector("#whatsappFrame");
const loader = document.querySelector("#loader");
const slowNotice = document.querySelector("#slowNotice");
const connectionText = document.querySelector("#connectionText");
const reloadButton = document.querySelector("#reloadButton");
const openTabButton = document.querySelector("#openTabButton");
const loginTabButton = document.querySelector("#loginTabButton");
const soundToggle = document.querySelector("#soundToggle");
const messageBadge = document.querySelector("#messageBadge");

let loadStartedAt = performance.now();
let slowNoticeTimer = null;
let notificationState = {
  unreadCount: 0,
  soundEnabled: true
};

function setConnectionState(state, label) {
  document.body.dataset.state = state;
  connectionText.textContent = label;
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
  setConnectionState(navigator.onLine ? "loading" : "offline", navigator.onLine ? "conectando" : "sem internet");
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
  setConnectionState("ready", "painel ativo");
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
    normalizedCount === 1
      ? "1 mensagem não lida"
      : `${normalizedCount} mensagens não lidas`
  );

  soundToggle.setAttribute("aria-pressed", String(Boolean(soundEnabled)));
  soundToggle.setAttribute(
    "aria-label",
    soundEnabled
      ? "Desativar som de novas mensagens"
      : "Ativar som de novas mensagens"
  );
  soundToggle.title = soundEnabled ? "Desativar som" : "Ativar som";
}

function requestNotificationState() {
  chrome.runtime.sendMessage({ type: "zapdock:get-state" }, (state) => {
    if (chrome.runtime.lastError || !state) {
      return;
    }

    applyNotificationState(state);
  });
}

function toggleSound() {
  const soundEnabled = soundToggle.getAttribute("aria-pressed") !== "true";

  applyNotificationState({
    unreadCount: notificationState.unreadCount,
    soundEnabled
  });

  chrome.runtime.sendMessage(
    { type: "zapdock:set-sound", soundEnabled },
    (state) => {
      if (!chrome.runtime.lastError && state) {
        applyNotificationState(state);
      }
    }
  );
}

frame.addEventListener("load", revealFrame);
reloadButton.addEventListener("click", loadWhatsApp);
openTabButton.addEventListener("click", openWhatsAppTab);
loginTabButton.addEventListener("click", openWhatsAppTab);
soundToggle.addEventListener("click", toggleSound);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "zapdock:state") {
    applyNotificationState(message.state);
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
  if (event.key === "Escape") {
    window.close();
  }
});

requestNotificationState();
loadWhatsApp();
