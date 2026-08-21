export const vi = {
    // ---------------------------------------------------------------- chung
    'lang.name': 'Tiếng Việt',
    'lang.switchTo': 'Chuyển sang {language}',

    'common.cancel': 'Huỷ',
    'common.delete': 'Xoá',
    'common.save': 'Lưu',
    'common.unknownAccount': 'Không tên',
    'common.workingOn': 'Đang xử lý...',

    // ---------------------------------------------------------------- popup
    'popup.setup.lead':
        'Tạo master password để bắt đầu. Toàn bộ mã 2FA sẽ được mã hoá bằng khoá dẫn xuất từ mật khẩu này.',
    'popup.setup.action': 'Thiết lập ngay',


    'popup.search': 'Tìm account...',
    'popup.action.add': 'Thêm account',
    'popup.action.sort': 'Sắp xếp',
    'popup.action.settings': 'Cài đặt',
    'popup.action.back': 'Quay lại danh sách mã',
    'popup.action.lock': 'Khoá lại',

    'popup.empty.title': 'Chưa có account nào',
    'popup.empty.text':
        'Nhập một lần cả danh sách bằng QR "Chuyển tài khoản" của Google Authenticator.',
    'popup.empty.action': 'Thêm account',
    'popup.noMatch': 'Không có account nào khớp.',

    'popup.entry.copyHint': 'Bấm để copy',
    'popup.entry.copy': 'Copy mã',
    'popup.entry.delete': 'Xoá',
    'popup.entry.moveUp': 'Lên',
    'popup.entry.moveDown': 'Xuống',
    'popup.entry.nextCode': 'Sinh mã tiếp theo',
    'popup.entry.hotpCounter': 'HOTP · counter {counter}',
    'popup.entry.brokenSecret': 'Secret lỗi',

    'popup.sort.on': 'Chế độ sắp xếp: bật',
    'popup.sort.off': 'Đã lưu thứ tự',

    'popup.copy.failed': 'Không copy được vào clipboard.',
    'popup.copy.done': 'Đã copy mã.',
    'popup.copy.doneWithClear': 'Đã copy. Clipboard tự xoá sau {seconds}s.',

    'popup.delete.title': 'Xoá account?',
    'popup.delete.message':
        '"{label}" sẽ bị xoá vĩnh viễn. Nếu chưa tắt 2FA ở dịch vụ đó, bạn sẽ mất quyền đăng nhập.',
    'popup.delete.done': 'Đã xoá account.',

    // --------------------------------------------------------------- unlock
    'unlock.setup.title': 'Tạo master password',
    'unlock.setup.lead':
        'Master password dùng để mã hoá toàn bộ mã 2FA bằng AES-256-GCM. Không có nó, dữ liệu trên máy chỉ là chuỗi vô nghĩa.',
    'unlock.setup.password': 'Master password',
    'unlock.setup.passwordHint':
        'Cách dễ nhớ mà vẫn mạnh: một câu dài từ 16 ký tự trở lên, ví dụ "con mèo trèo cây cau 2026". Không cần ký tự đặc biệt nếu câu đủ dài.',
    'unlock.setup.confirm': 'Nhập lại master password',
    'unlock.setup.warning':
        'Mật khẩu này không được lưu ở bất cứ đâu và không có cách khôi phục. Quên là mất toàn bộ mã 2FA đã lưu.',
    'unlock.setup.ack': 'Tôi hiểu và đã ghi nhớ hoặc lưu mật khẩu ở nơi an toàn.',
    'unlock.setup.action': 'Tạo vault',
    'unlock.setup.working': 'Đang tạo khoá...',
    'unlock.setup.mismatch': 'Hai lần nhập mật khẩu không khớp.',
    'unlock.setup.exists': 'Vault đã tồn tại, không tạo lại được.',

    'unlock.title': 'Mở khoá vault',
    'unlock.lead': 'Nhập master password để giải mã danh sách mã 2FA.',
    'unlock.password': 'Master password',
    'unlock.action': 'Mở khoá',
    'unlock.working': 'Đang mở khoá...',
    'unlock.biometric': 'Mở khoá bằng vân tay',
    'unlock.footnote': 'Vault tự khoá lại theo thời gian rảnh bạn đặt trong Cài đặt.',

    'unlock.scan.title': 'Đang chờ vân tay',
    'unlock.scan.hint': 'Chạm cảm biến để mở vault. Khung này chờ tới khi bạn xong hoặc bấm huỷ.',
    'unlock.scan.usePassword': 'Dùng master password',
    'unlock.lockout': 'Sai quá nhiều lần. Thử lại sau {time}.',
    'unlock.wait.seconds': '{seconds} giây',
    'unlock.wait.minutes': '{minutes} phút {seconds} giây',

    'password.strength': 'Độ mạnh: {label}',
    'password.strength.0': 'Rất yếu',
    'password.strength.1': 'Yếu',
    'password.strength.2': 'Trung bình',
    'password.strength.3': 'Khá',
    'password.strength.4': 'Mạnh',
    'password.strength.5': 'Rất mạnh',
    'password.tooShort': 'Cần ít nhất {min} ký tự.',
    'password.needMix':
        'Dưới {length} ký tự thì cần trộn ít nhất 3 nhóm: chữ thường, chữ hoa, số, ký tự đặc biệt. Hoặc đơn giản hơn: dùng một câu dài dễ nhớ.',
    'password.tooFewUnique': 'Quá ít ký tự khác nhau.',
    'password.repeated': 'Không dùng một đoạn lặp đi lặp lại.',
    'password.blocklisted': 'Mật khẩu này nằm trong danh sách bị dò đầu tiên.',

    // --------------------------------------------------------------- import
    'import.title': 'Thêm account',
    'import.lead':
        'Nhập cả danh sách bằng một ảnh QR "Chuyển tài khoản" của Google Authenticator, hoặc thêm từng cái bằng QR thường / nhập tay.',
    'import.locked': 'Vault đang khoá. Hãy mở khoá từ biểu tượng extension rồi quay lại trang này.',

    'import.tab.qr': 'Từ ảnh QR',
    'import.tab.manual': 'Nhập tay',

    'import.drop.title': 'Kéo thả ảnh QR vào đây',
    'import.drop.hint': 'hoặc bấm để chọn ảnh, hoặc dán ảnh bằng Ctrl+V',

    'import.howto.summary': 'Cách lấy QR chứa toàn bộ account từ Google Authenticator',
    'import.howto.step1': 'Mở app Google Authenticator trên điện thoại.',
    'import.howto.step2': 'Bấm menu ba chấm => "Chuyển tài khoản" => "Xuất tài khoản".',
    'import.howto.step3': 'Chọn các account cần chuyển rồi bấm "Tiếp theo".',
    'import.howto.step4': 'Chụp màn hình QR hiện ra và đưa file ảnh vào ô trên.',
    'import.howto.step5': 'Nếu app hiện nhiều QR liên tiếp, chụp hết và chọn tất cả ảnh cùng lúc.',
    'import.howto.warning':
        'Ảnh QR này chứa toàn bộ secret 2FA ở dạng đọc được. Xoá ảnh khỏi máy ngay sau khi nhập xong.',

    'import.manual.issuer': 'Dịch vụ (issuer)',
    'import.manual.issuerPlaceholder': 'GitHub',
    'import.manual.account': 'Tài khoản',
    'import.manual.accountPlaceholder': 'ten@email.com',
    'import.manual.secret': 'Secret (Base32)',
    'import.manual.secretHint':
        'Dán nguyên chuỗi dịch vụ đưa cho bạn. Khoảng trắng và gạch nối tự bỏ.',
    'import.manual.algorithm': 'Thuật toán',
    'import.manual.digits': 'Số chữ số',
    'import.manual.period': 'Chu kỳ (giây)',
    'import.manual.submit': 'Thêm account',
    'import.manual.needName': 'Hãy điền ít nhất tên dịch vụ hoặc tên tài khoản.',
    'import.manual.added': 'Đã thêm {label}.',

    'import.review.title': 'Xem lại {count} account',
    'import.review.titleIdle': 'Xem lại trước khi lưu',
    'import.review.selectAll': 'Chọn tất cả',
    'import.review.selectNone': 'Bỏ chọn',
    'import.review.issuerPlaceholder': 'Dịch vụ',
    'import.review.accountPlaceholder': 'Tài khoản',
    'import.review.badgeDuplicate': 'đã có',
    'import.review.summary': 'Đã chọn {selected}/{total}',
    'import.review.summaryDuplicates': '{count} account đã có sẵn nên bỏ chọn mặc định',
    'import.review.save': 'Lưu vào vault',
    'import.review.saving': 'Đang lưu...',

    'import.reading': 'Đang đọc {count} ảnh...',
    'import.readingPasted': 'Đang đọc ảnh vừa dán...',
    'import.needImage': 'Hãy chọn file ảnh chứa mã QR.',
    'import.noneFound': 'Không tìm thấy account nào trong ảnh.',
    'import.noneInPasted': 'Không tìm thấy mã QR trong ảnh vừa dán.',
    'import.readCount': 'Đọc được {count} account.',
    'import.readErrors': '{count} ảnh không đọc được: {names}.',
    'import.failed': 'Không nhập được: {details}',
    'import.batchMissing':
        'Lần xuất này gồm {size} mã QR, bạn mới nhập {seen}. Còn thiếu {missing} mã (batch {id}).',
    'import.batchComplete': 'Đã nhập đủ {size} mã QR của lần xuất này.',
    'import.saved': 'Đã lưu {count} account vào vault mã hoá.',
    'import.savedSkipped': '{count} account đã có sẵn nên bỏ qua.',
    'import.savedFailed': '{count} account lỗi: {reason}',

    // -------------------------------------------------------------- options
    'options.title': 'Cài đặt',
    'options.lead': 'Mọi dữ liệu nằm trên máy bạn. Extension không gửi bất cứ thứ gì ra ngoài.',
    'options.welcome':
        'Vault đã được tạo. Nên bật thêm mở khoá bằng vân tay ở mục bên dưới để đỡ phải gõ mật khẩu mỗi lần.',
    'options.locked':
        'Vault đang khoá. Mở khoá từ biểu tượng extension rồi tải lại trang này để đổi cài đặt bảo mật.',

    'options.language.title': 'Ngôn ngữ',
    'options.language.lead': 'Áp dụng cho toàn bộ extension và có hiệu lực ngay.',

    'options.protection.title': 'Master password',
    'options.protection.lead': 
        'Master password là thứ biến seed đã lưu thành dữ liệu không đọc được trên đĩa. Bạn có thể tắt cho tiện, nhưng khi đó bất cứ thứ gì đọc được profile Chrome này đều đọc được mã của bạn.',
    'options.protection.on': 'Đang bật. Vault chỉ mở khi bạn nhập master password.',
    'options.protection.off': 'Đang tắt. Vault tự mở, không cần mật khẩu và không có khoá.',
    'options.protection.disable': 'Tắt master password',
    'options.protection.disableTitle': 'Tắt master password?',
    'options.protection.disableMessage': 
        'Mã 2FA sẽ mở ra mà không cần mật khẩu, và khoá giải mã nằm ngay cạnh dữ liệu trong profile Chrome này. Auto-lock, mở khoá bằng vân tay và mật khẩu hiện tại đều bị gỡ. Bật lại là phải đặt mật khẩu mới từ đầu.',
    'options.protection.disableAction': 'Tắt đi',
    'options.protection.disabled': 'Đã tắt master password.',
    'options.protection.needUnlock': 'Mở khoá vault trước rồi mới đổi được mục này.',
    'options.protection.enable': 'Bật lại master password',
    'options.protection.enableLead': 'Đặt mật khẩu mới. Mật khẩu cũ đã bị gỡ lúc bạn tắt tính năng này.',
    'options.protection.newPassword': 'Master password mới',
    'options.protection.confirm': 'Nhập lại master password mới',
    'options.protection.submit': 'Bật và bọc lại khoá',
    'options.protection.working': 'Đang dẫn xuất khoá...',
    'options.protection.enabled': 'Đã bật lại master password.',
    'options.protection.mismatch': 'Hai mật khẩu không khớp.',
    'options.protection.hiddenNote': 
        'Auto-lock, mở khoá bằng vân tay và đổi mật khẩu đang ẩn vì không còn master password nào để khoá.',

    'options.lock.title': 'Khoá tự động',
    'options.lock.lead':
        'Vault luôn tự khoá khi bạn đóng Chrome. Mốc dưới đây là thời gian rảnh trước khi khoá sớm hơn.',
    'options.lock.after': 'Tự khoá sau',
    'options.lock.1': '1 phút',
    'options.lock.5': '5 phút',
    'options.lock.15': '15 phút',
    'options.lock.30': '30 phút',
    'options.lock.60': '1 giờ',
    'options.lock.0': 'Chỉ khi đóng Chrome',
    'options.lock.saved': 'Đã lưu mốc tự khoá.',

    'options.display.title': 'Hiển thị và clipboard',
    'options.display.lead': 'Áp dụng bất kể vault có master password hay không.',

    'options.clipboard.label': 'Tự xoá clipboard sau khi copy mã',
    'options.clipboard.hint':
        'Mã OTP nằm lại trong clipboard có thể bị trang web khác đọc khi bạn dán nhầm chỗ.',
    'options.clipboard.10': '10 giây',
    'options.clipboard.20': '20 giây',
    'options.clipboard.60': '60 giây',
    'options.clipboard.0': 'Không tự xoá',
    'options.clipboard.saved': 'Đã lưu cài đặt clipboard.',

    'options.hideCodes': 'Làm mờ mã cho tới khi rê chuột vào (chống nhìn trộm màn hình)',
    'options.saved': 'Đã lưu.',

    'options.biometric.title': 'Mở khoá bằng vân tay',
    'options.biometric.lead':
        'Dùng Touch ID, Windows Hello hoặc khoá bảo mật để mở vault mà không cần gõ master password. Khoá vẫn được bảo vệ bằng sinh trắc của hệ điều hành, không có bản sao mật khẩu nào được lưu.',
    'options.biometric.on': 'Đang bật. Bạn có thể mở vault bằng sinh trắc thay cho master password.',
    'options.biometric.unavailable':
        'Thiết bị này không có cảm biến sinh trắc khả dụng cho trình duyệt. Vẫn dùng master password bình thường.',
    'options.biometric.needUnlock': 'Hãy mở khoá vault trước, rồi mới bật được mở khoá bằng vân tay.',
    'options.biometric.off': 'Chưa bật.',
    'options.biometric.enable': 'Bật mở khoá bằng vân tay',
    'options.biometric.enabling': 'Đang chờ xác thực...',
    'options.biometric.enabled': 'Đã bật mở khoá bằng vân tay.',
    'options.biometric.remove': 'Gỡ vân tay',
    'options.biometric.removeTitle': 'Gỡ mở khoá bằng vân tay?',
    'options.biometric.removeMessage':
        'Sau khi gỡ, bạn chỉ mở được vault bằng master password. Hãy chắc chắn bạn còn nhớ nó.',
    'options.biometric.removed': 'Đã gỡ vân tay.',

    'options.password.title': 'Đổi master password',
    'options.password.lead':
        'Đổi mật khẩu chỉ bọc lại khoá dữ liệu, không mã hoá lại toàn bộ vault nên rất nhanh và không có rủi ro mất dữ liệu.',
    'options.password.current': 'Mật khẩu hiện tại',
    'options.password.next': 'Mật khẩu mới',
    'options.password.confirm': 'Nhập lại mật khẩu mới',
    'options.password.submit': 'Đổi mật khẩu',
    'options.password.working': 'Đang xử lý...',
    'options.password.mismatch': 'Hai lần nhập mật khẩu mới không khớp.',
    'options.password.changed': 'Đã đổi master password.',

    'options.facts.title': 'Cách dữ liệu được bảo vệ',
    'options.facts.encryption': 'Mã hoá:',
    'options.facts.encryptionText': 'AES-256-GCM, mỗi lần ghi dùng IV ngẫu nhiên riêng.',
    'options.facts.kdf': 'Dẫn xuất khoá:',
    'options.facts.kdfText': 'PBKDF2-HMAC-SHA256, 600.000 vòng, salt ngẫu nhiên 16 byte.',
    'options.facts.locked': 'Khi khoá:',
    'options.facts.lockedText': 'trên đĩa chỉ có ciphertext. Không có bản sao secret nào ở dạng đọc được.',
    'options.facts.unlocked': 'Khi mở khoá:',
    'options.facts.unlockedText':
        'khoá dữ liệu nằm trong bộ nhớ phiên của Chrome, tự mất khi đóng trình duyệt.',
    'options.facts.network': 'Mạng:',
    'options.facts.networkText': 'extension không có quyền truy cập bất kỳ website nào và không gọi mạng.',
    'options.facts.sync': 'Đồng bộ:',
    'options.facts.syncText': 'không dùng chrome.storage.sync, dữ liệu không rời khỏi máy này.',

    'options.destroy.title': 'Xoá toàn bộ dữ liệu',
    'options.destroy.lead':
        'Xoá vault và mọi account bên trong. Không có bản sao lưu, không khôi phục được. Hãy chắc chắn bạn còn cách khác để đăng nhập các dịch vụ đang bật 2FA.',
    'options.destroy.action': 'Xoá vault vĩnh viễn',
    'options.destroy.confirm1Title': 'Xoá toàn bộ vault?',
    'options.destroy.confirm1Message':
        'Tất cả account 2FA sẽ mất vĩnh viễn. Không có bản sao lưu nào để khôi phục.',
    'options.destroy.confirm1Action': 'Tiếp tục',
    'options.destroy.confirm2Title': 'Chắc chắn chưa?',
    'options.destroy.confirm2Message':
        'Nếu bạn chưa tắt 2FA hoặc chưa lưu mã dự phòng ở các dịch vụ đang dùng, bạn sẽ bị khoá ngoài tài khoản của mình.',
    'options.destroy.confirm2Action': 'Xoá vĩnh viễn',
    'options.destroy.done': 'Đã xoá vault.',

    // ---------------------------------------------------------------- lỗi
    'error.unknown': 'Có lỗi xảy ra.',

    'error.base32Empty': 'Secret rỗng.',
    'error.base32Invalid': 'Secret Base32 không hợp lệ (ký tự "{char}").',
    'error.base32TooShort': 'Secret Base32 quá ngắn.',

    'error.algorithmUnsupported': 'Thuật toán không hỗ trợ: {algorithm}',
    'error.digitsRange': 'Số chữ số phải nằm trong khoảng 6 đến 10.',
    'error.periodPositive': 'Chu kỳ phải lớn hơn 0.',
    'error.periodRange': 'Chu kỳ phải từ 1 đến 300 giây.',

    'error.otpNotOtpauth': 'Đây không phải QR 2FA (otpauth://).',
    'error.otpBadUri': 'Link otpauth trong QR không hợp lệ.',
    'error.otpTypeUnsupported': 'Loại OTP không hỗ trợ: {type}',
    'error.otpNoSecret': 'QR không chứa secret.',
    'error.otpSecretNotBase32': 'Secret trong QR không phải Base32 hợp lệ.',
    'error.otpDigitsInvalid': 'Số chữ số trong QR không hợp lệ.',
    'error.otpPeriodInvalid': 'Chu kỳ trong QR không hợp lệ.',

    'error.migrationNotMigrationUri': 'Đây không phải QR chuyển tài khoản của Google Authenticator.',
    'error.migrationBadUri': 'Link migration trong QR không hợp lệ.',
    'error.migrationNoData': 'QR migration thiếu tham số data.',
    'error.migrationBadBase64': 'Dữ liệu trong QR migration không giải mã được (base64 hỏng).',
    'error.migrationNoAccounts': 'QR migration không chứa account nào.',
    'error.migrationEntryNoSecret': 'Một mục trong QR không có secret.',
    'error.migrationAlgorithmUnsupported':
        'Thuật toán không hỗ trợ trong QR (mã {id}). MD5 không được dùng cho 2FA.',

    'error.protobufTruncatedVarint': 'Protobuf hỏng: varint bị cắt cụt.',
    'error.protobufVarintTooLong': 'Protobuf hỏng: varint quá dài.',
    'error.protobufTruncated': 'Protobuf hỏng: dữ liệu bị cắt cụt.',
    'error.protobufOverrun': 'Protobuf hỏng: trường length-delimited vượt quá dữ liệu.',
    'error.protobufBadFieldNumber': 'Protobuf hỏng: field number 0 không hợp lệ.',
    'error.protobufBadWireType': 'Protobuf hỏng: wire type {wireType} không hỗ trợ.',

    'error.qrNoDetector': 'Chrome của bạn chưa hỗ trợ đọc QR (BarcodeDetector). Hãy cập nhật Chrome.',
    'error.qrCannotOpenImage': 'Không mở được ảnh. Định dạng có thể không hợp lệ.',
    'error.qrNotFound': 'Không tìm thấy mã QR trong ảnh.',

    'error.vaultLocked': 'Vault đang khoá.',
    'error.vaultNeedUnlockForBiometric': 'Hãy mở khoá vault trước khi đăng ký vân tay.',
    'error.vaultNotInitialized': 'Chưa có vault nào. Hãy tạo master password trước.',
    'error.vaultAlreadyExists': 'Vault đã được tạo rồi.',
    'error.vaultNoAccounts': 'Chưa có vault. Hãy tạo master password trước.',
    'error.accountNotFound': 'Không tìm thấy account.',
    'error.notHotp': 'Không phải account HOTP.',
    'error.accountDuplicate': 'Account này đã có trong danh sách.',

    'error.wrongPassword': 'Master password không đúng. Đã sai {attempts} lần.',
    'error.wrongCurrentPassword': 'Master password hiện tại không đúng.',
    'error.tooManyAttempts': 'Nhập sai quá nhiều lần. Thử lại sau {seconds} giây.',

    'error.protectionOff': 'Vault này không đặt master password. Mở thẳng từ icon extension.',
    'error.protectionAlreadyOn': 'Master password đang bật sẵn.',
    'error.vaultNeedUnlockForProtection': 'Mở khoá vault trước khi đổi cài đặt master password.',

    'error.biometricNotEnrolled': 'Chưa đăng ký mở khoá bằng vân tay.',
    'error.biometricBadRecord': 'Dữ liệu đăng ký vân tay không hợp lệ.',
    'error.biometricUnlockFailed': 'Không mở khoá được bằng vân tay. Dùng master password.',
    'error.biometricUnavailable': 'Thiết bị này không có cảm biến vân tay / Windows Hello khả dụng.',
    'error.biometricPrfUnsupported':
        'Thiết bị hoặc trình duyệt này không hỗ trợ WebAuthn PRF, nên chưa thể mở khoá bằng vân tay. Hãy tiếp tục dùng master password.',
    'error.biometricNoPrfResult': 'Authenticator không trả về dữ liệu PRF. Hãy dùng master password.',
    'error.biometricCancelled': 'Bạn đã huỷ hoặc hết thời gian xác thực sinh trắc.',
    'error.biometricAlreadyRegistered': 'Thiết bị này đã đăng ký rồi.',
    'error.biometricNotSupported': 'Trình duyệt hoặc thiết bị không hỗ trợ kiểu xác thực này.',
    'error.biometricInsecureContext': 'Ngữ cảnh không an toàn để dùng WebAuthn.',
    'error.biometricRegistrationCancelled': 'Đăng ký vân tay bị huỷ.',
};
