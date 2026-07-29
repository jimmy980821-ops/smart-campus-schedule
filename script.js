import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  getMessaging,
  getToken,
  isSupported as isMessagingSupported,
  onMessage
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging.js";

// Firebase 公開的網站設定。這些識別資料不是密碼；資料安全由 Firestore 規則控管。
const firebaseConfig = {
  apiKey: "AIzaSyBU4gvnt7fVHwkRbqbJ-hBBlmZrP0MgKY4",
  authDomain: "campus-flow-9965c.firebaseapp.com",
  projectId: "campus-flow-9965c",
  storageBucket: "campus-flow-9965c.firebasestorage.app",
  messagingSenderId: "706339405367",
  appId: "1:706339405367:web:6368418b712f0c613109b2",
  measurementId: "G-MF082FK8VZ"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const database = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();
const VAPID_PUBLIC_KEY = "BHsz6TlMHrDVkDiNPBdvKYnJtKldrAukA_L37eyoyjO2k_Adr8Mxu3YWAI5L5h8oJVWHHgWXINkld01D5l1r9SU";

/* =========================================================
   課表資料集中區：日後只要修改此區即可調整時間與課程
   星期代碼：1 = 星期一，2 = 星期二……5 = 星期五
   ========================================================= */
const periodTimes = [
  { period: 1, start: "08:10", end: "09:00" },
  { period: 2, start: "09:10", end: "10:00" },
  { period: 3, start: "10:10", end: "11:00" },
  { period: 4, start: "11:10", end: "12:00" },
  { period: 5, start: "13:10", end: "14:00" },
  { period: 6, start: "14:20", end: "15:10" }
];

const defaultWeeklySchedule = {
  1: [
    { period: 1, subject: "導師時間", room: "305 教室", teacher: "趙晉鴻" },
    { period: 2, subject: "英文輔導", room: "305 教室", teacher: "鄭慧真" },
    { period: 3, subject: "化學輔導", room: "305 教室", teacher: "余璧婷" },
    { period: 4, subject: "數學輔導", room: "305 教室", teacher: "李俊緯" },
    { period: 5, subject: "國文寫作", room: "305 教室", teacher: "張育愷" },
    { period: 6, subject: "物理輔導", room: "305 教室", teacher: "趙晉鴻" }
  ],
  2: [
    { period: 1, subject: "國文輔導", room: "305 教室", teacher: "張育愷" },
    { period: 2, subject: "化學輔導", room: "305 教室", teacher: "余璧婷" },
    { period: 3, subject: "國文輔導", room: "305 教室", teacher: "張育愷" },
    { period: 4, subject: "數學輔導", room: "305 教室", teacher: "李俊緯" },
    { period: 5, subject: "英文輔導", room: "305 教室", teacher: "鄭慧真" },
    { period: 6, subject: "英文輔導", room: "305 教室", teacher: "鄭慧真" }
  ],
  3: [
    { period: 1, subject: "物理輔導", room: "305 教室", teacher: "趙晉鴻" },
    { period: 2, subject: "物理輔導", room: "305 教室", teacher: "趙晉鴻" },
    { period: 3, subject: "英文輔導", room: "305 教室", teacher: "鄭慧真" },
    { period: 4, subject: "英文輔導", room: "305 教室", teacher: "鄭慧真" },
    { period: 5, subject: "國文輔導", room: "305 教室", teacher: "張育愷" },
    { period: 6, subject: "數學輔導", room: "305 教室", teacher: "李俊緯" }
  ],
  4: [
    { period: 1, subject: "國文輔導", room: "305 教室", teacher: "張育愷" },
    { period: 2, subject: "英語文作文", room: "305 教室", teacher: "鄭慧真" },
    { period: 3, subject: "化學輔導", room: "305 教室", teacher: "余璧婷" },
    { period: 4, subject: "數學輔導", room: "305 教室", teacher: "李俊緯" },
    { period: 5, subject: "國文輔導", room: "305 教室", teacher: "張育愷" },
    { period: 6, subject: "選修生物／選修地球科學", room: "305 教室", teacher: "朱則華、李冠葦" }
  ],
  5: [
    { period: 1, subject: "數學輔導", room: "305 教室", teacher: "李俊緯" },
    { period: 2, subject: "數學輔導", room: "305 教室", teacher: "李俊緯" },
    { period: 3, subject: "生物輔導", room: "305 教室", teacher: "李冠葦" },
    { period: 4, subject: "地球科學輔導", room: "305 教室", teacher: "朱則華" },
    { period: 5, subject: "化學輔導", room: "305 教室", teacher: "余璧婷" },
    { period: 6, subject: "物理輔導", room: "305 教室", teacher: "趙晉鴻" }
  ]
};

const subjectColors = {
  導師時間: "#ece9f8",
  國文輔導: "#f9e8df",
  國文寫作: "#f7e3dc",
  英文輔導: "#e3f0fd",
  英語文作文: "#dcecfb",
  數學輔導: "#e5e9fb",
  物理輔導: "#e2f3ef",
  化學輔導: "#f0e6f6",
  生物輔導: "#e7f2dc",
  地球科學輔導: "#f7edda",
  "選修生物／選修地球科學": "#e4efe4"
};
/* ====================== 課表資料集中區結束 ====================== */

const STORAGE_KEYS = {
  assignments: "campusFlowAssignments",
  exams: "campusFlowExams",
  schedule: "campusFlowWeeklySchedule",
  theme: "campusFlowTheme"
};

const COMPLETED_ASSIGNMENT_RETENTION_DAYS = 30;
const weekdayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const shortDateFormatter = new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric", weekday: "long" });
const fullDateFormatter = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric" });
const deviceDateTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

let weeklySchedule = normalizeSchedule(loadStorage(STORAGE_KEYS.schedule, defaultWeeklySchedule));
let assignments = removeExpiredCompletedAssignments(loadStorage(STORAGE_KEYS.assignments, createDefaultAssignments()));
let exams = loadStorage(STORAGE_KEYS.exams, createDefaultExams());
let pushDevices = [];
let notificationTimer = null;
let toastTimer = null;
let notifiedCourseKey = "";
let currentUser = null;
let cloudUnsubscribers = [];
let messaging = null;
let serviceWorkerRegistration = null;
let maintenanceTimer = null;

const elements = {
  todayDate: document.querySelector("#today-date"),
  todayList: document.querySelector("#today-course-list"),
  todayCount: document.querySelector("#today-course-count"),
  nextCard: document.querySelector("#next-course-card"),
  nextStatus: document.querySelector("#next-course-status"),
  nextName: document.querySelector("#next-course-name"),
  nextMeta: document.querySelector("#next-course-meta"),
  nextCountdown: document.querySelector("#next-course-countdown"),
  nextCountdownLabel: document.querySelector("#next-course-countdown-label"),
  reminderText: document.querySelector("#reminder-text"),
  notificationButton: document.querySelector("#notification-button"),
  notificationMessage: document.querySelector("#notification-message"),
  authButton: document.querySelector("#auth-button"),
  authStatus: document.querySelector("#auth-status"),
  scheduleBody: document.querySelector("#schedule-body"),
  assignmentSummary: document.querySelector("#assignment-summary"),
  assignmentList: document.querySelector("#assignment-list"),
  examList: document.querySelector("#exam-list"),
  learningOverview: document.querySelector("#learning-overview-grid"),
  deviceCount: document.querySelector("#device-count"),
  deviceCountNote: document.querySelector("#device-count-note"),
  deviceSyncState: document.querySelector("#device-sync-state"),
  deviceSyncNote: document.querySelector("#device-sync-note"),
  deviceList: document.querySelector("#device-list"),
  refreshDeviceButton: document.querySelector("#refresh-device-button"),
  gsatCard: document.querySelector("#gsat-home-card"),
  gsatTitle: document.querySelector("#gsat-home-title"),
  gsatDate: document.querySelector("#gsat-home-date"),
  gsatDays: document.querySelector("#gsat-home-days"),
  gsatUnit: document.querySelector("#gsat-home-unit"),
  gsatMessage: document.querySelector("#gsat-home-message"),
  gsatManageButton: document.querySelector("#gsat-manage-button"),
  assignmentModal: document.querySelector("#assignment-modal"),
  assignmentForm: document.querySelector("#assignment-form"),
  examModal: document.querySelector("#exam-modal"),
  examForm: document.querySelector("#exam-form"),
  courseModal: document.querySelector("#course-modal"),
  courseForm: document.querySelector("#course-form"),
  courseDeleteButton: document.querySelector("#delete-course-button"),
  toast: document.querySelector("#toast"),
  themeButton: document.querySelector("#theme-toggle"),
  themeIcon: document.querySelector("#theme-toggle-icon"),
  themeLabel: document.querySelector("#theme-toggle-label"),
  themeColorMeta: document.querySelector("#theme-color-meta"),
  menuButton: document.querySelector(".menu-toggle"),
  navLinks: document.querySelector("#nav-links")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  initializeTheme();
  saveStorage(STORAGE_KEYS.schedule, weeklySchedule);
  saveStorage(STORAGE_KEYS.assignments, assignments);
  populateSubjectOptions();
  renderSchedule();
  renderAssignments();
  renderExams();
  renderDeviceManagement();
  updateLiveCourseState();
  bindEvents();
  setDefaultFormDates();
  initializePwa();
  initializeCloudSync();
  notificationTimer = window.setInterval(updateLiveCourseState, 30000);
  maintenanceTimer = window.setInterval(cleanupCompletedAssignments, 60 * 60 * 1000);
}

function bindEvents() {
  document.querySelector("#add-assignment-button").addEventListener("click", () => openAssignmentModal());
  document.querySelector("#add-exam-button").addEventListener("click", () => openExamModal());
  elements.assignmentForm.addEventListener("submit", saveAssignment);
  elements.courseForm.addEventListener("submit", saveCourse);
  elements.courseDeleteButton.addEventListener("click", deleteCourse);
  elements.examForm.addEventListener("submit", saveExam);
  elements.notificationButton.addEventListener("click", enableBackgroundNotifications);
  elements.refreshDeviceButton.addEventListener("click", refreshCurrentDevice);
  elements.deviceList.addEventListener("click", handleDeviceAction);
  elements.authButton.addEventListener("click", handleAuthButton);
  elements.themeButton.addEventListener("click", toggleTheme);
  elements.gsatManageButton.addEventListener("click", openGsatExamModal);
  elements.menuButton.addEventListener("click", toggleMenu);

  elements.navLinks.addEventListener("click", (event) => {
    if (event.target.matches("a")) closeMenu();
  });

  document.querySelectorAll(".modal-close").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  window.addEventListener("beforeunload", () => {
    if (notificationTimer) window.clearInterval(notificationTimer);
    if (maintenanceTimer) window.clearInterval(maintenanceTimer);
    stopCloudListeners();
  });
}

/* ====================== 白天／黑夜模式 ====================== */

function initializeTheme() {
  const savedTheme = getSavedTheme();
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(savedTheme || systemTheme);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    if (!getSavedTheme()) applyTheme(event.matches ? "dark" : "light");
  });
}

