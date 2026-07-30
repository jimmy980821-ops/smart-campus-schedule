import FirebaseAuth
import FirebaseCore
import FirebaseFirestore
import GoogleSignIn
import SwiftUI
import UIKit
import WidgetKit

struct NativeWebCredential: Equatable {
    let uid: String
    let idToken: String
    let accessToken: String
    let deviceID: String
}

@MainActor
final class CampusFlowModel: ObservableObject {
    @Published private(set) var user: User?
    @Published private(set) var courses: [Course] = []
    @Published private(set) var assignments: [AssignmentItem] = []
    @Published private(set) var exams: [ExamItem] = []
    @Published private(set) var isLoading = false
    @Published private(set) var webCredential: NativeWebCredential?
    @Published var errorMessage: String?

    private var authHandle: AuthStateDidChangeListenerHandle?
    private var listeners: [ListenerRegistration] = []

    var isFirebaseReady: Bool { FirebaseApp.app() != nil }

    var snapshot: WidgetSnapshot {
        Self.makeSnapshot(courses: courses, assignments: assignments, exams: exams)
    }

    func start() async {
        guard isFirebaseReady else {
            errorMessage = "尚未加入 GoogleService-Info.plist，請先完成 Firebase iOS App 設定。"
            return
        }

        authHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                guard let self else { return }
                self.user = user
                self.stopListeners()
                if let user {
                    self.restoreGoogleSessionForWeb(uid: user.uid)
                    self.startListeners(uid: user.uid)
                    await PushNotificationManager.shared.refreshDeviceRegistration(uid: user.uid)
                } else {
                    self.webCredential = nil
                    self.clearData()
                }
            }
        }
    }

    func signInWithGoogle() async {
        guard isFirebaseReady else {
            errorMessage = "請先加入 Firebase 的 GoogleService-Info.plist。"
            return
        }
        guard let clientID = Self.googleClientID else {
            errorMessage = "Firebase 設定檔缺少 Google Client ID，請在 Firebase 重新下載 GoogleService-Info.plist。"
            return
        }
        guard let root = UIApplication.shared.connectedScenes
            .compactMap({ ($0 as? UIWindowScene)?.keyWindow?.rootViewController })
            .first
        else {
            errorMessage = "目前無法開啟 Google 登入畫面。"
            return
        }

        isLoading = true
        defer { isLoading = false }
        do {
            // 每次登入前設定一次，避免 App 啟動順序造成 Google Sign-In 尚未初始化。
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: root)
            guard let idToken = result.user.idToken?.tokenString else {
                throw CampusFlowError.missingGoogleToken
            }
            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )
            let authResult = try await Auth.auth().signIn(with: credential)
            webCredential = NativeWebCredential(
                uid: authResult.user.uid,
                idToken: idToken,
                accessToken: result.user.accessToken.tokenString,
                deviceID: PushNotificationManager.shared.nativeDeviceID(uid: authResult.user.uid)
            )
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private static var googleClientID: String? {
        if let clientID = FirebaseApp.app()?.options.clientID, !clientID.isEmpty {
            return clientID
        }
        guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
              let serviceInfo = NSDictionary(contentsOfFile: path),
              let clientID = serviceInfo["CLIENT_ID"] as? String,
              !clientID.isEmpty
        else {
            return nil
        }
        return clientID
    }

    private func restoreGoogleSessionForWeb(uid: String) {
        guard webCredential == nil, GIDSignIn.sharedInstance.hasPreviousSignIn() else { return }

        GIDSignIn.sharedInstance.restorePreviousSignIn { [weak self] user, _ in
            guard let user,
                  let idToken = user.idToken?.tokenString
            else {
                return
            }
            Task { @MainActor in
                self?.webCredential = NativeWebCredential(
                    uid: uid,
                    idToken: idToken,
                    accessToken: user.accessToken.tokenString,
                    deviceID: PushNotificationManager.shared.nativeDeviceID(uid: uid)
                )
            }
        }
    }

    func signOut() {
        PushNotificationManager.shared.markOffline()
        webCredential = nil
        try? Auth.auth().signOut()
        GIDSignIn.sharedInstance.signOut()
    }

    func requestNotifications() async -> Bool {
        guard let uid = user?.uid else {
            errorMessage = "請先登入 Google 帳號。"
            return false
        }
        do {
            try await PushNotificationManager.shared.requestPermission(uid: uid)
            errorMessage = nil
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func updateDevicePresence(isOnline: Bool) async {
        guard let uid = user?.uid else { return }
        await PushNotificationManager.shared.updatePresence(uid: uid, online: isOnline)
    }

    private func startListeners(uid: String) {
        isLoading = true
        let database = Firestore.firestore()

        listeners = [
            database.collection("users").document(uid).collection("assignments")
                .addSnapshotListener { [weak self] snapshot, error in
                    Task { @MainActor in
                        guard let self else { return }
                        if let error { self.errorMessage = error.localizedDescription; return }
                        self.assignments = snapshot?.documents.compactMap(Self.assignment(from:)) ?? []
                        self.publishWidgetSnapshot()
                    }
                },
            database.collection("users").document(uid).collection("exams")
                .addSnapshotListener { [weak self] snapshot, error in
                    Task { @MainActor in
                        guard let self else { return }
                        if let error { self.errorMessage = error.localizedDescription; return }
                        self.exams = snapshot?.documents.compactMap(Self.exam(from:)) ?? []
                        self.publishWidgetSnapshot()
                    }
                },
            database.collection("users").document(uid).collection("settings").document("schedule")
                .addSnapshotListener { [weak self] snapshot, error in
                    Task { @MainActor in
                        guard let self else { return }
                        self.isLoading = false
                        if let error { self.errorMessage = error.localizedDescription; return }
                        self.courses = Self.courses(from: snapshot?.data()?["days"])
                        self.publishWidgetSnapshot()
                    }
                }
        ]
    }

    private func publishWidgetSnapshot() {
        do {
            try WidgetStore.save(snapshot)
            WidgetCenter.shared.reloadTimelines(ofKind: "CampusFlowWidget")
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func stopListeners() {
        listeners.forEach { $0.remove() }
        listeners.removeAll()
    }

    private func clearData() {
        courses = []
        assignments = []
        exams = []
        isLoading = false
        try? WidgetStore.save(.empty)
        WidgetCenter.shared.reloadAllTimelines()
    }

    deinit {
        listeners.forEach { $0.remove() }
        if let authHandle { Auth.auth().removeStateDidChangeListener(authHandle) }
    }
}

private extension CampusFlowModel {
    static func string(_ data: [String: Any], _ key: String) -> String {
        data[key] as? String ?? ""
    }

    static func double(_ data: [String: Any], _ key: String) -> Double? {
        if let value = data[key] as? Double { return value }
        if let value = data[key] as? Int { return Double(value) }
        if let value = data[key] as? NSNumber { return value.doubleValue }
        return nil
    }

    static func assignment(from document: QueryDocumentSnapshot) -> AssignmentItem? {
        let data = document.data()
        let content = string(data, "content")
        let dueDate = string(data, "dueDate")
        guard !content.isEmpty, !dueDate.isEmpty else { return nil }
        return AssignmentItem(
            id: document.documentID,
            subject: string(data, "subject"),
            content: content,
            dueDate: dueDate,
            completed: data["completed"] as? Bool ?? false,
            completedAt: double(data, "completedAt"),
            createdAt: double(data, "createdAt")
        )
    }

    static func exam(from document: QueryDocumentSnapshot) -> ExamItem? {
        let data = document.data()
        let name = string(data, "name")
        let date = string(data, "date")
        guard !name.isEmpty, !date.isEmpty else { return nil }
        return ExamItem(
            id: document.documentID,
            type: string(data, "type"),
            name: name,
            date: date
        )
    }

    static func courses(from value: Any?) -> [Course] {
        guard let days = value as? [String: Any] else { return [] }
        return days.flatMap { key, value -> [Course] in
            guard let weekday = Int(key), let records = value as? [[String: Any]] else { return [] }
            return records.compactMap { record in
                guard let period = (record["period"] as? NSNumber)?.intValue else { return nil }
                return Course(
                    weekday: weekday,
                    period: period,
                    subject: string(record, "subject"),
                    room: string(record, "room"),
                    teacher: string(record, "teacher")
                )
            }
        }
        .sorted { ($0.weekday, $0.period) < ($1.weekday, $1.period) }
    }

    static func makeSnapshot(
        courses: [Course],
        assignments: [AssignmentItem],
        exams: [ExamItem],
        now: Date = Date()
    ) -> WidgetSnapshot {
        let calendar = CampusFlowDate.calendar
        let courseState = CampusFlowSchedule.state(at: now, courses: courses)
        let nearestAssignment = assignments
            .filter { !$0.completed && ($0.due ?? .distantPast) >= calendar.startOfDay(for: now) }
            .sorted { ($0.due ?? .distantFuture) < ($1.due ?? .distantFuture) }
            .first
        let gsat = exams
            .filter { $0.type == "學測" && ($0.examDate ?? .distantPast) >= calendar.startOfDay(for: now) }
            .sorted { ($0.examDate ?? .distantFuture) < ($1.examDate ?? .distantFuture) }
            .first

        return WidgetSnapshot(
            updatedAt: now,
            currentCourse: courseState.currentCourse,
            currentCourseEnd: courseState.currentCourseEnd,
            nextCourse: courseState.nextCourse,
            nextCourseStart: courseState.nextCourseStart,
            todayCourses: courseState.todayCourses,
            nearestAssignment: nearestAssignment,
            gsat: gsat,
            gsatDays: gsat?.examDate.map { CampusFlowDate.days(from: now, to: $0) }
        )
    }
}

enum CampusFlowError: LocalizedError {
    case missingGoogleToken

    var errorDescription: String? {
        switch self {
        case .missingGoogleToken:
            "Google 登入沒有回傳有效憑證，請稍後重試。"
        }
    }
}
