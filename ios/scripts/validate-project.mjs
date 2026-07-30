import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const required = [
  "project.yml",
  "CampusFlowApp/CampusFlowApp.swift",
  "CampusFlowApp/CampusFlowModel.swift",
  "CampusFlowApp/PushNotificationManager.swift",
  "CampusFlowApp/ContentView.swift",
  "CampusFlowApp/CampusFlowWebView.swift",
  "CampusFlowWidget/CampusFlowWidget.swift",
  "Shared/CampusFlowModels.swift",
  "Shared/WidgetStore.swift",
  "Config/CampusFlow.entitlements",
  "Config/CampusFlowWidget.entitlements",
  "scripts/configure-firebase.sh"
];

const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  throw new Error(`缺少 iOS 專案檔案：${missing.join(", ")}`);
}

const project = readFileSync(join(root, "project.yml"), "utf8");
for (const value of [
  "com.jimmy980821.campusflow",
  "group.com.jimmy980821.campusflow",
  "CampusFlowWidgetExtension",
  "FirebaseMessaging",
  "exactVersion: 10.29.0",
  "SWIFT_VERSION: \"5.9\""
]) {
  if (!project.includes(value)) throw new Error(`project.yml 缺少必要設定：${value}`);
}

console.log(`iOS 專案結構檢查通過，共 ${required.length} 個必要檔案。`);