function toggleTheme() {
  const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
  } catch {
    // localStorage 無法使用時仍可在本次瀏覽中切換。
  }
  applyTheme(nextTheme);
  showToast(nextTheme === "dark" ? "已切換為黑夜模式" : "已切換為白天模式");
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  elements.themeButton.setAttribute("aria-pressed", String(isDark));
  elements.themeButton.setAttribute("aria-label", isDark ? "切換為白天模式" : "切換為黑夜模式");
  elements.themeIcon.textContent = isDark ? "☾" : "☀";
  elements.themeLabel.textContent = isDark ? "黑夜" : "白天";
  elements.themeColorMeta.setAttribute("content", isDark ? "#0d1524" : "#f4f7fb");
}

function getSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    return savedTheme === "dark" || savedTheme === "light" ? savedTheme : "";
  } catch {
    return "";
  }
}

/* ====================== Firebase 登入與跨裝置同步 ====================== */

function initializeCloudSync() {
  onAuthStateChanged(auth, async (user) => {
    stopCloudListeners();
    pushDevices = [];
    currentUser = user;
    updateAuthInterface();

    if (!user) {
      assignments = loadStorage(STORAGE_KEYS.assignments, createDefaultAssignments());
      exams = loadStorage(STORAGE_KEYS.exams, createDefaultExams());
      renderAssignments();
      renderExams();
      renderDeviceManagement();
      return;
    }

    setSyncStatus("正在同步雲端資料…");
    try {
      await migrateLocalDataToCloud(user.uid);
      startCloudListeners(user.uid);
      refreshExistingPushToken();
    } catch (error) {
      handleCloudError(error);
    }
  });
}

