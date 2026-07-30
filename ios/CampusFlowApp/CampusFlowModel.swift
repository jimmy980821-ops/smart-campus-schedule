import FirebaseAuth
import FirebaseCore
import FirebaseFirestore
import GoogleSignIn
import SwiftUI
import UIKit
import WidgetKit

@MainActor
final class CampusFlowModel: ObservableObject {
    @Published private(set) var user: User?
    @Published private(set) var courses: [Course] = []
    @Published private(set) var assignments: [AssignmentItem] = []
    @Published private(set) var exams: [ExamItem] = []
    @Published private(set) var isLoading = false
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
                    self.startListeners(uid: user.uid)
                    await PushNotificationManager.shared.refreshDeviceRegistration(uid: user.uid)
                } else {
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
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: root)
            guard let idToken = result.user.idToken?.tokenString else {
                throw CampusFlowError.missingGoogleToken
            }
            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )
            _ = try await Auth.auth().signIn(with: credential)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() {
        PushNotificationManager.shared.markOffline()
        try? Auth.auth().signOut()
        GIDSignIn.sharedInstance.signOut()
    }

    func requestNotifications() async {
        guard let uid = user?.uid else {
            errorMessage = "請先登入 Google 帳號。"
            return
        }
        do {
            try await PushNotificationManager.shared.requestPermission(uid: uid)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
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
        let appleWeekday = calendar.component(.weekday, from: now)
        let weekday = appleWeekday == 1 ? 7 : appleWeekday - 1
        let todayCourses = courses.filter { $0.weekday == weekday }.sorted { $0.period < $1.period }
        let nextCourse = todayCourses.first {
            guard let start = CampusFlowDate.startTime(for: $0, on: now) else { return false }
            return start > now
        }
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
            nextCourse: nextCourse,
            nextCourseStart: nextCourse.flatMap { CampusFlowDate.startTime(for: $0, on: now) },
            todayCourses: todayCourses,
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

