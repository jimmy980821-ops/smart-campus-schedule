import { createSign } from "node:crypto";

const PROJECT_ID = "campus-flow-9965c";
const SITE_URL = "https://jimmy980821-ops.github.io/smart-campus-schedule/";
const ICON_URL = `${SITE_URL}app-icon.png`;
const FIRESTORE_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const periodTimes = [
  { period: 1, start: "08:10" },
  { period: 2, start: "09:10" },
  { period: 3, start: "10:10" },
  { period: 4, start: "11:10" },
  { period: 5, start: "13:10" },
  { period: 6, start: "14:20" }
];

const schedule = {
  1: ["導師時間", "英文輔導", "化學輔導", "數學輔導", "國文寫作", "物理輔導"],
  2: ["國文輔導", "化學輔導", "國文輔導", "數學輔導", "英文輔導", "英文輔導"],
  3: ["物理輔導", "物理輔導", "英文輔導", "英文輔導", "國文輔導", "數學輔導"],
  4: ["國文輔導", "英語文作文", "化學輔導", "數學輔導", "國文輔導", "選修生物／選修地球科學"],
  5: ["數學輔導", "數學輔導", "生物輔導", "地球科學輔導", "化學輔導", "物理輔導"]
};

const isTest = process.env.SEND_TEST === "true";
const reminderTime = process.env.NOW ? new Date(process.env.NOW) : new Date();
const reminder = isTest ? createTestReminder() : getScheduledReminder(reminderTime);

if (!reminder) {
  console.log("目前沒有需要發送的課程提醒。");
  process.exit(0);
}

if (process.env.DRY_RUN === "true") {
  console.log(JSON.stringify(reminder));
  process.exit(0);
}

const serviceAccount = parseServiceAccount();
const accessToken = await createAccessToken(serviceAccount);

if (!isTest && await notificationWasSent(reminder.key, accessToken)) {
  console.log(`提醒 ${reminder.key} 已發送，略過重複執行。`);
  process.exit(0);
}

const devices = await listPushDevices(accessToken);
if (!devices.length) {
  console.log("目前沒有已訂閱背景通知的裝置。");
  process.exit(0);
}

let successCount = 0;
for (const device of devices) {
  const result = await sendMessage(device.token, reminder, accessToken);
  if (result.ok) {
    successCount += 1;
  } else if (result.invalidToken) {
    await deletePushDevice(device.id, accessToken);
  }
}

if (!isTest && successCount > 0) {
  await markNotificationSent(reminder, successCount, accessToken);
}

console.log(`通知完成：成功 ${successCount} 台，共 ${devices.length} 台裝置。`);

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("缺少 GitHub Secret：FIREBASE_SERVICE_ACCOUNT");
  const value = JSON.parse(raw);
  if (!value.client_email || !value.private_key) throw new Error("Firebase 服務帳戶格式不完整。");
  return value;
}

async function createAccessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(account.private_key).toString("base64url");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedToken}.${signature}`
    })
  });
  if (!response.ok) throw new Error(`無法取得 Google 存取權：${response.status}`);
  return (await response.json()).access_token;
}

function getScheduledReminder(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
  const weekday = dayMap[parts.weekday];
  if (!weekday) return null;

  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const period = periodTimes.find((item) => {
    const [hour, minute] = item.start.split(":").map(Number);
    const minutesUntil = hour * 60 + minute - currentMinutes;
    return minutesUntil > 0 && minutesUntil <= 10;
  });
  if (!period) return null;

  const subject = schedule[weekday][period.period - 1];
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    key: `${dateKey}-period-${period.period}`,
    title: `準備上課：${subject}`,
    body: `${period.start} 在 305 教室上課，請準備課本與用品。`,
    tag: `${dateKey}-${period.period}`
  };
}

function createTestReminder() {
  return {
    key: `test-${Date.now()}`,
    title: "校園日程測試通知",
    body: "背景推播設定成功！之後會在上課前提醒你。",
    tag: "campus-flow-test"
  };
}

async function listPushDevices(token) {
  const devices = [];
  let pageToken = "";
  do {
    const url = new URL(`${FIRESTORE_ROOT}/pushDevices`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await authorizedFetch(url, token);
    if (!response.ok) throw new Error(`讀取推播裝置失敗：${response.status}`);
    const data = await response.json();
    for (const document of data.documents || []) {
      const pushToken = document.fields?.token?.stringValue;
      if (pushToken) devices.push({ id: document.name.split("/").pop(), token: pushToken });
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return devices;
}

async function sendMessage(deviceToken, reminder, token) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        data: {
          title: reminder.title,
          body: reminder.body,
          icon: ICON_URL,
          url: SITE_URL,
          tag: reminder.tag
        },
        webpush: { headers: { Urgency: "high" } }
      }
    })
  });

  if (response.ok) return { ok: true, invalidToken: false };
  const message = await response.text();
  console.error(`FCM 發送失敗 ${response.status}: ${message}`);
  return {
    ok: false,
    invalidToken: response.status === 404 || message.includes("UNREGISTERED")
  };
}

async function notificationWasSent(key, token) {
  const response = await authorizedFetch(`${FIRESTORE_ROOT}/pushNotificationRuns/${encodeURIComponent(key)}`, token);
  return response.ok;
}

async function markNotificationSent(reminder, successCount, token) {
  const response = await authorizedFetch(
    `${FIRESTORE_ROOT}/pushNotificationRuns/${encodeURIComponent(reminder.key)}`,
    token,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fields: {
          title: { stringValue: reminder.title },
          sentAt: { timestampValue: new Date().toISOString() },
          deviceCount: { integerValue: String(successCount) }
        }
      })
    }
  );
  if (!response.ok) throw new Error(`寫入通知紀錄失敗：${response.status}`);
}

async function deletePushDevice(id, token) {
  await authorizedFetch(`${FIRESTORE_ROOT}/pushDevices/${encodeURIComponent(id)}`, token, { method: "DELETE" });
}

function authorizedFetch(url, token, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}
