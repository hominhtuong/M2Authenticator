# Chrome Web Store listing (English)

Copy each block into the matching field in the Developer Dashboard.
Field names below are given in English with the Vietnamese dashboard label in brackets.

---

## 1. Product details [Thông tin chi tiết về sản phẩm]

### Name [Tên trong gói]

Pulled automatically from `manifest.json` => `name`. Do not type it in the dashboard.

```
M2 Authenticator
```

### Summary [Thông tin tóm tắt trong gói]

Pulled automatically from `manifest.json` => `description`. Max 132 characters. Currently:

```
Offline 2FA codes (TOTP/HOTP). AES-256-GCM encrypted vault, unlocked by master password or fingerprint.
```

### Description [Mô tả] - max 16,000 characters

```
M2 Authenticator generates two-factor authentication codes (TOTP and HOTP) directly in Chrome, so you
do not have to reach for your phone every time you sign in.

It is built for people who want the convenience of a browser authenticator without giving up the security
properties they would get from a phone app.


ENCRYPTED BY DEFAULT, NOT AS AN OPTION

Every 2FA secret is encrypted with AES-256-GCM before it ever touches disk. The encryption key is derived
from your master password using PBKDF2-HMAC-SHA256 with 600,000 iterations and a random 16-byte salt, which
matches the current OWASP recommendation.

While the vault is locked, the data stored on your computer is nothing but ciphertext. Your master password
is never stored anywhere, not even as a hash, so there is no password file to steal and no hash to crack
offline.

The extension uses a two-layer key design. A random 256-bit data key encrypts your account list, and that
data key is separately wrapped by your master password and by your fingerprint. Changing your master
password only rewraps 32 bytes instead of re-encrypting the whole vault, so there is never a window where
your data sits half-migrated.


UNLOCK WITH YOUR FINGERPRINT

Use Touch ID, Windows Hello or a security key to open the vault without typing your password, through the
WebAuthn PRF extension. The secret that unwraps your key never leaves the authenticator hardware in a form
that can be replayed without biometric verification, and user verification is always required, so plugging
in a device is not enough on its own.

Your master password still works as a fallback, and removing the fingerprint never touches the password path.


MOVE EVERYTHING OVER FROM GOOGLE AUTHENTICATOR IN ONE STEP

A single "Transfer accounts" export QR from Google Authenticator can carry dozens of accounts. M2 decodes
it, shows you every account it found, lets you tick which ones to keep and rename them inline, flags the ones
you already have, and saves them in one pass.

If your export is split across several QR codes, import them all at once and the extension keeps track of how
many parts it has seen and how many are still missing.

You can also add accounts from a normal 2FA QR image, by dragging an image onto the window, by pasting a
screenshot with Ctrl+V, or by typing a Base32 secret by hand.


LOCKS ITSELF AND CLEANS UP AFTER YOU

- The vault auto-locks after an idle period you choose, and always locks when Chrome closes
- Codes you copy are wiped from the clipboard a few seconds later, even after the popup is closed
- Optional blur that hides codes until you hover, so nobody reads them over your shoulder
- Repeated wrong password attempts trigger an increasing delay that survives a browser restart


NO NETWORK, NO TRACKING, NO THIRD-PARTY CODE

- No host permissions at all, so the extension cannot read or modify any website you visit
- No content scripts, nothing is injected into the pages you browse
- No network calls of any kind. The build pipeline refuses to package the extension if any source file
  contains fetch, XMLHttpRequest, WebSocket or importScripts
- No analytics, no telemetry, no ads
- Chrome sync is not used, so your vault never leaves this machine
- Zero third-party libraries. Everything runs on Web Crypto, BarcodeDetector and WebAuthn, which ship with
  Chrome itself. There is no supply chain to compromise
- No innerHTML and no eval anywhere in the codebase, with a content security policy that only allows
  scripts bundled with the extension


ALSO INCLUDED

- TOTP and HOTP, SHA-1 / SHA-256 / SHA-512, 6 to 10 digit codes, custom periods
- Live countdown ring for every code
- Search and manual reordering
- Verified against the official RFC 6238, RFC 4226 and RFC 4648 test vectors


PLEASE READ BEFORE INSTALLING

There is no backup or export feature yet. If you forget your master password, your accounts cannot be
recovered by anyone, including us, because the key is derived from that password alone. Store your master
password somewhere safe, and keep the recovery codes each service gives you when you enable 2FA.

Note on the interface language: the user interface is currently in Vietnamese. English is planned.

Requires Chrome 116 or later.
```

### Category [Loại]

```
Productivity  >  Workflow & Planning
```

### Language [Ngôn ngữ]

```
English (United States)
```

Read the warning in "Language mismatch" at the bottom of this file before choosing.

---

## 2. Privacy [Quyền riêng tư]

### Single purpose description

```
M2 Authenticator has a single purpose: to generate and manage two-factor authentication codes
(TOTP and HOTP) entirely on the user's own machine. It stores the user's 2FA secrets in an encrypted
local vault and displays the current one-time codes derived from them. It does not perform any other
function and does not interact with web pages.
```

### Permission justifications

**storage**

```
Stores the user's 2FA vault, encrypted with AES-256-GCM, and their preferences on their own machine
using chrome.storage.local. The in-memory chrome.storage.session area holds the decryption key only
while the vault is unlocked, so the key is never written to disk. No data is transmitted anywhere.
```

**alarms**

```
Enforces the auto-lock timer so the vault locks itself after the idle period the user chose, and
schedules the clipboard wipe after a code is copied. Both must fire after the popup has closed and
after the service worker has been suspended, which is exactly what chrome.alarms is for.
```

**offscreen**

