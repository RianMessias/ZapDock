const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

async function testEmbeddingRule() {
  const listeners = {};
  const calls = [];
  const storageState = {};

  const chrome = {
    action: {
      async setBadgeText() {},
      async setBadgeBackgroundColor() {},
      async setBadgeTextColor() {}
    },
    runtime: {
      id: "abcdefghijklmnopabcdefghijklmnop",
      getURL(file) {
        return `chrome-extension://abcdefghijklmnopabcdefghijklmnop/${file}`;
      },
      async getContexts() {
        return [{ contextType: "OFFSCREEN_DOCUMENT" }];
      },
      async sendMessage() {},
      onMessage: {
        addListener(listener) {
          listeners.message = listener;
        }
      },
      onInstalled: {
        addListener(listener) {
          listeners.installed = listener;
        }
      },
      onStartup: {
        addListener(listener) {
          listeners.startup = listener;
        }
      }
    },
    offscreen: {
      async createDocument() {}
    },
    sidePanel: {
      async open() {
        return true;
      }
    },
    tabs: {
      async query() {
        return [{ windowId: 1 }];
      }
    },
    storage: {
      local: {
        async get(keys) {
          if (typeof keys === "string") {
            return { [keys]: storageState[keys] };
          }

          return Object.fromEntries(
            keys
              .filter((key) => Object.hasOwn(storageState, key))
              .map((key) => [key, storageState[key]])
          );
        },
        async set(values) {
          Object.assign(storageState, values);
        }
      }
    },
    declarativeNetRequest: {
      async updateDynamicRules(options) {
        calls.push(options);
      }
    }
  };

  const context = vm.createContext({ chrome, console });
  const backgroundSource = fs.readFileSync(
    path.join(projectRoot, "background.js"),
    "utf8"
  );

  vm.runInContext(backgroundSource, context, { filename: "background.js" });
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(typeof listeners.installed, "function");
  assert.equal(typeof listeners.startup, "function");
  assert.equal(typeof listeners.message, "function");
  assert.equal(calls.length, 1);

  const rule = JSON.parse(JSON.stringify(calls[0].addRules[0]));
  assert.deepEqual(rule, {
    id: 1,
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
        { header: "content-security-policy", operation: "remove" },
        { header: "x-frame-options", operation: "remove" }
      ]
    },
    condition: {
      requestDomains: ["web.whatsapp.com"],
      topDomains: ["abcdefghijklmnopabcdefghijklmnop"],
      resourceTypes: ["sub_frame"]
    }
  });
}

