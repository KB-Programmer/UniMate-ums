import { combineDateTime, todayISO, DAYS, fmtTime } from "./utils";

export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function sendBrowserNotification(title, body, tag) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, tag, icon: undefined });
    return true;
  } catch {
    return false;
  }
}

export const REMINDER_PRESETS = [
  { value: 0, label: "At time" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
  { value: 2880, label: "2 days before" },
];

export function reminderLabel(minutes) {
  const found = REMINDER_PRESETS.find((r) => r.value === Number(minutes));
  return found ? found.label : `${minutes} minutes before`;
}

const LOG_KEY = "unimate_reminder_log";

function loadLog() {
  try {
    return JSON.parse(window.localStorage.getItem(LOG_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLog(log) {
  try {
    window.localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

function weeklyMatch(dateValue) {
  const then = combineDateTime(dateValue, "00:00");
  if (!then) return false;
  const dayName = DAYS[(new Date().getDay() + 6) % 7];
  return then.getTime() <= Date.now() && DAYS[(then.getDay() + 6) % 7] === dayName;
}

export function buildReminders(data) {
  const now = new Date();
  const log = loadLog();
  const delivered = [];
  const candidates = [];

  (data.events || []).forEach((event) => {
    const occursToday = event.date === todayISO() || (event.repeat === "weekly" && weeklyMatch(event.date));
    if (!occursToday || event.status === "Cancelled") return;
    candidates.push({
      sourceType: "events", sourceId: event.id, title: event.title, category: "Event",
      at: combineDateTime(todayISO(), event.startTime), minutes: event.reminderMinutes,
      message: `${event.title} starts at ${fmtTime(event.startTime)}${event.location ? ` · ${event.location}` : ""}.`,
    });
  });

  (data.timetable || []).forEach((cls) => {
    const dayName = DAYS[(new Date().getDay() + 6) % 7];
    if (cls.day !== dayName) return;
    candidates.push({
      sourceType: "timetable", sourceId: cls.id, title: `${cls.courseCode} class`, category: "Class",
      at: combineDateTime(todayISO(), cls.startTime), minutes: cls.reminderMinutes,
      message: `${cls.courseName} starts at ${fmtTime(cls.startTime)} in ${cls.classroom}.`,
    });
  });

  (data.tasks || []).forEach((task) => {
    if (task.status === "Completed" || !task.dueDate) return;
    candidates.push({
      sourceType: "tasks", sourceId: task.id, title: task.title, category: "Task",
      at: combineDateTime(task.dueDate, task.dueTime || "23:59"), minutes: task.reminderMinutes,
      message: `“${task.title}” is due ${fmtTime(task.dueTime || "23:59")}. Priority: ${task.priority}.`,
    });
  });

  (data.academicItems || []).forEach((item) => {
    if (["Submitted", "Completed"].includes(item.status) || !item.dueDate) return;
    candidates.push({
      sourceType: "academicItems", sourceId: item.id, title: item.title, category: item.type === "exam" ? "Exam" : "Assignment",
      at: combineDateTime(item.dueDate, item.dueTime || "23:59"), minutes: item.reminderMinutes,
      message: `${item.title} is due ${fmtTime(item.dueTime || "23:59")} · ${item.course}.`,
    });
  });

  (data.studySessions || []).forEach((session) => {
    if (session.status === "Completed" || session.date !== todayISO()) return;
    candidates.push({
      sourceType: "studySessions", sourceId: session.id, title: session.topic, category: "Study session",
      at: combineDateTime(session.date, session.startTime), minutes: session.reminderMinutes,
      message: `Planned study session “${session.topic}” starts at ${fmtTime(session.startTime)}.`,
    });
  });

  candidates.forEach((c) => {
    if (!c.at) return;
    const remindAt = new Date(c.at.getTime() - (Number(c.minutes) || 0) * 60000);
    const key = `${c.sourceType}:${c.sourceId}:${c.at.toISOString()}:${c.minutes}`;
    if (log[key]) return;
    if (now >= remindAt && now <= c.at && now - remindAt < 12 * 60000) {
      delivered.push({ key, notification: c });
      log[key] = now.toISOString();
    }
  });

  if (delivered.length) {
    const cutoff = Date.now() - 3 * 86400000;
    Object.keys(log).forEach((key) => {
      const ts = new Date(log[key]).getTime();
      if (Number.isFinite(ts) && ts < cutoff) delete log[key];
    });
    saveLog(log);
  }
  return delivered;
}

export function playChime(volume = 0.5) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [660, 880, 1100];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.16);
      gain.gain.linearRampToValueAtTime(volume * 0.18, ctx.currentTime + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.34);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.16);
      osc.stop(ctx.currentTime + i * 0.16 + 0.36);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio unsupported */
  }
}
