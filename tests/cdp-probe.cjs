const wsUrl = process.argv[2];
const reloadEnabled = !process.argv.includes("--no-reload");

if (!wsUrl) {
  console.error("Uso: node tests/cdp-probe.cjs <webSocketDebuggerUrl>");
  process.exit(1);
}

const socket = new WebSocket(wsUrl);
let commandId = 0;
const pending = new Map();
const diagnostics = {
  requests: [],
  requestExtraHeaders: [],
  documents: [],
  console: [],
  logs: [],
  exceptions: []
};
const keepAlive = setTimeout(() => {
  console.error("Tempo esgotado ao aguardar o DevTools.");
  process.exitCode = 1;
  socket.close();
}, 15000);

function send(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.id) {
    const handler = pending.get(message.id);
    pending.delete(message.id);

    if (message.error) {
      handler?.reject(new Error(message.error.message));
    } else {
      handler?.resolve(message.result);
    }
    return;
  }

  if (
    message.method === "Network.requestWillBeSent" &&
    message.params.type === "Document"
  ) {
    diagnostics.requests.push({
      url: message.params.request.url,
      headers: message.params.request.headers
    });
  }

  if (message.method === "Network.requestWillBeSentExtraInfo") {
    diagnostics.requestExtraHeaders.push(message.params.headers);
  }

  if (
    message.method === "Network.responseReceived" &&
    message.params.type === "Document"
  ) {
    const response = message.params.response;
    diagnostics.documents.push({
      url: response.url,
      status: response.status,
      mimeType: response.mimeType,
      protocol: response.protocol,
      headers: response.headers
    });
  }

  if (message.method === "Runtime.consoleAPICalled") {
    diagnostics.console.push({
      type: message.params.type,
      values: message.params.args.map((argument) => argument.value)
    });
  }

  if (message.method === "Log.entryAdded") {
    diagnostics.logs.push(message.params.entry);
  }

  if (message.method === "Runtime.exceptionThrown") {
    diagnostics.exceptions.push(
      message.params.exceptionDetails.exception?.description ??
        message.params.exceptionDetails.text
    );
  }
});

socket.addEventListener("open", async () => {
  try {
    await Promise.all([
      send("Runtime.enable"),
      send("Network.enable"),
      send("Log.enable")
    ]);

    if (reloadEnabled) {
      try {
        await send("Page.enable");
        await send("Page.reload", { ignoreCache: true });
        await new Promise((resolve) => setTimeout(resolve, 6000));
      } catch {
        // Alvos OOPIF aceitam Runtime/Network, mas não comandos Page.
        await send("Runtime.evaluate", {
          expression: "location.reload()"
        });
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    }

    let pageValue;

    for (let attempt = 0; attempt < 5 && !pageValue; attempt += 1) {
      const evaluated = await send("Runtime.evaluate", {
        expression: `JSON.stringify({
          title: document.title,
          text: document.body?.innerText,
          html: document.documentElement?.outerHTML.slice(0, 1200),
          cookie: document.cookie,
          referrer: document.referrer,
          windowName: window.name,
          topEqualsSelf: top === self,
          hasFrameElement: Boolean(frameElement),
          readyState: document.readyState,
          userAgent: navigator.userAgent
        })`,
        returnByValue: true
      });

      pageValue = evaluated.result.value;

      if (!pageValue) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    diagnostics.page = pageValue ? JSON.parse(pageValue) : null;
    console.log(JSON.stringify(diagnostics, null, 2));
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

socket.addEventListener("close", () => {
  clearTimeout(keepAlive);
});
