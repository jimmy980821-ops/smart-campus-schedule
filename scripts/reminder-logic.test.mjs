import assert from "node:assert/strict";
import test from "node:test";
import {
  getAssignmentReminders,
  getClassReminder,
  getExamReminders
} from "./reminder-logic.mjs";

test("作業在到期前一天晚上 8 點提醒", () => {
  const reminders = getAssignmentReminders(
    new Date("2026-07-27T12:00:00Z"),
    [{
      id: "a1",
      subject: "數學",
      content: "完成習題",
      dueDate: "2026-07-28",
      completed: false
    }],
    "user-1"
  );

  assert.equal(reminders.length, 1);
  assert.match(reminders[0].title, /明天到期/);
});

test("作業在到期當天早上 7 點提醒，已完成作業略過", () => {
  const reminders = getAssignmentReminders(
    new Date("2026-07-27T23:00:00Z"),
    [
      {
        id: "a1",
        subject: "英文",
        content: "背單字",
        dueDate: "2026-07-28",
        completed: false
      },
      {
        id: "a2",
        subject: "物理",
        content: "完成實驗紀錄",
        dueDate: "2026-07-28",
        completed: true
      }
    ],
    "user-1"
  );

  assert.equal(reminders.length, 1);
  assert.match(reminders[0].title, /今天到期/);
});

test("學測每天早上 8 點顯示正確倒數", () => {
  const reminders = getExamReminders(
    new Date("2026-07-27T00:00:00Z"),
    [{
      id: "e1",
      type: "學測",
      name: "學科能力測驗",
      date: "2026-07-30"
    }],
    "user-1"
  );

  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].title, "學測倒數 3 天");
});

test("學測排程延遲到上午 9 點仍會補發", () => {
  const reminders = getExamReminders(
    new Date("2026-07-27T01:25:00Z"),
    [{
      id: "e1",
      type: "學測",
      name: "學科能力測驗",
      date: "2026-07-30"
    }],
    "user-1"
  );

  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].key, "exam-user-1-e1-2026-07-27-countdown");
});

test("學測中午後不再補發", () => {
  const reminders = getExamReminders(
    new Date("2026-07-27T04:00:00Z"),
    [{
      id: "e1",
      type: "學測",
      name: "學科能力測驗",
      date: "2026-07-30"
    }],
    "user-1"
  );

  assert.equal(reminders.length, 0);
});

test("非學測類型不發送每日倒數", () => {
  const reminders = getExamReminders(
    new Date("2026-07-27T00:00:00Z"),
    [{
      id: "e1",
      type: "段考",
      name: "第一次段考",
      date: "2026-07-30"
    }],
    "user-1"
  );

  assert.equal(reminders.length, 0);
});

test("平日上課前 10 分鐘仍會提醒", () => {
  const reminder = getClassReminder(
    new Date("2026-07-27T00:00:00Z"),
    [{ period: 1, start: "08:10" }],
    { 1: ["導師時間"] }
  );

  assert.equal(reminder?.title, "準備上課：導師時間");
});

test("課程備援巡檢在上課前 5 分鐘仍會提醒", () => {
  const reminder = getClassReminder(
    new Date("2026-07-27T00:05:00Z"),
    [{ period: 1, start: "08:10" }],
    { 1: ["導師時間"] }
  );

  assert.equal(reminder?.key, "2026-07-27-period-1");
});

test("課程主要排程在上課前 12 分鐘也會提醒", () => {
  const reminder = getClassReminder(
    new Date("2026-07-26T23:58:00Z"),
    [{ period: 1, start: "08:10" }],
    { 1: ["導師時間"] }
  );

  assert.equal(reminder?.key, "2026-07-27-period-1");
});

test("作業備援排程延遲到 17 分仍會提醒", () => {
  const morningReminders = getAssignmentReminders(
    new Date("2026-07-27T23:17:00Z"),
    [{
      id: "a1",
      subject: "英文",
      content: "完成習作",
      dueDate: "2026-07-28",
      completed: false
    }],
    "user-1"
  );
  const eveningReminders = getAssignmentReminders(
    new Date("2026-07-27T12:17:00Z"),
    [{
      id: "a2",
      subject: "數學",
      content: "完成講義",
      dueDate: "2026-07-28",
      completed: false
    }],
    "user-1"
  );

  assert.equal(morningReminders.length, 1);
  assert.equal(eveningReminders.length, 1);
});

test("作業第三次巡檢在 27 分仍會提醒", () => {
  const reminders = getAssignmentReminders(
    new Date("2026-07-27T23:27:00Z"),
    [{
      id: "a1",
      subject: "英文",
      content: "完成習作",
      dueDate: "2026-07-28",
      completed: false
    }],
    "user-1"
  );

  assert.equal(reminders.length, 1);
});
