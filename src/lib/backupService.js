import { BACKUP_KEY, COLLECTIONS, sanitizeData, getByteSize } from "./storageService";
import { uid } from "./utils";

export function loadBackups() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(BACKUP_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((b) => b && b.data && Array.isArray(b.id) === false);
  } catch {
    return [];
  }
}

function persistBackups(list) {
  window.localStorage.setItem(BACKUP_KEY, JSON.stringify(list));
}

export function createSnapshot(data, reason = "Automatic backup", maxBackups = 5) {
  try {
    const backups = loadBackups();
    const signature = JSON.stringify(data);
    if (backups[0] && JSON.stringify(backups[0].data) === signature) {
      return { created: false, backups };
    }
    const snapshot = {
      id: uid("bkp"),
      createdAt: new Date().toISOString(),
      reason,
      size: getByteSize(signature),
      data: JSON.parse(signature),
    };
    let next = [snapshot, ...backups].slice(0, Math.max(1, Math.min(10, Number(maxBackups) || 5)));
    try {
      persistBackups(next);
    } catch {
      next = next.slice(0, 2);
      persistBackups(next);
    }
    return { created: true, backups: next, snapshot };
  } catch {
    return { created: false, backups: loadBackups(), error: true };
  }
}

export function deleteSnapshot(id) {
  const next = loadBackups().filter((b) => b.id !== id);
  persistBackups(next);
  return next;
}

export function clearSnapshots() {
  try {
    window.localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

const TYPE_FIELDS = {
  tasks: "title",
  events: "title",
  timetable: "courseCode",
  studySessions: "topic",
  academicItems: "title",
  assignments: "title",
  exams: "title",
  weeklyTimetables: "weekStart",
  permanentTimetable: "courseCode",
  notes: "title",
  notifications: "title",
  focusSessions: "subject",
};

export function recordKey(collection, record) {
  if (collection === "events") return `${(record.title || "").toLowerCase()}|${record.date}|${record.startTime}`;
  if (collection === "timetable" || collection === "permanentTimetable")
    return `${(record.courseCode || record.courseName || "").toLowerCase()}|${record.day}|${record.startTime}`;
  if (collection === "weeklyTimetables") return `${record.weekStart || ""}`;
  if (collection === "academicItems" || collection === "assignments" || collection === "exams")
    return `${record.type || collection}|${(record.title || "").toLowerCase()}|${record.examDate || record.dueDate || ""}`;
  if (collection === "tasks") return `${(record.title || "").toLowerCase()}|${record.course || ""}|${record.dueDate}`;
  if (collection === "studySessions") return `${(record.subject || "").toLowerCase()}|${record.date}|${record.startTime}`;
  if (collection === "notes") return `${(record.title || "").toLowerCase()}`;
  if (collection === "focusSessions") return `${record.date}|${record.completedAt}|${record.minutes}`;
  return `${record.id || ""}`;
}

export function validateBackup(rawInput) {
  let raw = rawInput;
  if (typeof rawInput === "string") {
    try {
      raw = JSON.parse(rawInput);
    } catch {
      return { ok: false, errors: ["The file is not valid JSON."] };
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["This does not look like a UniMate backup."] };
  }
  const errors = [];
  const warnings = [];
  if (raw.app && raw.app !== "UniMate") errors.push(`Unrecognised application identity: “${raw.app}”.`);
  const version = raw.backupVersion ?? raw.version ?? raw?.data?.version ?? 1;
  if (Number(version) > 1) errors.push(`Backup version ${version} is newer than this app supports (v1).`);
  const payload = raw.data && typeof raw.data === "object" ? raw.data : raw;
  const found = COLLECTIONS.filter((key) => Array.isArray(payload[key]));
  if (!found.length) errors.push("No recognisable UniMate data sections were found in the file.");
  COLLECTIONS.forEach((key) => {
    if (payload[key] !== undefined && !Array.isArray(payload[key])) errors.push(`Section “${key}” must be an array.`);
    else if (payload[key] === undefined && raw.data) warnings.push(`Section “${key}” is missing and will be empty.`);
  });
  if (payload.settings !== undefined && (typeof payload.settings !== "object" || Array.isArray(payload.settings)))
    errors.push("The settings section is malformed.");
  if (errors.length) return { ok: false, errors, warnings };
  const data = sanitizeData(payload);
  return {
    ok: true,
    errors: [],
    warnings,
    data,
    meta: {
      app: raw.app || "UniMate",
      version,
      exportedAt: raw.exportedAt || payload.updatedAt || null,
      sections: found,
      counts: Object.fromEntries(COLLECTIONS.map((key) => [key, (payload[key] || []).length])),
    },
  };
}

export function mergeData(current, incoming) {
  const merged = sanitizeData(current);
  const added = {};
  const skipped = {};
  COLLECTIONS.forEach((key) => {
    added[key] = 0;
    skipped[key] = 0;
    const existingIds = new Set((current[key] || []).map((r) => r.id));
    const fingerprints = new Set((current[key] || []).map((r) => recordKey(key, r)));
    (incoming[key] || []).forEach((record) => {
      const fingerprint = recordKey(key, record);
      if ((record.id && existingIds.has(record.id)) || fingerprints.has(fingerprint)) {
        skipped[key] += 1;
        return;
      }
      merged[key] = [...(merged[key] || []), record];
      if (record.id) existingIds.add(record.id);
      fingerprints.add(fingerprint);
      added[key] += 1;
    });
  });
  merged.updatedAt = new Date().toISOString();
  return { data: merged, added, skipped };
}

export function summarizeBackup(data) {
  const counts = Object.fromEntries(COLLECTIONS.map((key) => [key, (data[key] || []).length]));
  return { counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

export { TYPE_FIELDS };
