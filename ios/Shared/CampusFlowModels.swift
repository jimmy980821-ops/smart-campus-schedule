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
        currentCourse: nil,
        currentCourseEnd: nil,
        nextCourse: nil,
        nextCourseStart: nil,
        todayCourses: [],
        nearestAssignment: nil,
        gsat: nil,
        gsatDays: nil
    )

    let updatedAt: Date
    let currentCourse: Course?
    let currentCourseEnd: Date?
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
        guard let value = periodTimes[course.period] else { return nil }
        return time(on: day, value: value)
    }

    static func endTime(for course: Course, on day: Date = Date()) -> Date? {
        guard let value = periodEndTimes[course.period] else { return nil }
        return time(on: day, value: value)
    }

    private static func time(on day: Date, value: String) -> Date? {
        let components = value.split(separator: ":").compactMap { Int($0) }
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

    static let periodEndTimes: [Int: String] = [
        1: "09:00",
        2: "10:00",
        3: "11:00",
        4: "12:00",
        5: "14:00",
        6: "15:10"
    ]
}

enum CampusFlowSchedule {
    struct State {
        let todayCourses: [Course]
        let currentCourse: Course?
        let currentCourseEnd: Date?
        let nextCourse: Course?
        let nextCourseStart: Date?
    }

    // 固定暑輔課表。免費 Personal Team 小工具可離線讀取，不依賴 App Groups。
    static let fixedCourses: [Course] = [
        Course(weekday: 1, period: 1, subject: "導師時間", room: "305 教室", teacher: "趙晉鴻"),
        Course(weekday: 1, period: 2, subject: "英文輔導", room: "305 教室", teacher: "鄭慧真"),
        Course(weekday: 1, period: 3, subject: "化學輔導", room: "305 教室", teacher: "余璧婷"),
        Course(weekday: 1, period: 4, subject: "數學輔導", room: "305 教室", teacher: "李俊緯"),
        Course(weekday: 1, period: 5, subject: "國文寫作", room: "305 教室", teacher: "張育愷"),
        Course(weekday: 1, period: 6, subject: "物理輔導", room: "305 教室", teacher: "趙晉鴻"),

        Course(weekday: 2, period: 1, subject: "國文輔導", room: "305 教室", teacher: "張育愷"),
        Course(weekday: 2, period: 2, subject: "化學輔導", room: "305 教室", teacher: "余璧婷"),
        Course(weekday: 2, period: 3, subject: "國文輔導", room: "305 教室", teacher: "張育愷"),
        Course(weekday: 2, period: 4, subject: "數學輔導", room: "305 教室", teacher: "李俊緯"),
        Course(weekday: 2, period: 5, subject: "英文輔導", room: "305 教室", teacher: "鄭慧真"),
        Course(weekday: 2, period: 6, subject: "英文輔導", room: "305 教室", teacher: "鄭慧真"),

        Course(weekday: 3, period: 1, subject: "物理輔導", room: "305 教室", teacher: "趙晉鴻"),
        Course(weekday: 3, period: 2, subject: "物理輔導", room: "305 教室", teacher: "趙晉鴻"),
        Course(weekday: 3, period: 3, subject: "英文輔導", room: "305 教室", teacher: "鄭慧真"),
        Course(weekday: 3, period: 4, subject: "英文輔導", room: "305 教室", teacher: "鄭慧真"),
        Course(weekday: 3, period: 5, subject: "國文輔導", room: "305 教室", teacher: "張育愷"),
        Course(weekday: 3, period: 6, subject: "數學輔導", room: "305 教室", teacher: "李俊緯"),

        Course(weekday: 4, period: 1, subject: "國文輔導", room: "305 教室", teacher: "張育愷"),
        Course(weekday: 4, period: 2, subject: "英語文作文", room: "305 教室", teacher: "鄭慧真"),
        Course(weekday: 4, period: 3, subject: "化學輔導", room: "305 教室", teacher: "余璧婷"),
        Course(weekday: 4, period: 4, subject: "數學輔導", room: "305 教室", teacher: "李俊緯"),
        Course(weekday: 4, period: 5, subject: "國文輔導", room: "305 教室", teacher: "張育愷"),
        Course(weekday: 4, period: 6, subject: "選修生物／選修地球科學", room: "305 教室", teacher: "朱則華、李冠葦"),

        Course(weekday: 5, period: 1, subject: "數學輔導", room: "305 教室", teacher: "李俊緯"),
        Course(weekday: 5, period: 2, subject: "數學輔導", room: "305 教室", teacher: "李俊緯"),
        Course(weekday: 5, period: 3, subject: "生物輔導", room: "305 教室", teacher: "李冠葦"),
        Course(weekday: 5, period: 4, subject: "地球科學輔導", room: "305 教室", teacher: "朱則華"),
        Course(weekday: 5, period: 5, subject: "化學輔導", room: "305 教室", teacher: "余璧婷"),
        Course(weekday: 5, period: 6, subject: "物理輔導", room: "305 教室", teacher: "趙晉鴻")
    ]

    static func state(at now: Date = Date(), courses: [Course] = fixedCourses) -> State {
        let calendar = CampusFlowDate.calendar
        let appleWeekday = calendar.component(.weekday, from: now)
        let weekday = appleWeekday == 1 ? 7 : appleWeekday - 1
        let todayCourses = courses
            .filter { $0.weekday == weekday }
            .sorted { $0.period < $1.period }
        let currentCourse = todayCourses.first { course in
            guard
                let start = CampusFlowDate.startTime(for: course, on: now),
                let end = CampusFlowDate.endTime(for: course, on: now)
            else {
                return false
            }
            return start <= now && now < end
        }
        let nextCourse = todayCourses.first { course in
            guard let start = CampusFlowDate.startTime(for: course, on: now) else { return false }
            return start > now
        }

        return State(
            todayCourses: todayCourses,
            currentCourse: currentCourse,
            currentCourseEnd: currentCourse.flatMap { CampusFlowDate.endTime(for: $0, on: now) },
            nextCourse: nextCourse,
            nextCourseStart: nextCourse.flatMap { CampusFlowDate.startTime(for: $0, on: now) }
        )
    }
}
