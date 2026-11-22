import { createSampleData, emptyData, DEFAULT_SETTINGS } from "./sampleData";
import { uid } from "./utils";
import {
  isIndexedDbAvailable,
  idbGetAll,
  idbPutMany,
  idbDeleteMany,
  idbSetMeta,
  idbEstimateBytes,
  recordStorageKey,
} from "./indexedDbService";

export const STORAGE_KEY = "unimate_data";
export const BACKUP_KEY = "unimate_backups_v1";
export const SETTINGS_KEY = "unimate_settings_v1";
export const MIGRATION_KEY = "unimate_hybrid_migrated_v1";
export const DRAFT_PREFIX = "unimate_draft_";
export const DATA_VERSION = 1;
export const COLLECTIONS = [
  "tasks", "events", "timetable", "studySessions", "academicItems", "notes", "notifications", "focusSessions",
  "assignments", "exams", "weeklyTimetables", "permanentTimetable",
];

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const pad = (n) => String(n).padStart(2, "0");

export function weekKeyFor(date = new Date(), weekStart = "monday") {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = weekStart === "sunday" ? day : (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STRING_FIELDS = {
  tasks: ["title", "description", "course", "priority", "status", "dueDate", "dueTime", "category"],
  events: ["title", "description", "category", "date", "startTime", "endTime", "location", "color", "status", "repeat"],
  timetable: ["courseName", "courseCode", "lecturer", "classroom", "day", "startTime", "endTime", "color", "notes"],
  permanentTimetable: ["courseName", "courseCode", "lecturer", "classroom", "day", "startTime", "endTime", "color", "notes"],
  studySessions: ["subject", "topic", "date", "startTime", "endTime", "goal", "status", "notes"],
  academicItems: ["type", "title", "course", "description", "dueDate", "dueTime", "status", "priority", "notes", "assignedDate", "examDate", "location"],
  assignments: ["title", "course", "description", "assignedDate", "dueDate", "dueTime", "status", "priority", "notes", "weight"],
  exams: ["title", "course", "description", "examDate", "startTime", "endTime", "location", "status", "priority", "preparationNotes", "dueDate", "dueTime", "notes", "weight"],
  weeklyTimetables: ["weekStart", "label"],
  notes: ["title", "content", "course", "category"],
  notifications: ["title", "message", "type"],
  focusSessions: ["subject", "mode", "date"],
};

const TAG_COLLECTIONS = ["tasks", "notes", "studySessions", "assignments", "exams"];
const ALLOWED_THEMES = ["light", "dark", "emerald", "lavender", "sunset", "ocean", "rose", "midnight-gold", "system"];

function normalizeItem(key, item) {
  const next = { ...item, id: typeof item.id === "string" && item.id ? item.id : uid(key.slice(0, 3)) };
  (STRING_FIELDS[key] || []).forEach((field) => {
    if (typeof next[field] !== "string") next[field] = next[field] == null ? "" : String(next[field]);
  });
  if (TAG_COLLECTIONS.includes(key)) {
    if (!Array.isArray(next.tags)) next.tags = [];
    else next.tags = next.tags.map((tag) => String(tag)).filter(Boolean);
  }
  if (key === "notes" && typeof next.pinned !== "boolean") next.pinned = Boolean(next.pinned);
  if (key === "academicItems" && !["assignment", "exam"].includes(next.type)) next.type = "assignment";
  if (key === "focusSessions" && !Number.isFinite(Number(next.minutes))) next.minutes = 0;
  if (key === "weeklyTimetables") {
    next.classes = Array.isArray(next.classes)
      ? next.classes.filter(isObj).map((item) => normalizeItem("timetable", item))
      : [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next.weekStart)) next.weekStart = weekKeyFor();
    if (!next.createdAt || typeof next.createdAt !== "string") next.createdAt = new Date().toISOString();
    if (!next.updatedAt || typeof next.updatedAt !== "string") next.updatedAt = next.createdAt;
  }
  return next;
}

function normalizeSettings(input) {
  const settings = { ...DEFAULT_SETTINGS, ...(isObj(input) ? input : {}) };
  if (!ALLOWED_THEMES.includes(settings.theme)) settings.theme = "light";
  if (!/^#[0-9a-fA-F]{6}$/.test(String(settings.accentColor || ""))) settings.accentColor = "#6366F1";
  settings.focusDuration = Math.min(180, Math.max(1, Number(settings.focusDuration) || 25));
  settings.shortBreak = Math.min(60, Math.max(1, Number(settings.shortBreak) || 5));
  settings.longBreak = Math.min(90, Math.max(1, Number(settings.longBreak) || 15));
  settings.dailyStudyGoal = Math.min(720, Math.max(15, Number(settings.dailyStudyGoal) || 180));
  settings.maxBackups = Math.min(10, Math.max(1, Number(settings.maxBackups) || 5));
  ["notificationsEnabled", "browserNotifications", "soundEnabled", "autoBackupEnabled"].forEach((key) => {
    settings[key] = Boolean(settings[key]);
  });
  settings.sampleData = isObj(input) ? Boolean(input.sampleData) : false;
  settings.weekStart = settings.weekStart === "sunday" ? "sunday" : "monday";
  settings.timetableMode = settings.timetableMode === "permanent" ? "permanent" : "weekly";
  if (typeof settings.activeWeekStart !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(settings.activeWeekStart)) {
    settings.activeWeekStart = "";
  }
  return settings;
}

function toAssignment(item) {
  return {
    ...item,
    type: "assignment",
    assignedDate: item.assignedDate || item.createdAt?.slice(0, 10) || item.dueDate || "",
    dueDate: item.dueDate || "",
    dueTime: item.dueTime || "",
    marksObtained: item.marksObtained ?? item.score ?? "",
    totalMarks: item.totalMarks ?? item.marks ?? "",
    weight: item.weight ?? "",
    notes: item.notes ?? item.description ?? "",
  };
}

function toExam(item) {
  return {
    ...item,
    type: "exam",
    examDate: item.examDate || item.dueDate || "",
    startTime: item.startTime || item.dueTime || "",
    endTime: item.endTime || "",
    location: item.location || "",
    dueDate: item.examDate || item.dueDate || "",
    dueTime: item.startTime || item.dueTime || "",
    marksObtained: item.marksObtained ?? item.score ?? "",
    totalMarks: item.totalMarks ?? item.marks ?? "",
    notes: item.preparationNotes ?? item.notes ?? "",
    preparationNotes: item.preparationNotes ?? item.notes ?? "",
  };
}

function syncAcademicCollections(clean) {
  const legacy = Array.isArray(clean.academicItems) ? clean.academicItems : [];
  const assignments = Array.isArray(clean.assignments) ? clean.assignments : [];
  const exams = Array.isArray(clean.exams) ? clean.exams : [];
  const known = new Set([...assignments, ...exams].map((item) => item.id));
  legacy.forEach((item) => {
    if (known.has(item.id)) return;
    const record = item.type === "exam" ? toExam(item) : toAssignment(item);
    if (record.type === "exam") exams.push(record);
    else assignments.push(record);
    known.add(item.id);
  });
  clean.assignments = assignments.map((item) => normalizeItem("assignments", toAssignment(item)));
  clean.exams = exams.map((item) => normalizeItem("exams", toExam(item)));
  const mirror = [
    ...clean.assignments.map((item) => normalizeItem("academicItems", { ...item, type: "assignment" })),
    ...clean.exams.map((item) => normalizeItem("academicItems", { ...item, type: "exam" })),
  ];
  clean.academicItems = mirror;
}

function syncTimetableCollections(clean) {
  const legacy = Array.isArray(clean.timetable) ? clean.timetable : [];
  const weekly = Array.isArray(clean.weeklyTimetables) ? clean.weeklyTimetables : [];
  const permanent = Array.isArray(clean.permanentTimetable) ? clean.permanentTimetable : [];
  if (!weekly.length && !permanent.length && legacy.length) {
    const clone = (item) => ({ ...item, id: item.id || uid("cls") });
    permanent.push(...legacy.map(clone));
    weekly.push({
      id: uid("wpl"),
      weekStart: weekKeyFor(new Date(), clean.settings.weekStart),
      label: "Imported weekly schedule",
      classes: legacy.map(clone),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  clean.weeklyTimetables = weekly;
  clean.permanentTimetable = permanent;
  const mode = clean.settings.timetableMode === "permanent" ? "permanent" : "weekly";
  const key = clean.settings.activeWeekStart || weekKeyFor(new Date(), clean.settings.weekStart);
  clean.settings.activeWeekStart = key;
  if (mode === "permanent") {
    clean.timetable = permanent.map((item) => normalizeItem("timetable", item));
    return;
  }
  let plan = weekly.find((item) => item.weekStart === key);
  if (!plan) {
    plan = {
      id: uid("wpl"),
      weekStart: key,
      label: "",
      classes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    weekly.push(plan);
  }
  clean.timetable = plan.classes.map((item) => normalizeItem("timetable", item));
}

function syncDerivedCollections(clean) {
  syncAcademicCollections(clean);
  syncTimetableCollections(clean);
  return clean;
}

export function refreshDerivedCollections(data) {
  return syncDerivedCollections(data);
}

export function sanitizeData(raw, { keepSettings } = {}) {
  const base = emptyData();
  if (!isObj(raw)) return syncDerivedCollections(base);
  const clean = {
    ...base,
    version: DATA_VERSION,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    settings: normalizeSettings({ ...(keepSettings ? keepSettings : {}), ...(isObj(raw.settings) ? raw.settings : {}) }),
  };
  COLLECTIONS.forEach((key) => {
    const list = Array.isArray(raw[key]) ? raw[key] : [];
    clean[key] = list.filter(isObj).map((item) => normalizeItem(key, item));
  });
  if (Array.isArray(raw.backups)) clean.backups = raw.backups;
  return syncDerivedCollections(clean);
}

export function loadData() {
  if (typeof window === "undefined") return createSampleData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const settingsRaw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      const sample = createSampleData();
      if (settingsRaw) {
        try {
          const saved = JSON.parse(settingsRaw);
          if (isObj(saved)) sample.settings = normalizeSettings({ ...sample.settings, ...saved });
        } catch {
          /* ignore invalid preference mirror */
        }
      }
      const clean = sanitizeData(sample);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      } catch {
        /* first load can still proceed in memory */
      }
      return clean;
    }
    const parsed = JSON.parse(raw);
    if (!isObj(parsed)) throw new Error("Invalid stored shape");
    let settings = null;
    if (settingsRaw) {
      try {
        const saved = JSON.parse(settingsRaw);
        if (isObj(saved)) settings = saved;
      } catch {
        /* ignore invalid preference mirror */
      }
    }
    return sanitizeData(parsed, settings ? { keepSettings: settings } : undefined);
  } catch (error) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) window.localStorage.setItem(`unimate_corrupt_${Date.now()}`, raw);
    } catch {
      /* ignore */
    }
    const recovered = createSampleData();
    recovered.settings.sampleData = false;
    return sanitizeData(recovered);
  }
}

