import { createSign } from "node:crypto";
import {
  getAssignmentReminders,
  getClassReminder,
  getExamReminders,
  getTaipeiClock
} from "./reminder-logic.mjs";

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

const serviceAccount = parseServiceAccount();
const accessToken = await createAccessToken(serviceAccount);
const devices = await listPushDevices(accessToken);
const taipeiClock = getTaipeiClock(reminderTime);
console.log(
  `提醒巡檢：臺灣 ${taipeiClock.dateKey} ${taipeiClock.hour}:${taipeiClock.minute}，`
  + `已訂閱裝置 ${devices.length} 台。`
);
if (!devices.length) {
  console.log("目前沒有已訂閱背景通知的裝置。");
  process.exit(0);
}

const reminderGroups = isTest
  ? [{ reminder: createTestReminder(), devices }]
  : await createScheduledReminderGroups(reminderTime, devices, accessToken);

if (!reminderGroups.length) {
  console.log("目前沒有需要發送的課程、作業或考試提醒。");
  process.exit(0);
}

if (process.env.DRY_RUN === "true") {
  console.log(JSON.stringify(reminderGroups.map(({ reminder, devices: targets }) => ({
    ...reminder,
    targetCount: targets.length
  })), null, 2));
  process.exit(0);
}

let successCount = 0;
let targetCount = 0;
for (const group of reminderGroups) {
  const { reminder, devices: targetDevices } = group;
  if (!isTest && await notificationWasSent(reminder.key, accessToken)) {
    console.log(`提醒 ${reminder.key} 已發送，略過重複執行。`);
    continue;
  }

  console.log(`準備發送：${reminder.title}，目標 ${targetDevices.length} 台。`);
  let reminderSuccessCount = 0;
  targetCount += targetDevices.length;
  for (const device of targetDevices) {
    const result = await sendMessage(device.token, reminder, accessToken);
    if (result.ok) {
      reminderSuccessCount += 1;
      successCount += 1;
    } else if (result.invalidToken) {
      await deletePushDevice(device.id, accessToken);
    }
  }

  if (!isTest && reminderSuccessCount > 0) {
    await markNotificationSent(reminder, reminderSuccessCount, accessToken);
  }
}

console.log(`通知完成：成功 ${successCount} 則，共 ${targetCount} 個發送目標。`);

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

function createTestReminder() {
  return {
    key: `test-${Date.now()}`,
    title: "校園日程測試通知",
    body: "背景推播設定成功！之後會提醒課程、作業與學測倒數。",
    tag: "campus-flow-test"
  };
}

async function createScheduledReminderGroups(date, devices, token) {
  const groups = [];
  const classReminder = getClassReminder(date, periodTimes, schedule);
  if (classReminder) groups.push({ reminder: classReminder, devices });

  const devicesByUser = new Map();
  for (const device of devices) {
    if (!device.uid) continue;
    const userDevices = devicesByUser.get(device.uid) || [];
    userDevices.push(device);
    devicesByUser.set(device.uid, userDevices);
  }

  for (const [uid, userDevices] of devicesByUser) {
    const [assignments, exams] = await Promise.all([
      listUserRecords(uid, "assignments", token),
      listUserRecords(uid, "exams", token)
    ]);
    const personalReminders = [
      ...getAssignmentReminders(date, assignments, uid),
      ...getExamReminders(date, exams, uid)
    ];
    personalReminders.forEach((reminder) => groups.push({ reminder, devices: userDevices }));
  }

  return groups;
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
      const uid = document.fields?.uid?.stringValue;
      const notificationsEnabled = document.fields?.notificationsEnabled?.booleanValue !== false;
      if (pushToken && notificationsEnabled) {
        devices.push({
          id: document.name.split("/").pop(),
          token: pushToken,
          uid,
          browser: document.fields?.browser?.stringValue || "",
          installMode: document.fields?.installMode?.stringValue || ""
        });
      }
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return devices;
}

async function listUserRecords(uid, collectionName, token) {
  const records = [];
  let pageToken = "";
  do {
    const url = new URL(
      `${FIRESTORE_ROOT}/users/${encodeURIComponent(uid)}/${encodeURIComponent(collectionName)}`
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await authorizedFetch(url, token);
    if (response.status === 404) return records;
    if (!response.ok) {
      throw new Error(`讀取 ${collectionName} 失敗：${response.status}`);
    }
    const data = await response.json();
    for (const document of data.documents || []) {
      records.push({
        id: document.name.split("/").pop(),
        ...decodeFirestoreFields(document.fields || {})
      });
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return records;
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])
  );
}

function decodeFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  return undefined;
}

async function sendMessage(deviceToken, reminder, token) {
  const isNativeIos = deviceToken.browser === "原生 App"
    || deviceToken.installMode === "iOS App";
  const message = {
    token: deviceToken.token,
    data: {
      title: reminder.title,
      body: reminder.body,
      icon: ICON_URL,
      url: SITE_URL,
      tag: reminder.tag
    }
  };

  if (isNativeIos) {
    // 原生 iOS 必須帶 notification/APNs payload，App 關閉時才會由系統顯示通知。
    message.notification = {
      title: reminder.title,
      body: reminder.body
    };
    message.apns = {
      headers: { "apns-priority": "10" },
      payload: {
        aps: {
          sound: "default"
        }
      }
    };
  } else {
    // Web Push 保持 data-only，交給既有 Service Worker 顯示，避免同一則通知重複。
    message.webpush = { headers: { Urgency: "high" } };
  }

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ message })
  });

  if (response.ok) return { ok: true, invalidToken: false };
  const responseMessage = await response.text();
  console.error(`FCM 發送失敗 ${response.status}: ${responseMessage}`);
  return {
    ok: false,
    invalidToken: response.status === 404 || responseMessage.includes("UNREGISTERED")
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