async function handleAuthButton() {
  elements.authButton.disabled = true;
  try {
    if (currentUser) {
      await removeCurrentPushDevice();
      await signOut(auth);
      showToast("已登出，改用本機資料");
    } else {
      await signInWithPopup(auth, googleProvider);
      showToast("登入成功，開始同步");
    }
  } catch (error) {
    const cancelled = ["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(error.code);
    if (!cancelled) {
      setSyncStatus("登入失敗，請確認 Firebase 已啟用 Google 登入");
      showToast("Google 登入未完成");
      console.error("Firebase authentication failed:", error);
    }
  } finally {
    elements.authButton.disabled = false;
  }
}

function updateAuthInterface() {
  if (currentUser) {
    const displayName = currentUser.displayName || currentUser.email || "已登入";
    elements.authButton.textContent = "登出";
    elements.authButton.setAttribute("aria-label", `登出 ${displayName}`);
    setSyncStatus(`${displayName}・雲端同步中`, true);
  } else {
    elements.authButton.textContent = "Google 登入同步";
    elements.authButton.setAttribute("aria-label", "使用 Google 帳號登入並同步資料");
    setSyncStatus("目前儲存在這台裝置");
  }
  renderDeviceManagement();
}

function setSyncStatus(message, isSynced = false) {
  elements.authStatus.textContent = message;
  elements.authStatus.classList.toggle("is-synced", isSynced);
}

async function migrateLocalDataToCloud(userId) {
  await Promise.all([
    uploadLocalCollectionWhenCloudIsEmpty(userId, "assignments", assignments),
    uploadLocalCollectionWhenCloudIsEmpty(userId, "exams", exams),
    uploadLocalScheduleWhenCloudIsEmpty(userId)
  ]);
}

async function uploadLocalScheduleWhenCloudIsEmpty(userId) {
  const scheduleDocument = doc(database, "users", userId, "settings", "schedule");
  const snapshot = await getDoc(scheduleDocument);
  if (!snapshot.exists()) {
    await setDoc(scheduleDocument, { days: weeklySchedule, updatedAt: Date.now() });
  }
}

async function uploadLocalCollectionWhenCloudIsEmpty(userId, collectionName, items) {
  const cloudCollection = collection(database, "users", userId, collectionName);
  const snapshot = await getDocs(cloudCollection);
  if (!snapshot.empty || !items.length) return;

  const batch = writeBatch(database);
  items.forEach((item) => {
    batch.set(doc(cloudCollection, item.id), { ...item, updatedAt: Date.now() });
  });
  await batch.commit();
}

function startCloudListeners(userId) {
  const subscribe = (collectionName, applyItems) => onSnapshot(
    collection(database, "users", userId, collectionName),
    (snapshot) => {
      const items = snapshot.docs.map((itemDocument) => ({
        ...itemDocument.data(),
        id: itemDocument.id
      }));
      applyItems(items);
      setSyncStatus(`${currentUser?.displayName || "已登入"}・資料已同步`, true);
    },
    handleCloudError
  );

  cloudUnsubscribers = [
    subscribe("assignments", (items) => {
      const expiredItems = items.filter(isExpiredCompletedAssignment);
      const completedWithoutTimestamp = items.filter((item) => item.completed && !Number(item.completedAt));
      assignments = removeExpiredCompletedAssignments(items);
      saveStorage(STORAGE_KEYS.assignments, assignments);
      renderAssignments();
      expiredItems.forEach((item) => deleteCloudRecord("assignments", item.id));
      completedWithoutTimestamp.forEach((item) => {
        const normalizedItem = assignments.find((assignment) => assignment.id === item.id);
        if (normalizedItem) syncCloudRecord("assignments", normalizedItem);
      });
    }),
    subscribe("exams", (items) => {
      exams = items;
      saveStorage(STORAGE_KEYS.exams, exams);
      renderExams();
    }),
    onSnapshot(
      query(collection(database, "pushDevices"), where("uid", "==", userId)),
      (snapshot) => {
        pushDevices = snapshot.docs
          .map((itemDocument) => ({ ...itemDocument.data(), id: itemDocument.id }))
          .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
        renderDeviceManagement();
      },
      handleCloudError
    ),
    onSnapshot(
      doc(database, "users", userId, "settings", "schedule"),
      (snapshot) => {
        if (!snapshot.exists()) return;
        weeklySchedule = normalizeSchedule(snapshot.data().days);
        saveStorage(STORAGE_KEYS.schedule, weeklySchedule);
        populateSubjectOptions();
        updateLiveCourseState();
      },
      handleCloudError
    )
  ];
}

function stopCloudListeners() {
  cloudUnsubscribers.forEach((unsubscribe) => unsubscribe());
  cloudUnsubscribers = [];
}

async function syncCloudRecord(collectionName, item) {
  if (!currentUser) return;
  try {
    await setDoc(
      doc(database, "users", currentUser.uid, collectionName, item.id),
      { ...item, updatedAt: Date.now() }
    );
  } catch (error) {
    handleCloudError(error);
  }
}

async function deleteCloudRecord(collectionName, id) {
  if (!currentUser) return;
  try {
    await deleteDoc(doc(database, "users", currentUser.uid, collectionName, id));
  } catch (error) {
    handleCloudError(error);
  }
}

async function syncSchedule() {
  if (!currentUser) return;
  try {
    await setDoc(
      doc(database, "users", currentUser.uid, "settings", "schedule"),
      { days: weeklySchedule, updatedAt: Date.now() }
    );
  } catch (error) {
    handleCloudError(error);
  }
}

function handleCloudError(error) {
  setSyncStatus("雲端同步暫時失敗，資料仍保存在本機");
  if (elements.deviceSyncState) {
    elements.deviceSyncState.textContent = "同步異常";
    elements.deviceSyncNote.textContent = "請檢查網路後重新整理";
  }
  console.error("Firebase sync failed:", error);
}

/* ====================== PWA 與 Firebase 背景推播 ====================== */

async function initializePwa() {
  if (!("serviceWorker" in navigator)) {
    elements.notificationMessage.textContent = "此瀏覽器不支援背景通知，仍可使用網站內提醒。";
    return;
  }

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register("./firebase-messaging-sw.js", {
      scope: "./"
    });

    if (await isMessagingSupported()) {
      messaging = getMessaging(firebaseApp);
      onMessage(messaging, showForegroundPushMessage);
      refreshExistingPushToken();
    }
  } catch (error) {
    elements.notificationMessage.textContent = "背景服務暫時無法啟動，請重新整理後再試。";
    console.error("PWA initialization failed:", error);
  }
}

async function enableBackgroundNotifications() {
  if (!window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator)) {
    elements.notificationMessage.textContent = "此瀏覽器不支援背景通知，請使用 HTTPS 網址開啟。";
    return;
  }

  if (isIosDevice() && !isStandalonePwa()) {
    elements.notificationMessage.textContent = "iPhone 請先點 Safari 分享按鈕 →「加入主畫面」，再從主畫面開啟校園日程。";
    showToast("請先加入 iPhone 主畫面");
    return;
  }

  if (!currentUser) {
    elements.notificationMessage.textContent = "請先使用 Google 帳號登入，再開啟背景通知。";
    showToast("請先登入 Google 帳號");
    return;
  }

  elements.notificationButton.disabled = true;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      elements.notificationMessage.textContent = permission === "denied"
        ? "通知已被封鎖，請到裝置的通知設定中重新允許。"
        : "尚未允許通知，網站內提醒仍可正常使用。";
      return;
    }

    const token = await registerPushDevice();
    if (!token) throw new Error("FCM did not return a registration token.");

    elements.notificationButton.textContent = "背景通知已開啟";
    elements.notificationMessage.textContent = "設定完成；關閉網站後仍可收到課程、作業與學測倒數通知。";
    showToast("背景通知已開啟");
  } catch (error) {
    elements.notificationMessage.textContent = "背景通知設定失敗，請確認 Firebase Cloud Messaging 已啟用。";
    console.error("Push notification setup failed:", error);
  } finally {
    elements.notificationButton.disabled = false;
  }
}

