document.documentElement.lang = chrome.i18n.getUILanguage();

document.querySelectorAll("[data-i18n]").forEach(element => {
  const message = chrome.i18n.getMessage(element.getAttribute("data-i18n"));
  if (message) {
    element.innerHTML = message;
  }
});

document.querySelectorAll("[data-i18n-aria]").forEach(element => {
  const message = chrome.i18n.getMessage(element.getAttribute("data-i18n-aria"));
  if (message) {
    element.setAttribute("aria-label", message);
  }
});

document.querySelectorAll("[data-i18n-title]").forEach(element => {
  const message = chrome.i18n.getMessage(element.getAttribute("data-i18n-title"));
  if (message) {
    element.setAttribute("title", message);
  }
});
