import { format, parseISO, addDays, startOfWeek, differenceInCalendarDays, isValid, isToday, isBefore, startOfDay } from "date-fns";

export const uid = (prefix = "rec") =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const toISODate = (date = new Date()) => format(date, "yyyy-MM-dd");
export const todayISO = () => toISODate(new Date());
export const nowTime = () => format(new Date(), "HH:mm");

export function safeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  try {
    const d = parseISO(String(value));
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

export function fmtDate(value, pattern = "dd MMM yyyy") {
  const d = safeDate(value);
  return d ? format(d, pattern) : "—";
}

export function fmtDateShort(value) {
  const d = safeDate(value);
  if (!d) return "—";
  if (isToday(d)) return "Today";
  const diff = differenceInCalendarDays(d, new Date());
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return format(d, "dd MMM");
}

export function fmtTime(time) {
  if (!time || !/^\d{1,2}:\d{2}/.test(time)) return "—";
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, "h:mm a");
}

export function timeToMinutes(time) {
  if (!time || !/^\d{1,2}:\d{2}/.test(time)) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const todayName = () => DAYS[(new Date().getDay() + 6) % 7];

export function combineDateTime(date, time) {
  const d = safeDate(date);
  if (!d) return null;
  const [h, m] = (time || "23:59").split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function isOverdue(date, time, statusDone = false) {
  if (statusDone) return false;
  const d = combineDateTime(date, time || "23:59");
  return d ? isBefore(d, new Date()) : false;
}

export function isDueSoon(date, days = 7) {
  const d = safeDate(date);
  if (!d) return false;
  const diff = differenceInCalendarDays(startOfDay(d), startOfDay(new Date()));
  return diff >= 0 && diff <= days;
}

export function weekStartDate(weekStartsOn = 1) {
  return startOfWeek(new Date(), { weekStartsOn });
}

export function weekDates(base = new Date(), weekStartsOn = 1) {
  const start = startOfWeek(base, { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatMinutes(mins = 0) {
  const value = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function formatHours(mins = 0) {
  return `${(Math.max(0, Number(mins) || 0) / 60).toFixed(1)}h`;
}

export function pct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

export function initials(text = "") {
  return text
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function courseShort(course = "") {
  const code = course.match(/\(([^)]+)\)/);
  return code ? code[1] : course.slice(0, 14) || "General";
}

export function normalizeHeader(header = "") {
  return String(header).toLowerCase().replace(/[\s_-]+/g, "");
}

export function groupBy(items = [], getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});
}

export function sortByDate(items = [], dateKey = "dueDate", timeKey = "dueTime") {
  return [...items].sort((a, b) => {
    const A = combineDateTime(a[dateKey], a[timeKey])?.getTime() || 0;
    const B = combineDateTime(b[dateKey], b[timeKey])?.getTime() || 0;
    return A - B;
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadText(text, filename, mime = "text/plain;charset=utf-8") {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const TASK_STATUSES = ["Pending", "In Progress", "Completed"];
export const EVENT_CATEGORIES = ["Class", "Assignment", "Exam", "Study session", "Personal", "Meeting", "Other"];
export const ASSIGNMENT_STATUSES = ["Not Started", "In Progress", "Submitted", "Completed"];
export const EXAM_STATUSES = ["Upcoming", "Prepared", "Completed"];

export const CATEGORY_COLORS = {
  Class: "#6366F1",
  Assignment: "#F59E0B",
  Exam: "#EF4444",
  "Study session": "#10B981",
  Personal: "#8B5CF6",
  Meeting: "#0EA5E9",
  Other: "#64748B",
};

export const COURSE_COLORS = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

export function statusTone(status = "") {
  const s = status.toLowerCase();
  if (["completed", "submitted", "prepared"].includes(s)) return "success";
  if (["overdue"].includes(s)) return "danger";
  if (["in progress", "upcoming"].includes(s)) return "info";
  if (["not started", "pending"].includes(s)) return "warning";
  return "neutral";
}

export function greetingName() {
  return greeting();
}

export { format, parseISO, addDays, isToday, isValid, isBefore };
