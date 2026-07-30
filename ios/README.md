# Campus Flow iOS 與 Widget

這個資料夾是現有 Campus Flow 網站的原生 iPhone／iPad App。它沿用同一個 Firebase 專案與資料格式，登入後會直接呈現完整網站介面。

Google 身分、登出與通知權限會透過安全的原生橋接交給 iOS App 處理；Widget 與背景推播仍由原生 Firebase SDK 負責。

## 已包含

- SwiftUI 原生登入與完整網站混合式首頁
- Firebase Google 登入
- Firestore 課表、作業、考試即時同步
- Firebase Cloud Messaging 原生裝置註冊
- iPhone／iPad 裝置名稱辨識
- App Groups 共用 Widget 資料
- iPhone 主畫面小型、中型 Widget
- iPhone 鎖定畫面行內、圓形、長方形 Widget
- 點擊 Widget 開啟既有網站

## 在 Mac 上第一次建立

1. 建議安裝最新版 Xcode。若使用 2017 MacBook Pro／macOS Ventura，
   專案也已鎖定相容的 Xcode 15.2、Firebase 10.29.0 與 Google Sign-In 7.1.0。
2. 安裝 XcodeGen：

   ```bash
   brew install xcodegen
   ```

3. 到 Firebase 控制台的 `campus-flow-9965c` 專案新增 iOS App。
4. Bundle ID 填入 `com.jimmy980821.campusflow`。
5. 下載 `GoogleService-Info.plist`，放到 `ios/Config/GoogleService-Info.plist`。
6. 執行自動設定腳本，讀取 `REVERSED_CLIENT_ID` 並重新產生專案：

   ```bash
   cd ios
   bash scripts/configure-firebase.sh
   ```

7. 在 Firebase Authentication 確認 Google 登入已啟用。
8. 在 Firebase 專案設定的 Cloud Messaging 上傳 APNs Authentication Key。
9. 若之後有修改 `project.yml`，可再次產生 Xcode 專案：

   ```bash
   cd ios
   xcodegen generate
   open CampusFlow.xcodeproj
   ```

10. 在 Xcode 選取 `CampusFlow` 與 `CampusFlowWidgetExtension`，於 Signing & Capabilities 選擇相同的 Team。
11. 確認兩個 target 的 App Groups 都是 `group.com.jimmy980821.campusflow`。
12. CampusFlow target 需有 Push Notifications；Background Modes 勾選 Remote notifications。
13. 連接 iPhone，選擇實機後執行。

## Firebase 資料位置

- 課表：`users/{uid}/settings/schedule`
- 作業：`users/{uid}/assignments/{assignmentId}`
- 考試：`users/{uid}/exams/{examId}`
- 推播裝置：`pushDevices/{sha256(fcmToken)}`

App 會將小工具需要的精簡資料寫入：

`UserDefaults(suiteName: "group.com.jimmy980821.campusflow")`

Widget 不直接連線 Firebase，可降低耗電並避免 Widget extension 的登入狀態問題。

## 重要限制

- Windows 無法編譯、簽署或安裝 iOS App，必須在 Mac 的 Xcode 完成。
- Widget 更新時間由 iOS 管理，不能保證每分鐘重新執行；準時提醒應交給 FCM／APNs。
- 第一次安裝後需至少開啟 App 一次、登入並同步，Widget 才會出現在正確資料狀態。
- `GoogleService-Info.plist` 不應公開分享，但 Firebase 用戶端設定本身不是伺服器私鑰。
