# iPhone 背景通知啟用步驟

網站端已包含 PWA、Service Worker、Firebase Cloud Messaging 與免費的 GitHub Actions 課程排程。完成以下一次性設定後，即可在網站關閉時接收通知。

## 1. 更新 Firestore 規則

在 Firebase 控制台開啟「Firestore Database → 規則」，貼上專案根目錄 `firestore.rules` 的完整內容並按「發布」。

## 2. 建立 GitHub 加密 Secret

1. Firebase 控制台 →「專案設定 → 服務帳戶」。
2. 點「產生新的私密金鑰」並下載 JSON。
3. GitHub 儲存庫 →「Settings → Secrets and variables → Actions」。
4. 點「New repository secret」。
5. 名稱填入 `FIREBASE_SERVICE_ACCOUNT`。
6. 值貼入 JSON 的完整內容並儲存。
7. 確認 GitHub Secret 建立後，刪除電腦上的 JSON 下載檔。

> 私密金鑰不可放進網站程式、Git commit、Issue、Pull Request 或對話訊息。

## 3. 讓排程進入預設分支

GitHub 的定時工作只會從預設分支執行。合併目前的 Pull Request 後，`.github/workflows/class-reminders.yml` 才會定時運作。

排程會在臺灣時間週一至週五的上課時段每五分鐘檢查一次，並利用 Firestore 紀錄避免同一節課重複通知。

## 4. 在 iPhone 訂閱

1. iPhone 需使用 iOS 16.4 或更新版本。
2. 用 Safari 開啟 `https://jimmy980821-ops.github.io/smart-campus-schedule/`。
3. 點「分享 → 加入主畫面」。
4. 從 iPhone 主畫面開啟「校園日程」。
5. 使用 Google 帳號登入。
6. 點「開啟背景通知」並允許通知。

## 5. 發送測試通知

1. GitHub 儲存庫 →「Actions」。
2. 選擇「Send class reminders」。
3. 點「Run workflow」，保持「發送測試通知」為開啟。
4. 執行後，已訂閱的 iPhone 應收到「校園日程測試通知」。

GitHub Actions 排程可能因平台繁忙而延遲數分鐘，這是免費排程的限制。
