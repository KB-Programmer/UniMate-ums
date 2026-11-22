import * as XLSX from "xlsx";
import { downloadBlob, normalizeHeader, todayISO, toISODate } from "./utils";
import { recordKey } from "./backupService";

const f = (key, label, type = "text", extra = {}) => ({ key, label, type, ...extra });

export const MODULES = {
  tasks: {
    label: "Tasks", collection: "tasks", file: "Tasks",
    fields: [
      f("title", "Title", "text", { required: true, example: "Finish ER diagram" }),
      f("description", "Description", "text", { example: "Entities and relationships" }),
      f("course", "Course", "text", { example: "Database Systems (CSC 3021)" }),
      f("priority", "Priority", "enum", { options: ["Low", "Medium", "High", "Urgent"], default: "Medium" }),
      f("status", "Status", "enum", { options: ["Pending", "In Progress", "Completed"], default: "Pending" }),
      f("dueDate", "Due Date", "date", { required: true, example: todayISO() }),
      f("dueTime", "Due Time", "time", { example: "17:00" }),
      f("category", "Category", "text", { example: "Project" }),
      f("tags", "Tags", "tags", { example: "project, database" }),
      f("reminderMinutes", "Reminder Minutes", "number", { default: 15 }),
    ],
  },
  events: {
    label: "Calendar Events", collection: "events", file: "CalendarEvents",
    fields: [
      f("title", "Title", "text", { required: true, example: "Project clinic" }),
      f("description", "Description", "text"),
      f("category", "Category", "enum", {
        options: ["Class", "Assignment", "Exam", "Study session", "Personal", "Meeting", "Other"], default: "Other",
      }),
      f("date", "Date", "date", { required: true, example: todayISO() }),
      f("startTime", "Start Time", "time", { required: true, example: "16:00" }),
      f("endTime", "End Time", "time", { required: true, example: "17:00" }),
      f("location", "Location", "text", { example: "Block B Room 204" }),
      f("reminderMinutes", "Reminder Minutes", "number", { default: 15 }),
      f("color", "Color", "text", { example: "#6366F1" }),
      f("status", "Status", "enum", { options: ["Confirmed", "Tentative", "Cancelled"], default: "Confirmed" }),
      f("repeat", "Repeat", "enum", { options: ["none", "weekly"], default: "none" }),
    ],
  },
  timetable: {
    label: "Timetable", collection: "timetable", file: "Timetable",
    fields: [
      f("courseName", "Course Name", "text", { required: true, example: "Database Systems" }),
      f("courseCode", "Course Code", "text", { required: true, example: "CSC 3021" }),
      f("lecturer", "Lecturer", "text", { example: "Dr. A. Mukamana" }),
      f("classroom", "Classroom", "text", { example: "Block B Room 204" }),
      f("day", "Day", "enum", {
        options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], required: true,
      }),
      f("startTime", "Start Time", "time", { required: true, example: "09:00" }),
      f("endTime", "End Time", "time", { required: true, example: "10:30" }),
      f("notes", "Notes", "text"),
      f("color", "Color", "text", { example: "#6366F1" }),
      f("reminderMinutes", "Reminder Minutes", "number", { default: 15 }),
    ],
  },
  assignments: {
    label: "Assignments", collection: "assignments", file: "Assignments",
    fields: [
      f("title", "Title", "text", { required: true, example: "Normalization exercise" }),
      f("course", "Course", "text", { required: true, example: "Database Systems (CSC 3021)" }),
      f("description", "Description", "text"),
      f("assignedDate", "Assigned Date", "date", { example: todayISO() }),
      f("dueDate", "Deadline", "date", { required: true, aliases: ["Due Date"], example: todayISO() }),
      f("dueTime", "Deadline Time", "time", { aliases: ["Due Time"], example: "23:59" }),
      f("status", "Status", "enum", {
        options: ["Not Started", "In Progress", "Submitted", "Completed"], default: "Not Started",
      }),
      f("priority", "Priority", "enum", { options: ["Low", "Medium", "High", "Urgent"], default: "Medium" }),
      f("totalMarks", "Total Marks", "number", { aliases: ["Marks"] }),
      f("marksObtained", "Marks Obtained", "number", { aliases: ["Score"] }),
      f("weight", "Weight (%)", "number"),
      f("reminderMinutes", "Reminder Minutes", "number", { default: 1440 }),
      f("notes", "Notes", "text"),
      f("tags", "Tags", "tags", { example: "database, cat" }),
    ],
  },
  exams: {
    label: "Exams", collection: "exams", file: "Exams",
    fields: [
      f("title", "Title", "text", { required: true, example: "Database Systems CAT 2" }),
      f("course", "Course", "text", { required: true, example: "Database Systems (CSC 3021)" }),
      f("description", "Description", "text"),
      f("examDate", "Exam Date", "date", { required: true, aliases: ["Due Date"], example: todayISO() }),
      f("startTime", "Start Time", "time", { aliases: ["Due Time"], example: "09:00" }),
      f("endTime", "End Time", "time", { example: "11:00" }),
      f("location", "Location", "text", { example: "Block B exam hall" }),
      f("status", "Status", "enum", { options: ["Upcoming", "Prepared", "Completed"], default: "Upcoming" }),
      f("priority", "Priority", "enum", { options: ["Low", "Medium", "High", "Urgent"], default: "Medium" }),
      f("totalMarks", "Total Marks", "number", { aliases: ["Marks"] }),
      f("marksObtained", "Marks Obtained", "number", { aliases: ["Score"] }),
      f("weight", "Weight (%)", "number"),
      f("reminderMinutes", "Reminder Minutes", "number", { default: 1440 }),
      f("preparationNotes", "Preparation Notes", "text", { aliases: ["Notes"] }),
      f("tags", "Tags", "tags", { example: "revision, final" }),
    ],
  },
  studySessions: {
    label: "Study Sessions", collection: "studySessions", file: "StudySessions",
    fields: [
      f("subject", "Subject", "text", { required: true, example: "Database Systems (CSC 3021)" }),
      f("topic", "Topic", "text", { required: true, example: "Indexing practice" }),
      f("date", "Date", "date", { required: true, example: todayISO() }),
      f("startTime", "Start Time", "time", { required: true, example: "18:00" }),
      f("endTime", "End Time", "time", { required: true, example: "19:30" }),
      f("plannedMinutes", "Planned Minutes", "number", { required: true, example: 90 }),
      f("actualMinutes", "Actual Minutes", "number", { default: 0 }),
      f("goal", "Goal", "text", { example: "Understand B-tree indexes" }),
      f("status", "Status", "enum", { options: ["Planned", "Completed", "Missed"], default: "Planned" }),
      f("notes", "Notes", "text"),
      f("reminderMinutes", "Reminder Minutes", "number", { default: 15 }),
    ],
  },
  notes: {
    label: "Notes", collection: "notes", file: "Notes",
    fields: [
      f("title", "Title", "text", { required: true, example: "ER modelling cheat sheet" }),
      f("content", "Content", "text", { required: true, example: "Entities, relationships and cardinality…" }),
      f("course", "Course", "text", { example: "Database Systems (CSC 3021)" }),
      f("category", "Category", "text", { example: "Summary" }),
      f("tags", "Tags", "tags", { example: "database, exam" }),
      f("pinned", "Pinned", "boolean", { default: false }),
    ],
  },
};

