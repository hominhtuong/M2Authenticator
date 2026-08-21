# M2 Authenticator

[Tiếng Việt](README.md) · **English**

![M2 Authenticator logo](brand/logo.png)

A Chrome extension that generates two-factor authentication codes (TOTP/HOTP) **fully offline**. The goal is to
replace the authenticator app on your phone without lowering your security standards.

Zero dependencies, no bundler, not a single network call. Everything runs on Web Crypto, `BarcodeDetector` and
WebAuthn, all built into Chrome. The source is small enough to read in one sitting, and that is deliberate:
an app that holds your 2FA seeds has to be verifiable.

The interface ships in **English and Vietnamese**, switched with a flag button inside the extension, no reload
needed.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-install-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/lkfhkcegjopcbkoafepfmmajlkbnglfh)
![Version](https://img.shields.io/badge/version-1.3.0-informational)
![License](https://img.shields.io/badge/license-MIT-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-brightgreen)
![Chrome](https://img.shields.io/badge/chrome-116%2B-orange)
![Dependencies](https://img.shields.io/badge/dependencies-0-success)
![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20VI-blueviolet)

---

## What is new in 1.3.0

Full history in [CHANGELOG.md](CHANGELOG.md).

- **Version and updates are visible.** The popup footer shows the version, Settings has a Version card with a
  check-for-updates button, and after each upgrade the popup opens on a short what-is-new summary.
- **Usable the moment it is installed** (since 1.2.0). No create-a-master-password wall for newcomers. A fresh
  vault starts with no password; anyone who wants real protection turns it on in Settings and keeps every
  account. The trade-off is spelled out under
  [Turning off the master password](#turning-off-the-master-password-read-this).
- **Settings open inside the popup** (since 1.1.0). Click the gear and the popup grows to show settings in
  place; the gear lights up while you are in there, and clicking it again returns to your codes.
- **One single unlock view** (since 1.1.0), so nothing shifts around when you press unlock with fingerprint.
  The scanning window now anchors to the top-right of the browser window, roughly where the popup was.
- **Stricter brute-force protection** (since 1.1.0): 5 free attempts, then 15s doubling each time up to a
  30 minute cap, with both the password field and the fingerprint button disabled while you wait.

Existing vaults need nothing on upgrade: the storage format is unchanged, there is no migration step, and any
password or fingerprint you already set keeps working. The new default applies to fresh installs only.

---

## Install

### Option 1: from the Chrome Web Store (recommended)

[**chromewebstore.google.com/detail/lkfhkcegjopcbkoafepfmmajlkbnglfh**](https://chromewebstore.google.com/detail/lkfhkcegjopcbkoafepfmmajlkbnglfh)

Click **Add to Chrome** and you are done. Updates arrive automatically.

### Option 2: download a packaged build from Releases

1. Download `m2-authenticator-<version>.zip` from the [Releases page](../../releases)
2. Unzip it
3. Open `chrome://extensions` and turn on **Developer mode**
4. Click **Load unpacked** and point it at the unzipped folder

If you build from source, `npm run build` also produces `dist/unpacked/` so you can load it directly without
unzipping anything.

### Option 3: fork and build it yourself

```bash
git clone https://github.com/hominhtuong/M2Authenticator.git
cd M2Authenticator
npm test        # 60 tests, no dependencies to install
npm run build   # produces dist/m2-authenticator-<version>.zip
```

Then Load unpacked and point it at the **`src/`** folder.

Requirements: Chrome 116 or newer. Node is only needed to run the tests or package a build, never to run the
extension.

---

## How to use it

### First run: usable right away

There is no setup wall after installing. The vault is created for you with **no master password**: open the
popup and you can start adding accounts immediately.

The trade-off to know about: with no master password, the decryption key sits in the browser profile next to
the data. Anything able to read that profile can read your 2FA seeds.

### Turn on a master password (recommended)

**Settings => Master password => Turn on master password.** Every account stays where it is; only the key gets
rewrapped.

The way to get something both strong and memorable: **one long sentence of 16 characters or more**, for example
`the quick brown fox jumps 2026`. No special characters needed if the sentence is long enough. That is not a
shortcut: length contributes far more entropy than sprinkling `!@#` into a short password.

> **There is no recovery.** The password is not stored anywhere, not even as a hash. Forget it and every saved
> account is gone. Keep it in a password manager, and keep the backup codes each service gives you when you
> enable 2FA.

### Move your whole list over from Google Authenticator

This is the fastest path; a single QR image can carry a dozen accounts:

1. Open the Google Authenticator app on your phone
2. Three-dot menu => **Transfer accounts** => **Export accounts**
3. Select the accounts to move and tap **Next**
4. Screenshot the QR code that appears
5. In the extension, click **+** and drag the image in (or paste it with `Ctrl+V`)
6. Tick the accounts you want, edit names if needed, click **Save to vault**

If the app shows several QR codes in a row, capture them all and select every image at once. The extension
counts the parts and tells you if any are still missing.

> That QR image contains every one of your secrets in readable form. **Delete it from your computer as soon as
> the import finishes.**

### Add accounts one at a time

- **From a normal QR:** click **+**, then drag or pick the QR image the service shows when you enable 2FA
- **By hand:** click **+**, switch to the **Manual entry** tab, paste the Base32 secret the service gave you
- **From a link:** copy the full `otpauth://totp/...` link and paste it into the import page with `Ctrl+V`

### Day to day

| Action | How |
| --- | --- |
| Copy a code | Click the digits directly, or the copy button |
| Find an account | Type in the search box at the top of the popup |
| Reorder | Click the sort button, then use the up and down arrows |
| Lock now | Click the padlock button on the right |
| Next HOTP code | Click the refresh button on that row |
| Delete an account | Click the trash button and confirm |

The ring on the left counts down the seconds left on the code. Codes turn amber with under 5 seconds to go.

### Turn on fingerprint unlock

Go to **Settings** (the gear, which opens inside the popup) => **Fingerprint unlock** => **Enable**. You need
Touch ID, Windows Hello or a security key that supports WebAuthn PRF. Enrolment itself opens a separate window,
because the operating system biometric prompt would otherwise close the popup mid-ceremony.

Once enabled, the unlock screen gains a biometric button. Your master password still works as the fallback, and
removing the fingerprint does not touch the password path.

### Switch language

Flag buttons sit on the unlock screen, at the bottom of the popup, at the top of the import page and in
Settings. One click switches immediately, no reload. The choice is remembered across every page of the
extension.

English is the default. English and Vietnamese are supported today.

### Settings worth adjusting

Clicking the gear opens settings inside the popup, not in another tab. The back arrow returns to your codes;
the padlock locks the vault straight away.

- **Auto-lock after:** 5 idle minutes by default. Set it to "Only when the browser closes" on a personal
  machine if the prompts annoy you. Only shown once a master password is on.
- **Clear the clipboard:** 20 seconds after copying a code by default. Set "Never clear" if you often copy
  other things in between.
- **Blur codes:** turn it on if you use the machine in public or share your screen a lot.
- **Master password:** turn it on or off at any time. Read the section below first.

### Turning off the master password (read this)

**Settings => Master password** has a button that removes the password layer completely. This is also the
default state of a fresh install. With no master password:

- The vault opens straight away with no prompt and no auto-lock. The Auto-lock, Fingerprint unlock and Change
  password sections disappear, because there is no password left to lock anything with.
- The data stays encrypted, but the decryption key sits inside the Chrome profile right next to it. In other
  words, anything that can read your Chrome profile can read your 2FA seeds. This is a convenience trade-off,
  not protection.
- Your old password and any enrolled fingerprint are removed. Turning it back on means setting a new password
  from scratch.

---

## How the security works

This section spells out what the extension does to protect your 2FA seeds, and is equally blunt about what it
does **not** protect against. The full threat model lives in [SECURITY.md](SECURITY.md) (Vietnamese).

### Encryption at rest

Every 2FA secret is encrypted with **AES-256-GCM** before it touches the disk. While the vault is locked, what
sits on your machine is meaningless noise.

- A fresh random 12-byte IV for **every write**, never reused with the same key
- A 128-bit authentication tag: flip one bit of ciphertext and decryption fails rather than returning garbage
- AAD binds each ciphertext to its schema and its purpose, which blocks moving a wrapped key from this vault
  into another slot, and blocks schema downgrades

### Key derivation

Keys are derived from the master password with **PBKDF2-HMAC-SHA256, 600,000 iterations** and a random 16-byte
salt, the level OWASP recommends. The master password is never stored, not even hashed, so there is no password
file to steal and no hash to crack offline.

The password is `normalize('NFKC')`-ed before derivation, so composed and precomposed diacritics produce the
same key.

### Two-tier key architecture

```text
master password ──PBKDF2-SHA256, 600k rounds──> KEK ──AES-GCM wrap──┐
                                                                     ├──> DEK ──AES-256-GCM──> vault
WebAuthn PRF ─────HKDF-SHA256─────────────────> BEK ──AES-GCM wrap──┘
```

The **DEK** is 32 random bytes that encrypt the whole account list. The **KEK** and **BEK** only ever wrap the
DEK; they never touch account data.

Two tiers for three concrete reasons:

1. Changing the password rewraps 32 bytes instead of re-encrypting the vault. There is no window where the
   data is half old and half new.
2. Fingerprint and password are **parallel** wraps of the same DEK. Adding or removing one leaves the other
   alone.
3. A fresh salt on every password change makes any precomputed table for the old password useless.

### Biometric unlock

Uses the WebAuthn `prf` extension. The authenticator returns 32 secret bytes that are stable for a given
(credential, salt) pair; those bytes go through HKDF-SHA256 into the key that wraps the DEK.

- The PRF secret never leaves the hardware in a form reproducible without biometric verification
- `userVerification: 'required'`, so touching the sensor is mandatory; plugging a device in is not enough
- No copy of the master password is stored anywhere

The ceremony runs in a separate window rather than the popup, because the operating system biometric dialog
takes focus, closes the popup and aborts the ceremony halfway.

### Key lifetime in memory

While unlocked, the DEK lives in `chrome.storage.session`: memory only, never written to disk, wiped when the
browser closes, and not readable by content scripts (this extension has none anyway).

That is a deliberate trade-off. A Manifest V3 service worker can be killed at any moment, so holding the key in
a global variable is pointless: users would retype their password every few minutes and would then pick a weak
one to cope.

### Auto-lock and cleanup

- With a master password on, the vault locks after the idle time you set and **always** locks when the browser
  closes
- Auto-lock runs on two layers: a deadline checked on every vault access, plus an alarm that wipes the key from
  memory on time even if nobody opens the popup
- Copied codes are overwritten in the clipboard after N seconds, scheduled by the service worker so it still
  happens after the popup is gone

### Brute-force protection

The first five wrong attempts cost nothing; from the sixth on you have to wait, and the wait doubles each time.
The counter is stored persistently, so restarting Chrome does not reset it, and it drops to zero on a
successful unlock:

| Wrong attempts | 1-5 | 6 | 7 | 8 | 9 | 10 | 11 | 12+ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Wait | 0 | 15s | 30s | 1 min | 2 min | 4 min | 8 min | doubling up to a 30 min cap |

During the wait, both the password field and the fingerprint button are disabled and the screen counts down in
place: blocking one path while leaving the other open would make the whole mechanism pointless.

There is deliberately **no** wipe-after-N-failures feature: without an encrypted backup export, that turns one
session of a child mashing the keyboard into permanent loss of every 2FA account.

### Attack surface removed

| Item | Status |
| --- | --- |
| Host permissions | None. The extension cannot read or write any website |
| Content scripts | None. No code is injected into any page |
| Network calls | None. The build **fails** if it finds `fetch`, `XMLHttpRequest`, `WebSocket` or `importScripts` in `src/` |
| Third-party libraries | None. Zero runtime dependencies, no supply chain surface |
| Sync | `chrome.storage.sync` is not used. Data never leaves the machine |
| CSP | `script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` |
| `innerHTML` / `eval` | Never used. DOM is built through helpers, user content always via `textContent` |
| Account IDs | `crypto.randomUUID()`, not `Math.random()` |

The extension requests exactly four permissions, each justified in [SECURITY.md](SECURITY.md): `storage`,
`alarms`, `offscreen`, `clipboardWrite`. None of them allows reading the pages you browse.

### What it does NOT protect against

Stated plainly so you can decide for yourself:

1. **Malware running as you while the vault is unlocked.** Whoever can read the memory can take the key. No
   in-browser software can prevent that.
2. **Keyloggers** capturing your master password as you type it.
3. **A weak master password.** 600k PBKDF2 rounds make cracking slow, not impossible.
4. **Phishing.** The extension cannot tell whether you are typing the code into the real site or a fake one.
5. **The exported QR image still sitting on your disk.** It contains every secret in readable form.

Compared to a phone authenticator: a phone adds a hardware secure enclave and OS-level sandboxing, neither of
which this extension has. What it does have: real encryption at rest, no network, no dependencies, and source
open enough for anyone to verify.

---

## Source layout

```text
src/                    the extension itself (load unpacked / zip this folder)
  manifest.json
  lib/                  pure modules, no DOM, testable with plain node
    base32.js           Base32 RFC 4648
    totp.js             HOTP RFC 4226 + TOTP RFC 6238
    crypto.js           PBKDF2, HKDF, AES-GCM, password strength
    vault.js            vault state, session key, account CRUD
    storage.js          chrome.storage wrapper
    otpauth.js          otpauth:// parsing
    protobuf.js         protobuf wire format reader
    migration.js        decodes the Google Authenticator export QR
    qr.js               QR reading via BarcodeDetector
    webauthn.js         PRF registration and assertion
    clipboard.js        copy with a scheduled wipe
    windows.js          opens a separate window anchored where the popup was
    version.js          running version, install type, update check
    release-notes.js    what-is-new content per release
    dom.js              DOM helpers (no API here accepts an HTML string)
    messages.js         message constants
    errors.js           AppError carrying a code instead of a sentence
    i18n.js             runtime translations + the flag switcher
    locales/            en.js and vi.js catalogues
  _locales/             name and description for the Chrome Web Store (en, vi)
  background/           service worker: auto-lock, clipboard cleanup
  offscreen/            offscreen document used only to overwrite the clipboard
  popup/                code list, search, reordering, settings panel
  unlock/               shared unlock view + the create-master-password page (own window, needed for WebAuthn)
  settings/             settings and what-is-new screens shared by the popup and the options page
  import/               QR scanning and the review step before saving
  options/              full-size shell for the settings screen (where fingerprint enrolment can run)
scripts/
  build.mjs             checks + zip packaging
  release.mjs           tag + GitHub release
  publish.mjs           ships a new version to the Chrome Web Store API
store/                  Chrome Web Store listing copy (English and Vietnamese)
  images/               1280x800 screenshots for the store
tools/screenshots/      harness that fakes chrome.* so screenshots can be retaken when the UI changes
brand/                  source logo and padlock badge in vector form (not shipped in the extension)
tests/                  node --test, no dependencies

CONTRIBUTING.md         constraints and contribution process
SECURITY.md             full threat model
PRIVACY.md              privacy policy
RELEASING.md            release process (maintainers only)
CHANGELOG.md            what changed in each release
```

---

## Development

```bash
npm test                  # 60 tests, including the official RFC 6238 / RFC 4226 / RFC 4648 vectors
npm run build             # checks, then packages dist/m2-authenticator-<version>.zip + dist/unpacked/
npm run screenshots       # builds the harness used to retake store screenshots
npm run release:github    # tag + GitHub release with the zip attached
npm run publish:store     # ship to the Chrome Web Store through the API
```

`npm run build` is a gate. It fails if:

- the version in `src/manifest.json` and `package.json` disagree
- the manifest requests a permission outside the allow-list
- a host permission or content script appears
- any `.js` file under `src/` contains a network call
- the two translation catalogues drift apart, or HTML/JS uses a translation key that does not exist

Both release scripts need configuration: copy `.env.example` to `.env` and fill it in following
[RELEASING.md](RELEASING.md). `.env` is in `.gitignore`, **never commit it**.

---

## Contributing

Very welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request: a few constraints are hard
and non-negotiable (no dependencies, no network, no `innerHTML`) because this application holds 2FA seeds.

If you find a security bug, follow the reporting section in [SECURITY.md](SECURITY.md) rather than opening a
public issue with exploit details.

---

## Status

The current release is **1.3.0**, live on the Chrome Web Store. The algorithmic core (TOTP/HOTP, Base32,
protobuf, AES-GCM, PBKDF2, HKDF) and the brute-force policy are covered by 60 automated tests, including the
official RFC 6238, RFC 4226 and RFC 4648 vectors, plus tests that keep the two translation catalogues in sync.

Known gaps, and they are known:

- **No encrypted backup export or import yet.** Forget the master password and every account is gone with no
  way back. That is also why there is no wipe-after-N-failures feature. Top priority for the next release.
- **No independent security audit.** Open source compensates somewhat, but it is not a substitute for an audit.
- **English and Vietnamese only.** Adding a language means one file in `src/lib/locales/`, see CONTRIBUTING.

---

## License

[MIT](LICENSE). Fork it freely, use it personally or commercially, just keep the copyright notice.
