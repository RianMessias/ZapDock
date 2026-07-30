(() => {
  const source =
    window.name === "zapdock-monitor"
      ? "monitor"
      : window.name === "zapdock-popup"
        ? "popup"
        : window.name === "zapdock-sidepanel"
          ? "sidepanel"
          : null;

  if (!source) {
    return;
  }

  let lastUnreadCount = null;
  let publishTimer = null;
  let baselinePublished = false;

  function readUnreadCountFromTitle() {
    const match = document.title.match(/^\((\d+)\)/);
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  function countFromLabel(label) {
    const patterns = [
      /(\d+)\s+mensagens?\s+não\s+lidas?/i,
      /(\d+)\s+unread\s+messages?/i,
      /(\d+)\s+mensajes?\s+no\s+le[ií]dos?/i
    ];

    for (const pattern of patterns) {
      const match = label.match(pattern);

      if (match) {
        return Number.parseInt(match[1], 10);
      }
    }

    return 0;
  }

  function readUnreadCountFromDom() {
    let total = 0;

    for (const element of document.querySelectorAll("[aria-label]")) {
      const label = element.getAttribute("aria-label");

      if (label) {
        total += countFromLabel(label);
      }
    }

    if (total > 0) {
      return total;
    }

    for (const icon of document.querySelectorAll(
      '[data-icon*="unread" i], [data-testid*="unread" i]'
    )) {
      const badgeText = icon.parentElement?.textContent?.trim() ?? "";

      if (/^\d+$/.test(badgeText)) {
        total += Number.parseInt(badgeText, 10);
      }
    }

    return total;
  }

  function readUnreadCount() {
    return Math.max(
      readUnreadCountFromTitle(),
      readUnreadCountFromDom()
    );
  }

  function sendCount(count, initial) {
    chrome.runtime.sendMessage(
      {
        type: "zapdock:unread",
        source,
        count,
        initial
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  }

  function publish(initial = false) {
    const count = readUnreadCount();

    if (!initial && count === lastUnreadCount) {
      return;
    }

    lastUnreadCount = count;
    baselinePublished = true;
    sendCount(count, initial);
  }

  function queuePublish() {
    clearTimeout(publishTimer);
    publishTimer = setTimeout(() => {
      if (baselinePublished) {
        publish(false);
      }
    }, 220);
  }

  function waitForWhatsApp() {
    const app = document.querySelector("#app");

    if (document.readyState === "complete" && app?.childElementCount > 0) {
      publish(true);
      return;
    }

    setTimeout(waitForWhatsApp, 500);
  }

  const observer = new MutationObserver(queuePublish);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["aria-label", "data-icon", "data-testid"],
    childList: true,
    subtree: true,
    characterData: true
  });

  waitForWhatsApp();
  setInterval(() => {
    if (baselinePublished) {
      publish(false);
    }
  }, 1500);
})();
