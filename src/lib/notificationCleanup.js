export const WARNING_AFTER_DAYS = 10;
export const ELIGIBLE_AFTER_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
const SOURCE_COLLECTIONS = {
  tasks: "tasks",
  events: "events",
  timetable: "timetable",
  studySessions: "studySessions",
  academicItems: "academicItems",
  assignments: "assignments",
  exams: "exams",
  notes: "notes",
};

export function notificationAgeDays(notification, now = Date.now()) {
  const created = notification?.createdAt ? new Date(notification.createdAt).getTime() : NaN;
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((now - created) / DAY_MS));
}

function isImportantSource(notification, data) {
  const collection = SOURCE_COLLECTIONS[notification.sourceType];
  if (!collection || !notification.sourceId) return false;
  const record = (data[collection] || []).find((item) => item.id === notification.sourceId);
  if (!record) return false;
  if (collection === "notes") return true;
  if (collection === "tasks") return !["Completed"].includes(record.status);
  if (["academicItems", "assignments", "exams"].includes(collection)) {
    return !["Completed", "Submitted"].includes(record.status);
  }
  return true;
}

export function getNotificationCleanupInfo(notifications = [], data = {}, now = Date.now()) {
  const warning = [];
  const eligible = [];
  const protectedIds = [];
  notifications.forEach((notification) => {
    const age = notificationAgeDays(notification, now);
    if (isImportantSource(notification, data)) {
      protectedIds.push(notification.id);
      return;
    }
    if (age >= ELIGIBLE_AFTER_DAYS) eligible.push(notification.id);
    else if (age >= WARNING_AFTER_DAYS) warning.push(notification.id);
  });
  return { warning, eligible, protectedIds };
}
