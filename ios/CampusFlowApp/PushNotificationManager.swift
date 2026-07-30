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

    func requestPermission(uid: String) async throws {
        self.uid = uid
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
        guard authorizationStatus == .authorized || authorizationStatus == .provisional else { return }
        UIApplication.shared.registerForRemoteNotifications()
        if let token = Messaging.messaging().fcmToken {
            await saveDevice(token: token, uid: uid)
        }
    }

    func markOffline() {
        guard let deviceDocumentID else { return }
        Firestore.firestore().collection("pushDevices").document(deviceDocumentID).setData([
            "online": false,
            "lastSeenAt": Date().timeIntervalSince1970 * 1000
        ], merge: true)
    }

    private func saveDevice(token: String, uid: String) async {
        let id = SHA256.hash(data: Data(token.utf8)).map { String(format: "%02x", $0) }.joined()
        let now = Date().timeIntervalSince1970 * 1000
        let platform = UIDevice.current.userInterfaceIdiom == .pad ? "iPad" : "iPhone"
        do {
            try await Firestore.firestore().collection("pushDevices").document(id).setData([
                "uid": uid,
                "token": token,
                "platform": platform,
                "browser": "原生 App",
                "installMode": "iOS App",
                "timezone": TimeZone.current.identifier,
                "updatedAt": now,
                "lastSeenAt": now,
                "online": true
            ], merge: true)
            fcmToken = token
            deviceDocumentID = id
            registrationError = nil
        } catch {
            registrationError = error.localizedDescription
        }
    }
}

extension PushNotificationManager: MessagingDelegate {
    nonisolated func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        Task { @MainActor in
            guard let uid = self.uid else {
                self.fcmToken = fcmToken
                return
            }
            await self.saveDevice(token: fcmToken, uid: uid)
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

    var errorDescription: String? {
        "通知權限未允許，請到「設定 → 通知 → 校園日程」重新開啟。"
    }
}

