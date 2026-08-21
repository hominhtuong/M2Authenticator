export const en = {
    // ---------------------------------------------------------------- chung
    'lang.name': 'English',
    'lang.switchTo': 'Switch to {language}',

    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.unknownAccount': 'Untitled',
    'common.workingOn': 'Working...',

    // ---------------------------------------------------------------- popup


    'popup.search': 'Search accounts...',
    'popup.action.add': 'Add account',
    'popup.action.sort': 'Reorder',
    'popup.action.settings': 'Settings',
    'popup.action.lock': 'Lock now',

    'popup.empty.title': 'No accounts yet',
    'popup.empty.text':
        'Bring your whole list over at once with the "Transfer accounts" QR from Google Authenticator.',
    'popup.empty.action': 'Add account',
    'popup.noMatch': 'No accounts match your search.',

    'popup.entry.copyHint': 'Click to copy',
    'popup.entry.copy': 'Copy code',
    'popup.entry.delete': 'Delete',
    'popup.entry.moveUp': 'Move up',
    'popup.entry.moveDown': 'Move down',
    'popup.entry.nextCode': 'Generate next code',
    'popup.entry.hotpCounter': 'HOTP · counter {counter}',
    'popup.entry.brokenSecret': 'Bad secret',

    'popup.sort.on': 'Reorder mode on',
    'popup.sort.off': 'Order saved',

    'popup.copy.failed': 'Could not copy to the clipboard.',
    'popup.copy.done': 'Copied.',
    'popup.copy.doneWithClear': 'Copied. The clipboard clears in {seconds}s.',

    'popup.delete.title': 'Delete this account?',
    'popup.delete.message':
        '"{label}" will be gone for good. If you have not turned 2FA off at that service first, you will be locked out of it.',
    'popup.delete.done': 'Account deleted.',

    // --------------------------------------------------------------- unlock
    'unlock.setup.title': 'Create a master password',
    'unlock.setup.lead':
        'Your master password encrypts every 2FA code with AES-256-GCM. Without it, the data on this computer is meaningless noise.',
    'unlock.setup.password': 'Master password',
    'unlock.setup.passwordHint':
        'Easy to remember and still strong: one long sentence of 16 characters or more, for example "the quick brown fox jumps 2026". No special characters needed if the sentence is long enough.',
    'unlock.setup.confirm': 'Repeat master password',
    'unlock.setup.warning':
        'This password is not stored anywhere and there is no way to recover it. Forget it and every saved 2FA code is gone.',
    'unlock.setup.ack': 'I understand, and I have memorised it or saved it somewhere safe.',
    'unlock.setup.action': 'Create vault',
    'unlock.setup.working': 'Deriving key...',
    'unlock.setup.mismatch': 'The two passwords do not match.',
    'unlock.setup.exists': 'A vault already exists and cannot be created again.',

    'unlock.title': 'Unlock vault',
    'unlock.lead': 'Enter your master password to decrypt your 2FA codes.',
    'unlock.password': 'Master password',
    'unlock.action': 'Unlock',
    'unlock.working': 'Unlocking...',
    'unlock.biometric': 'Unlock with fingerprint',
    'unlock.footnote': 'The vault re-locks itself after the idle period you set in Settings.',

    'unlock.scan.title': 'Waiting for your fingerprint',
    'unlock.scan.hint': 'Touch the sensor to open the vault. This view waits until you finish or cancel.',
    'unlock.scan.usePassword': 'Use master password instead',
    'unlock.lockout': 'Too many wrong attempts. Try again in {time}.',
    'unlock.wait.seconds': '{seconds}s',
    'unlock.wait.minutes': '{minutes}m {seconds}s',

    'password.strength': 'Strength: {label}',
    'password.strength.0': 'Very weak',
    'password.strength.1': 'Weak',
    'password.strength.2': 'Fair',
    'password.strength.3': 'Good',
    'password.strength.4': 'Strong',
    'password.strength.5': 'Very strong',
    'password.tooShort': 'Use at least {min} characters.',
    'password.needMix':
        'Under {length} characters you need at least 3 of: lowercase, uppercase, digits, symbols. Or simpler: use one long sentence.',
    'password.tooFewUnique': 'Too few distinct characters.',
    'password.repeated': 'Do not repeat the same chunk over and over.',
    'password.blocklisted': 'This password is among the first ones an attacker tries.',

    // --------------------------------------------------------------- import
    'import.title': 'Add account',
    'import.lead':
        'Bring your whole list over with one "Transfer accounts" QR from Google Authenticator, or add accounts one at a time from a normal QR or by hand.',
    'import.locked': 'The vault is locked. Unlock it from the extension icon, then come back to this page.',

    'import.tab.qr': 'From a QR image',
    'import.tab.manual': 'Manual entry',

    'import.drop.title': 'Drag a QR image here',
    'import.drop.hint': 'or click to pick an image, or paste one with Ctrl+V',

    'import.howto.summary': 'How to get a QR holding every account from Google Authenticator',
    'import.howto.step1': 'Open the Google Authenticator app on your phone.',
    'import.howto.step2': 'Tap the three-dot menu => "Transfer accounts" => "Export accounts".',
    'import.howto.step3': 'Pick the accounts you want to move, then tap "Next".',
    'import.howto.step4': 'Screenshot the QR code that appears and drop the image into the box above.',
    'import.howto.step5': 'If the app shows several QR codes in a row, capture them all and select every image at once.',
    'import.howto.warning':
        'That QR image contains every one of your 2FA secrets in readable form. Delete it from your computer as soon as the import finishes.',

    'import.manual.issuer': 'Service (issuer)',
    'import.manual.issuerPlaceholder': 'GitHub',
    'import.manual.account': 'Account',
    'import.manual.accountPlaceholder': 'you@email.com',
    'import.manual.secret': 'Secret (Base32)',
    'import.manual.secretHint':
        'Paste the string the service gave you. Spaces and dashes are stripped automatically.',
    'import.manual.algorithm': 'Algorithm',
    'import.manual.digits': 'Digits',
    'import.manual.period': 'Period (seconds)',
    'import.manual.submit': 'Add account',
    'import.manual.needName': 'Fill in at least a service name or an account name.',
    'import.manual.added': 'Added {label}.',

    'import.review.title': 'Review {count} accounts',
    'import.review.titleIdle': 'Review before saving',
    'import.review.selectAll': 'Select all',
    'import.review.selectNone': 'Select none',
    'import.review.issuerPlaceholder': 'Service',
    'import.review.accountPlaceholder': 'Account',
    'import.review.badgeDuplicate': 'already added',
    'import.review.summary': 'Selected {selected} of {total}',
    'import.review.summaryDuplicates': '{count} already exist so they start unticked',
    'import.review.save': 'Save to vault',
    'import.review.saving': 'Saving...',

    'import.reading': 'Reading {count} images...',
    'import.readingPasted': 'Reading pasted image...',
    'import.needImage': 'Please choose an image file containing a QR code.',
    'import.noneFound': 'No accounts found in the image.',
    'import.noneInPasted': 'No QR code found in the pasted image.',
    'import.readCount': 'Read {count} accounts.',
    'import.readErrors': '{count} images could not be read: {names}.',
    'import.failed': 'Nothing imported: {details}',
    'import.batchMissing':
        'This export is made of {size} QR codes and you have imported {seen}. {missing} still missing (batch {id}).',
    'import.batchComplete': 'All {size} QR codes of this export have been imported.',
    'import.saved': 'Saved {count} accounts to the encrypted vault.',
    'import.savedSkipped': '{count} accounts already existed and were skipped.',
    'import.savedFailed': '{count} accounts failed: {reason}',

    // -------------------------------------------------------------- options
    'options.title': 'Settings',
    'options.lead': 'Everything stays on your machine. This extension never sends anything anywhere.',
    'options.locked':
        'The vault is locked. Unlock it from the extension icon, then reload this page to change security settings.',

    'options.language.title': 'Language',
    'options.language.lead': 'Applies to the whole extension and takes effect immediately.',

    'options.protection.title': 'Master password',
    'options.protection.lead':
        'A master password is what turns your saved secrets into unreadable data on disk. Without one the vault opens by itself, which is convenient, but then anything able to read this browser profile can read your codes.',
    'options.protection.on': 'On. The vault stays encrypted until you type your master password.',
    'options.protection.off': 'Off. The vault opens by itself, with no password and no lock.',
    'options.protection.disable': 'Turn off master password',
    'options.protection.disableTitle': 'Turn off the master password?',
    'options.protection.disableMessage':
        'Your codes will open with no password, and the key that decrypts them sits next to the data in this browser profile. Auto-lock, fingerprint unlock and your current password are removed. Turning it back on means setting a new password from scratch.',
    'options.protection.disableAction': 'Turn it off',
    'options.protection.disabled': 'Master password turned off.',
    'options.protection.needUnlock': 'Unlock the vault first to change this.',
    'options.protection.enable': 'Turn on master password',
    'options.protection.enableLead':
        'Pick a master password. It encrypts the key to your vault and is never stored anywhere, so there is no way to recover it if you forget it.',
    'options.protection.newPassword': 'New master password',
    'options.protection.confirm': 'Repeat new master password',
    'options.protection.submit': 'Turn on and rewrap the key',
    'options.protection.working': 'Deriving key...',
    'options.protection.enabled': 'Master password is on again.',
    'options.protection.mismatch': 'The two passwords do not match.',
    'options.protection.hiddenNote':
        'Auto-lock, fingerprint unlock and change password are hidden because there is no master password to lock anything with.',

    'options.lock.title': 'Auto-lock',
    'options.lock.lead':
        'The vault always locks when you close the browser. The setting below is how long it waits while idle before locking sooner.',
    'options.lock.after': 'Lock after',
    'options.lock.1': '1 minute',
    'options.lock.5': '5 minutes',
    'options.lock.15': '15 minutes',
    'options.lock.30': '30 minutes',
    'options.lock.60': '1 hour',
    'options.lock.0': 'Only when the browser closes',
    'options.lock.saved': 'Auto-lock setting saved.',

    'options.display.title': 'Codes and clipboard',
    'options.display.lead': 'Applies whether or not the vault has a master password.',

    'options.clipboard.label': 'Clear the clipboard after copying a code',
    'options.clipboard.hint':
        'A one-time code left in the clipboard can be read by any site you paste into by mistake.',
    'options.clipboard.10': '10 seconds',
    'options.clipboard.20': '20 seconds',
    'options.clipboard.60': '60 seconds',
    'options.clipboard.0': 'Never clear',
    'options.clipboard.saved': 'Clipboard setting saved.',

    'options.hideCodes': 'Blur codes until I hover over them (shoulder-surfing protection)',
    'options.saved': 'Saved.',

    'options.biometric.title': 'Fingerprint unlock',
    'options.biometric.lead':
        'Use Touch ID, Windows Hello or a security key to open the vault without typing your master password. The key stays protected by your operating system biometrics, and no copy of your password is stored.',
    'options.biometric.on': 'Enabled. You can open the vault with biometrics instead of your master password.',
    'options.biometric.unavailable':
        'This device has no biometric sensor available to the browser. Keep using your master password.',
    'options.biometric.needUnlock': 'Unlock the vault first, then you can enable fingerprint unlock.',
    'options.biometric.off': 'Not enabled.',
    'options.biometric.enable': 'Enable fingerprint unlock',
    'options.biometric.enabling': 'Waiting for verification...',
    'options.biometric.enabled': 'Fingerprint unlock is on.',
    'options.biometric.remove': 'Remove fingerprint',
    'options.biometric.removeTitle': 'Remove fingerprint unlock?',
    'options.biometric.removeMessage':
        'After this you can only open the vault with your master password. Make sure you still remember it.',
    'options.biometric.removed': 'Fingerprint removed.',

    'options.password.title': 'Change master password',
    'options.password.lead':
        'Changing your password only rewraps the data key, it does not re-encrypt the vault, so it is fast and carries no risk of data loss.',
    'options.password.current': 'Current password',
    'options.password.next': 'New password',
    'options.password.confirm': 'Repeat new password',
    'options.password.submit': 'Change password',
    'options.password.working': 'Working...',
    'options.password.mismatch': 'The two new passwords do not match.',
    'options.password.changed': 'Master password changed.',

    'options.facts.title': 'How your data is protected',
    'options.facts.encryption': 'Encryption:',
    'options.facts.encryptionText': 'AES-256-GCM with a fresh random IV for every write.',
    'options.facts.kdf': 'Key derivation:',
    'options.facts.kdfText': 'PBKDF2-HMAC-SHA256, 600,000 iterations, random 16-byte salt.',
    'options.facts.locked': 'While locked:',
    'options.facts.lockedText': 'only ciphertext on disk. No readable copy of any secret exists.',
    'options.facts.unlocked': 'While unlocked:',
    'options.facts.unlockedText':
        'the data key lives in the browser session memory and disappears when the browser closes.',
    'options.facts.network': 'Network:',
    'options.facts.networkText': 'the extension cannot reach any website and makes no network calls.',
    'options.facts.sync': 'Sync:',
    'options.facts.syncText': 'chrome.storage.sync is not used, so data never leaves this machine.',

    'options.destroy.title': 'Delete everything',
    'options.destroy.lead':
        'Deletes the vault and every account in it. There is no backup and no way to recover. Make sure you have another way to sign in to the services using 2FA.',
    'options.destroy.action': 'Delete vault permanently',
    'options.destroy.confirm1Title': 'Delete the whole vault?',
    'options.destroy.confirm1Message':
        'Every 2FA account will be lost for good. There is no backup to restore from.',
    'options.destroy.confirm1Action': 'Continue',
    'options.destroy.confirm2Title': 'Are you sure?',
    'options.destroy.confirm2Message':
        'If you have not turned off 2FA or saved the recovery codes for the services you use, you will be locked out of your own accounts.',
    'options.destroy.confirm2Action': 'Delete permanently',
    'options.destroy.done': 'Vault deleted.',

    // ---------------------------------------------------------------- lỗi
    'error.unknown': 'Something went wrong.',

    'error.base32Empty': 'The secret is empty.',
    'error.base32Invalid': 'Invalid Base32 secret (character "{char}").',
    'error.base32TooShort': 'The Base32 secret is too short.',

    'error.algorithmUnsupported': 'Unsupported algorithm: {algorithm}',
    'error.digitsRange': 'Digit count must be between 6 and 10.',
    'error.periodPositive': 'The period must be greater than 0.',
    'error.periodRange': 'The period must be between 1 and 300 seconds.',

    'error.otpNotOtpauth': 'This is not a 2FA QR code (otpauth://).',
    'error.otpBadUri': 'The otpauth link in the QR code is malformed.',
    'error.otpTypeUnsupported': 'Unsupported OTP type: {type}',
    'error.otpNoSecret': 'The QR code contains no secret.',
    'error.otpSecretNotBase32': 'The secret in the QR code is not valid Base32.',
    'error.otpDigitsInvalid': 'The digit count in the QR code is invalid.',
    'error.otpPeriodInvalid': 'The period in the QR code is invalid.',

    'error.migrationNotMigrationUri': 'This is not a Google Authenticator transfer QR code.',
    'error.migrationBadUri': 'The migration link in the QR code is malformed.',
    'error.migrationNoData': 'The migration QR code has no data parameter.',
    'error.migrationBadBase64': 'The data in the migration QR code could not be decoded (broken base64).',
    'error.migrationNoAccounts': 'The migration QR code contains no accounts.',
    'error.migrationEntryNoSecret': 'One entry in the QR code has no secret.',
    'error.migrationAlgorithmUnsupported':
        'Unsupported algorithm in the QR code (id {id}). MD5 is not usable for 2FA.',

    'error.protobufTruncatedVarint': 'Malformed protobuf: truncated varint.',
    'error.protobufVarintTooLong': 'Malformed protobuf: varint too long.',
    'error.protobufTruncated': 'Malformed protobuf: truncated data.',
    'error.protobufOverrun': 'Malformed protobuf: length-delimited field runs past the data.',
    'error.protobufBadFieldNumber': 'Malformed protobuf: field number 0 is not valid.',
    'error.protobufBadWireType': 'Malformed protobuf: unsupported wire type {wireType}.',

    'error.qrNoDetector': 'Your browser cannot read QR codes yet (BarcodeDetector). Please update to a newer version.',
    'error.qrCannotOpenImage': 'The image could not be opened. The format may be unsupported.',
    'error.qrNotFound': 'No QR code found in the image.',

    'error.vaultLocked': 'The vault is locked.',
    'error.vaultNeedUnlockForBiometric': 'Unlock the vault before enrolling a fingerprint.',
    'error.vaultNotInitialized': 'No vault exists yet. Create a master password first.',
    'error.vaultAlreadyExists': 'The vault has already been created.',
    'error.vaultNoAccounts': 'No vault found. Create a master password first.',
    'error.accountNotFound': 'Account not found.',
    'error.notHotp': 'This is not an HOTP account.',
    'error.accountDuplicate': 'This account is already in your list.',

    'error.wrongPassword': 'Wrong master password. {attempts} failed attempts so far.',
    'error.wrongCurrentPassword': 'The current master password is not correct.',
    'error.tooManyAttempts': 'Too many wrong attempts. Try again in {seconds} seconds.',

    'error.protectionOff': 'This vault has no master password. Open it straight from the extension icon.',
    'error.protectionAlreadyOn': 'The master password is already on.',
    'error.vaultNeedUnlockForProtection': 'Unlock the vault before changing the master password setting.',

    'error.biometricNotEnrolled': 'Fingerprint unlock has not been set up.',
    'error.biometricBadRecord': 'The fingerprint enrolment data is invalid.',
    'error.biometricUnlockFailed': 'Could not unlock with your fingerprint. Use your master password.',
    'error.biometricUnavailable': 'This device has no fingerprint or Windows Hello sensor available.',
    'error.biometricPrfUnsupported':
        'This device or browser does not support WebAuthn PRF, so fingerprint unlock is not available yet. Please keep using your master password.',
    'error.biometricNoPrfResult': 'The authenticator returned no PRF data. Please use your master password.',
    'error.biometricCancelled': 'You cancelled the biometric prompt, or it timed out.',
    'error.biometricAlreadyRegistered': 'This device is already enrolled.',
    'error.biometricNotSupported': 'Your browser or device does not support this kind of authentication.',
    'error.biometricInsecureContext': 'This context is not secure enough to use WebAuthn.',
    'error.biometricRegistrationCancelled': 'Fingerprint enrolment was cancelled.',
};