async function registerPushDevice() {
  if (!messaging || !currentUser) return "";
  serviceWorkerRegistration ||= await navigator.serviceWorker.ready;

  const token = await getToken(messaging, {
    vapidKey: VAPID_PUBLIC_KEY,
    serviceWorkerRegistration
  });
  if (!token) return "";

  const previousDeviceId = getCurrentDeviceId();
  const deviceId = await hashText(token);
  await setDoc(doc(database, "pushDevices", deviceId), {
    uid: currentUser.uid,
    token,
    platform: getDeviceLabel(),
    browser: getBrowserLabel(),
    installMode: isStandalonePwa() ? "主畫面 App" : "瀏覽器",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Taipei",
    updatedAt: Date.now()
  }, { merge: true });
  setCurrentDeviceId(deviceId);

  if (previousDeviceId && previousDeviceId !== deviceId) {
    try {
      await deleteDoc(doc(database, "pushDevices", previousDeviceId));
    } catch (error) {
      console.warn("Old push device cleanup failed:", error);
    }
  }
  return token;
}

async function refreshExistingPushToken() {
  if (!("Notification" in window) || Notification.permission !== "granted" || !messaging || !currentUser) return;
  try {
    const token = await registerPushDevice();
    if (token) {
      elements.notificationButton.textContent = "背景通知已開啟";
      elements.notificationMessage.textContent = "此裝置已啟用課程、作業與學測背景提醒。";
    }
  } catch (error) {
    console.warn("Push token refresh failed:", error);
  }
}

async function removeCurrentPushDevice() {
  const deviceId = getCurrentDeviceId();
  if (!deviceId || !currentUser) return;
  try {
    await deleteDoc(doc(database, "pushDevices", deviceId));
    clearCurrentDeviceId();
  } catch (error) {
    console.warn("Push device removal failed:", error);
  }
}

async function refreshCurrentDevice() {
  if (!currentUser) {
    showToast("請先登入 Google 帳號");
    return;
  }

  if (!("Notification" in window) || Notification.permission !== "granted") {
    await enableBackgroundNotifications();
    return;
  }

  elements.refreshDeviceButton.disabled = true;
  try {
    const token = await registerPushDevice();
    if (!token) throw new Error("FCM did not return a registration token.");
    showToast("這台裝置已更新");
  } catch (error) {
    showToast("裝置更新失敗，請稍後再試");
    console.error("Push device refresh failed:", error);
  } finally {
    elements.refreshDeviceButton.disabled = false;
  }
}

async function handleDeviceAction(event) {
  const button = event.target.closest("button[data-device-action]");
  if (!button || !currentUser) return;

  const deviceId = button.dataset.deviceId;
  const device = pushDevices.find((item) => item.id === deviceId);
  if (!device) return;

  const isCurrentDevice = deviceId === getCurrentDeviceId();
  const confirmation = isCurrentDevice
    ? "移除這台裝置後，將不再收到背景通知。確定要移除嗎？"
    : `確定要移除「${device.platform || "未命名裝置"}」嗎？`;
  if (!window.confirm(confirmation)) return;

  button.disabled = true;
  try {
    await deleteDoc(doc(database, "pushDevices", deviceId));
    if (isCurrentDevice) {
      clearCurrentDeviceId();
      elements.notificationButton.textContent = "開啟背景通知";
      elements.notificationMessage.textContent = "這台裝置的背景通知已關閉，可隨時重新開啟。";
    }
    showToast("裝置已移除");
  } catch (error) {
    button.disabled = false;
    showToast("無法移除裝置，請稍後再試");
    console.error("Push device removal failed:", error);
  }
}

function renderDeviceManagement() {
  if (!elements.deviceList) return;

  elements.refreshDeviceButton.disabled = !currentUser;
  if (!currentUser) {
    elements.deviceCount.textContent = "0 台";
    elements.deviceCountNote.textContent = "登入後即可查看";
    elements.deviceSyncState.textContent = "尚未登入";
    elements.deviceSyncNote.textContent = "使用 Google 帳號同步課表、作業與考試";
    elements.deviceList.innerHTML = '<div class="empty-state">請先登入 Google 帳號，即可查看同步與通知裝置。</div>';
    return;
  }

  const currentDeviceId = getCurrentDeviceId();
  elements.deviceCount.textContent = `${pushDevices.length} 台`;
  elements.deviceCountNote.textContent = pushDevices.length
    ? "已啟用課程、作業與學測通知"
    : "目前沒有啟用背景通知的裝置";
  elements.deviceSyncState.textContent = "即時同步中";
  elements.deviceSyncNote.textContent = currentUser.email || currentUser.displayName || "Google 帳號";

  if (!pushDevices.length) {
    elements.deviceList.innerHTML = '<div class="empty-state">尚未啟用通知裝置。請按「更新這台裝置」完成設定。</div>';
    return;
  }

  elements.deviceList.innerHTML = pushDevices.map((device) => {
    const isCurrentDevice = device.id === currentDeviceId;
    const platform = device.platform || "未知裝置";
    const browser = device.browser || "瀏覽器";
    const installMode = device.installMode || "網頁";
    const statusText = isCurrentDevice ? "這台裝置" : "背景通知";

    return `
      <article class="device-card${isCurrentDevice ? " current-device" : ""}">
        <span class="device-type" aria-hidden="true">${escapeHtml(getDeviceShortCode(platform))}</span>
        <div class="device-card-body">
          <div class="device-card-heading">
            <h3>${escapeHtml(platform)}</h3>
            <span class="device-status${isCurrentDevice ? " is-current" : ""}">${statusText}</span>
          </div>
          <p>${escapeHtml(browser)} · ${escapeHtml(installMode)}</p>
          <small>最後連線：${escapeHtml(formatDeviceUpdatedAt(device.updatedAt))}</small>
        </div>
        <button
          class="button button-secondary device-remove-button"
          type="button"
          data-device-action="remove"
          data-device-id="${escapeHtml(device.id)}"
          aria-label="移除 ${escapeHtml(platform)}">
          移除
        </button>
      </article>
    `;
  }).join("");
}

async function showForegroundPushMessage(payload) {
  const data = payload.data || {};
  const title = data.title || "校園日程提醒";
  const options = {
    body: data.body || "有新的校園日程提醒。",
    icon: data.icon || "./app-icon.png",
    badge: "./app-icon.png",
    tag: data.tag || "campus-flow-reminder",
    data: { url: data.url || "./" }
  };

  if (serviceWorkerRegistration && Notification.permission === "granted") {
    await serviceWorkerRegistration.showNotification(title, options);
  }
}

function isIosDevice() {
  return Boolean(getAppleDeviceType());
}

function isStandalonePwa() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function getDeviceLabel() {
  const appleDevice = getAppleDeviceType();
  if (appleDevice) return appleDevice;
  if (/Android/i.test(navigator.userAgent)) return "Android";
  return "電腦瀏覽器";
}

function getAppleDeviceType() {
  const userAgent = navigator.userAgent;
  if (/iPad/i.test(userAgent)) return "iPad";
  if (/iPhone|iPod/i.test(userAgent)) return "iPhone";

  // iPadOS 13 之後可能使用桌面版 Mac User-Agent。
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return "iPad";
  return "";
}

