import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CalendarPlus, CheckSquare, ClipboardList, Eye, FileText, GraduationCap, Pencil, School, Timer } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { Button, Field, Input, Markdown, Modal, SaveStatus, Select, Tabs, Textarea, Toggle } from "./ui";
import {
  ASSIGNMENT_STATUSES, CATEGORY_COLORS, COURSE_COLORS, DAYS, EVENT_CATEGORIES, EXAM_STATUSES,
  PRIORITIES, TASK_STATUSES, minutesToTime, timeToMinutes, todayISO,
} from "../lib/utils";
import { REMINDER_PRESETS } from "../lib/notificationService";
import { useFormAutosave } from "../hooks/useFormAutosave";

export function useCourseOptions() {
  const { data } = useApp();
  return useMemo(() => {
    const set = new Set(["Personal", "General"]);
    (data.timetable || []).forEach((c) => set.add(`${c.courseName} (${c.courseCode})`));
    [...(data.academicItems || []), ...(data.assignments || []), ...(data.exams || []), ...(data.tasks || []), ...(data.notes || []), ...(data.studySessions || [])]
      .forEach((r) => r.course && set.add(r.course));
    return Array.from(set).filter(Boolean).sort();
  }, [data.timetable, data.academicItems, data.assignments, data.exams, data.tasks, data.notes, data.studySessions]);
}

function CourseInput({ value, onChange, id, courses, label = "Course" }) {
  return (
    <Field label={label} htmlFor={id}>
      <Input id={id} list={`${id}-options`} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Database Systems (CSC 3021)" autoComplete="off" />
      <datalist id={`${id}-options`}>
        {courses.map((course) => <option key={course} value={course} />)}
      </datalist>
    </Field>
  );
}

function FormGrid({ children, cols = 2 }) {
  return <div className={`grid grid-cols-1 gap-3.5 ${cols === 2 ? "sm:grid-cols-2" : ""}`}>{children}</div>;
}

