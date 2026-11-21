window.addEventListener("message", async event => {
  if (event.source !== window || event.data?.source !== "JARVIS_DASHBOARD" || event.data?.type !== "BROWSER_COMMAND") return;
  const { requestId, command } = event.data;
  try {
    const result = await chrome.runtime.sendMessage({ type: "JARVIS_BROWSER_COMMAND", command });
    window.postMessage({ source: "JARVIS_EXTENSION", type: "BROWSER_RESULT", requestId, result }, "*");
  } catch (error) {
    window.postMessage({
      source: "JARVIS_EXTENSION",
      type: "BROWSER_RESULT",
      requestId,
      result: { ok: false, message: error?.message || "Extension connection failed. Is the JARVIS extension enabled?" }
    }, "*");
  }
});