function getBrowserLabel() {
  const userAgent = navigator.userAgent;
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/CriOS/i.test(userAgent)) return "Google Chrome";
  if (/FxiOS/i.test(userAgent)) return "Firefox";
  if (/Chrome/i.test(userAgent)) return "Google Chrome";
  if (/Firefox/i.test(userAgent)) return "Firefox";
  if (/Safari/i.test(userAgent)) return "Safari";
  return "瀏覽器";
}

function getDeviceShortCode(platform) {
  if (/iPhone/i.test(platform)) return "IPH";
  if (/iPad/i.test(platform)) return "IPD";
  if (/Android/i.test(platform)) return "AND";
  return "WEB";
}

function formatDeviceUpdatedAt(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "尚無紀錄";
  return deviceDateTimeFormatter.format(new Date(timestamp));
}

function getCurrentDeviceId() {
  try {
    return localStorage.getItem("campusFlowPushDeviceId") || "";
  } catch {
    return "";
  }
}

function setCurrentDeviceId(deviceId) {
  try {
    localStorage.setItem("campusFlowPushDeviceId", deviceId);
  } catch {
    // 無法使用 localStorage 時仍保留雲端通知註冊。
  }
}

function clearCurrentDeviceId() {
  try {
    localStorage.removeItem("campusFlowPushDeviceId");
  } catch {
    // 無法使用 localStorage 時，雲端裝置資料仍已移除。
  }
}

async function hashText(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function updateLiveCourseState() {
  const now = new Date();
  const day = now.getDay();
  const todayCourses = weeklySchedule[day] || [];
  const liveState = getLiveCourseState(now, todayCourses);

  elements.todayDate.textContent = `${shortDateFormatter.format(now)} · ${getDailyGreeting(now)}`;
  renderTodayCourses(todayCourses, liveState);
  renderNextCourse(liveState);
  renderLearningOverview();
  renderSchedule(liveState);
  maybeSendClassNotification(liveState);
}

function getLiveCourseState(now, todayCourses) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentCourse = todayCourses.find((course) => {
    const time = getPeriodTime(course.period);
    return currentMinutes >= time.startMinutes && currentMinutes < time.endMinutes;
  }) || null;

  const nextCourse = todayCourses.find((course) => {
    const time = getPeriodTime(course.period);
    return time.startMinutes > currentMinutes;
  }) || null;

  const minutesUntil = nextCourse
    ? Math.max(0, getPeriodTime(nextCourse.period).startMinutes - currentMinutes)
    : null;

  return { now, currentCourse, nextCourse, minutesUntil };
}

function renderTodayCourses(courses, liveState) {
  elements.todayCount.textContent = `${courses.length} 節課`;

  if (!courses.length) {
    elements.todayList.innerHTML = `<div class="empty-state">今日沒有課程，好好休息，也可以整理下週計畫。</div>`;
    return;
  }

  elements.todayList.innerHTML = courses.map((course) => {
    const time = getPeriodTime(course.period);
    const isCurrent = liveState.currentCourse?.period === course.period;
    const isNext = liveState.nextCourse?.period === course.period;
    const className = isCurrent ? "current" : isNext ? "next" : "";
    const state = isCurrent ? "進行中" : isNext ? "下一節" : "";

    return `
      <div class="today-course ${className}">
        <span class="period-badge">${course.period}</span>
        <div>
          <strong>${escapeHtml(course.subject)}</strong>
          <small>${time.start}–${time.end} · ${escapeHtml(course.room)}</small>
        </div>
        <span class="course-state">${state}</span>
      </div>`;
  }).join("");
}

function renderNextCourse(liveState) {
  const { now, currentCourse, nextCourse, minutesUntil } = liveState;
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  if (nextCourse) {
    const time = getPeriodTime(nextCourse.period);
    elements.nextStatus.textContent = currentCourse ? `目前：${currentCourse.subject}` : "下一節課";
    elements.nextName.textContent = nextCourse.subject;
    elements.nextMeta.textContent = `${time.start}–${time.end} · ${nextCourse.room} · ${nextCourse.teacher}`;
    elements.nextCountdown.textContent = formatMinutes(minutesUntil);
    elements.nextCountdownLabel.textContent = "距離上課時間";
    elements.reminderText.textContent = `${nextCourse.subject}將於 ${time.start} 在${nextCourse.room}上課，剩餘 ${formatMinutes(minutesUntil)}。`;
    return;
  }

  if (currentCourse) {
    const time = getPeriodTime(currentCourse.period);
    elements.nextStatus.textContent = "目前課程";
    elements.nextName.textContent = currentCourse.subject;
    elements.nextMeta.textContent = `${time.start}–${time.end} · ${currentCourse.room} · ${currentCourse.teacher}`;
    elements.nextCountdown.textContent = "本日最後一堂";
    elements.nextCountdownLabel.textContent = "專心完成今天的課程";
    elements.reminderText.textContent = `目前正在上${currentCourse.subject}，今天沒有其他待上課程。`;
    return;
  }

  elements.nextStatus.textContent = isWeekend ? "週末模式" : "今日完成";
  elements.nextName.textContent = isWeekend ? "今日沒有課程" : "今天的課程已結束";
  elements.nextMeta.textContent = "下一個上課日再見";
  elements.nextCountdown.textContent = "好好休息";
  elements.nextCountdownLabel.textContent = "也別忘了查看作業與考試";
  elements.reminderText.textContent = isWeekend ? "週末沒有課程提醒。" : "今天已沒有其他課程提醒。";
}

function renderSchedule(liveState = getLiveCourseState(new Date(), weeklySchedule[new Date().getDay()] || [])) {
  const currentDay = liveState.now.getDay();

  elements.scheduleBody.innerHTML = periodTimes.map((time) => {
    const cells = [1, 2, 3, 4, 5].map((day) => {
      const course = weeklySchedule[day].find((item) => item.period === time.period);
      if (!course) {
        return `
          <td>
            <button class="course-button empty-course" type="button"
              aria-label="新增${weekdayNames[day]}第 ${time.period} 節課程"
              data-day="${day}" data-period="${time.period}">
              <strong>＋</strong>
              <small>新增課程</small>
            </button>
          </td>`;
      }

      const isCurrent = day === currentDay && liveState.currentCourse?.period === time.period;
      const isNext = day === currentDay && liveState.nextCourse?.period === time.period;
      const stateClass = isCurrent ? "current-course" : isNext ? "next-course" : "";
      const label = `${weekdayNames[day]}第 ${time.period} 節，${course.subject}，${course.room}，${course.teacher}`;

      return `
        <td>
          <button class="course-button ${stateClass}" type="button"
            style="--course-color:${subjectColors[course.subject] || "#edf2f8"}"
            aria-label="${escapeHtml(label)}"
            data-day="${day}" data-period="${time.period}">
            <strong>${escapeHtml(course.subject)}</strong>
            <small>${escapeHtml(course.room)}</small>
          </button>
        </td>`;
    }).join("");

    return `
      <tr>
        <td>第 ${time.period} 節</td>
        <td class="schedule-time">${time.start}<br>${time.end}</td>
        ${cells}
      </tr>`;
  }).join("");

  elements.scheduleBody.querySelectorAll(".course-button").forEach((button) => {
    button.addEventListener("click", () => openCourseModal(Number(button.dataset.day), Number(button.dataset.period)));
  });
}