function FormSection({ title, description, children, icon: Icon }) {
  return (
    <section className="space-y-3">
      {title && (
        <div className="flex items-start gap-2">
          {Icon && <Icon size={14} className="mt-0.5 text-[var(--accent)]" />}
          <div>
            <h3 className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">{title}</h3>
            {description && <p className="mt-0.5 text-[11px] text-[var(--faint)]">{description}</p>}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

function ReminderSelect({ value, onChange, id }) {
  return (
    <Field label="Reminder" htmlFor={id} hint="Saved as an in-app reminder. Browser alerts require permission in Settings.">
      <Select id={id} value={value ?? 15} onChange={(e) => onChange(Number(e.target.value))}>
        {REMINDER_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </Select>
    </Field>
  );
}

const blankTask = () => ({
  title: "", description: "", course: "", priority: "Medium", status: "Pending",
  dueDate: todayISO(), dueTime: "17:00", category: "Coursework", tags: [], reminderMinutes: 15,
});

export function TaskForm({ open, onClose, initial }) {
  const { data, addItem, updateItem } = useApp();
  const toast = useToast();
  const courses = useCourseOptions();
  const defaultReminder = data.settings?.defaultReminderMinutes ?? 15;
  const [form, setForm] = useState(blankTask);
  const [tagsText, setTagsText] = useState("");
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const buildPayload = ({ form: f, tagsText: t }) => ({
    ...f, title: f.title.trim(),
    tags: t.split(",").map((item) => item.trim()).filter(Boolean),
    completedAt: f.status === "Completed" ? initial?.completedAt || new Date().toISOString() : null,
  });
  const autosave = useFormAutosave({
    key: `task:${initial?.id || "new"}`, open, form, tagsText, initial,
    buildPayload,
    canSave: (payload) => !!payload.title?.trim() && !!payload.dueDate,
    persist: (payload, id) => {
      if (id) { updateItem("tasks", id, payload); return { id }; }
      return addItem("tasks", payload);
    },
    onRestore: (restoredForm, restoredTags) => { setForm(restoredForm); setTagsText(restoredTags); },
    deps: [form, tagsText],
  });
  const close = () => { autosave.flush(); onClose(); };

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({ ...blankTask(), ...initial, tags: initial.tags || [] });
      setTagsText((initial.tags || []).join(", "));
    } else {
      setForm({ ...blankTask(), reminderMinutes: defaultReminder });
      setTagsText("");
    }
    setErrors({});
  }, [open, initial, defaultReminder]);

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = "A task title is required.";
    if (!form.dueDate) next.dueDate = "Choose a due date.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const payload = buildPayload({ form, tagsText });
    if (initial) {
      updateItem("tasks", initial.id, payload);
      toast.success("Task updated", `“${payload.title}” was saved.`);
    } else {
      addItem("tasks", payload);
      toast.success("Task created", `“${payload.title}” is now on your list.`);
    }
    autosave.markSubmitted();
    onClose();
  };

  return (
    <Modal
      open={open} onClose={close} title={initial ? "Edit task" : "New task"} icon={CheckSquare}
      description="Keep the next action clear, with a deadline and a priority. Changes autosave after 2 minutes of inactivity."
      footer={<><SaveStatus status={autosave.status} lastSavedAt={autosave.lastSavedAt} /><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" form="task-form">{initial ? "Save changes" : "Create task"}</Button></>}
    >
      <form id="task-form" onSubmit={submit} className="space-y-5">
        <FormGrid cols={1}>
          <Field label="Task title" htmlFor="task-title" required error={errors.title}>
            <Input id="task-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="What needs to be done?" invalid={!!errors.title} maxLength={140} />
          </Field>
          <Field label="Description" htmlFor="task-desc" hint="Optional context, resources or acceptance criteria.">
            <Textarea id="task-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Add details…" />
          </Field>
        </FormGrid>
        <FormGrid>
          <CourseInput id="task-course" value={form.course} onChange={(v) => set("course", v)} courses={courses} />
          <Field label="Priority" htmlFor="task-priority">
            <Select id="task-priority" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Due date" htmlFor="task-date" required error={errors.dueDate}>
            <Input id="task-date" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} invalid={!!errors.dueDate} />
          </Field>
          <Field label="Due time" htmlFor="task-time">
            <Input id="task-time" type="time" value={form.dueTime} onChange={(e) => set("dueTime", e.target.value)} />
          </Field>
          <Field label="Status" htmlFor="task-status">
            <Select id="task-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <ReminderSelect id="task-reminder" value={form.reminderMinutes} onChange={(v) => set("reminderMinutes", v)} />
          <Field label="Category" htmlFor="task-cat">
            <Input id="task-cat" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Project, Reading, Revision…" />
          </Field>
          <Field label="Tags" htmlFor="task-tags" hint="Separate tags with commas.">
            <Input id="task-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="project, database" />
          </Field>
        </FormGrid>
      </form>
    </Modal>
  );
}

const blankEvent = () => ({
  title: "", description: "", category: "Other", date: todayISO(), startTime: "10:00", endTime: "11:00",
  location: "", reminderMinutes: 15, color: "#6366F1", status: "Confirmed", repeat: "none",
});

export function EventForm({ open, onClose, initial, defaultDate }) {
  const { data, addItem, updateItem } = useApp();
  const toast = useToast();
  const defaultReminder = data.settings?.defaultReminderMinutes ?? 15;
  const [form, setForm] = useState(blankEvent);
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const buildPayload = ({ form: f }) => ({
    ...f, title: f.title.trim(),
    color: f.color || CATEGORY_COLORS[f.category] || "#6366F1",
  });
  const autosave = useFormAutosave({
    key: `event:${initial?.id || "new"}`, open, form, tagsText: "", initial,
    buildPayload,
    canSave: (payload) => !!payload.title?.trim() && !!payload.date && !!payload.startTime && !!payload.endTime && timeToMinutes(payload.endTime) > timeToMinutes(payload.startTime),
    persist: (payload, id) => {
      if (id) { updateItem("events", id, payload); return { id }; }
      return addItem("events", payload);
    },
    deps: [form],
  });
  const close = () => { autosave.flush(); onClose(); };

  useEffect(() => {
    if (!open) return;
    if (initial) setForm({ ...blankEvent(), ...initial });
    else setForm({ ...blankEvent(), date: defaultDate || todayISO(), reminderMinutes: defaultReminder });
    setErrors({});
  }, [open, initial, defaultDate, defaultReminder]);

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = "An event title is required.";
    if (!form.date) next.date = "Choose a date.";
    if (!form.startTime || !form.endTime) next.time = "Start and end times are required.";
    else if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) next.time = "End time must be after the start time.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const payload = buildPayload({ form });
    if (initial) { updateItem("events", initial.id, payload); toast.success("Event updated", `“${payload.title}” was saved.`); }
    else { addItem("events", payload); toast.success("Event created", `“${payload.title}” was added to your calendar.`); }
    autosave.markSubmitted();
    onClose();
  };

  return (
    <Modal
      open={open} onClose={close} title={initial ? "Edit event" : "New calendar event"} icon={CalendarPlus}
      description="Events appear in your calendar and can trigger reminders. Changes autosave after 2 minutes of inactivity."
      footer={<><SaveStatus status={autosave.status} lastSavedAt={autosave.lastSavedAt} /><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" form="event-form">{initial ? "Save changes" : "Create event"}</Button></>}
    >
      <form id="event-form" onSubmit={submit} className="space-y-5">
        <Field label="Event title" htmlFor="event-title" required error={errors.title}>
          <Input id="event-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Project clinic" invalid={!!errors.title} />
        </Field>
        <FormGrid>
          <Field label="Category" htmlFor="event-cat">
            <Select id="event-cat" value={form.category} onChange={(e) => { set("category", e.target.value); set("color", CATEGORY_COLORS[e.target.value] || form.color); }}>
              {EVENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Date" htmlFor="event-date" required error={errors.date}>
            <Input id="event-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} invalid={!!errors.date} />
          </Field>
          <Field label="Start time" htmlFor="event-start" required>
            <Input id="event-start" type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </Field>
          <Field label="End time" htmlFor="event-end" required error={errors.time}>
            <Input id="event-end" type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} invalid={!!errors.time} />
          </Field>
          <Field label="Location" htmlFor="event-loc">
            <Input id="event-loc" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Room, building or online link" />
          </Field>
          <Field label="Repeat" htmlFor="event-repeat">
            <Select id="event-repeat" value={form.repeat} onChange={(e) => set("repeat", e.target.value)}>
              <option value="none">Does not repeat</option>
              <option value="weekly">Every week</option>
            </Select>
          </Field>
          <Field label="Status" htmlFor="event-status">
            <Select id="event-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {["Confirmed", "Tentative", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <ReminderSelect id="event-reminder" value={form.reminderMinutes} onChange={(v) => set("reminderMinutes", v)} />
          <Field label="Event colour" htmlFor="event-color">
            <div className="flex items-center gap-2">
              <input id="event-color" type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--border-strong)] bg-[var(--surface)]" />
              <Input value={form.color} onChange={(e) => set("color", e.target.value)} className="font-mono text-xs" aria-label="Event colour hex" />
            </div>
          </Field>
        </FormGrid>
        <Field label="Description" htmlFor="event-desc">
          <Textarea id="event-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Agenda, preparation or notes…" />
        </Field>
      </form>
    </Modal>
  );
}

const blankClass = () => ({
  courseName: "", courseCode: "", lecturer: "", classroom: "", day: DAYS[(new Date().getDay() + 6) % 7],
  startTime: "08:00", endTime: "10:00", color: COURSE_COLORS[0], notes: "", reminderMinutes: 15,
});

