"use strict";

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

const weeklySchedule = {
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
  exams: "campusFlowExams"
};

const weekdayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const shortDateFormatter = new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric", weekday: "long" });
const fullDateFormatter = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric" });

let assignments = loadStorage(STORAGE_KEYS.assignments, createDefaultAssignments());
let exams = loadStorage(STORAGE_KEYS.exams, createDefaultExams());
let notificationTimer = null;
let toastTimer = null;
let notifiedCourseKey = "";

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
  scheduleBody: document.querySelector("#schedule-body"),
  assignmentSummary: document.querySelector("#assignment-summary"),
  assignmentList: document.querySelector("#assignment-list"),
  examList: document.querySelector("#exam-list"),
  analysis: document.querySelector("#free-period-analysis"),
  assignmentModal: document.querySelector("#assignment-modal"),
  assignmentForm: document.querySelector("#assignment-form"),
  examModal: document.querySelector("#exam-modal"),
  examForm: document.querySelector("#exam-form"),
  courseModal: document.querySelector("#course-modal"),
  toast: document.querySelector("#toast"),
  menuButton: document.querySelector(".menu-toggle"),
  navLinks: document.querySelector("#nav-links")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  populateSubjectOptions();
  renderSchedule();
  renderAssignments();
  renderExams();
  updateLiveCourseState();
  bindEvents();
  setDefaultFormDates();
  notificationTimer = window.setInterval(updateLiveCourseState, 30000);
}

function bindEvents() {
  document.querySelector("#add-assignment-button").addEventListener("click", () => openAssignmentModal());
  document.querySelector("#add-exam-button").addEventListener("click", () => openExamModal());
  elements.assignmentForm.addEventListener("submit", saveAssignment);
  elements.examForm.addEventListener("submit", saveExam);
  elements.notificationButton.addEventListener("click", requestNotificationPermission);
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
  });
}

