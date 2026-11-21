# J.A.R.V.I.S Chrome Browser Control

This extension connects the JARVIS dashboard to Chrome tab controls. It is designed for the dashboard at:

https://llm-chat-app-template.hvrhypt5z2.workers.dev

## Install on Chromebook

1. Open this repository on GitHub and download the repository ZIP (Code → Download ZIP).
2. In the Files app, extract the ZIP.
3. Open Chrome and visit `chrome://extensions`.
4. Turn on **Developer mode** (top-right), if your Chromebook allows it.
5. Choose **Load unpacked** and select the extracted `chrome-extension` folder.
6. Pin **J.A.R.V.I.S Browser Control** to the Chrome toolbar.
7. Open your JARVIS dashboard. On each website you want JARVIS to interact with, open the extension menu and choose **ALLOW ON THIS WEBSITE**. Chrome will ask you to approve that site's permission.

If your Chromebook is school-managed or Developer mode / Load unpacked is blocked, do not try to bypass the restriction; the extension may not be installable on that device.

## Example commands

- `open wikipedia.org`
- `search Google for Ireland rugby`
- `new tab`
- `switch to tab 2`
- `close tab` (asks first)
- `back` / `forward`
- `read this page`
- `click the About link` (asks first)
- `fill the Search field with rugby` (asks first; does not submit)

Say or type **browser help** in JARVIS for the command list.

## Permission and safety notes

- The extension asks for access to each website separately. Grant access only to sites you trust.
- Page reading, clicking and filling only work on a site after you grant its permission.
- JARVIS does not submit forms, click obvious send/purchase/delete/submit controls, or fill password, hidden or email fields.
- Never ask JARVIS to handle passwords, payment details, private messages or other sensitive information.
- You remain responsible for checking the page before taking actions. You can remove the extension or revoke its site permissions from `chrome://extensions`.
