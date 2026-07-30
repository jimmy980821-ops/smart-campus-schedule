import Foundation

enum WidgetStore {
    static let snapshotKey = "campusFlow.widgetSnapshot.v1"

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
            return .empty
        }
        return snapshot
    }
}

enum WidgetStoreError: LocalizedError {
    case unavailableAppGroup

    var errorDescription: String? {
        "無法開啟 App Group，請確認 App 與 Widget 的 Signing & Capabilities 設定一致。"
    }
}

