const fs = require("node:fs");
const wsUrl = process.argv[2];
const outputPath = process.argv[3];

if (!wsUrl || !outputPath) {
  console.error(
    "Uso: node tests/cdp-screenshot.cjs <webSocketDebuggerUrl> <arquivo.png>"
  );
  process.exit(1);
}

const socket = new WebSocket(wsUrl);
const keepAlive = setTimeout(() => {
  console.error("Tempo esgotado ao capturar a tela.");
  process.exitCode = 1;
  socket.close();
}, 15000);
let commandId = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (!message.id) {
    return;
  }

  const handler = pending.get(message.id);
  pending.delete(message.id);

  if (message.error) {
    handler?.reject(new Error(message.error.message));
  } else {
    handler?.resolve(message.result);
  }
});

socket.addEventListener("open", async () => {
  try {
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 800,
      height: 600,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    fs.writeFileSync(outputPath, Buffer.from(screenshot.data, "base64"));
    console.log(outputPath);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    clearTimeout(keepAlive);
    socket.close();
  }
});

socket.addEventListener("error", (event) => {
  clearTimeout(keepAlive);
  console.error("Falha no WebSocket do DevTools:", event.message ?? event);
  process.exitCode = 1;
});