function testExtensionFiles() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "manifest.json"), "utf8")
  );
  const html = fs.readFileSync(path.join(projectRoot, "popup.html"), "utf8");
  const css = fs.readFileSync(path.join(projectRoot, "popup.css"), "utf8");
  const popupScript = fs.readFileSync(
    path.join(projectRoot, "popup.js"),
    "utf8"
  );

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, "1.0.0");
  assert.equal(manifest.minimum_chrome_version, "145");
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.equal(
    manifest.permissions.includes("declarativeNetRequestWithHostAccess"),
    true
  );
  assert.equal(manifest.permissions.includes("offscreen"), true);
  assert.equal(manifest.permissions.includes("sidePanel"), true);
  assert.equal(manifest.permissions.includes("storage"), true);
  assert.deepEqual(manifest.host_permissions, [
    "https://web.whatsapp.com/*"
  ]);
  assert.equal(manifest.content_scripts[0].all_frames, true);
  assert.deepEqual(manifest.content_scripts[0].js, [
    "whatsapp-observer.js"
  ]);
  assert.equal(Object.hasOwn(manifest, "options_page"), false);
  assert.equal(manifest.side_panel.default_path, "sidepanel.html");

  for (const size of [16, 32, 48, 128]) {
    const iconPath = path.join(projectRoot, `icons/icon-${size}.png`);
    assert.equal(fs.existsSync(iconPath), true, `Ícone ${size}px ausente.`);
  }

  assert.match(html, /id="whatsappFrame"/);
  assert.match(html, /id="reloadButton"/);
  assert.match(html, /id="soundToggle"/);
  assert.match(html, /id="messageBadge"/);
  assert.match(html, /aria-label="Controles do ZapDock"/);
  assert.match(html, /id="connectionStatus"[^>]+role="status"/s);
  assert.match(html, /id="frameArea"[^>]+aria-busy="true"/s);
  assert.match(html, /id="notificationStatus"[^>]+aria-live="polite"/s);
  assert.match(html, /aria-keyshortcuts="Alt\+Shift\+R"/);
  assert.match(html, /aria-keyshortcuts="Alt\+Shift\+S"/);
  assert.match(html, /allow="autoplay; camera; microphone;/);
  assert.match(css, /width: 800px/);
  assert.match(css, /height: 600px/);
  assert.match(css, /--whatsapp-scale: 0\.86/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.sr-only/);
  assert.match(css, /forced-colors: active/);
  assert.match(css, /button:focus-visible/);
  assert.match(popupScript, /https:\/\/web\.whatsapp\.com\//);
  assert.match(popupScript, /event\.altKey/);
  assert.match(popupScript, /notificationStatus\.textContent/);
  assert.match(popupScript, /hasUserInteractedWithSound/);
  assert.match(popupScript, /checkPanelMode/);
  assert.match(popupScript, /zapdock:open-sidepanel/);
  assert.match(popupScript, /zapdock:get-panel-mode/);
  assert.match(popupScript, /sidePanelToggle/);
  assert.match(html, /id="sidePanelToggle"/);
  assert.match(html, /id="panelNotice"/);
  assert.match(html, /id="openSidePanelButton"/);
  assert.match(html, /id="switchToPopupButton"/);
  assert.doesNotMatch(popupScript, /contentDocument|contentWindow\.document/);

  const sidepanelHtml = fs.readFileSync(
    path.join(projectRoot, "sidepanel.html"),
    "utf8"
  );
  const sidepanelCss = fs.readFileSync(
    path.join(projectRoot, "sidepanel.css"),
    "utf8"
  );
  const sidepanelScript = fs.readFileSync(
    path.join(projectRoot, "sidepanel.js"),
    "utf8"
  );

  assert.match(sidepanelHtml, /name="zapdock-sidepanel"/);
  assert.match(sidepanelHtml, /id="whatsappFrame"/);
  assert.match(sidepanelHtml, /id="soundToggle"/);
  assert.match(sidepanelHtml, /id="reloadButton"/);
  assert.match(sidepanelHtml, /Painel Lateral/);
  assert.match(sidepanelScript, /https:\/\/web\.whatsapp\.com\//);
  assert.match(sidepanelScript, /zapdock:get-state/);
  assert.match(sidepanelScript, /zapdock:set-sound/);
  assert.match(sidepanelCss, /--whatsapp-scale: 0\.48/);

  const observerScript = fs.readFileSync(
    path.join(projectRoot, "whatsapp-observer.js"),
    "utf8"
  );
  assert.match(observerScript, /mensagens\?\\s\+não\\s\+lidas\?/);
  assert.match(observerScript, /querySelectorAll\("\[aria-label\]"\)/);
  assert.match(observerScript, /attributeFilter/);
  assert.match(observerScript, /zapdock-sidepanel/);

  for (const file of [
    "background.js",
    "offscreen.html",
    "offscreen.js",
    "whatsapp-observer.js",
    "sidepanel.html",
    "sidepanel.js",
    "sidepanel.css"
  ]) {
    assert.equal(
      fs.existsSync(path.join(projectRoot, file)),
      true,
      `${file} ausente.`
    );
  }
}

(async () => {
  await testEmbeddingRule();
  testExtensionFiles();
  console.log("Smoke tests do popup ancorado concluídos com sucesso.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
