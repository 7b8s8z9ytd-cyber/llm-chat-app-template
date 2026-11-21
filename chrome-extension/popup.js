const button = document.getElementById("allow");
const status = document.getElementById("status");
button.addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.url || !/^https?:\\/\\//i.test(tab.url)) {
      status.textContent = "Open a normal website first. Chrome system pages cannot be controlled.";
      return;
    }
    const origin = new URL(tab.url).origin + "/*";
    const granted = await chrome.permissions.request({ origins: [origin] });
    status.textContent = granted
      ? "Access granted for " + new URL(tab.url).hostname + ". Return to JARVIS and try again."
      : "Permission was not granted. JARVIS cannot interact with this page.";
  } catch (error) {
    status.textContent = "Could not request access: " + error.message;
  }
});