function openCourseModal(day, period) {
  const course = weeklySchedule[day].find((item) => item.period === period);
  const time = getPeriodTime(period);

  elements.courseForm.reset();
  document.querySelector("#course-day").value = String(day);
  document.querySelector("#course-period").value = String(period);
  document.querySelector("#course-modal-title").textContent = course ? "編輯課程" : "新增課程";
  document.querySelector("#course-slot").textContent =
    `${weekdayNames[day]}・第 ${period} 節・${time.start}–${time.end}`;
  document.querySelector("#course-subject").value = course?.subject || "";
  document.querySelector("#course-room").value = course?.room || "305 教室";
  document.querySelector("#course-teacher").value = course?.teacher || "";
  document.querySelector("#course-error").textContent = "";
  elements.courseDeleteButton.hidden = !course;
  elements.courseModal.showModal();
}

async function saveCourse(event) {
  event.preventDefault();
  const day = Number(document.querySelector("#course-day").value);
  const period = Number(document.querySelector("#course-period").value);
  const subject = document.querySelector("#course-subject").value.trim();
  const room = document.querySelector("#course-room").value.trim();
  const teacher = document.querySelector("#course-teacher").value.trim();
  const error = document.querySelector("#course-error");

  if (!subject || !room || !teacher) {
    error.textContent = "請完整填寫科目、教室與任課老師。";
    return;
  }

  const course = { period, subject, room, teacher };
  weeklySchedule[day] = [
    ...weeklySchedule[day].filter((item) => item.period !== period),
    course
  ].sort((a, b) => a.period - b.period);

  saveStorage(STORAGE_KEYS.schedule, weeklySchedule);
  populateSubjectOptions();
  updateLiveCourseState();
  elements.courseModal.close();
  showToast("課表已更新");
  await syncSchedule();
}

async function deleteCourse() {
  const day = Number(document.querySelector("#course-day").value);
  const period = Number(document.querySelector("#course-period").value);
  const course = weeklySchedule[day].find((item) => item.period === period);
  if (!course || !window.confirm(`確定要刪除「${course.subject}」嗎？`)) return;

  weeklySchedule[day] = weeklySchedule[day].filter((item) => item.period !== period);
  saveStorage(STORAGE_KEYS.schedule, weeklySchedule);
  populateSubjectOptions();
  updateLiveCourseState();
  elements.courseModal.close();
  showToast("課程已刪除");
  await syncSchedule();
}

function renderAssignments() {
  const sorted = [...assignments].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    return parseDate(a.dueDate) - parseDate(b.dueDate);
  });

  const counts = sorted.reduce((result, item) => {
    const status = getDueStatus(item);
    result.total += 1;
    if (item.completed) result.completed += 1;
    if (status.key === "overdue") result.overdue += 1;
    if (status.key === "today" || status.key === "tomorrow") result.soon += 1;
    return result;
  }, { total: 0, completed: 0, overdue: 0, soon: 0 });

  elements.assignmentSummary.innerHTML = [
    ["全部作業", counts.total],
    ["即將到期", counts.soon],
    ["已逾期", counts.overdue],
    ["已完成", counts.completed]
  ].map(([label, value]) => `<div class="summary-card"><span>${label}</span><strong>${value}</strong></div>`).join("");
  renderLearningOverview();

  if (!sorted.length) {
    elements.assignmentList.innerHTML = `<div class="empty-state">目前沒有作業。新增一項，開始規劃吧！</div>`;
    return;
  }

  elements.assignmentList.innerHTML = sorted.map((item) => {
    const status = getDueStatus(item);
    const urgent = !item.completed && ["overdue", "today", "tomorrow"].includes(status.key);
    return `
      <article class="assignment-card ${item.completed ? "completed" : ""} ${urgent ? "urgent" : ""}">
        <button class="check-button" type="button" data-action="toggle" data-id="${item.id}"
          aria-label="${item.completed ? "取消完成" : "標記完成"}：${escapeHtml(item.content)}">${item.completed ? "✓" : ""}</button>
        <div>
          <span class="tag">${escapeHtml(item.subject)}</span>
          <p class="assignment-content">${escapeHtml(item.content)}</p>
        </div>
        <span class="due-badge ${status.key}">${status.label}</span>
        <div class="card-actions">
          <button class="icon-button" type="button" data-action="edit" data-id="${item.id}" aria-label="編輯作業">✎</button>
          <button class="icon-button danger" type="button" data-action="delete" data-id="${item.id}" aria-label="刪除作業">⌫</button>
        </div>
      </article>`;
  }).join("");

  elements.assignmentList.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAssignmentAction(button.dataset.action, button.dataset.id));
  });
}

function openAssignmentModal(item = null) {
  elements.assignmentForm.reset();
  clearErrors("assignment");
  document.querySelector("#assignment-id").value = item?.id || "";
  document.querySelector("#assignment-modal-title").textContent = item ? "編輯作業" : "新增作業";
  document.querySelector("#assignment-subject").value = item?.subject || "國文";
  document.querySelector("#assignment-content").value = item?.content || "";
  document.querySelector("#assignment-due").value = item?.dueDate || toDateInput(addDays(new Date(), 2));
  elements.assignmentModal.showModal();
}

async function saveAssignment(event) {
  event.preventDefault();
  const id = document.querySelector("#assignment-id").value;
  const subject = document.querySelector("#assignment-subject").value;
  const content = document.querySelector("#assignment-content").value.trim();
  const dueDate = document.querySelector("#assignment-due").value;

  clearErrors("assignment");
  let valid = true;
  if (!content) {
    document.querySelector("#assignment-content-error").textContent = "請輸入作業內容。";
    valid = false;
  }
  if (!dueDate) {
    document.querySelector("#assignment-due-error").textContent = "請選擇繳交日期。";
    valid = false;
  }
  if (!valid) return;

  let savedAssignment;
  if (id) {
    assignments = assignments.map((item) => item.id === id ? { ...item, subject, content, dueDate } : item);
    savedAssignment = assignments.find((item) => item.id === id);
    showToast("資料已更新");
  } else {
    savedAssignment = {
      id: createId(),
      subject,
      content,
      dueDate,
      completed: false,
      completedAt: null,
      createdAt: Date.now()
    };
    assignments.push(savedAssignment);
    showToast("作業新增成功");
  }

  saveStorage(STORAGE_KEYS.assignments, assignments);
  renderAssignments();
  elements.assignmentModal.close();
  await syncCloudRecord("assignments", savedAssignment);
}

