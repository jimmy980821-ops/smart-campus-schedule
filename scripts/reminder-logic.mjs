const TAIPEI_TIME_ZONE = "Asia/Taipei";
const FIXED_TIME_WINDOW_MINUTES = 10;
const EXAM_REMINDER_START_MINUTES = 8 * 60;
const EXAM_REMINDER_END_MINUTES = 12 * 60;

export function getTaipeiClock(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TAIPEI_TIME_ZONE,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    ...parts,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    currentMinutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

export function getClassReminder(date, periodTimes, schedule) {
  const clock = getTaipeiClock(date);
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
  const weekday = dayMap[clock.weekday];
  if (!weekday) return null;

  const period = periodTimes.find((item) => {
    const [hour, minute] = item.start.split(":").map(Number);
    const minutesUntil = hour * 60 + minute - clock.currentMinutes;
    return minutesUntil > 0 && minutesUntil <= 10;
  });
  if (!period) return null;

  const subject = schedule[weekday]?.[period.period - 1];
  if (!subject) return null;

  return {
    key: `${clock.dateKey}-period-${period.period}`,
    title: `準備上課：${subject}`,
    body: `${period.start} 在 305 教室上課，請準備課本與用品。`,
    tag: `${clock.dateKey}-${period.period}`
  };
}

export function getAssignmentReminders(date, assignments, uid) {
  const clock = getTaipeiClock(date);
  const reminders = [];
  const isMorningReminder = isWithinTimeWindow(clock.currentMinutes, 7 * 60);
  const isEveningReminder = isWithinTimeWindow(clock.currentMinutes, 20 * 60);
  if (!isMorningReminder && !isEveningReminder) return reminders;

  for (const assignment of assignments) {
    if (assignment.completed || !isDateKey(assignment.dueDate)) continue;
    const daysUntilDue = daysBetweenDateKeys(clock.dateKey, assignment.dueDate);
    const subject = assignment.subject || "未分類科目";
    const content = assignment.content || "請查看作業內容";

    if (isMorningReminder && daysUntilDue === 0) {
      reminders.push({
        key: `assignment-${uid}-${assignment.id}-${clock.dateKey}-due-today`,
        title: `作業今天到期：${subject}`,
        body: `${content}（今天繳交）`,
        tag: `assignment-${assignment.id}-due-today`
      });
    }

    if (isEveningReminder && daysUntilDue === 1) {
      reminders.push({
        key: `assignment-${uid}-${assignment.id}-${clock.dateKey}-due-tomorrow`,
        title: `作業明天到期：${subject}`,
        body: `${content}（明天繳交）`,
        tag: `assignment-${assignment.id}-due-tomorrow`
      });
    }
  }

  return reminders;
}

export function getExamReminders(date, exams, uid) {
  const clock = getTaipeiClock(date);
  // GitHub Actions 的排程可能延遲；上午第一次成功執行時補發，
  // 再由每日通知紀錄的相同 key 避免重複推播。
  if (
    clock.currentMinutes < EXAM_REMINDER_START_MINUTES
    || clock.currentMinutes >= EXAM_REMINDER_END_MINUTES
  ) return [];

  return exams.flatMap((exam) => {
    if (exam.type !== "學測" || !isDateKey(exam.date)) return [];
    const daysRemaining = daysBetweenDateKeys(clock.dateKey, exam.date);
    if (daysRemaining < 0) return [];

    const title = daysRemaining === 0
      ? `${exam.name || "學測"}就是今天！`
      : `學測倒數 ${daysRemaining} 天`;
    const body = daysRemaining === 0
      ? "記得攜帶准考證、文具與所需用品，沉著應試。"
      : `${exam.name || "學科能力測驗"}將於 ${exam.date} 舉行。`;

    return [{
      key: `exam-${uid}-${exam.id}-${clock.dateKey}-countdown`,
      title,
      body,
      tag: `exam-${exam.id}-countdown`
    }];
  });
}

export function daysBetweenDateKeys(fromDateKey, toDateKey) {
  const from = parseDateKey(fromDateKey);
  const to = parseDateKey(toDateKey);
  return Math.round((to - from) / 86400000);
}

function isWithinTimeWindow(currentMinutes, targetMinutes) {
  return currentMinutes >= targetMinutes
    && currentMinutes < targetMinutes + FIXED_TIME_WINDOW_MINUTES;
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function parseDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