```
The service worker has no DOM, so it cannot write to the clipboard. A short-lived offscreen document
with the CLIPBOARD reason is created solely to overwrite the clipboard once the copied one-time code
expires. It is closed immediately afterwards and never loads remote content.
```

**clipboardWrite**

```
Copies the one-time code the user asked for, and then overwrites the clipboard when the retention
period ends so the code does not linger where other applications can read it. The extension never
reads the clipboard.
```

**No host permissions requested**

```
The extension never needs access to any website. It does not read page content, does not autofill,
and has no content scripts.
```

### Data usage disclosures

Tick exactly these:

| Question | Answer |
| --- | --- |
| Personally identifiable information | Not collected |
| Health information | Not collected |
| Financial and payment information | Not collected |
| Authentication information | Not collected |
| Personal communications | Not collected |
| Location | Not collected |
| Web history | Not collected |
| User activity | Not collected |
| Website content | Not collected |

On "Authentication information": the 2FA secrets never leave the user's device and are never transmitted,
received or shared. Google's definition of "collect" is transmitting data off the user's machine, which this
extension never does, so "Not collected" is the correct answer. If the review team asks, the explanation is:

```
2FA secrets are stored only in the local, encrypted extension storage on the user's own machine. The
extension has no host permissions, makes no network requests of any kind, and does not use chrome.storage.sync.
No data is ever transmitted off the device, so nothing is collected under the Chrome Web Store definition.
```

### Required certifications

Tick all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

Publish `PRIVACY.md` at a public URL and paste it here. A GitHub Pages URL or a raw GitHub file both work.
This field is mandatory.

---

## 3. Testing instructions [Hướng dẫn thử nghiệm]

The reviewer hits a locked screen on first run, so give them a working path. Paste this in:

```
The extension stores 2FA secrets in a local encrypted vault, so it asks you to create a master password
on first run. No account, no login and no network connection are needed.

1. Install the extension. A setup tab opens automatically. If it does not, click the extension icon and
   press "Thiết lập ngay" (Set up now).

2. Create a master password. Any passphrase of 16 characters or more is accepted, for example:
      the quick brown fox jumps 2026
   Tick the acknowledgement checkbox, then press "Tạo vault" (Create vault).

3. The options page opens. You can leave it as is, or use "Bật mở khoá bằng vân tay"
   (Enable fingerprint unlock) if the review machine has Touch ID or Windows Hello.

4. Add a test account. Click the extension icon, then the "+" button in the toolbar. The import tab opens.
   Choose the second tab, "Nhập tay" (Manual entry), and fill in:
      Service (Dịch vụ):  Demo
      Account (Tài khoản): reviewer@example.com
      Secret:              JBSWY3DPEHPK3PXP
   Press "Thêm account" (Add account).

5. Click the extension icon again. The 6-digit code is shown with a countdown ring and refreshes every
   30 seconds. Click the code to copy it.

   To verify the code is correct, compare it against any public TOTP calculator using the same secret
   JBSWY3DPEHPK3PXP with the default settings (SHA-1, 6 digits, 30 second period).

6. To test bulk import, open Google Authenticator on a phone, choose the three-dot menu, then
   "Transfer accounts" and "Export accounts", screenshot the QR code that appears, and drop that image
   onto the import tab. The extension decodes every account in the QR and shows a review list.

7. To test locking, press the padlock button in the popup toolbar. The vault locks and asks for the
   master password again.

Note: the interface is currently in Vietnamese. The steps above name every button in Vietnamese with an
English translation next to it.
```

---

## 4. Graphic assets [Biểu trưng cửa hàng và ảnh chụp màn hình]

### Store icon

128 x 128 PNG. Already in the repository at `src/assets/icons/icon128.png`.

### Screenshots

1280 x 800 or 640 x 400 PNG or JPEG. At least one is required, five is better. Suggested set:

1. Unlocked code list with the countdown rings and the search bar
2. Lock screen with the fingerprint unlock button
3. Import review table showing several accounts decoded from one Google Authenticator export QR
4. Options page showing the auto-lock and clipboard settings
5. Master password setup screen with the strength meter

Do not use real secrets in the screenshots. Create a few throwaway accounts first.

### Optional

- Small promo tile 440 x 280
- Marquee promo tile 1400 x 560

---

## 5. Distribution [Phân phối]

| Field | Value |
| --- | --- |
| Visibility | Public |
| Regions | All regions |
| Pricing | Free |
| Contains ads | No |
| In-app purchases | No |

---

## Language mismatch: read this before you submit

The extension name and summary shown on the store come from `manifest.json`, which is now in English.
The interface inside the extension is still in Vietnamese.

Three options, pick one:

1. **Set the listing language to Vietnamese.** Honest and consistent, but limits discovery to Vietnamese users.
2. **Set it to English and keep the disclosure line** already included in the description above. Acceptable, but
   English speakers who install it will meet a Vietnamese interface and may leave one-star reviews.
3. **Localise the interface first** using `_locales/` with English and Vietnamese, then set the listing to English.
   This is the right answer if you want a global audience. It is roughly a day of work: about 120 UI strings across
   four pages, plus `default_locale` in the manifest.

I recommend option 3 before a public launch, and option 1 if you want to ship this week.

---

## Pre-submit checklist

- [ ] `npm test` is green (43 tests)
- [ ] `npm run build` succeeds, take the file from `dist/`
- [ ] `version` bumped in **both** `src/manifest.json` and `package.json`, they must match or the build fails
- [ ] `PRIVACY.md` published at a public URL and pasted into the privacy policy field
- [ ] Screenshots prepared, no real secrets visible
- [ ] Installed the zip from scratch and walked the whole flow: create vault, import a QR, lock, unlock,
      auto-lock after the idle period, copy a code and confirm the clipboard clears