function updateLiveCourseState() {
  const now = new Date();
  const day = now.getDay();
  const todayCourses = weeklySchedule[day] || [];
  const liveState = getLiveCourseState(now, todayCourses);

  elements.todayDate.textContent = `${shortDateFormatter.format(now)} · ${getDailyGreeting(now)}`;
  renderTodayCourses(todayCourses, liveState);
  renderNextCourse(liveState);
  renderFreePeriodAnalysis(todayCourses, day);
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
      if (!course) return `<td><span class="empty-period" aria-label="空堂">—</span></td>`;

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
  if (!course) return;

  document.querySelector("#course-modal-title").textContent = course.subject;
  document.querySelector("#course-detail").innerHTML = `
    <div class="detail-row"><span>上課日</span><strong>${weekdayNames[day]}</strong></div>
    <div class="detail-row"><span>節次</span><strong>第 ${period} 節</strong></div>
    <div class="detail-row"><span>時間</span><strong>${time.start}–${time.end}</strong></div>
    <div class="detail-row"><span>教室</span><strong>${escapeHtml(course.room)}</strong></div>
    <div class="detail-row"><span>任課老師</span><strong>${escapeHtml(course.teacher)}</strong></div>
    <div class="detail-row"><span>課前提醒</span><strong>建議提早 5 分鐘到教室</strong></div>`;
  elements.courseModal.showModal();
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

function saveAssignment(event) {
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

  if (id) {
    assignments = assignments.map((item) => item.id === id ? { ...item, subject, content, dueDate } : item);
    showToast("資料已更新");
  } else {
    assignments.push({ id: createId(), subject, content, dueDate, completed: false });
    showToast("作業新增成功");
  }

  saveStorage(STORAGE_KEYS.assignments, assignments);
  renderAssignments();
  elements.assignmentModal.close();
}

function handleAssignmentAction(action, id) {
  const item = assignments.find((assignment) => assignment.id === id);
  if (!item) return;

  if (action === "edit") {
    openAssignmentModal(item);
  } else if (action === "toggle") {
    item.completed = !item.completed;
    saveStorage(STORAGE_KEYS.assignments, assignments);
    renderAssignments();
    showToast(item.completed ? "作業已完成" : "已改為未完成");
  } else if (action === "delete" && window.confirm(`確定要刪除「${item.content}」嗎？此操作無法復原。`)) {
    assignments = assignments.filter((assignment) => assignment.id !== id);
    saveStorage(STORAGE_KEYS.assignments, assignments);
    renderAssignments();
    showToast("作業已刪除");
  }
}

function renderExams() {
  const sorted = [...exams].sort((a, b) => parseDate(a.date) - parseDate(b.date));
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

function saveExam(event) {
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

  if (id) {
    exams = exams.map((item) => item.id === id ? { ...item, type, name, date } : item);
    showToast("資料已更新");
  } else {
    exams.push({ id: createId(), type, name, date });
    showToast("考試新增成功");
  }

  saveStorage(STORAGE_KEYS.exams, exams);
  renderExams();
  elements.examModal.close();
}

function handleExamAction(action, id) {
  const item = exams.find((exam) => exam.id === id);
  if (!item) return;
  if (action === "edit") {
    openExamModal(item);
  } else if (action === "delete" && window.confirm(`確定要刪除「${item.name}」嗎？`)) {
    exams = exams.filter((exam) => exam.id !== id);
    saveStorage(STORAGE_KEYS.exams, exams);
    renderExams();
    showToast("考試已刪除");
  }
}

function renderFreePeriodAnalysis(courses, day) {
  if (day === 0 || day === 6) {
    elements.analysis.innerHTML = createAnalysisCards([
      ["休", "今日課程", "0 節"],
      ["空", "空堂時段", "今日為週末"],
      ["長", "最長空堂", "不適用"],
      ["學", "讀書建議", "安排 45 分鐘複習"]
    ]);
    return;
  }

  const occupied = courses.map((course) => course.period);
  const first = Math.min(...occupied);
  const last = Math.max(...occupied);
  const freePeriods = periodTimes
    .map((time) => time.period)
    .filter((period) => period >= first && period <= last && !occupied.includes(period));
  const longest = getLongestConsecutiveRun(freePeriods);
  const freeLabel = freePeriods.length ? freePeriods.map((period) => `第 ${period} 節`).join("、") : "沒有空堂";
  const suggestion = freePeriods.length
    ? `可安排約 ${freePeriods.length * 40} 分鐘`
    : "今日課程較為集中";

  elements.analysis.innerHTML = createAnalysisCards([
    ["課", "今日課程", `${courses.length} 節`],
    ["空", "空堂時段", freeLabel],
    ["長", "最長空堂", `${longest} 節`],
    ["學", "讀書建議", suggestion]
  ]);
}

function createAnalysisCards(items) {
  return items.map(([icon, label, value]) => `
    <article class="analysis-card">
      <span class="analysis-icon" aria-hidden="true">${icon}</span>
      <span>${label}</span>
      <strong>${value}</strong>
    </article>`).join("");
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    elements.notificationMessage.textContent = "此瀏覽器不支援通知功能，課程提醒仍會顯示在網站內。";
    return;
  }

  if (!window.isSecureContext) {
    elements.notificationMessage.textContent = "瀏覽器通知需透過 HTTPS 或 localhost 開啟；目前仍可使用頁面內提醒。";
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      elements.notificationMessage.textContent = "課程通知已開啟，將於上課前 10 分鐘提醒。";
      showToast("課程通知已開啟");
      updateLiveCourseState();
    } else if (permission === "denied") {
      elements.notificationMessage.textContent = "通知權限已被封鎖，可至瀏覽器網站設定中重新開啟。";
    } else {
      elements.notificationMessage.textContent = "尚未開啟通知，課程提醒仍會顯示在網站內。";
    }
  } catch (error) {
    elements.notificationMessage.textContent = "暫時無法開啟通知，請稍後再試。";
    console.warn("通知權限請求失敗：", error);
  }
}

function maybeSendClassNotification(liveState) {
  if (!("Notification" in window) || Notification.permission !== "granted" || !liveState.nextCourse) return;
  if (liveState.minutesUntil < 0 || liveState.minutesUntil > 10) return;

  const course = liveState.nextCourse;
  const key = `${toDateInput(liveState.now)}-${course.period}`;
  if (notifiedCourseKey === key) return;

  const time = getPeriodTime(course.period);
  new Notification(`準備上課：${course.subject}`, {
    body: `${time.start} 在${course.room}上課，還有 ${liveState.minutesUntil} 分鐘。`,
    tag: key
  });
  notifiedCourseKey = key;
}

function populateSubjectOptions() {
  const subjects = [...new Set(Object.values(weeklySchedule).flat().map((course) => course.subject))];
  document.querySelector("#assignment-subject").innerHTML = subjects
    .map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`)
    .join("");
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

function getLongestConsecutiveRun(numbers) {
  if (!numbers.length) return 0;
  let longest = 1;
  let current = 1;
  for (let index = 1; index < numbers.length; index += 1) {
    current = numbers[index] === numbers[index - 1] + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
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
