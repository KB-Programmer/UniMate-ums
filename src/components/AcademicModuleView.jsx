import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import {
  Award, CalendarDays, CheckCircle2, ClipboardList, Clock, GraduationCap, MapPin, Pencil,
  SearchX, Target, Trash2, TriangleAlert,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, InfoNote, PageHeader, PageShell,
  ProgressBar, SearchInput, Select, StatCard,
} from "./ui";
import { AssignmentForm, ExamForm } from "./forms";
import { DataToolsButton } from "./ImportExportPanel";
import {
  ASSIGNMENT_STATUSES, EXAM_STATUSES, combineDateTime, courseShort, fmtDate, fmtDateShort, fmtTime,
  isOverdue, pct, statusTone,
} from "../lib/utils";

const PRIORITY_TONE = { Urgent: "danger", High: "warning", Medium: "info", Low: "neutral" };

const CONFIG = {
  assignment: {
    collection: "assignments", label: "Assignment", plural: "Assignments",
    icon: ClipboardList, statuses: ASSIGNMENT_STATUSES, done: ["Submitted", "Completed"],
    dateField: "dueDate", timeField: "dueTime", moduleKey: "assignments",
    description: "Every brief, deadline, priority and grade in one dedicated module. Assignments flow into your calendar and reminders automatically.",
  },
  exam: {
    collection: "exams", label: "Exam", plural: "Exams",
    icon: GraduationCap, statuses: EXAM_STATUSES, done: ["Completed"],
    dateField: "examDate", timeField: "startTime", moduleKey: "exams",
    description: "Dates, venues, scope and grades for every assessment. Exams flow into your calendar and reminders automatically.",
  },
};

