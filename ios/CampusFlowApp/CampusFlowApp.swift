import FirebaseCore
import FirebaseMessaging
import GoogleSignIn
import SwiftUI
import UIKit
import UserNotifications

@main
struct CampusFlowApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var model = CampusFlowModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
                .task { await model.start() }
                .onOpenURL { url in
                    _ = GIDSignIn.sharedInstance.handle(url)
                }
                .onChange(of: scenePhase) { _, phase in
                    guard phase != .inactive else { return }
                    Task {
                        await model.updateDevicePresence(isOnline: phase == .active)
                    }
                }
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
           let options = FirebaseOptions(contentsOfFile: path) {
            FirebaseApp.configure(options: options)
            let serviceInfo = NSDictionary(contentsOfFile: path)
            if let clientID = options.clientID ?? (serviceInfo?["CLIENT_ID"] as? String) {
                GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
            }
        }

        UNUserNotificationCenter.current().delegate = PushNotificationManager.shared
        if FirebaseApp.app() != nil {
            Messaging.messaging().delegate = PushNotificationManager.shared
        }
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        PushNotificationManager.shared.registrationError = error.localizedDescription
    }
}
