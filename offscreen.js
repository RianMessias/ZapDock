let audioContext = null;

function createTone(context, startAt, frequency) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.13, startAt + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.17);
}

async function playAlert() {
  audioContext ??= new AudioContext();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const startAt = audioContext.currentTime + 0.025;
  createTone(audioContext, startAt, 880);
  createTone(audioContext, startAt + 0.13, 1175);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "zapdock:play-alert") {
    return false;
  }

  playAlert()
    .then(() => sendResponse({ played: true }))
    .catch((error) => {
      console.error("Não foi possível tocar o alerta do ZapDock:", error);
      sendResponse({ played: false });
    });

  return true;
});
