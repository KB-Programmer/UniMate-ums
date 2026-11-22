import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import {
  AlertCircle, Award, CalendarDays, CheckCircle2, ClipboardList, Clock, GraduationCap, Pencil, Plus,
  SearchX, Target, Trash2, TrendingUp, TriangleAlert,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, InfoNote, PageHeader, PageShell,
  ProgressBar, SearchInput, Select, StatCard, Tabs,
} from "../components/ui";
import { AcademicForm } from "../components/forms";
import { DataToolsButton } from "../components/ImportExportPanel";
import {
  ASSIGNMENT_STATUSES, EXAM_STATUSES, combineDateTime, courseShort, fmtDate, fmtDateShort, fmtTime,
  isOverdue, pct, statusTone,
} from "../lib/utils";

const PRIORITY_TONE = { Urgent: "danger", High: "warning", Medium: "info", Low: "neutral" };

export default function AcademicPage() {
  const { data, updateItem, deleteItem } = useApp();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [course, setCourse] = useState("All");
  const [sort, setSort] = useState("deadline");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [defaultType, setDefaultType] = useState("assignment");
  const [deleting, setDeleting] = useState(null);
  const items = data.academicItems || [];

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setDefaultType(searchParams.get("type") === "exam" ? "exam" : "assignment");
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const assignments = items.filter((i) => i.type === "assignment");
  const exams = items.filter((i) => i.type === "exam");
  const isDone = (item) => ["Submitted", "Completed"].includes(item.status);
  const overdue = items.filter((i) => !isDone(i) && isOverdue(i.dueDate, i.dueTime));
  const nextWeek = items.filter((i) => {
    const d = combineDateTime(i.dueDate, "00:00");
    return !isDone(i) && d >= startOfDay(new Date()) && d <= addDays(startOfDay(new Date()), 7);
  });
  const graded = items.filter((i) => i.score !== "" && Number(i.marks) > 0 && Number.isFinite(Number(i.score)));
  const gradePct = graded.length
    ? Math.round(graded.reduce((sum, i) => sum + Number(i.score), 0) / graded.reduce((sum, i) => sum + Number(i.marks), 0) * 100)
    : null;

  const courses = useMemo(() => Array.from(new Set(items.map((i) => i.course).filter(Boolean))).sort(), [items]);
  const statusOptions = useMemo(() => Array.from(new Set([...ASSIGNMENT_STATUSES, ...EXAM_STATUSES])), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      const typeOk = tab === "all" || (tab === "assignments" ? item.type === "assignment" : item.type === "exam");
      const queryOk = !q || [item.title, item.course, item.description, item.notes].join(" ").toLowerCase().includes(q);
      const statusOk = status === "All" || (status === "Overdue" ? !isDone(item) && isOverdue(item.dueDate, item.dueTime) : item.status === status);
      const courseOk = course === "All" || item.course === course;
      return typeOk && queryOk && statusOk && courseOk;
    });
    const getTime = (i) => combineDateTime(i.dueDate, i.dueTime)?.getTime() || 0;
    return [...list].sort((a, b) => {
      if (sort === "deadline") return getTime(a) - getTime(b);
      if (sort === "created") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "marks") return (Number(b.marks) || 0) - (Number(a.marks) || 0);
      return 0;
    });
  }, [items, tab, query, status, course, sort]);

  const changeStatus = (item, nextStatus) => {
    const collection = item.type === "exam" ? "exams" : "assignments";
    updateItem(collection, item.id, { status: nextStatus });
    toast.success("Status updated", `“${item.title}” is now ${nextStatus.toLowerCase()}.`);
  };
  const remove = () => {
    const collection = deleting.type === "exam" ? "exams" : "assignments";
    deleteItem(collection, deleting.id);
    toast.success("Record deleted", `“${deleting.title}” was removed. Its calendar deadline is gone too.`);
    setDeleting(null);
  };

  const resetFilters = () => { setQuery(""); setStatus("All"); setCourse("All"); setSort("deadline"); };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Coursework tracker"
        title="Assignments & Exams"
        description="One shared record for every submission and assessment. Deadlines flow into your calendar and reminders automatically."
        actions={
          <>
            <DataToolsButton moduleKey="assignments" allowModuleSelect label="Import / export" />
            <Button variant="secondary" icon={GraduationCap} onClick={() => { setEditing(null); setDefaultType("exam"); setFormOpen(true); }}>Add exam</Button>
            <Button icon={Plus} onClick={() => { setEditing(null); setDefaultType("assignment"); setFormOpen(true); }}>Add assignment</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Assignments" value={assignments.length} sub={`${assignments.filter((a) => isDone(a)).length} submitted`} icon={ClipboardList} tone="accent" progress={pct(assignments.filter((a) => isDone(a)).length, assignments.length)} />
        <StatCard label="Exams" value={exams.length} sub={`${exams.filter((e) => e.status === "Prepared").length} prepared`} icon={GraduationCap} tone="warning" />
        <StatCard label="Due in 7 days" value={nextWeek.length} sub={overdue.length ? `${overdue.length} overdue` : "Nothing overdue"} icon={Clock} tone={overdue.length ? "danger" : "info"} />
        <StatCard label="Graded average" value={gradePct === null ? "—" : `${gradePct}%`} sub={graded.length ? `${graded.length} graded records` : "No scores entered"} icon={Award} tone="success" />
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={tab} onChange={(v) => { setTab(v); setStatus("All"); }}
              tabs={[
                { value: "all", label: "All work", count: items.length },
                { value: "assignments", label: "Assignments", count: assignments.length },
                { value: "exams", label: "Exams", count: exams.length },
              ]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder="Search coursework…" className="w-full sm:w-56" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 w-auto py-1 text-[11px]" aria-label="Filter by status">
              <option value="All">All statuses</option>
              {statusOptions.map((s) => <option key={s}>{s}</option>)}
              <option>Overdue</option>
            </Select>
            <Select value={course} onChange={(e) => setCourse(e.target.value)} className="h-8 w-auto max-w-[210px] py-1 text-[11px]" aria-label="Filter by course">
              <option value="All">All courses</option>
              {courses.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10.5px] text-[var(--faint)]">Sort</span>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 w-auto py-1 text-[11px]" aria-label="Sort coursework">
                <option value="deadline">Deadline</option>
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
              icon={items.length ? SearchX : ClipboardList}
              title={items.length ? "No work matches these filters" : "No assignments or exams yet"}
              description={items.length ? "Try clearing filters or searching for a different course." : "Add your first assignment or exam and UniMate will connect it to your calendar and reminders."}
              action={<Button size="sm" onClick={items.length ? resetFilters : () => { setDefaultType("assignment"); setFormOpen(true); }}>{items.length ? "Clear filters" : "Add academic work"}</Button>}
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filtered.map((item) => {
                const isExam = item.type === "exam";
                const done = isDone(item);
                const late = !done && isOverdue(item.dueDate, item.dueTime);
                const days = differenceInCalendarDays(combineDateTime(item.dueDate, "00:00"), startOfDay(new Date()));
                const statuses = isExam ? EXAM_STATUSES : ASSIGNMENT_STATUSES;
                const grade = item.marks && item.score !== "" ? Math.round((Number(item.score) / Number(item.marks)) * 100) : null;
                return (
                  <div key={item.id} className="group p-3 transition-colors hover:bg-[var(--surface-2)]/40 sm:p-3.5">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isExam ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}>
                        {isExam ? <GraduationCap size={15} /> : <ClipboardList size={15} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className={`truncate text-[12.5px] font-semibold ${done ? "text-[var(--muted)]" : "text-[var(--text)]"}`}>{item.title}</p>
                          <Badge tone={isExam ? "danger" : "accent"}>{isExam ? "Exam" : "Assignment"}</Badge>
                          {late && <Badge tone="danger" dot>Overdue</Badge>}
                          {!late && !done && days >= 0 && days <= 2 && <Badge tone="warning">{days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : "Due soon"}</Badge>}
                        </div>
                        <p className="mt-0.5 truncate text-[10.5px] text-[var(--faint)]">{item.course} · {item.marks ? `${item.marks} marks` : "Ungraded"}{grade !== null ? ` · scored ${grade}%` : ""}</p>
                        {item.description && <p className="mt-1 line-clamp-1 text-[10.5px] text-[var(--muted)]">{item.description}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`flex items-center gap-1 text-[10.5px] font-medium ${late ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}><CalendarDays size={10} /> {fmtDateShort(item.dueDate)} · {fmtTime(item.dueTime)}</span>
                          <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority}</Badge>
                          {grade !== null && (
                            <span className="flex items-center gap-1.5 text-[10px] text-[var(--faint)]"><Target size={10} /> <span className="w-14"><ProgressBar value={grade} className="h-1" color={grade >= 50 ? "var(--success)" : "var(--danger)"} /></span>{item.score}/{item.marks}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Select value={item.status} onChange={(e) => changeStatus(item, e.target.value)} className="h-7 w-[112px] py-0.5 text-[10px] font-semibold" aria-label={`Status for ${item.title}`}>
                          {statuses.map((s) => <option key={s}>{s}</option>)}
                        </Select>
                        <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
                          <IconButton icon={Pencil} label={`Edit ${item.title}`} size="iconSm" onClick={() => { setEditing(item); setDefaultType(item.type); setFormOpen(true); }} />
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
            <span>{filtered.length} records · {overdue.length} overdue · {nextWeek.length} due this week</span>
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
              {nextWeek.slice(0, 5).map((item) => (
                <button key={item.id} onClick={() => { setEditing(item); setDefaultType(item.type); setFormOpen(true); }} className="flex w-full items-center gap-2 py-2 text-left">
                  <span className="flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-md bg-[var(--surface-2)]">
                    <span className="text-[8px] font-bold uppercase text-[var(--faint)]">{fmtDate(item.dueDate, "MMM")}</span>
                    <span className="text-[10px] font-bold leading-none text-[var(--text)]">{fmtDate(item.dueDate, "d")}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-[var(--text)]">{item.title}</span>
                    <span className="block truncate text-[9.5px] text-[var(--faint)]">{fmtTime(item.dueTime)} · {courseShort(item.course)}</span>
                  </span>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </button>
              ))}
              {!nextWeek.length && <p className="py-4 text-center text-[11px] text-[var(--faint)]">Nothing due in the next seven days.</p>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-bold text-[var(--text)]">Performance snapshot</p>
                <p className="text-[10px] text-[var(--faint)]">Based on scored records only</p>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--success-soft)] text-[var(--success)]"><TrendingUp size={14} /></span>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <p className="font-display text-[30px] font-bold leading-none text-[var(--text)]">{gradePct === null ? "—" : `${gradePct}%`}</p>
              <p className="mb-0.5 text-[10.5px] text-[var(--faint)]">weighted across {graded.length} graded item{graded.length === 1 ? "" : "s"}</p>
            </div>
            <ProgressBar value={gradePct || 0} className="mt-2.5" color="var(--success)" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[var(--border)] p-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--faint)]">Submitted</p>
                <p className="mt-0.5 text-[14px] font-bold text-[var(--text)]">{assignments.filter((a) => isDone(a)).length}/{assignments.length}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--faint)]">Exams prepared</p>
                <p className="mt-0.5 text-[14px] font-bold text-[var(--text)]">{exams.filter((e) => e.status === "Prepared").length}/{exams.length}</p>
              </div>
            </div>
          </Card>

          {overdue.length > 0 && (
            <div className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--danger)]"><TriangleAlert size={13} /> {overdue.length} overdue item{overdue.length === 1 ? "" : "s"}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[var(--muted)]">{overdue.slice(0, 2).map((i) => i.title).join(" · ")}{overdue.length > 2 ? ` and ${overdue.length - 2} more` : ""}. Update the deadline or status if plans have changed.</p>
              <Button size="xs" variant="dangerGhost" className="mt-2" onClick={() => setStatus("Overdue")}>Review overdue</Button>
            </div>
          )}

          <InfoNote tone="neutral" icon={CalendarDays}>
            Coursework deadlines are shown on the calendar as read-only linked items. Update them here to keep every module consistent.
          </InfoNote>
        </div>
      </div>

      <AcademicForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} defaultType={defaultType} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete this academic record?" message={deleting ? `“${deleting.title}” will be removed from assignments and exams, along with its calendar deadline and reminders.` : ""} confirmLabel="Delete record" />
    </PageShell>
  );
}