export default function AcademicModuleView({ kind = "assignment" }) {
  const cfg = CONFIG[kind] || CONFIG.assignment;
  const { data, updateItem, deleteItem } = useApp();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [course, setCourse] = useState("All");
  const [sort, setSort] = useState("deadline");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const items = data[cfg.collection] || [];

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const isDone = (item) => cfg.done.includes(item.status);
  const overdue = items.filter((item) => !isDone(item) && isOverdue(item[cfg.dateField] || item.dueDate, item[cfg.timeField] || item.dueTime));
  const nextWeek = items.filter((item) => {
    const d = combineDateTime(item[cfg.dateField] || item.dueDate, "00:00");
    return !isDone(item) && d >= startOfDay(new Date()) && d <= addDays(startOfDay(new Date()), 7);
  });
  const graded = items.filter((item) => item.marksObtained !== "" && Number(item.totalMarks || item.marks) > 0 && Number.isFinite(Number(item.marksObtained)));
  const gradePct = graded.length
    ? Math.round(graded.reduce((sum, item) => sum + Number(item.marksObtained), 0) / graded.reduce((sum, item) => sum + Number(item.totalMarks || item.marks), 0) * 100)
    : null;

  const courses = useMemo(() => Array.from(new Set(items.map((item) => item.course).filter(Boolean))).sort(), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      const queryOk = !q || [item.title, item.course, item.description, item.notes, item.preparationNotes, item.location]
        .join(" ").toLowerCase().includes(q);
      const statusOk = status === "All"
        ? true
        : status === "Overdue"
          ? !isDone(item) && isOverdue(item[cfg.dateField] || item.dueDate, item[cfg.timeField] || item.dueTime)
          : item.status === status;
      const courseOk = course === "All" || item.course === course;
      return queryOk && statusOk && courseOk;
    });
    const getTime = (item) => combineDateTime(item[cfg.dateField] || item.dueDate, item[cfg.timeField] || "00:00")?.getTime() || 0;
    return [...list].sort((a, b) => {
      if (sort === "deadline") return getTime(a) - getTime(b);
      if (sort === "created") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sort === "title") return String(a.title).localeCompare(String(b.title));
      if (sort === "marks") return (Number(b.totalMarks || b.marks) || 0) - (Number(a.totalMarks || a.marks) || 0);
      return 0;
    });
  }, [items, query, status, course, sort, cfg]);

  const changeStatus = (item, nextStatus) => {
    updateItem(cfg.collection, item.id, { status: nextStatus });
    toast.success("Status updated", `“${item.title}” is now ${nextStatus.toLowerCase()}.`);
  };

  const remove = () => {
    deleteItem(cfg.collection, deleting.id);
    toast.success(`${cfg.label} deleted`, `“${deleting.title}” was removed from your ${cfg.plural.toLowerCase()} module.`);
    setDeleting(null);
  };

  const resetFilters = () => { setQuery(""); setStatus("All"); setCourse("All"); setSort("deadline"); };
  const Form = kind === "exam" ? ExamForm : AssignmentForm;
  const Icon = cfg.icon;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Coursework tracker"
        title={cfg.plural}
        description={cfg.description}
        actions={
          <>
            <DataToolsButton moduleKey={cfg.moduleKey} allowModuleSelect label="Import / export" />
            <Button icon={Icon} onClick={() => { setEditing(null); setFormOpen(true); }}>Add {cfg.label.toLowerCase()}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={cfg.plural} value={items.length} sub={`${items.filter(isDone).length} completed`} icon={Icon} tone="accent" progress={pct(items.filter(isDone).length, items.length)} />
        <StatCard label="Due in 7 days" value={nextWeek.length} sub={overdue.length ? `${overdue.length} overdue` : "Nothing overdue"} icon={Clock} tone={overdue.length ? "danger" : "info"} />
        <StatCard label="Graded average" value={gradePct === null ? "—" : `${gradePct}%`} sub={graded.length ? `${graded.length} graded records` : "No scores entered"} icon={Award} tone="success" />
        <StatCard label={kind === "exam" ? "Prepared" : "Submitted"} value={items.filter((item) => item.status === (kind === "exam" ? "Prepared" : "Submitted")).length} sub={`of ${items.length} records`} icon={CheckCircle2} tone="warning" />
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[13px] font-bold text-[var(--text)]">All {cfg.plural.toLowerCase()}</h2>
              <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">Separate from other coursework, but always linked to your calendar.</p>
            </div>
            <SearchInput value={query} onChange={setQuery} placeholder={`Search ${cfg.plural.toLowerCase()}…`} className="w-full sm:w-56" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 w-auto py-1 text-[11px]" aria-label="Filter by status">
              <option value="All">All statuses</option>
              {cfg.statuses.map((s) => <option key={s}>{s}</option>)}
              <option>Overdue</option>
            </Select>
            <Select value={course} onChange={(e) => setCourse(e.target.value)} className="h-8 w-auto max-w-[210px] py-1 text-[11px]" aria-label="Filter by course">
              <option value="All">All courses</option>
              {courses.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10.5px] text-[var(--faint)]">Sort</span>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 w-auto py-1 text-[11px]" aria-label="Sort records">
                <option value="deadline">{kind === "exam" ? "Exam date" : "Deadline"}</option>
                <option value="created">Newest</option>
                <option value="title">Title</option>
                <option value="marks">Marks</option>
              </Select>
            </div>
            {(query || status !== "All" || course !== "All") && <Button size="sm" variant="ghost" onClick={resetFilters}>Clear filters</Button>}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-8">
          {filtered.length === 0 ? (
            <EmptyState
              icon={items.length ? SearchX : Icon}
              title={items.length ? `No ${cfg.plural.toLowerCase()} match these filters` : `No ${cfg.plural.toLowerCase()} yet`}
              description={items.length ? "Try clearing filters or searching for a different course." : `Add your first ${cfg.label.toLowerCase()} and UniMate will connect it to your calendar and reminders.`}
              action={<Button size="sm" onClick={items.length ? resetFilters : () => { setEditing(null); setFormOpen(true); }}>{items.length ? "Clear filters" : `Add ${cfg.label.toLowerCase()}`}</Button>}
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filtered.map((item) => {
                const done = isDone(item);
                const date = item[cfg.dateField] || item.dueDate;
                const time = item[cfg.timeField] || item.dueTime;
                const late = !done && isOverdue(date, time);
                const days = differenceInCalendarDays(combineDateTime(date, "00:00"), startOfDay(new Date()));
                const total = Number(item.totalMarks ?? item.marks) || 0;
                const obtained = item.marksObtained ?? item.score;
                const grade = total && obtained !== "" && obtained != null ? Math.round((Number(obtained) / total) * 100) : null;
                return (
                  <div key={item.id} className="group p-3 transition-colors hover:bg-[var(--surface-2)]/40 sm:p-3.5">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className={`truncate text-[12.5px] font-semibold ${done ? "text-[var(--muted)]" : "text-[var(--text)]"}`}>{item.title}</p>
                          {late && <Badge tone="danger" dot>Overdue</Badge>}
                          {!late && !done && days >= 0 && days <= 2 && <Badge tone="warning">{days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : "Due soon"}</Badge>}
                          {item.weight !== "" && item.weight != null && <Badge tone="neutral">{item.weight}% weight</Badge>}
                        </div>
                        <p className="mt-0.5 truncate text-[10.5px] text-[var(--faint)]">{item.course} · {total ? `${total} marks` : "Ungraded"}{grade !== null ? ` · scored ${grade}%` : ""}</p>
                        {item.description && <p className="mt-1 line-clamp-1 text-[10.5px] text-[var(--muted)]">{item.description}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`flex items-center gap-1 text-[10.5px] font-medium ${late ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
                            <CalendarDays size={10} /> {fmtDate(date, "dd MMM")}{time ? ` · ${fmtTime(time)}` : ""}
                          </span>
                          {item.location && <span className="flex items-center gap-1 text-[10px] text-[var(--faint)]"><MapPin size={10} /> {item.location}</span>}
                          <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
                          {grade !== null && (
                            <span className="flex items-center gap-1.5 text-[10px] text-[var(--faint)]">
                              <Target size={10} /> <span className="w-14"><ProgressBar value={grade} className="h-1" color={grade >= 50 ? "var(--success)" : "var(--danger)"} /></span>{obtained}/{total}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Select value={item.status} onChange={(e) => changeStatus(item, e.target.value)} className="h-7 w-[112px] py-0.5 text-[10px] font-semibold" aria-label={`Status for ${item.title}`}>
                          {cfg.statuses.map((s) => <option key={s}>{s}</option>)}
                        </Select>
                        <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
                          <IconButton icon={Pencil} label={`Edit ${item.title}`} size="iconSm" onClick={() => { setEditing(item); setFormOpen(true); }} />
                          <IconButton icon={Trash2} label={`Delete ${item.title}`} size="iconSm" className="hover:text-[var(--danger)]" onClick={() => setDeleting(item)} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-2)]/30 px-3 py-2 text-[10.5px] text-[var(--faint)]">
            <span>{filtered.length} records · {overdue.length} overdue · {nextWeek.length} in the next seven days</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-[var(--success)]" /> Linked to calendar &amp; notifications</span>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-[var(--text)]">Next seven days</p>
              <Clock size={13} className="text-[var(--faint)]" />
            </div>
            <div className="mt-2 divide-y divide-[var(--border)]">
              {nextWeek.slice(0, 5).map((item) => {
                const date = item[cfg.dateField] || item.dueDate;
                const time = item[cfg.timeField] || item.dueTime;
                return (
                  <button key={item.id} onClick={() => { setEditing(item); setFormOpen(true); }} className="flex w-full items-center gap-2 py-2 text-left">
                    <span className="flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-md bg-[var(--surface-2)]">
                      <span className="text-[8px] font-bold uppercase text-[var(--faint)]">{fmtDate(date, "MMM")}</span>
                      <span className="text-[10px] font-bold leading-none text-[var(--text)]">{fmtDate(date, "d")}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-[var(--text)]">{item.title}</span>
                      <span className="block truncate text-[9.5px] text-[var(--faint)]">{fmtTime(time)} · {courseShort(item.course)}</span>
                    </span>
                    <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                  </button>
                );
              })}
              {!nextWeek.length && <p className="py-4 text-center text-[11px] text-[var(--faint)]">Nothing due in the next seven days.</p>}
            </div>
          </Card>

          {overdue.length > 0 && (
            <div className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--danger)]"><TriangleAlert size={13} /> {overdue.length} overdue item{overdue.length === 1 ? "" : "s"}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[var(--muted)]">{overdue.slice(0, 2).map((item) => item.title).join(" · ")}{overdue.length > 2 ? ` and ${overdue.length - 2} more` : ""}. Update the date or status if plans have changed.</p>
              <Button size="xs" variant="dangerGhost" className="mt-2" onClick={() => setStatus("Overdue")}>Review overdue</Button>
            </div>
          )}

          <InfoNote tone="neutral" icon={CalendarDays}>
            {cfg.plural} are stored independently and mirrored into the shared academic feed so the calendar, dashboard and reminders stay consistent.
          </InfoNote>
        </div>
      </div>

      <Form open={formOpen} onClose={() => setFormOpen(false)} initial={editing} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title={`Delete this ${cfg.label.toLowerCase()}?`}
        message={deleting ? `“${deleting.title}” will be removed from the ${cfg.plural.toLowerCase()} module and its linked calendar entry.` : ""}
        confirmLabel={`Delete ${cfg.label.toLowerCase()}`}
      />
    </PageShell>
  );
}
