import CryptoKit
import FirebaseFirestore
import FirebaseMessaging
import UIKit
import UserNotifications

@MainActor
final class PushNotificationManager: NSObject, ObservableObject {
    static let shared = PushNotificationManager()

    @Published private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined
    @Published private(set) var fcmToken: String?
    @Published var registrationError: String?

    private var uid: String?
    private var deviceDocumentID: String?
    private var heartbeatTimer: Timer?

    var supportsRemoteNotifications: Bool {
        Bundle.main.object(forInfoDictionaryKey: "NATIVE_PUSH_ENABLED") as? Bool ?? false
    }

    func requestPermission(uid: String) async throws {
        self.uid = uid
        await registerAppDevice(uid: uid)
        guard supportsRemoteNotifications else {
            throw PushError.personalTeamDoesNotSupportRemotePush
        }
        let granted = try await UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .badge, .sound])
        authorizationStatus = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        guard granted else { throw PushError.permissionDenied }
        UIApplication.shared.registerForRemoteNotifications()
        await refreshDeviceRegistration(uid: uid)
    }

    func refreshDeviceRegistration(uid: String) async {
        self.uid = uid
        authorizationStatus = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        await registerAppDevice(uid: uid)
        guard supportsRemoteNotifications else { return }
        guard authorizationStatus == .authorized || authorizationStatus == .provisional else { return }
        UIApplication.shared.registerForRemoteNotifications()
        if let token = Messaging.messaging().fcmToken {
            await saveDevice(uid: uid, token: token, online: true)
        }
    }

    func markOffline() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = nil
        guard let deviceDocumentID else { return }
        Firestore.firestore().collection("pushDevices").document(deviceDocumentID).setData([
            "online": false,
            "lastSeenAt": Date().timeIntervalSince1970 * 1000
        ], merge: true)
    }

    func updatePresence(uid: String, online: Bool) async {
        self.uid = uid
        if online {
            await registerAppDevice(uid: uid)
        } else {
            markOffline()
        }
    }

    private func registerAppDevice(uid: String) async {
        await saveDevice(
            uid: uid,
            token: supportsRemoteNotifications ? Messaging.messaging().fcmToken : nil,
            online: true
        )
        startHeartbeat(uid: uid)
    }

    private func saveDevice(uid: String, token: String?, online: Bool) async {
        let id = nativeDeviceID(uid: uid)
        let now = Date().timeIntervalSince1970 * 1000
        let platform = UIDevice.current.userInterfaceIdiom == .pad ? "iPad" : "iPhone"
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
            ?? "開發版"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
            ?? "1"
        let notificationsEnabled = supportsRemoteNotifications
            && token != nil
            && (authorizationStatus == .authorized || authorizationStatus == .provisional)
        var data: [String: Any] = [
            "uid": uid,
            "platform": platform,
            "browser": "校園日程",
            "installMode": "iOS 原生 App",
            "appVersion": version,
            "buildNumber": build,
            "timezone": TimeZone.current.identifier,
            "updatedAt": now,
            "lastSeenAt": now,
            "online": online,
            "nativeApp": true,
            "syncEnabled": true,
            "notificationsEnabled": notificationsEnabled
        ]
        if let token {
            data["token"] = token
        }

        do {
            let devices = Firestore.firestore().collection("pushDevices")
            try await devices.document(id).setData(data, merge: true)
            if let token {
                let legacyID = sha256(token)
                if legacyID != id {
                    try? await devices.document(legacyID).delete()
                }
            }
            fcmToken = token
            deviceDocumentID = id
            registrationError = nil
        } catch {
            registrationError = error.localizedDescription
        }
    }

    private func startHeartbeat(uid: String) {
        heartbeatTimer?.invalidate()
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 2 * 60, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                await self.saveDevice(
                    uid: uid,
                    token: self.supportsRemoteNotifications ? Messaging.messaging().fcmToken : nil,
                    online: true
                )
            }
        }
    }

    func nativeDeviceID(uid: String) -> String {
        let installIDKey = "campusFlow.nativeInstallID"
        let defaults = UserDefaults.standard
        let installID: String
        if let saved = defaults.string(forKey: installIDKey), !saved.isEmpty {
            installID = saved
        } else {
            installID = UUID().uuidString
            defaults.set(installID, forKey: installIDKey)
        }
        return "native-\(sha256("\(uid)|\(installID)"))"
    }

    private func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8))
            .map { String(format: "%02x", $0) }
            .joined()
    }
}

extension PushNotificationManager: MessagingDelegate {
    nonisolated func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        Task { @MainActor in
            guard self.supportsRemoteNotifications else { return }
            guard let uid = self.uid else {
                self.fcmToken = fcmToken
                return
            }
            await self.saveDevice(uid: uid, token: fcmToken, online: true)
        }
    }
}

extension PushNotificationManager: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .badge]
    }
}

enum PushError: LocalizedError {
    case permissionDenied
    case personalTeamDoesNotSupportRemotePush

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            "通知權限未允許，請到「設定 → 通知 → 校園日程」重新開啟。"
        case .personalTeamDoesNotSupportRemotePush:
            "免費 Personal Team 版本可同步資料與使用小工具，但原生背景推播仍由主畫面 PWA 接收。"
        }
    }
}
