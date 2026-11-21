const UNSAFE_ACTION_WORDS = /\\b(send|submit|purchase|buy|pay|checkout|delete|remove|erase|transfer|post|publish|sign ?out|log ?out|confirm)\\b/i;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "JARVIS_BROWSER_COMMAND") return;
  runCommand(message.command).then(sendResponse).catch(error => {
    sendResponse({ ok: false, message: error?.message || "Browser command failed." });
  });
  return true;
});

async function runCommand(command) {
  const action = command?.action;
  const args = command?.args || {};
  if (action === "open" || action === "search") {
    let url;
    if (action === "search") {
      url = "https://www.google.com/search?q=" + encodeURIComponent(args.query || "");
    } else {
      let target = String(args.url || "").trim();
      if (!target) throw new Error("Tell me which website to open.");
      if (!/^https?:\\/\\//i.test(target)) target = "https://" + target;
      const parsed = new URL(target);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only normal websites can be opened.");
      url = parsed.href;
    }
    const tab = await chrome.tabs.create({ url, active: true });
    return { ok: true, message: "Opened " + url, tabId: tab.id };
  }
  if (action === "new_tab") {
    const tab = await chrome.tabs.create({ active: true });
    return { ok: true, message: "Opened a new tab." , tabId: tab.id };
  }
  if (action === "switch_tab") {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const index = Number(args.index) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= tabs.length) throw new Error("I can't find that tab number.");
    await chrome.tabs.update(tabs[index].id, { active: true });
    return { ok: true, message: "Switched to tab " + (index + 1) + "." };
  }
  if (action === "close_tab") {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) throw new Error("There is no active tab to close.");
    await chrome.tabs.remove(tab.id);
    return { ok: true, message: "Closed the current tab." };
  }
  if (action === "back" || action === "forward" || action === "read" || action === "click" || action === "fill") {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) throw new Error("I couldn't find the active tab.");
    if (action === "read") {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => (document.body?.innerText || "").slice(0, 6000)
      });
      return { ok: true, message: "Visible page text:\\n" + (result?.[0]?.result || "No readable page text found.") };
    }
    if (action === "back" || action === "forward") {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: direction => direction === "back" ? history.back() : history.forward(),
        args: [action]
      });
      return { ok: true, message: action === "back" ? "Going back one page." : "Going forward one page." };
    }
    if (action === "click") {
      const label = String(args.label || "").trim();
      if (!label) throw new Error("Tell me the exact button or link text.");
      if (UNSAFE_ACTION_WORDS.test(label)) throw new Error("I won't click a control that appears to submit, send, purchase, delete or publish something. Please do that yourself.");
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: text => {
          const norm = value => (value || "").replace(/\\s+/g, " ").trim().toLowerCase();
          const wanted = norm(text);
          const candidates = [...document.querySelectorAll("button, a, [role='button']")];
          const match = candidates.find(el => {
            const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            const label = norm(el.innerText || el.getAttribute("aria-label") || el.getAttribute("title"));
            return visible && !el.disabled && label === wanted;
          });
          if (!match) return { ok: false, message: "I couldn't find a visible button or link with that exact text." };
          match.click();
          return { ok: true, message: "Clicked: " + (match.innerText || text) };
        },
        args: [label]
      });
      const value = result?.[0]?.result;
      if (!value?.ok) throw new Error(value?.message || "Click did not complete.");
      return value;
    }
    if (action === "fill") {
      const field = String(args.field || "").trim();
      const value = String(args.text || "");
      if (!field) throw new Error("Tell me which field to fill.");
      if (!value) throw new Error("Tell me what text to enter.");
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: ({ field, value }) => {
          const norm = text => (text || "").replace(/\\s+/g, " ").trim().toLowerCase();
          const wanted = norm(field);
          const elements = [...document.querySelectorAll("input:not([type='password']):not([type='hidden']):not([type='email']), textarea, [contenteditable='true']")];
          const match = elements.find(el => {
            const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            if (!visible || el.disabled || el.readOnly) return false;
            const label = el.labels ? [...el.labels].map(l => l.innerText).join(" ") : "";
            const name = [el.getAttribute("aria-label"), el.getAttribute("placeholder"), el.getAttribute("name"), el.getAttribute("id"), label].join(" ");
            return norm(name).includes(wanted);
          });
          if (!match) return { ok: false, message: "I couldn't find a visible, editable, non-sensitive field matching that label." };
          if (match.isContentEditable) {
            match.textContent = value;
          } else {
            const proto = match instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
            if (setter) setter.call(match, value); else match.value = value;
          }
          match.dispatchEvent(new Event("input", { bubbles: true }));
          match.dispatchEvent(new Event("change", { bubbles: true }));
          return { ok: true, message: "Entered text in the " + field + " field. I have not submitted the form." };
        },
        args: [{ field, value }]
      });
      const valueResult = result?.[0]?.result;
      if (!valueResult?.ok) throw new Error(valueResult?.message || "I couldn't fill that field.");
      return valueResult;
    }
  }
  throw new Error("I don't recognise that browser command.");
}