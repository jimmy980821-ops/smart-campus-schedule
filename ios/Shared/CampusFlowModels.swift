import Foundation

struct Course: Codable, Hashable, Identifiable {
    var id: String { "\(weekday)-\(period)" }
    let weekday: Int
    let period: Int
    let subject: String
    let room: String
    let teacher: String
}

struct AssignmentItem: Codable, Hashable, Identifiable {
    let id: String
    let subject: String
    let content: String
    let dueDate: String
    let completed: Bool
    let completedAt: Double?
    let createdAt: Double?

    var due: Date? { CampusFlowDate.date(from: dueDate) }
}

struct ExamItem: Codable, Hashable, Identifiable {
    let id: String
    let type: String
    let name: String
    let date: String

    var examDate: Date? { CampusFlowDate.date(from: date) }
}

struct WidgetSnapshot: Codable, Hashable {
    static let empty = WidgetSnapshot(
        updatedAt: .distantPast,
        nextCourse: nil,
        nextCourseStart: nil,
        todayCourses: [],
        nearestAssignment: nil,
        gsat: nil,
        gsatDays: nil
    )

    let updatedAt: Date
    let nextCourse: Course?
    let nextCourseStart: Date?
    let todayCourses: [Course]
    let nearestAssignment: AssignmentItem?
    let gsat: ExamItem?
    let gsatDays: Int?
}

enum CampusFlowDate {
    static let taipei = TimeZone(identifier: "Asia/Taipei") ?? .current

    static var calendar: Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = taipei
        return value
    }

    static func date(from value: String) -> Date? {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = taipei
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: value)
    }

    static func startTime(for course: Course, on day: Date = Date()) -> Date? {
        guard let time = periodTimes[course.period] else { return nil }
        let components = time.split(separator: ":").compactMap { Int($0) }
        guard components.count == 2 else { return nil }
        return calendar.date(
            bySettingHour: components[0],
            minute: components[1],
            second: 0,
            of: day
        )
    }

    static func days(from today: Date = Date(), to target: Date) -> Int {
        let start = calendar.startOfDay(for: today)
        let end = calendar.startOfDay(for: target)
        return calendar.dateComponents([.day], from: start, to: end).day ?? 0
    }

    // 與目前網站相同的六節暑輔時間。
    static let periodTimes: [Int: String] = [
        1: "08:10",
        2: "09:10",
        3: "10:10",
        4: "11:10",
        5: "13:10",
        6: "14:20"
    ]
}