export const MODULE_KEYS = Object.keys(MODULES);

export function rowsForModule(moduleKey, data) {
  const mod = MODULES[moduleKey];
  if (!mod) return [];
  const records = (data[mod.collection] || []).filter((r) => !mod.type || r.type === mod.type);
  return records.map((record) => {
    const row = {};
    mod.fields.forEach((field) => {
      const value = record[field.key];
      row[field.label] = Array.isArray(value) ? value.join(", ") : value ?? "";
    });
    return row;
  });
}

function timestamp() {
  return toISODate(new Date());
}

export function downloadTemplate(moduleKey) {
  const mod = MODULES[moduleKey];
  if (!mod) return;
  const sample = {};
  mod.fields.forEach((field) => {
    sample[field.label] = field.example ?? field.default ?? "";
  });
  const sheet = XLSX.utils.json_to_sheet([sample]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, mod.label.slice(0, 28));
  XLSX.writeFile(book, `${mod.file}_Template.xlsx`);
}

export function exportModule(moduleKey, data, format = "xlsx") {
  const mod = MODULES[moduleKey];
  const rows = rowsForModule(moduleKey, data);
  if (format === "json") {
    const payload = {
      app: "UniMate", module: moduleKey, exportedAt: new Date().toISOString(),
      count: rows.length, records: (data[mod.collection] || []).filter((r) => !mod.type || r.type === mod.type),
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${mod.file}_${timestamp()}.json`);
    return rows.length;
  }
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [Object.fromEntries(mod.fields.map((f) => [f.label, ""]))]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, mod.label.slice(0, 28));
  XLSX.writeFile(book, `${mod.file}_${timestamp()}.xlsx`);
  return rows.length;
}

export function exportFullJSON(data) {
  const payload = {
    app: "UniMate",
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `UniMate_Backup_${timestamp()}.json`);
}

export function exportAllExcel(data) {
  const book = XLSX.utils.book_new();
  Object.keys(MODULES).forEach((key) => {
    const rows = rowsForModule(key, data);
    if (!rows.length) return;
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(book, sheet, MODULES[key].label.slice(0, 28));
  });
  const focusRows = (data.focusSessions || []).map((s) => ({
    Subject: s.subject || "General", Minutes: s.minutes, Date: s.date, Completed: s.completedAt,
  }));
  if (focusRows.length) XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(focusRows), "Focus Sessions");
  if (!book.SheetNames.length) return 0;
  XLSX.writeFile(book, `UniMate_AllData_${timestamp()}.xlsx`);
  return book.SheetNames.length;
}

const TRUE_VALUES = ["true", "yes", "1", "y"];
const FALSE_VALUES = ["false", "no", "0", "n"];

function coerce(field, raw) {
  if (raw === undefined || raw === null || raw === "") return field.type === "boolean" ? false : "";
  const value = raw instanceof Date ? raw : String(raw).trim();
  switch (field.type) {
    case "enum": {
      const match = field.options.find((opt) => opt.toLowerCase() === String(value).toLowerCase());
      return match || field.default || field.options[0];
    }
    case "number": {
      const n = Number(String(value).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(n) ? n : "";
    }
    case "tags":
      return Array.isArray(raw) ? raw : String(value).split(/[,;]/).map((t) => t.trim()).filter(Boolean);
    case "boolean":
      return TRUE_VALUES.includes(String(value).toLowerCase())
        ? true
        : FALSE_VALUES.includes(String(value).toLowerCase())
          ? false
          : Boolean(value);
    case "date": {
      if (value instanceof Date) return toISODate(value);
      if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? String(value) : toISODate(parsed);
    }
    case "time": {
      if (value instanceof Date) return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
      const m = String(value).match(/^(\d{1,2}):(\d{2})/);
      return m ? `${String(m[1]).padStart(2, "0")}:${m[2]}` : String(value);
    }
    default:
      return String(value);
  }
}

function validateRecord(moduleKey, record) {
  const mod = MODULES[moduleKey];
  const errors = [];
  mod.fields.forEach((field) => {
    const value = record[field.key];
    const empty = value === "" || value === null || value === undefined;
    if (field.required && empty) errors.push(`${field.label} is required.`);
    if (empty) return;
    if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      errors.push(`${field.label} must be a date (YYYY-MM-DD).`);
    }
    if (field.type === "time" && !/^\d{2}:\d{2}$/.test(String(value))) {
      errors.push(`${field.label} must be a time (HH:MM).`);
    }
    if (field.type === "enum" && !field.options.includes(value)) {
      errors.push(`${field.label} must be one of: ${field.options.join(", ")}.`);
    }
    if (field.type === "number" && (typeof value !== "number" || Number.isNaN(value))) {
      errors.push(`${field.label} must be a number.`);
    }
  });
  const timePairs = [["startTime", "endTime"]];
  timePairs.forEach(([start, end]) => {
    if (record[start] && record[end] && record[start] >= record[end]) {
      errors.push("End time must be after start time.");
    }
  });
  return errors;
}

function fingerprint(moduleKey, record) {
  const mod = MODULES[moduleKey];
  return recordKey(mod.collection, { ...record, type: mod.type || record.type });
}

function safeSheetRows(buffer) {
  const book = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const sheetName = book.SheetNames[0];
  if (!sheetName) throw new Error("The workbook has no sheets.");
  const sheet = book.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  if (!matrix.length) throw new Error("The spreadsheet is empty.");
  const headers = matrix[0].map((h) => String(h || "").trim());
  const rows = matrix.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  return rows.map((row, i) => {
    const obj = {};
    headers.forEach((header, index) => {
      if (header) obj[header] = row[index];
    });
    obj.__row = i + 2;
    return obj;
  });
}

export async function parseImportFile(file, moduleKey, existingData) {
  const mod = MODULES[moduleKey];
  if (!mod) throw new Error("Unknown module.");
  const name = (file.name || "").toLowerCase();
  let records = [];
  let headers = [];
  let unmapped = [];
  try {
    if (name.endsWith(".json")) {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("The JSON file could not be parsed.");
      }
      records = Array.isArray(parsed) ? parsed : Array.isArray(parsed.records) ? parsed.records : Array.isArray(parsed.data) ? parsed.data : null;
      if (!records) throw new Error("JSON must contain an array of records (or a `records` / `data` array).");
      headers = Array.from(new Set(records.flatMap((r) => (r && typeof r === "object" ? Object.keys(r) : [])))).filter((h) => h !== "__row");
      records = records.map((r, i) => ({ ...(r && typeof r === "object" ? r : { value: r }), __row: i + 1 }));
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      records = safeSheetRows(buffer);
      headers = Object.keys(records[0] || {}).filter((h) => h !== "__row");
    } else {
      throw new Error("Unsupported file type. Choose an .xlsx, .xls or .json file.");
    }
    if (!records.length) throw new Error("No data rows were found in the file.");

    const headerLookup = new Map();
    headers.forEach((h) => headerLookup.set(normalizeHeader(h), h));
    const mapping = {};
    mod.fields.forEach((field) => {
      const candidates = [field.key, field.label, ...(field.aliases || [])];
      for (const c of candidates) {
        const real = headerLookup.get(normalizeHeader(c));
        if (real) {
          mapping[field.key] = real;
          break;
        }
      }
    });
    unmapped = headers.filter((h) => !Object.values(mapping).includes(h));
    const missing = mod.fields.filter((field) => field.required && !mapping[field.key]).map((field) => field.label);
    if (missing.length) {
      return {
        ok: false,
        error: `Missing required columns: ${missing.join(", ")}. Download the template for the correct headers.`,
        headers, mapping, unmapped,
      };
    }

    const seen = new Set();
    (existingData?.[mod.collection] || [])
      .filter((r) => !mod.type || r.type === mod.type)
      .forEach((r) => seen.add(fingerprint(moduleKey, r)));

    const parsedRecords = records.map((raw) => {
      const record = {};
      mod.fields.forEach((field) => {
        const header = mapping[field.key];
        const input = header ? raw[header] : undefined;
        const value = coerce(field, input === undefined ? field.default ?? "" : input);
        if (value !== "") record[field.key] = value;
        else if (field.default !== undefined) record[field.key] = field.default;
      });
      if (mod.type) record.type = mod.type;
      record.title = record.title || record.topic || record.subject || "";
      const errors = validateRecord(moduleKey, record);
      const fp = fingerprint(moduleKey, record);
      const duplicate = !errors.length && seen.has(fp);
      if (!errors.length && !duplicate) seen.add(fp);
      return { record, errors, duplicate, row: raw.__row || 0 };
    });

    return {
      ok: true,
      headers, mapping, unmapped, records: parsedRecords,
      summary: {
        total: parsedRecords.length,
        valid: parsedRecords.filter((r) => !r.errors.length && !r.duplicate).length,
        invalid: parsedRecords.filter((r) => r.errors.length).length,
        duplicates: parsedRecords.filter((r) => r.duplicate).length,
      },
    };
  } catch (error) {
    return { ok: false, error: error.message || "The file could not be read." };
  }
}

export function validImportRecords(parsed) {
  if (!parsed?.records) return [];
  return parsed.records.filter((r) => !r.errors.length && !r.duplicate).map((r) => r.record);
}

export { fingerprint };