export function ClassForm({ open, onClose, initial, weekStart }) {
  const { data, addTimetableClass, updateTimetableClass } = useApp();
  const toast = useToast();
  const defaultReminder = data.settings?.defaultReminderMinutes ?? 15;
  const [form, setForm] = useState(blankClass);
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...blankClass(), ...initial } : { ...blankClass(), reminderMinutes: defaultReminder });
    setErrors({});
  }, [open, initial, defaultReminder]);

  const overlaps = useMemo(() => {
    if (!form.day || !form.startTime || !form.endTime) return [];
    const start = timeToMinutes(form.startTime);
    const end = timeToMinutes(form.endTime);
    return (data.timetable || []).filter((cls) => {
      if (cls.id === initial?.id || cls.day !== form.day) return false;
      const s = timeToMinutes(cls.startTime);
      const e = timeToMinutes(cls.endTime);
      return start < e && end > s;
    });
  }, [data.timetable, form.day, form.startTime, form.endTime, initial?.id]);

  const buildPayload = ({ form: f }) => ({
    ...f, courseName: f.courseName.trim(), courseCode: f.courseCode.trim().toUpperCase(),
  });
  const autosave = useFormAutosave({
    key: `class:${initial?.id || weekStart || "new"}`, open, form, tagsText: "", initial,
    buildPayload,
    canSave: (payload) => !!payload.courseName?.trim() && !!payload.courseCode?.trim() && !!payload.startTime && !!payload.endTime && timeToMinutes(payload.endTime) > timeToMinutes(payload.startTime) && overlaps.length === 0,
    persist: (payload, id) => {
      if (id) { updateTimetableClass(id, payload, weekStart); return { id }; }
      return addTimetableClass(payload, weekStart);
    },
    deps: [form, overlaps.length],
  });
  const close = () => { autosave.flush(); onClose(); };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.courseName.trim()) next.courseName = "Course name is required.";
    if (!form.courseCode.trim()) next.courseCode = "Course code is required.";
    if (!form.startTime || !form.endTime) next.time = "Start and end times are required.";
    else if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) next.time = "End time must be after start time.";
    if (overlaps.length) next.overlap = `This overlaps with ${overlaps.map((c) => c.courseCode).join(", ")}. Adjust the time before saving.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    const payload = buildPayload({ form });
    if (initial) { updateTimetableClass(initial.id, payload, weekStart); toast.success("Class updated", `${payload.courseCode} timetable entry saved.`); }
    else { addTimetableClass(payload, weekStart); toast.success("Class added", `${payload.courseCode} was added to your timetable.`); }
    autosave.markSubmitted();
    onClose();
  };

  return (
    <Modal
      open={open} onClose={close} title={initial ? "Edit class" : "Add a class"} icon={School}
      description="Build your weekly schedule. Overlapping classes are detected automatically. Changes autosave after 2 minutes of inactivity."
      footer={<><SaveStatus status={autosave.status} lastSavedAt={autosave.lastSavedAt} /><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" form="class-form">{initial ? "Save changes" : "Save class"}</Button></>}
    >
      <form id="class-form" onSubmit={submit} className="space-y-5">
        <FormGrid>
          <Field label="Course name" htmlFor="cls-name" required error={errors.courseName}>
            <Input id="cls-name" value={form.courseName} onChange={(e) => set("courseName", e.target.value)} placeholder="Database Systems" invalid={!!errors.courseName} />
          </Field>
          <Field label="Course code" htmlFor="cls-code" required error={errors.courseCode}>
            <Input id="cls-code" value={form.courseCode} onChange={(e) => set("courseCode", e.target.value)} placeholder="CSC 3021" invalid={!!errors.courseCode} />
          </Field>
          <Field label="Lecturer" htmlFor="cls-lecturer">
            <Input id="cls-lecturer" value={form.lecturer} onChange={(e) => set("lecturer", e.target.value)} placeholder="Dr. A. Mukamana" />
          </Field>
          <Field label="Classroom" htmlFor="cls-room">
            <Input id="cls-room" value={form.classroom} onChange={(e) => set("classroom", e.target.value)} placeholder="Block B · Room 204" />
          </Field>
          <Field label="Day of week" htmlFor="cls-day">
            <Select id="cls-day" value={form.day} onChange={(e) => set("day", e.target.value)}>
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Class colour" htmlFor="cls-color">
            <div className="flex items-center gap-1.5">
              {COURSE_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => set("color", color)} aria-label={`Use colour ${color}`}
                  className={`h-6 w-6 rounded-full border-2 ${form.color === color ? "border-[var(--text)]" : "border-transparent"}`} style={{ background: color }} />
              ))}
            </div>
          </Field>
          <Field label="Start time" htmlFor="cls-start" required>
            <Input id="cls-start" type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </Field>
          <Field label="End time" htmlFor="cls-end" required error={errors.time}>
            <Input id="cls-end" type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} invalid={!!errors.time} />
          </Field>
          <ReminderSelect id="cls-reminder" value={form.reminderMinutes} onChange={(v) => set("reminderMinutes", v)} />
          <Field label="Class notes" htmlFor="cls-notes">
            <Input id="cls-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Bring worksheet…" />
          </Field>
        </FormGrid>
        {overlaps.length > 0 && (
          <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3 text-[11.5px] leading-relaxed text-[var(--muted)]">
            <span className="font-semibold text-[var(--warning)]">Schedule overlap: </span>
            {overlaps.map((c) => `${c.courseCode} (${c.startTime}–${c.endTime})`).join(", ")} on {form.day}. You cannot save until the times no longer conflict.
          </div>
        )}
      </form>
    </Modal>
  );
}

const durationBetween = (start, end) => Math.max(0, (timeToMinutes(end) || 0) - (timeToMinutes(start) || 0));

const blankStudy = () => ({
  subject: "", topic: "", date: todayISO(), startTime: "18:00", endTime: "19:30",
  plannedMinutes: 90, actualMinutes: 0, goal: "", status: "Planned", notes: "", reminderMinutes: 15,
});

export function StudyForm({ open, onClose, initial }) {
  const { data, addItem, updateItem } = useApp();
  const toast = useToast();
  const courses = useCourseOptions();
  const defaultReminder = data.settings?.defaultReminderMinutes ?? 15;
  const [form, setForm] = useState(blankStudy);
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const buildPayload = ({ form: f }) => ({
    ...f, plannedMinutes: Number(f.plannedMinutes), actualMinutes: Number(f.actualMinutes) || 0, status: f.status,
  });
  const autosave = useFormAutosave({
    key: `study:${initial?.id || "new"}`, open, form, tagsText: "", initial,
    buildPayload,
    canSave: (payload) => !!payload.subject?.trim() && !!payload.topic?.trim() && !!payload.date && payload.plannedMinutes > 0,
    persist: (payload, id) => {
      if (id) { updateItem("studySessions", id, payload); return { id }; }
      return addItem("studySessions", payload);
    },
    deps: [form],
  });
  const close = () => { autosave.flush(); onClose(); };

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...blankStudy(), ...initial } : { ...blankStudy(), reminderMinutes: defaultReminder });
    setErrors({});
  }, [open, initial, defaultReminder]);

  useEffect(() => {
    if (!open) return;
    const computed = durationBetween(form.startTime, form.endTime);
    if (computed > 0) setForm((p) => ({ ...p, plannedMinutes: computed }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startTime, form.endTime, open]);

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.subject.trim()) next.subject = "Choose or type a subject.";
    if (!form.topic.trim()) next.topic = "Add a study topic.";
    if (!form.date) next.date = "Choose a date.";
    if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) next.time = "End time must be after start time.";
    if (!form.plannedMinutes || Number(form.plannedMinutes) <= 0) next.plannedMinutes = "Planned duration must be greater than zero.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const payload = buildPayload({ form });
    if (initial) { updateItem("studySessions", initial.id, payload); toast.success("Study session updated", `“${payload.topic}” was saved.`); }
    else { addItem("studySessions", payload); toast.success("Study session planned", `“${payload.topic}” is on your study plan.`); }
    autosave.markSubmitted();
    onClose();
  };

  return (
    <Modal
      open={open} onClose={close} title={initial ? "Edit study session" : "Plan a study session"} icon={BookOpen}
      description="Define a topic and a measurable goal. Planned minutes update with your times. Changes autosave after 2 minutes of inactivity."
      footer={<><SaveStatus status={autosave.status} lastSavedAt={autosave.lastSavedAt} /><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" form="study-form">{initial ? "Save changes" : "Add to plan"}</Button></>}
    >
      <form id="study-form" onSubmit={submit} className="space-y-5">
        <FormGrid>
          <CourseInput id="study-subject" label="Subject" value={form.subject} onChange={(v) => set("subject", v)} courses={courses} />
          <Field label="Topic" htmlFor="study-topic" required error={errors.topic}>
            <Input id="study-topic" value={form.topic} onChange={(e) => set("topic", e.target.value)} placeholder="Indexing & query performance" invalid={!!errors.topic} />
          </Field>
          <Field label="Date" htmlFor="study-date" required error={errors.date}>
            <Input id="study-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="Status" htmlFor="study-status">
            <Select id="study-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {["Planned", "Completed", "Missed"].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Start time" htmlFor="study-start" required>
            <Input id="study-start" type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </Field>
          <Field label="End time" htmlFor="study-end" required error={errors.time}>
            <Input id="study-end" type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} invalid={!!errors.time} />
          </Field>
          <Field label="Planned minutes" htmlFor="study-planned" required error={errors.plannedMinutes}>
            <Input id="study-planned" type="number" min="5" step="5" value={form.plannedMinutes} onChange={(e) => set("plannedMinutes", e.target.value)} invalid={!!errors.plannedMinutes} />
          </Field>
          <Field label="Actual minutes" htmlFor="study-actual" hint="Log what you actually studied after the session.">
            <Input id="study-actual" type="number" min="0" step="5" value={form.actualMinutes} onChange={(e) => set("actualMinutes", e.target.value)} />
          </Field>
          <ReminderSelect id="study-reminder" value={form.reminderMinutes} onChange={(v) => set("reminderMinutes", v)} />
        </FormGrid>
        <Field label="Session goal" htmlFor="study-goal">
          <Textarea id="study-goal" value={form.goal} onChange={(e) => set("goal", e.target.value)} placeholder="What will you be able to do at the end?" rows={2} />
        </Field>
        <Field label="Notes" htmlFor="study-notes">
          <Input id="study-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Resources, reflections…" />
        </Field>
      </form>
    </Modal>
  );
}

const blankAcademic = (type = "assignment") => ({
  type, title: "", course: "", description: "", dueDate: todayISO(), dueTime: "23:59",
  status: type === "exam" ? "Upcoming" : "Not Started", priority: "Medium", marks: "", score: "",
  reminderMinutes: 1440, notes: "",
});

export function AcademicForm({ open, onClose, initial, defaultType = "assignment" }) {
  const { data, addItem, updateItem } = useApp();
  const toast = useToast();
  const courses = useCourseOptions();
  const defaultReminder = data.settings?.defaultReminderMinutes ?? 1440;
  const [form, setForm] = useState(() => blankAcademic(defaultType));
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const buildPayload = ({ form: f }) => {
    const total = f.marks === "" ? "" : Number(f.marks);
    const obtained = f.score === "" ? "" : Number(f.score);
    const payload = {
      ...f, type: f.type, title: f.title.trim(),
      marks: total, score: obtained, totalMarks: total, marksObtained: obtained,
    };
    if (f.type === "exam") {
      payload.examDate = f.dueDate;
      payload.startTime = f.dueTime;
      payload.preparationNotes = f.notes;
    } else {
      payload.assignedDate = f.assignedDate || f.dueDate;
    }
    return payload;
  };
  const autosave = useFormAutosave({
    key: `academic:${initial?.id || "new"}`, open, form, tagsText: "", initial,
    buildPayload,
    canSave: (payload) => !!payload.title?.trim() && !!payload.course?.trim() && !!payload.dueDate,
    persist: (payload, id) => {
      const collection = payload.type === "exam" ? "exams" : "assignments";
      if (id) { updateItem(collection, id, payload); return { id }; }
      return addItem(collection, payload);
    },
    deps: [form],
  });
  const close = () => { autosave.flush(); onClose(); };

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...blankAcademic(initial.type), ...initial } : { ...blankAcademic(defaultType), reminderMinutes: defaultReminder });
    setErrors({});
  }, [open, initial, defaultType, defaultReminder]);

  useEffect(() => {
    if (!open) return;
    const allowed = form.type === "exam" ? EXAM_STATUSES : ASSIGNMENT_STATUSES;
    if (!allowed.includes(form.status)) set("status", allowed[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type, open]);

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = "A title is required.";
    if (!form.course.trim()) next.course = "Choose or type a course.";
    if (!form.dueDate) next.dueDate = "Choose a due date.";
    if (form.marks !== "" && form.score !== "" && Number(form.score) > Number(form.marks)) next.score = "Score cannot exceed total marks.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const payload = buildPayload({ form });
    const collection = form.type === "exam" ? "exams" : "assignments";
    if (initial) { updateItem(collection, initial.id, payload); toast.success(`${form.type === "exam" ? "Exam" : "Assignment"} updated`, `“${payload.title}” was saved.`); }
    else { addItem(collection, payload); toast.success(`${form.type === "exam" ? "Exam" : "Assignment"} added`, `“${payload.title}” is now tracked.`); }
    autosave.markSubmitted();
    onClose();
  };

  const statuses = form.type === "exam" ? EXAM_STATUSES : ASSIGNMENT_STATUSES;

  return (
    <Modal
      open={open} onClose={close} title={initial ? `Edit ${form.type}` : "New academic work"} icon={form.type === "exam" ? GraduationCap : ClipboardList}
      description="Assignments and exams share one tracker and appear in your calendar automatically. Changes autosave after 2 minutes of inactivity."
      footer={<><SaveStatus status={autosave.status} lastSavedAt={autosave.lastSavedAt} /><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" form="academic-form">{initial ? "Save changes" : "Add record"}</Button></>}
    >
      <form id="academic-form" onSubmit={submit} className="space-y-5">
        <Field label="Record type">
          <div className="grid grid-cols-2 gap-2">
            {[{ value: "assignment", label: "Assignment", icon: ClipboardList }, { value: "exam", label: "Exam", icon: GraduationCap }].map((opt) => (
              <button key={opt.value} type="button" onClick={() => set("type", opt.value)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12.5px] font-semibold transition-colors ${form.type === opt.value ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}>
                <opt.icon size={15} /> {opt.label}
              </button>
            ))}
          </div>
        </Field>
        <FormGrid>
          <Field label={form.type === "exam" ? "Exam title" : "Assignment title"} htmlFor="acad-title" required error={errors.title} className="sm:col-span-2">
            <Input id="acad-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={form.type === "exam" ? "Database Systems CAT 2" : "Normalization exercise"} invalid={!!errors.title} />
          </Field>
          <CourseInput id="acad-course" value={form.course} onChange={(v) => set("course", v)} courses={courses} />
          <Field label="Status" htmlFor="acad-status">
            <Select id="acad-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Due date" htmlFor="acad-date" required error={errors.dueDate}>
            <Input id="acad-date" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} invalid={!!errors.dueDate} />
          </Field>
          <Field label="Due time" htmlFor="acad-time">
            <Input id="acad-time" type="time" value={form.dueTime} onChange={(e) => set("dueTime", e.target.value)} />
          </Field>
          <Field label="Priority" htmlFor="acad-priority">
            <Select id="acad-priority" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <ReminderSelect id="acad-reminder" value={form.reminderMinutes} onChange={(v) => set("reminderMinutes", v)} />
          <Field label="Total marks" htmlFor="acad-marks">
            <Input id="acad-marks" type="number" min="0" value={form.marks} onChange={(e) => set("marks", e.target.value)} placeholder="20" />
          </Field>
          <Field label="Achieved score" htmlFor="acad-score" error={errors.score} hint="Leave blank until graded.">
            <Input id="acad-score" type="number" min="0" value={form.score} onChange={(e) => set("score", e.target.value)} placeholder="—" invalid={!!errors.score} />
          </Field>
        </FormGrid>
        <Field label="Description" htmlFor="acad-desc">
          <Textarea id="acad-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Requirements, scope, assessment criteria…" />
        </Field>
        <Field label="Submission / exam notes" htmlFor="acad-notes">
          <Input id="acad-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Venue, portal, preparation checklist…" />
        </Field>
      </form>
    </Modal>
  );
}

const blankAssignment = () => ({
  title: "", course: "", description: "", assignedDate: todayISO(), dueDate: todayISO(), dueTime: "23:59",
  status: ASSIGNMENT_STATUSES[0] || "Not Started", priority: "Medium", totalMarks: "", marksObtained: "",
  weight: "", reminderMinutes: 1440, notes: "", tags: [],
});

export function AssignmentForm({ open, onClose, initial, defaultCourse }) {
  const { data, addItem, updateItem } = useApp();
  const toast = useToast();
  const courses = useCourseOptions();
  const defaultReminder = data.settings?.defaultReminderMinutes ?? 1440;
  const [form, setForm] = useState(blankAssignment);
  const [tagsText, setTagsText] = useState("");
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const buildPayload = ({ form: f, tagsText: t }) => ({
    ...f, type: "assignment", title: f.title.trim(),
    totalMarks: f.totalMarks === "" ? "" : Number(f.totalMarks),
    marksObtained: f.marksObtained === "" ? "" : Number(f.marksObtained),
    weight: f.weight === "" ? "" : Number(f.weight),
    marks: f.totalMarks === "" ? "" : Number(f.totalMarks),
    score: f.marksObtained === "" ? "" : Number(f.marksObtained),
    tags: t.split(",").map((item) => item.trim()).filter(Boolean),
  });
  const autosave = useFormAutosave({
    key: `assignment:${initial?.id || "new"}`, open, form, tagsText, initial,
    buildPayload,
    canSave: (payload) => !!payload.title?.trim() && !!payload.course?.trim() && !!payload.dueDate,
    persist: (payload, id) => {
      if (id) { updateItem("assignments", id, payload); return { id }; }
      return addItem("assignments", payload);
    },
    onRestore: (restoredForm, restoredTags) => { setForm(restoredForm); setTagsText(restoredTags); },
    deps: [form, tagsText],
  });
  const close = () => { autosave.flush(); onClose(); };

  useEffect(() => {
    if (!open) return;
    const base = blankAssignment();
    const next = initial
      ? {
          ...base, ...initial,
          assignedDate: initial.assignedDate || initial.createdAt?.slice(0, 10) || initial.dueDate || base.assignedDate,
          totalMarks: initial.totalMarks ?? initial.marks ?? "",
          marksObtained: initial.marksObtained ?? initial.score ?? "",
        }
      : { ...base, course: defaultCourse || "", reminderMinutes: defaultReminder };
    setForm(next);
    setTagsText((next.tags || []).join(", "));
    setErrors({});
  }, [open, initial, defaultCourse, defaultReminder]);

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = "An assignment title is required.";
    if (!form.course.trim()) next.course = "Choose or type a course.";
    if (!form.dueDate) next.dueDate = "Choose a deadline.";
    if (form.assignedDate && form.dueDate && form.assignedDate > form.dueDate) next.assignedDate = "Assigned date cannot be after the deadline.";
    if (form.totalMarks !== "" && form.marksObtained !== "" && Number(form.marksObtained) > Number(form.totalMarks)) next.marksObtained = "Marks obtained cannot exceed total marks.";
    if (form.weight !== "" && (Number(form.weight) < 0 || Number(form.weight) > 100)) next.weight = "Weight must be between 0 and 100.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const payload = buildPayload({ form, tagsText });
    if (initial) { updateItem("assignments", initial.id, payload); toast.success("Assignment updated", `“${payload.title}” was saved.`); }
    else { addItem("assignments", payload); toast.success("Assignment created", `“${payload.title}” is now tracked.`); }
    autosave.markSubmitted();
    onClose();
  };

  return (
    <Modal
      open={open} onClose={close} size="lg" title={initial ? "Edit assignment" : "New assignment"} icon={ClipboardList}
      description="Track the brief, deadline, priority and grade in one place. Assignments appear in your calendar automatically. Changes autosave after 2 minutes of inactivity."
      footer={<><SaveStatus status={autosave.status} lastSavedAt={autosave.lastSavedAt} /><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" form="assignment-form">{initial ? "Save changes" : "Create assignment"}</Button></>}
    >
      <form id="assignment-form" onSubmit={submit} className="space-y-5">
        <FormGrid cols={1}>
          <Field label="Assignment title" htmlFor="asg-title" required error={errors.title}>
            <Input id="asg-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Normalization exercise" invalid={!!errors.title} />
          </Field>
          <Field label="Description" htmlFor="asg-desc" hint="Requirements, scope and assessment criteria.">
            <Textarea id="asg-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What must be submitted?" />
          </Field>
        </FormGrid>
        <FormSection title="Schedule" icon={CalendarPlus}>
          <FormGrid>
            <CourseInput id="asg-course" value={form.course} onChange={(v) => set("course", v)} courses={courses} />
            <Field label="Assigned date" htmlFor="asg-assigned" error={errors.assignedDate}>
              <Input id="asg-assigned" type="date" value={form.assignedDate} onChange={(e) => set("assignedDate", e.target.value)} invalid={!!errors.assignedDate} />
            </Field>
            <Field label="Deadline" htmlFor="asg-due" required error={errors.dueDate}>
              <Input id="asg-due" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} invalid={!!errors.dueDate} />
            </Field>
            <Field label="Deadline time" htmlFor="asg-time">
              <Input id="asg-time" type="time" value={form.dueTime} onChange={(e) => set("dueTime", e.target.value)} />
            </Field>
            <ReminderSelect id="asg-reminder" value={form.reminderMinutes} onChange={(v) => set("reminderMinutes", v)} />
          </FormGrid>
        </FormSection>
        <FormSection title="Progress & grading" icon={CheckSquare}>
          <FormGrid>
            <Field label="Status" htmlFor="asg-status">
              <Select id="asg-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {ASSIGNMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Priority" htmlFor="asg-priority">
              <Select id="asg-priority" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Total marks" htmlFor="asg-total">
              <Input id="asg-total" type="number" min="0" value={form.totalMarks} onChange={(e) => set("totalMarks", e.target.value)} placeholder="20" />
            </Field>
            <Field label="Marks obtained" htmlFor="asg-obtained" error={errors.marksObtained} hint="Leave blank until graded.">
              <Input id="asg-obtained" type="number" min="0" value={form.marksObtained} onChange={(e) => set("marksObtained", e.target.value)} placeholder="—" invalid={!!errors.marksObtained} />
            </Field>
            <Field label="Weight (%)" htmlFor="asg-weight" error={errors.weight}>
              <Input id="asg-weight" type="number" min="0" max="100" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="10" invalid={!!errors.weight} />
            </Field>
            <Field label="Tags" htmlFor="asg-tags" hint="Separate tags with commas.">
              <Input id="asg-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="project, cat" />
            </Field>
          </FormGrid>
        </FormSection>
        <Field label="Submission notes" htmlFor="asg-notes">
          <Input id="asg-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Portal, file format, group members…" />
        </Field>
      </form>
    </Modal>
  );
}

const blankExam = () => ({
  title: "", course: "", description: "", examDate: todayISO(), startTime: "09:00", endTime: "11:00",
  location: "", status: EXAM_STATUSES[0] || "Upcoming", priority: "Medium", totalMarks: "", marksObtained: "",
  weight: "", reminderMinutes: 1440, preparationNotes: "", tags: [],
});

export function ExamForm({ open, onClose, initial, defaultCourse }) {
  const { data, addItem, updateItem } = useApp();
  const toast = useToast();
  const courses = useCourseOptions();
  const defaultReminder = data.settings?.defaultReminderMinutes ?? 1440;
  const [form, setForm] = useState(blankExam);
  const [tagsText, setTagsText] = useState("");
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const buildPayload = ({ form: f, tagsText: t }) => ({
    ...f, type: "exam", title: f.title.trim(),
    dueDate: f.examDate, dueTime: f.startTime,
    notes: f.preparationNotes,
    totalMarks: f.totalMarks === "" ? "" : Number(f.totalMarks),
    marksObtained: f.marksObtained === "" ? "" : Number(f.marksObtained),
    weight: f.weight === "" ? "" : Number(f.weight),
    marks: f.totalMarks === "" ? "" : Number(f.totalMarks),
    score: f.marksObtained === "" ? "" : Number(f.marksObtained),
    tags: t.split(",").map((item) => item.trim()).filter(Boolean),
  });
  const autosave = useFormAutosave({
    key: `exam:${initial?.id || "new"}`, open, form, tagsText, initial,
    buildPayload,
    canSave: (payload) => !!payload.title?.trim() && !!payload.course?.trim() && !!payload.examDate,
    persist: (payload, id) => {
      if (id) { updateItem("exams", id, payload); return { id }; }
      return addItem("exams", payload);
    },
    onRestore: (restoredForm, restoredTags) => { setForm(restoredForm); setTagsText(restoredTags); },
    deps: [form, tagsText],
  });
  const close = () => { autosave.flush(); onClose(); };

  useEffect(() => {
    if (!open) return;
    const base = blankExam();
    const next = initial
      ? {
          ...base, ...initial,
          examDate: initial.examDate || initial.dueDate || base.examDate,
          startTime: initial.startTime || initial.dueTime || base.startTime,
          preparationNotes: initial.preparationNotes ?? initial.notes ?? "",
          totalMarks: initial.totalMarks ?? initial.marks ?? "",
          marksObtained: initial.marksObtained ?? initial.score ?? "",
        }
      : { ...base, course: defaultCourse || "", reminderMinutes: defaultReminder };
    setForm(next);
    setTagsText((next.tags || []).join(", "));
    setErrors({});
  }, [open, initial, defaultCourse, defaultReminder]);

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = "An exam title is required.";
    if (!form.course.trim()) next.course = "Choose or type a course.";
    if (!form.examDate) next.examDate = "Choose an exam date.";
    if (form.startTime && form.endTime && timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) next.time = "End time must be after the start time.";
    if (form.totalMarks !== "" && form.marksObtained !== "" && Number(form.marksObtained) > Number(form.totalMarks)) next.marksObtained = "Marks obtained cannot exceed total marks.";
    if (form.weight !== "" && (Number(form.weight) < 0 || Number(form.weight) > 100)) next.weight = "Weight must be between 0 and 100.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const payload = buildPayload({ form, tagsText });
    if (initial) { updateItem("exams", initial.id, payload); toast.success("Exam updated", `“${payload.title}” was saved.`); }
    else { addItem("exams", payload); toast.success("Exam created", `“${payload.title}” is now tracked.`); }
    autosave.markSubmitted();
    onClose();
  };

  return (
    <Modal
      open={open} onClose={close} size="lg" title={initial ? "Edit exam" : "New exam"} icon={GraduationCap}
      description="Record the date, venue, scope and grade. Exams appear in your calendar automatically. Changes autosave after 2 minutes of inactivity."
      footer={<><SaveStatus status={autosave.status} lastSavedAt={autosave.lastSavedAt} /><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" form="exam-form">{initial ? "Save changes" : "Create exam"}</Button></>}
    >
      <form id="exam-form" onSubmit={submit} className="space-y-5">
        <FormGrid cols={1}>
          <Field label="Exam title" htmlFor="exm-title" required error={errors.title}>
            <Input id="exm-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Database Systems CAT 2" invalid={!!errors.title} />
          </Field>
          <Field label="Description" htmlFor="exm-desc" hint="Topics, format and what to revise.">
            <Textarea id="exm-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Covers normalization, transactions and SQL…" />
          </Field>
        </FormGrid>
        <FormSection title="Schedule" icon={CalendarPlus}>
          <FormGrid>
            <CourseInput id="exm-course" value={form.course} onChange={(v) => set("course", v)} courses={courses} />
            <Field label="Exam date" htmlFor="exm-date" required error={errors.examDate}>
              <Input id="exm-date" type="date" value={form.examDate} onChange={(e) => set("examDate", e.target.value)} invalid={!!errors.examDate} />
            </Field>
            <Field label="Start time" htmlFor="exm-start" required>
              <Input id="exm-start" type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </Field>
            <Field label="End time" htmlFor="exm-end" error={errors.time}>
              <Input id="exm-end" type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} invalid={!!errors.time} />
            </Field>
            <Field label="Location" htmlFor="exm-location">
              <Input id="exm-location" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Block B exam hall" />
            </Field>
            <ReminderSelect id="exm-reminder" value={form.reminderMinutes} onChange={(v) => set("reminderMinutes", v)} />
          </FormGrid>
        </FormSection>
        <FormSection title="Progress & grading" icon={CheckSquare}>
          <FormGrid>
            <Field label="Status" htmlFor="exm-status">
              <Select id="exm-status" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {EXAM_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Priority" htmlFor="exm-priority">
              <Select id="exm-priority" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Total marks" htmlFor="exm-total">
              <Input id="exm-total" type="number" min="0" value={form.totalMarks} onChange={(e) => set("totalMarks", e.target.value)} placeholder="30" />
            </Field>
            <Field label="Marks obtained" htmlFor="exm-obtained" error={errors.marksObtained} hint="Leave blank until graded.">
              <Input id="exm-obtained" type="number" min="0" value={form.marksObtained} onChange={(e) => set("marksObtained", e.target.value)} placeholder="—" invalid={!!errors.marksObtained} />
            </Field>
            <Field label="Weight (%)" htmlFor="exm-weight" error={errors.weight}>
              <Input id="exm-weight" type="number" min="0" max="100" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="20" invalid={!!errors.weight} />
            </Field>
            <Field label="Tags" htmlFor="exm-tags" hint="Separate tags with commas.">
              <Input id="exm-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="revision, final" />
            </Field>
          </FormGrid>
        </FormSection>
        <Field label="Preparation notes" htmlFor="exm-notes">
          <Input id="exm-notes" value={form.preparationNotes} onChange={(e) => set("preparationNotes", e.target.value)} placeholder="Formula sheet, venue, materials to bring…" />
        </Field>
      </form>
    </Modal>
  );
}

const blankNote = () => ({ title: "", content: "", course: "", category: "General", tags: [], pinned: false });

export function NoteForm({ open, onClose, initial, defaultCourse }) {
  const { addItem, updateItem } = useApp();
  const toast = useToast();
  const courses = useCourseOptions();
  const [form, setForm] = useState(blankNote);
  const [tagsText, setTagsText] = useState("");
  const [tab, setTab] = useState("write");
  const [errors, setErrors] = useState({});
  const [autoStatus, setAutoStatus] = useState("idle");
  const savedRef = useRef("");
  const sawRef = useRef("");
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    if (!open) return;
    const next = initial ? { ...blankNote(), ...initial } : { ...blankNote(), course: defaultCourse || "" };
    setForm(next);
    setTagsText((next.tags || []).join(", "));
    sawRef.current = initial ? `${next.title}|${next.content}` : "";
    savedRef.current = initial ? `${next.title}|${next.content}` : "";
    setTab("write");
    setErrors({});
    setAutoStatus("idle");
  }, [open, initial, defaultCourse]);

  sawRef.current = `${form.title}|${form.content}`;

  useEffect(() => {
    if (!open || !initial) return;
    if (sawRef.current === savedRef.current) return;
    setAutoStatus("saving");
    const timer = setTimeout(() => {
      if (!form.title.trim()) { setAutoStatus("idle"); return; }
      try {
        updateItem("notes", initial.id, {
          title: form.title.trim(), content: form.content, course: form.course, category: form.category,
          tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean), pinned: form.pinned,
        });
        savedRef.current = sawRef.current;
        setAutoStatus("saved");
        setTimeout(() => setAutoStatus("idle"), 1600);
      } catch {
        setAutoStatus("error");
      }
    }, 1400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, tagsText, open, initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setErrors({ title: "Give your note a title." }); return; }
    if (!form.content.trim()) { setErrors({ content: "Write something before saving." }); return; }
    const payload = {
      ...form, title: form.title.trim(),
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (initial) { updateItem("notes", initial.id, payload); toast.success("Note updated", `“${payload.title}” is saved.`); }
    else { addItem("notes", payload); toast.success("Note created", `“${payload.title}” was added to your notes.`); }
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose} size="lg" title={initial ? "Edit note" : "New note"} icon={FileText}
      description={initial ? "Changes to saved notes autosave while you type." : "Use Markdown for headings, lists, emphasis and quotes."}
      footer={
        <>
          <span className="mr-auto"><SaveStatus status={autoStatus} /></span>
          <Tabs tabs={[{ value: "write", label: "Write", icon: Pencil }, { value: "preview", label: "Preview", icon: Eye }]} value={tab} onChange={setTab} className="mr-auto" />
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="note-form">{initial ? "Save changes" : "Create note"}</Button>
        </>
      }
    >
      <form id="note-form" onSubmit={submit} className="space-y-4">
        <Field label="Title" htmlFor="note-title" required error={errors.title}>
          <Input id="note-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. ER modelling cheat sheet" invalid={!!errors.title} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <CourseInput id="note-course" value={form.course} onChange={(v) => set("course", v)} courses={courses} />
          <Field label="Category" htmlFor="note-cat">
            <Input id="note-cat" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Lecture, Summary, Plan…" />
          </Field>
          <Field label="Tags" htmlFor="note-tags" hint="Comma separated">
            <Input id="note-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="database, exam" />
          </Field>
          <div className="rounded-xl border border-[var(--border)] px-3">
            <Toggle checked={form.pinned} onChange={(v) => set("pinned", v)} label="Pin note" description="Keep important notes at the top." />
          </div>
        </div>
        {tab === "write" ? (
          <Field label="Content" htmlFor="note-content" required error={errors.content}>
            <Textarea id="note-content" rows={13} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder={"## Heading\nWrite your notes here…"} className="font-mono text-[12.5px] leading-relaxed" invalid={!!errors.content} />
          </Field>
        ) : (
          <div className="min-h-[260px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
            {form.content.trim() ? <Markdown content={form.content} /> : <p className="text-xs text-[var(--faint)]">Nothing to preview yet.</p>}
          </div>
        )}
      </form>
    </Modal>
  );
}
