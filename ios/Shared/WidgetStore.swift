import Foundation

enum WidgetStore {
    static let snapshotKey = "campusFlow.widgetSnapshot.v1"
    // 免費 Personal Team 無法使用 App Groups，改用固定日期維持學測倒數。
    static let fallbackGsat = ExamItem(
        id: "personal-team-gsat-2027",
        type: "學測",
        name: "2027 學科能力測驗",
        date: "2027-01-22"
    )

    static var appGroupID: String {
        Bundle.main.object(forInfoDictionaryKey: "APP_GROUP_ID") as? String
            ?? "group.com.jimmy980821.campusflow"
    }

    static func save(_ snapshot: WidgetSnapshot) throws {
        guard let defaults = UserDefaults(suiteName: appGroupID) else {
            throw WidgetStoreError.unavailableAppGroup
        }
        defaults.set(try JSONEncoder().encode(snapshot), forKey: snapshotKey)
    }

    static func load() -> WidgetSnapshot {
        guard
            let defaults = UserDefaults(suiteName: appGroupID),
            let data = defaults.data(forKey: snapshotKey),
            let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
        else {
            return addingGsatFallback(to: addingScheduleFallback(to: .empty))
        }
        return addingGsatFallback(to: addingScheduleFallback(to: snapshot))
    }

    private static func addingScheduleFallback(
        to snapshot: WidgetSnapshot,
        now: Date = Date()
    ) -> WidgetSnapshot {
        guard
            snapshot.todayCourses.isEmpty,
            snapshot.currentCourse == nil,
            snapshot.nextCourse == nil
        else {
            return snapshot
        }

        let state = CampusFlowSchedule.state(at: now)
        return WidgetSnapshot(
            updatedAt: snapshot.updatedAt == .distantPast ? now : snapshot.updatedAt,
            currentCourse: state.currentCourse,
            currentCourseEnd: state.currentCourseEnd,
            nextCourse: state.nextCourse,
            nextCourseStart: state.nextCourseStart,
            todayCourses: state.todayCourses,
            nearestAssignment: snapshot.nearestAssignment,
            gsat: snapshot.gsat,
            gsatDays: snapshot.gsatDays
        )
    }

    private static func addingGsatFallback(to snapshot: WidgetSnapshot) -> WidgetSnapshot {
        guard
            snapshot.gsat == nil,
            snapshot.gsatDays == nil,
            let examDate = fallbackGsat.examDate
        else {
            return snapshot
        }

        let days = CampusFlowDate.days(to: examDate)
        guard days >= 0 else { return snapshot }

        return WidgetSnapshot(
            updatedAt: snapshot.updatedAt,
            currentCourse: snapshot.currentCourse,
            currentCourseEnd: snapshot.currentCourseEnd,
            nextCourse: snapshot.nextCourse,
            nextCourseStart: snapshot.nextCourseStart,
            todayCourses: snapshot.todayCourses,
            nearestAssignment: snapshot.nearestAssignment,
            gsat: fallbackGsat,
            gsatDays: days
        )
    }
}

enum WidgetStoreError: LocalizedError {
    case unavailableAppGroup

    var errorDescription: String? {
        "無法開啟 App Group，請確認 App 與 Widget 的 Signing & Capabilities 設定一致。"
    }
}
