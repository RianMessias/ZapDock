const wsUrl = process.argv[2];
const expression = process.argv.slice(3).join(" ");

if (!wsUrl || !expression) {
  console.error("Uso: node tests/cdp-evaluate.cjs <webSocketDebuggerUrl> <expressão>");
  process.exit(1);
}

const socket = new WebSocket(wsUrl);
let commandId = 0;

socket.addEventListener("open", () => {
  socket.send(
    JSON.stringify({
      id: ++commandId,
      method: "Runtime.evaluate",
      params: {
        expression,
        awaitPromise: true,
        returnByValue: true
      }
    })
  );
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.id !== commandId) {
    return;
  }

  if (message.error || message.result?.exceptionDetails) {
    console.error(
      message.error?.message ??
        message.result.exceptionDetails.exception?.description ??
        message.result.exceptionDetails.text
    );
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(message.result.result.value));
  }

  socket.close();
});

socket.addEventListener("error", (event) => {
  console.error(event.message ?? event);
  process.exitCode = 1;
});
