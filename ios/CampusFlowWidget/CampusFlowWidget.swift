import SwiftUI
import WidgetKit

struct CampusFlowEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

struct CampusFlowProvider: TimelineProvider {
    func placeholder(in context: Context) -> CampusFlowEntry {
        CampusFlowEntry(date: .now, snapshot: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (CampusFlowEntry) -> Void) {
        completion(CampusFlowEntry(date: .now, snapshot: WidgetStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CampusFlowEntry>) -> Void) {
        let snapshot = WidgetStore.load()
        let now = Date()
        let entry = CampusFlowEntry(date: now, snapshot: snapshot)
        let nextBoundary = [snapshot.currentCourseEnd, snapshot.nextCourseStart]
            .compactMap { $0 }
            .filter { $0 > now }
            .min()
        let nextRefresh = nextBoundary?.addingTimeInterval(1)
            ?? now.addingTimeInterval(30 * 60)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

struct CampusFlowWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: CampusFlowEntry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                smallWidget
            case .systemMedium:
                mediumWidget
            case .accessoryInline:
                Text(accessoryText)
            case .accessoryCircular:
                circularWidget
            default:
                rectangularWidget
            }
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [Color(red: 0.07, green: 0.20, blue: 0.43), Color(red: 0.12, green: 0.38, blue: 0.77)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .widgetURL(URL(string: "https://jimmy980821-ops.github.io/smart-campus-schedule/"))
    }

    private var smallWidget: some View {
        VStack(alignment: .leading, spacing: 7) {
            if entry.snapshot.currentCourse != nil {
                Label("正在上課", systemImage: "book.closed.fill")
                    .font(.caption.bold())
                    .foregroundStyle(.white.opacity(0.75))
            } else {
                Label("下一節", systemImage: "calendar")
                    .font(.caption.bold())
                    .foregroundStyle(.white.opacity(0.75))
            }
            Spacer()
            if let course = entry.snapshot.currentCourse {
                Text(course.subject)
                    .font(.title2.bold())
                    .lineLimit(2)
                if let end = entry.snapshot.currentCourseEnd {
                    HStack(spacing: 4) {
                        Text("至")
                        Text(end, style: .time)
                    }
                    .font(.headline)
                }
                Text(course.room).font(.caption)
            } else if let course = entry.snapshot.nextCourse {
                Text(course.subject)
                    .font(.title2.bold())
                    .lineLimit(2)
                if let start = entry.snapshot.nextCourseStart {
                    Text(start, style: .time).font(.headline)
                }
                Text(course.room).font(.caption)
            } else {
                Text("今天課程\n已結束").font(.title3.bold())
            }
        }
        .foregroundStyle(.white)
    }

    private var mediumWidget: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 7) {
                Text(entry.snapshot.currentCourse == nil ? "下一節課" : "正在上課")
                    .font(.caption.bold())
                    .foregroundStyle(.white.opacity(0.7))
                if let course = entry.snapshot.currentCourse {
                    Text(course.subject).font(.title2.bold()).lineLimit(1)
                    Text("第 \(course.period) 節・\(course.room)").font(.caption)
                    if let end = entry.snapshot.currentCourseEnd {
                        HStack(spacing: 4) {
                            Text("至")
                            Text(end, style: .time)
                        }
                        .font(.headline)
                    }
                } else if let course = entry.snapshot.nextCourse {
                    Text(course.subject).font(.title2.bold()).lineLimit(1)
                    Text("第 \(course.period) 節・\(course.room)").font(.caption)
                    if let start = entry.snapshot.nextCourseStart {
                        Text(start, style: .time).font(.headline)
                    }
                } else {
                    Text("今天課程已結束").font(.headline)
                }
            }
            Divider().overlay(.white.opacity(0.25))
            VStack(alignment: .leading, spacing: 9) {
                Label(
                    entry.snapshot.nearestAssignment?.content ?? "沒有待辦作業",
                    systemImage: "checklist"
                )
                .font(.caption)
                .lineLimit(2)
                Label(
                    entry.snapshot.gsatDays.map { "學測倒數 \($0) 天" } ?? "尚未設定學測",
                    systemImage: "graduationcap"
                )
                .font(.caption)
                .lineLimit(2)
            }
        }
        .foregroundStyle(.white)
    }

    private var rectangularWidget: some View {
        VStack(alignment: .leading, spacing: 3) {
            if let course = entry.snapshot.currentCourse {
                Text("正在上課・\(course.subject)").font(.headline)
                if let end = entry.snapshot.currentCourseEnd {
                    Text("第 \(course.period) 節・至 \(end, style: .time)")
                }
            } else if let course = entry.snapshot.nextCourse {
                Text(course.subject).font(.headline)
                Text("第 \(course.period) 節・\(course.room)")
            } else if let days = entry.snapshot.gsatDays {
                Text("今天課程已結束").font(.headline)
                Text("學測倒數 \(days) 天")
            } else {
                Text("今天課程已結束").font(.headline)
            }
        }
    }

    private var circularWidget: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Image(systemName: "graduationcap")
                Text(entry.snapshot.gsatDays.map(String.init) ?? "—").font(.headline)
            }
        }
    }

    private var accessoryText: String {
        if let course = entry.snapshot.currentCourse {
            let end = entry.snapshot.currentCourseEnd.map {
                $0.formatted(date: .omitted, time: .shortened)
            } ?? ""
            return "正在上 \(course.subject)・至 \(end)"
        }
        if let course = entry.snapshot.nextCourse {
            return "下一節 \(course.subject)・\(CampusFlowDate.periodTimes[course.period] ?? "")"
        }
        if let days = entry.snapshot.gsatDays {
            return "學測倒數 \(days) 天"
        }
        return "校園日程"
    }
}

struct CampusFlowWidget: Widget {
    let kind = "CampusFlowWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CampusFlowProvider()) { entry in
            CampusFlowWidgetView(entry: entry)
        }
        .configurationDisplayName("校園日程")
        .description("查看目前課程、下一節課、最近作業與學測倒數。")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryInline,
            .accessoryCircular,
            .accessoryRectangular
        ])
    }
}

@main
struct CampusFlowWidgetBundle: WidgetBundle {
    var body: some Widget {
        CampusFlowWidget()
    }
}