export class StorageQuotaError extends Error {
  constructor(message = "Browser storage is full.") {
    super(message);
    this.name = "StorageQuotaError";
  }
}

export function saveData(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    if (error?.name === "QuotaExceededError" || error?.code === 22 || error?.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      throw new StorageQuotaError(
        "Browser storage is full. Delete old backups or export your data before continuing."
      );
    }
    throw error;
  }
}

export function loadSettingsPreference() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return isObj(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSettingsPreference(settings) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings || {}));
    return true;
  } catch {
    return false;
  }
}

export function getByteSize(value) {
  try {
    return new Blob([typeof value === "string" ? value : JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

let hybridStats = { idbBytes: 0, available: false };

export function getHybridStorageStats() {
  return { ...hybridStats };
}

function updateHybridStats(next) {
  hybridStats = { ...hybridStats, ...next };
}

export function diffCollections(next, previous = {}) {
  const puts = [];
  const deletes = [];
  COLLECTIONS.forEach((collection) => {
    const prevList = Array.isArray(previous[collection]) ? previous[collection] : [];
    const nextList = Array.isArray(next[collection]) ? next[collection] : [];
    const prevMap = new Map(prevList.filter(isObj).map((item) => [item.id, item]));
    const nextMap = new Map(nextList.filter(isObj).map((item) => [item.id, item]));
    nextMap.forEach((record, id) => {
      const before = prevMap.get(id);
      if (!before || getByteSize(before) !== getByteSize(record) || JSON.stringify(before) !== JSON.stringify(record)) {
        puts.push({ collection, record });
      }
    });
    prevMap.forEach((_, id) => {
      if (!nextMap.has(id)) deletes.push({ collection, id });
    });
  });
  return { puts, deletes };
}

export async function migrateToIndexedDb(baseData) {
  const clean = sanitizeData(baseData);
  const entries = [];
  COLLECTIONS.forEach((collection) => {
    (clean[collection] || []).forEach((record) => entries.push({ collection, record }));
  });
  await idbPutMany(entries);
  const stored = await idbGetAll();
  const keys = new Set(stored.map((row) => row.key));
  const verified = entries.every(({ collection, record }) => keys.has(recordStorageKey(collection, record.id)));
  if (!verified) throw new Error("IndexedDB migration could not be verified.");
  await idbSetMeta(MIGRATION_KEY, new Date().toISOString());
  return clean;
}

export async function initializeHybridStorage(baseData) {
  if (!isIndexedDbAvailable()) {
    updateHybridStats({ available: false, idbBytes: 0 });
    return {
      data: sanitizeData(baseData),
      available: false,
      migrated: false,
      idbBytes: 0,
      warning: "IndexedDB is unavailable. Data will continue to use LocalStorage only.",
    };
  }
  try {
    let stored = await idbGetAll();
    let migrated = false;
    if (!stored.length) {
      await migrateToIndexedDb(baseData);
      stored = await idbGetAll();
      migrated = true;
    }
    const grouped = {};
    stored.forEach((row) => {
      if (!row || typeof row.collection !== "string" || !row.data) return;
      if (!Array.isArray(grouped[row.collection])) grouped[row.collection] = [];
      grouped[row.collection].push(row.data);
    });
    const merged = { ...(isObj(baseData) ? baseData : {}) };
    COLLECTIONS.forEach((collection) => {
      const incoming = grouped[collection];
      if (!Array.isArray(incoming) || !incoming.length) return;
      const byId = new Map();
      (Array.isArray(merged[collection]) ? merged[collection] : []).forEach((item) => {
        if (isObj(item)) byId.set(item.id, item);
      });
      incoming.filter(isObj).forEach((item) => byId.set(item.id, item));
      merged[collection] = Array.from(byId.values());
    });
    const data = sanitizeData(merged);
    const idbBytes = await idbEstimateBytes();
    updateHybridStats({ available: true, idbBytes });
    saveSettingsPreference(data.settings);
    return { data, available: true, migrated, idbBytes, warning: null };
  } catch (error) {
    updateHybridStats({ available: false, idbBytes: 0 });
    return {
      data: sanitizeData(baseData),
      available: false,
      migrated: false,
      idbBytes: 0,
      warning: "IndexedDB could not be initialised. Existing LocalStorage data was preserved.",
    };
  }
}

export async function persistHybridChanges(next, previous = {}) {
  const diff = diffCollections(next, previous);
  let idb = false;
  let mirror = false;
  let mirrorError = null;
  let idbBytes = hybridStats.idbBytes;
  if (isIndexedDbAvailable()) {
    try {
      if (diff.puts.length) await idbPutMany(diff.puts);
      if (diff.deletes.length) await idbDeleteMany(diff.deletes);
      idb = true;
      idbBytes = await idbEstimateBytes();
      updateHybridStats({ available: true, idbBytes });
    } catch {
      updateHybridStats({ available: false });
    }
  }
  saveSettingsPreference(next.settings);
  try {
    mirror = saveData(next);
  } catch (error) {
    mirrorError = error;
  }
  return { idb, mirror, mirrorError, idbBytes, diff };
}

export function getStorageInfo(data) {
  let dataBytes = 0;
  let settingsBytes = 0;
  let backupBytes = 0;
  try {
    dataBytes = getByteSize(window.localStorage.getItem(STORAGE_KEY) || data || {});
    settingsBytes = getByteSize(window.localStorage.getItem(SETTINGS_KEY) || "");
    backupBytes = getByteSize(window.localStorage.getItem(BACKUP_KEY) || "[]");
  } catch {
    /* ignore */
  }
  const limit = 5 * 1024 * 1024;
  const used = dataBytes + settingsBytes + backupBytes;
  const idbBytes = hybridStats.idbBytes;
  const total = used + idbBytes;
  return {
    dataBytes,
    settingsBytes,
    backupBytes,
    idbBytes,
    idbLabel: formatBytes(idbBytes),
    used,
    total,
    limit,
    percent: Math.min(100, Math.round((used / limit) * 100)),
    label: used > 1024 * 1024 ? `${(used / (1024 * 1024)).toFixed(2)} MB` : `${(used / 1024).toFixed(1)} KB`,
  };
}

export function formatBytes(bytes = 0) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