async function handleAssignmentAction(action, id) {
  const item = assignments.find((assignment) => assignment.id === id);
  if (!item) return;

  if (action === "edit") {
    openAssignmentModal(item);
  } else if (action === "toggle") {
    item.completed = !item.completed;
    item.completedAt = item.completed ? Date.now() : null;
    saveStorage(STORAGE_KEYS.assignments, assignments);
    renderAssignments();
    showToast(item.completed ? "作業已完成" : "已改為未完成");
    await syncCloudRecord("assignments", item);
  } else if (action === "delete" && window.confirm(`確定要刪除「${item.content}」嗎？此操作無法復原。`)) {
    assignments = assignments.filter((assignment) => assignment.id !== id);
    saveStorage(STORAGE_KEYS.assignments, assignments);
    renderAssignments();
    showToast("作業已刪除");
    await deleteCloudRecord("assignments", id);
  }
}

function removeExpiredCompletedAssignments(items) {
  const completedAtFallback = Date.now();
  return (Array.isArray(items) ? items : [])
    .filter((item) => !isExpiredCompletedAssignment(item))
    .map((item) => item.completed && !Number(item.completedAt)
      ? { ...item, completedAt: completedAtFallback }
      : item);
}

function isExpiredCompletedAssignment(item) {
  if (!item?.completed) return false;
  const completedAt = Number(item.completedAt);
  if (!Number.isFinite(completedAt) || completedAt <= 0) return false;
  return Date.now() - completedAt >= COMPLETED_ASSIGNMENT_RETENTION_DAYS * 86400000;
}

async function cleanupCompletedAssignments() {
  const expiredItems = assignments.filter(isExpiredCompletedAssignment);
  if (!expiredItems.length) return;

  const expiredIds = new Set(expiredItems.map((item) => item.id));
  assignments = assignments.filter((item) => !expiredIds.has(item.id));
  saveStorage(STORAGE_KEYS.assignments, assignments);
  renderAssignments();
  await Promise.all(expiredItems.map((item) => deleteCloudRecord("assignments", item.id)));
  showToast("已自動清除完成超過 30 天的作業");
}

function renderExams() {
  const sorted = [...exams].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  renderGsatCountdown();
  renderLearningOverview();
  if (!sorted.length) {
    elements.examList.innerHTML = `<div class="empty-state">目前沒有考試。新增重要日期，讓準備更從容。</div>`;
    return;
  }

  const examColors = { 段考: "#315fbc", 模擬考: "#7a59a5", 學測: "#d06b43", 其他考試: "#39816a" };

  elements.examList.innerHTML = sorted.map((exam) => {
    const days = daysBetweenToday(exam.date);
    const countLabel = days < 0 ? "已結束" : days === 0 ? "就是今天" : `還有 ${days} 天`;
    return `
      <article class="exam-card ${days >= 0 && days <= 7 ? "soon" : ""}" style="--exam-color:${examColors[exam.type] || examColors["其他考試"]}">
        <span class="tag">${escapeHtml(exam.type)}</span>
        <div class="card-actions">
          <button class="icon-button" type="button" data-action="edit" data-id="${exam.id}" aria-label="編輯考試">✎</button>
          <button class="icon-button danger" type="button" data-action="delete" data-id="${exam.id}" aria-label="刪除考試">⌫</button>
        </div>
        <h3>${escapeHtml(exam.name)}</h3>
        <p class="exam-date">${fullDateFormatter.format(parseDate(exam.date))}</p>
        <div class="exam-count">${days >= 0 ? `<strong>${days}</strong><span>天</span>` : `<strong>—</strong>`}</div>
        <span class="due-badge ${days < 0 ? "done" : days <= 7 ? "tomorrow" : ""}">${countLabel}</span>
      </article>`;
  }).join("");

  elements.examList.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleExamAction(button.dataset.action, button.dataset.id));
  });
}

function renderGsatCountdown() {
  const gsat = getUpcomingGsat();
  elements.gsatCard.classList.toggle("is-empty", !gsat);
  elements.gsatCard.classList.remove("is-today");

  if (!gsat) {
    elements.gsatTitle.textContent = "尚未設定學測日期";
    elements.gsatDate.textContent = "請在考試管理新增一筆「學測」類型的考試。";
    elements.gsatDays.textContent = "—";
    elements.gsatUnit.textContent = "";
    elements.gsatMessage.textContent = "設定日期後，首頁與每日通知都會自動開始倒數。";
    elements.gsatManageButton.textContent = "設定學測日期";
    return;
  }

  const days = daysBetweenToday(gsat.date);
  elements.gsatTitle.textContent = gsat.name;
  elements.gsatDate.textContent = fullDateFormatter.format(parseDate(gsat.date));
  elements.gsatDays.textContent = days === 0 ? "今天" : String(days);
  elements.gsatUnit.textContent = days === 0 ? "" : "天";
  elements.gsatMessage.textContent = days === 0
    ? "沉著應試，相信一路累積的準備。"
    : "每天完成一個小目標，穩定靠近理想校系。";
  elements.gsatManageButton.textContent = "調整學測日期";
  elements.gsatCard.classList.toggle("is-today", days === 0);
}

function getUpcomingGsat() {
  return exams
    .filter((exam) => exam.type === "學測" && daysBetweenToday(exam.date) >= 0)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date))[0] || null;
}

function openGsatExamModal() {
  const gsat = getUpcomingGsat();
  if (gsat) {
    openExamModal(gsat);
    return;
  }

  openExamModal();
  document.querySelector("#exam-type").value = "學測";
  document.querySelector("#exam-name").value = "學科能力測驗";
}

function openExamModal(item = null) {
  elements.examForm.reset();
  clearErrors("exam");
  document.querySelector("#exam-id").value = item?.id || "";
  document.querySelector("#exam-modal-title").textContent = item ? "編輯考試" : "新增考試";
  document.querySelector("#exam-type").value = item?.type || "段考";
  document.querySelector("#exam-name").value = item?.name || "";
  document.querySelector("#exam-date").value = item?.date || toDateInput(addDays(new Date(), 14));
  elements.examModal.showModal();
}

async function saveExam(event) {
  event.preventDefault();
  const id = document.querySelector("#exam-id").value;
  const type = document.querySelector("#exam-type").value;
  const name = document.querySelector("#exam-name").value.trim();
  const date = document.querySelector("#exam-date").value;

  clearErrors("exam");
  let valid = true;
  if (!name) {
    document.querySelector("#exam-name-error").textContent = "請輸入考試名稱。";
    valid = false;
  }
  if (!date) {
    document.querySelector("#exam-date-error").textContent = "請選擇考試日期。";
    valid = false;
  }
  if (!valid) return;

  let savedExam;
  if (id) {
    exams = exams.map((item) => item.id === id ? { ...item, type, name, date } : item);
    savedExam = exams.find((item) => item.id === id);
    showToast("資料已更新");
  } else {
    savedExam = { id: createId(), type, name, date };
    exams.push(savedExam);
    showToast("考試新增成功");
  }

  saveStorage(STORAGE_KEYS.exams, exams);
  renderExams();
  elements.examModal.close();
  await syncCloudRecord("exams", savedExam);
}

async function handleExamAction(action, id) {
  const item = exams.find((exam) => exam.id === id);
  if (!item) return;
  if (action === "edit") {
    openExamModal(item);
  } else if (action === "delete" && window.confirm(`確定要刪除「${item.name}」嗎？`)) {
    exams = exams.filter((exam) => exam.id !== id);
    saveStorage(STORAGE_KEYS.exams, exams);
    renderExams();
    showToast("考試已刪除");
    await deleteCloudRecord("exams", id);
  }
}

function renderLearningOverview() {
  const pendingAssignments = assignments.filter((item) => !item.completed);
  const dueWithinSevenDays = pendingAssignments.filter((item) => {
    const days = daysBetweenToday(item.dueDate);
    return days >= 0 && days <= 7;
  });
  const upcomingExam = exams
    .filter((exam) => daysBetweenToday(exam.date) >= 0)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date))[0];
  const completedCount = assignments.filter((item) => item.completed).length;
  const completionRate = assignments.length
    ? Math.round((completedCount / assignments.length) * 100)
    : 0;
  const examLabel = upcomingExam
    ? `${upcomingExam.name}・${daysBetweenToday(upcomingExam.date)} 天`
    : "尚未設定";

  elements.learningOverview.innerHTML = createAnalysisCards([
    ["待", "待完成作業", `${pendingAssignments.length} 項`],
    ["近", "七日內到期", `${dueWithinSevenDays.length} 項`],
    ["考", "最近考試", examLabel],
    ["成", "作業完成率", `${completionRate}%`]
  ]);
}

function createAnalysisCards(items) {
  return items.map(([icon, label, value]) => `
    <article class="analysis-card">
      <span class="analysis-icon" aria-hidden="true">${escapeHtml(String(icon))}</span>
      <span>${escapeHtml(String(label))}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>`).join("");
}

function maybeSendClassNotification(liveState) {
  if (!("Notification" in window) || Notification.permission !== "granted" || !liveState.nextCourse) return;
  if (liveState.minutesUntil < 0 || liveState.minutesUntil > 10) return;

  const course = liveState.nextCourse;
  const key = `${toDateInput(liveState.now)}-${course.period}`;
  if (notifiedCourseKey === key) return;

  const time = getPeriodTime(course.period);
  const options = {
    body: `${time.start} 在${course.room}上課，還有 ${liveState.minutesUntil} 分鐘。`,
    icon: "./app-icon.png",
    badge: "./app-icon.png",
    tag: key,
    data: { url: "./" }
  };
  if (serviceWorkerRegistration) {
    serviceWorkerRegistration.showNotification(`準備上課：${course.subject}`, options);
  } else {
    new Notification(`準備上課：${course.subject}`, options);
  }
  notifiedCourseKey = key;
}

function populateSubjectOptions() {
  const subjects = [...new Set([
    ...Object.values(defaultWeeklySchedule).flat(),
    ...Object.values(weeklySchedule).flat()
  ].map((course) => course.subject))];
  document.querySelector("#assignment-subject").innerHTML = subjects
    .map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`)
    .join("");
}

function normalizeSchedule(value) {
  const source = value && typeof value === "object" ? value : defaultWeeklySchedule;
  return Object.fromEntries([1, 2, 3, 4, 5].map((day) => {
    const courses = Array.isArray(source[day]) ? source[day] : [];
    const normalizedCourses = courses
      .filter((course) => periodTimes.some((time) => time.period === Number(course?.period)))
      .map((course) => ({
        period: Number(course.period),
        subject: String(course.subject || "").trim(),
        room: String(course.room || "").trim(),
        teacher: String(course.teacher || "").trim()
      }))
      .filter((course) => course.subject)
      .sort((a, b) => a.period - b.period);
    return [day, normalizedCourses];
  }));
}

function setDefaultFormDates() {
  document.querySelector("#assignment-due").value = toDateInput(addDays(new Date(), 2));
  document.querySelector("#exam-date").value = toDateInput(addDays(new Date(), 14));
}

function getPeriodTime(period) {
  const time = periodTimes.find((item) => item.period === period);
  const [startHour, startMinute] = time.start.split(":").map(Number);
  const [endHour, endMinute] = time.end.split(":").map(Number);
  return {
    ...time,
    startMinutes: startHour * 60 + startMinute,
    endMinutes: endHour * 60 + endMinute
  };
}

function getDueStatus(item) {
  if (item.completed) return { key: "done", label: "已完成" };
  const days = daysBetweenToday(item.dueDate);
  if (days < 0) return { key: "overdue", label: "已逾期" };
  if (days === 0) return { key: "today", label: "今天到期" };
  if (days === 1) return { key: "tomorrow", label: "明天到期" };
  return { key: "future", label: `${days} 天後` };
}

function daysBetweenToday(dateString) {
  const today = startOfDay(new Date());
  const target = startOfDay(parseDate(dateString));
  return Math.round((target - today) / 86400000);
}

function parseDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const result = startOfDay(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMinutes(minutes) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `${hours} 小時 ${remaining} 分` : `${hours} 小時`;
  }
  return `${minutes} 分鐘`;
}

function getDailyGreeting(date) {
  const hour = date.getHours();
  if (hour < 11) return "早安";
  if (hour < 14) return "午安";
  if (hour < 18) return "下午好";
  return "晚安";
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.warn(`讀取 ${key} 失敗，已使用預設資料。`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`儲存 ${key} 失敗。`, error);
    showToast("瀏覽器儲存空間目前無法使用");
  }
}

function createDefaultAssignments() {
  return [
    { id: "demo-a1", subject: "數學輔導", content: "完成講義二次函數練習", dueDate: toDateInput(addDays(new Date(), 1)), completed: false },
    { id: "demo-a2", subject: "英文輔導", content: "背誦第三課單字與例句", dueDate: toDateInput(addDays(new Date(), 3)), completed: false },
    { id: "demo-a3", subject: "物理輔導", content: "整理牛頓運動定律實驗紀錄", dueDate: toDateInput(addDays(new Date(), 6)), completed: false }
  ];
}

function createDefaultExams() {
  return [
    { id: "demo-e1", type: "段考", name: "第一次段考", date: toDateInput(addDays(new Date(), 18)) },
    { id: "demo-e2", type: "模擬考", name: "全校模擬考", date: toDateInput(addDays(new Date(), 42)) },
    { id: "demo-e3", type: "學測", name: "學科能力測驗", date: toDateInput(addDays(new Date(), 168)) }
  ];
}

function clearErrors(prefix) {
  document.querySelectorAll(`[id^="${prefix}-"][id$="-error"]`).forEach((element) => {
    element.textContent = "";
  });
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function toggleMenu() {
  const open = elements.menuButton.getAttribute("aria-expanded") === "true";
  elements.menuButton.setAttribute("aria-expanded", String(!open));
  elements.menuButton.setAttribute("aria-label", open ? "開啟導覽選單" : "關閉導覽選單");
  elements.navLinks.classList.toggle("open", !open);
}

function closeMenu() {
  elements.menuButton.setAttribute("aria-expanded", "false");
  elements.menuButton.setAttribute("aria-label", "開啟導覽選單");
  elements.navLinks.classList.remove("open");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
