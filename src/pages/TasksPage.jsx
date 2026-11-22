import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle, Check, CheckCheck, CheckCircle2, CheckSquare, ChevronDown, Clock, Filter, ListFilter,
  Pencil, Plus, RotateCcw, SearchX, Trash2, CalendarClock, CircleDashed, Loader2, X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, InfoNote, PageHeader, PageShell,
  ProgressBar, ProgressRing, SearchInput, Select, StatCard, Tabs,
} from "../components/ui";
import { TaskForm } from "../components/forms";
import { DataToolsButton } from "../components/ImportExportPanel";
import { PRIORITIES, combineDateTime, fmtDate, fmtDateShort, fmtTime, isOverdue, pct, statusTone } from "../lib/utils";

const PRIORITY_RANK = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
const PRIORITY_TONE = { Urgent: "danger", High: "warning", Medium: "info", Low: "neutral" };
const PRIORITY_COLOR = { Urgent: "var(--danger)", High: "var(--warning)", Medium: "var(--info)", Low: "var(--faint)" };

export default function TasksPage() {
  const { data, updateItem, deleteMany } = useApp();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [course, setCourse] = useState("All");
  const [sort, setSort] = useState("deadline");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const tasks = data.tasks || [];

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const courses = useMemo(() => Array.from(new Set(tasks.map((t) => t.course).filter(Boolean))).sort(), [tasks]);

  const counts = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "Pending").length,
    progress: tasks.filter((t) => t.status === "In Progress").length,
    completed: tasks.filter((t) => t.status === "Completed").length,
    overdue: tasks.filter((t) => t.status !== "Completed" && isOverdue(t.dueDate, t.dueTime)).length,
  }), [tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tasks.filter((task) => {
      const matchesQuery = !q || [task.title, task.description, task.course, (task.tags || []).join(" "), task.category].join(" ").toLowerCase().includes(q);
      const matchesStatus = status === "All" || (status === "Overdue" ? task.status !== "Completed" && isOverdue(task.dueDate, task.dueTime) : task.status === status);
      const matchesPriority = priority === "All" || task.priority === priority;
      const matchesCourse = course === "All" || task.course === course;
      return matchesQuery && matchesStatus && matchesPriority && matchesCourse;
    });
    const getTime = (t) => combineDateTime(t.dueDate, t.dueTime)?.getTime() || 0;
    list = [...list].sort((a, b) => {
      if (sort === "deadline") return getTime(a) - getTime(b);
      if (sort === "priority") return (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0) || getTime(a) - getTime(b);
      if (sort === "created") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sort === "title") return a.title.localeCompare(b.title);
      return 0;
    });
    return list;
  }, [tasks, query, status, priority, course, sort]);

  const toggleComplete = (task) => {
    const complete = task.status !== "Completed";
    updateItem("tasks", task.id, {
      status: complete ? "Completed" : "Pending",
      completedAt: complete ? new Date().toISOString() : null,
    });
    toast.success(complete ? "Task completed" : "Task reopened", `“${task.title}” was ${complete ? "marked as complete" : "returned to your list"}.`);
  };

  const bulkUpdate = (patch, message) => {
    selected.forEach((id) => updateItem("tasks", id, patch));
    toast.success(message.title, message.text.replace("{n}", selected.length));
    setSelected([]);
  };

  const removeSelected = () => {
    const count = selected.length;
    deleteMany("tasks", selected);
    setSelected([]);
    setConfirmDelete(null);
    toast.success("Tasks deleted", `${count} task${count === 1 ? "" : "s"} removed from your workspace.`);
  };

  const resetFilters = () => { setQuery(""); setStatus("All"); setPriority("All"); setCourse("All"); setSort("deadline"); };
  const activeFilters = [query, status !== "All" ? status : "", priority !== "All" ? priority : "", course !== "All" ? course : ""].filter(Boolean).length;
  const allVisibleSelected = filtered.length > 0 && filtered.every((t) => selected.includes(t.id));
  const toggleSelectAll = () => setSelected(allVisibleSelected ? [] : filtered.map((t) => t.id));
  const toggleSelect = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Personal productivity"
        title="Tasks"
        description="Capture everything you need to do, then work through it with clear priorities and deadlines."
        actions={<><DataToolsButton moduleKey="tasks" /><Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>New task</Button></>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="All tasks" value={counts.total} sub="In your workspace" icon={ListFilter} tone="accent" />
        <StatCard label="Pending" value={counts.pending} sub="Not started yet" icon={CircleDashed} tone="warning" />
        <StatCard label="In progress" value={counts.progress} sub="Currently moving" icon={Loader2} tone="info" />
        <StatCard label="Completed" value={counts.completed} sub={`${pct(counts.completed, counts.total)}% completion rate`} icon={CheckCircle2} tone="success" progress={pct(counts.completed, counts.total)} />
        <StatCard label="Overdue" value={counts.overdue} sub={counts.overdue ? "Needs attention" : "You're on track"} icon={AlertCircle} tone="danger" />
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={status} onChange={setStatus}
              tabs={[
                { value: "All", label: "All", count: counts.total }, { value: "Pending", label: "Pending", count: counts.pending },
                { value: "In Progress", label: "In progress", count: counts.progress }, { value: "Completed", label: "Completed", count: counts.completed },
                { value: "Overdue", label: "Overdue", count: counts.overdue },
              ]}
            />
            <div className="flex items-center gap-2">
              <SearchInput value={query} onChange={setQuery} placeholder="Search tasks…" className="flex-1 sm:w-52" />
              {activeFilters > 0 && <Button size="sm" variant="ghost" icon={X} onClick={resetFilters}>Clear ({activeFilters})</Button>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[10.5px] font-semibold text-[var(--faint)]"><Filter size={11} /> Filters</span>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-8 w-auto py-1 text-[11px]" aria-label="Filter by priority">
              <option value="All">All priorities</option>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
            <Select value={course} onChange={(e) => setCourse(e.target.value)} className="h-8 w-auto max-w-[190px] py-1 text-[11px]" aria-label="Filter by course">
              <option value="All">All courses</option>
              {courses.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10.5px] text-[var(--faint)]">Sort by</span>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 w-auto py-1 text-[11px]" aria-label="Sort tasks">
                <option value="deadline">Deadline</option>
                <option value="priority">Priority</option>
                <option value="created">Newest</option>
                <option value="title">Title</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {selected.length > 0 && (
        <div className="sticky top-[68px] z-20 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--surface)] p-2.5 shadow-md animate-slideUp">
          <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-bold text-[var(--accent)]">{selected.length} selected</span>
          <Button size="xs" variant="secondary" icon={CheckCheck} onClick={() => bulkUpdate({ status: "Completed", completedAt: new Date().toISOString() }, { title: "Tasks completed", text: "{n} tasks marked as complete." })}>Complete</Button>
          <Button size="xs" variant="secondary" icon={RotateCcw} onClick={() => bulkUpdate({ status: "Pending", completedAt: null }, { title: "Tasks reopened", text: "{n} tasks returned to pending." })}>Reopen</Button>
          <Button size="xs" variant="dangerGhost" icon={Trash2} onClick={() => setConfirmDelete("bulk")}>Delete</Button>
          <button onClick={() => setSelected([])} className="ml-auto rounded p-1 text-[var(--faint)] hover:text-[var(--text)]" aria-label="Clear selection"><X size={14} /></button>
        </div>
      )}

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={tasks.length ? SearchX : CheckSquare}
            title={tasks.length ? "No tasks match these filters" : "A clear task list is a good place to start"}
            description={tasks.length ? "Adjust the filters or clear your search to see more tasks." : "Add your first task and UniMate will track deadlines, reminders and progress for you."}
            action={<Button size="sm" icon={tasks.length ? X : Plus} onClick={tasks.length ? resetFilters : () => setFormOpen(true)}>{tasks.length ? "Clear filters" : "Create your first task"}</Button>}
          />
        ) : (
          <>
            <div className="hidden items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2 text-[9.5px] font-bold uppercase tracking-[0.07em] text-[var(--faint)] sm:flex">
              <button onClick={toggleSelectAll} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${allVisibleSelected ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border-strong)] bg-[var(--surface)]"}`} aria-label="Select all visible tasks">
                {allVisibleSelected && <Check size={11} />}
              </button>
              <span className="flex-1 pl-1">Task</span>
              <span className="hidden w-[120px] shrink-0 md:block">Course</span>
              <span className="w-[92px] shrink-0">Due</span>
              <span className="w-[62px] shrink-0">Priority</span>
              <span className="w-[82px] shrink-0">Status</span>
              <span className="w-[54px] shrink-0 text-right">Actions</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {filtered.map((task) => {
                const done = task.status === "Completed";
                const overdue = !done && isOverdue(task.dueDate, task.dueTime);
                const dueSoon = !done && !overdue && combineDateTime(task.dueDate, task.dueTime) - Date.now() < 86400000 * 2;
                return (
                  <div key={task.id} className={`group flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-[var(--surface-2)]/40 sm:flex-row sm:items-center ${selected.includes(task.id) ? "bg-[var(--accent-soft)]/40" : ""}`}>
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <button
                        onClick={() => toggleComplete(task)}
                        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
                        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors ${done ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-[var(--border-strong)] bg-[var(--surface)] hover:border-[var(--accent)]"}`}
                      >
                        {done && <Check size={11} strokeWidth={3} />}
                      </button>
                      <button onClick={() => { setEditing(task); setFormOpen(true); }} className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-2">
                          <span className={`truncate text-[12.5px] font-semibold ${done ? "text-[var(--faint)] line-through" : "text-[var(--text)]"}`}>{task.title}</span>
                          {overdue && <Badge tone="danger">Overdue</Badge>}
                          {dueSoon && !overdue && <Badge tone="warning">Soon</Badge>}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--faint)]">
                          {task.description ? <span className="max-w-[300px] truncate">{task.description}</span> : null}
                          {(task.tags || []).slice(0, 2).map((tag) => <span key={tag} className="rounded bg-[var(--surface-2)] px-1 py-px text-[9px] text-[var(--muted)]">#{tag}</span>)}
                          {task.category && <span className="rounded bg-[var(--surface-2)] px-1 py-px text-[9px] text-[var(--muted)]">{task.category}</span>}
                        </span>
                      </button>
                    </div>
                    <div className="ml-[28px] flex flex-wrap items-center gap-2 sm:ml-0 sm:flex-nowrap">
                      <div className="hidden min-w-0 md:block md:w-[120px] md:shrink-0">
                        <span className="block truncate text-[10.5px] text-[var(--muted)]">{task.course || "—"}</span>
                      </div>
                      <div className="w-auto shrink-0 sm:w-[92px]">
                        <p className={`flex items-center gap-1 text-[10.5px] font-medium ${overdue ? "text-[var(--danger)]" : dueSoon ? "text-[var(--warning)]" : "text-[var(--muted)]"}`}>
                          <Clock size={10} /> {fmtDateShort(task.dueDate)}
                        </p>
                        <p className="text-[9.5px] text-[var(--faint)]">{fmtTime(task.dueTime)}</p>
                      </div>
                      <div className="shrink-0 sm:w-[62px]">
                        <Badge tone={PRIORITY_TONE[task.priority]} dot>{task.priority}</Badge>
                      </div>
                      <div className="shrink-0 sm:w-[82px]">
                        <Badge tone={statusTone(task.status)}>{task.status}</Badge>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 sm:w-[54px] sm:justify-end">
                        <IconButton icon={Pencil} label={`Edit ${task.title}`} size="iconSm" onClick={() => { setEditing(task); setFormOpen(true); }} />
                        <IconButton icon={Trash2} label={`Delete ${task.title}`} size="iconSm" variant="ghost" className="hover:text-[var(--danger)]" onClick={() => setConfirmDelete(task.id)} />
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSelect(task.id)}
                      aria-label={`Select ${task.title}`}
                      className={`hidden h-4 w-4 shrink-0 items-center justify-center rounded border sm:flex ${selected.includes(task.id) ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border-strong)] bg-[var(--surface)] opacity-0 group-hover:opacity-100"}`}
                    >
                      {selected.includes(task.id) && <Check size={10} />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-2)]/30 px-3 py-2">
              <p className="text-[10.5px] text-[var(--faint)]">Showing {filtered.length} of {tasks.length} tasks · {counts.overdue} overdue</p>
              <div className="flex items-center gap-2 text-[10.5px] text-[var(--muted)]">
                <span>Completion</span>
                <div className="w-24"><ProgressBar value={pct(counts.completed, counts.total)} /></div>
                <span className="font-semibold text-[var(--text)]">{pct(counts.completed, counts.total)}%</span>
              </div>
            </div>
          </>
        )}
      </Card>

      <InfoNote tone="neutral" icon={CalendarClock}>
        Completing a task records the completion date for your dashboard. Overdue tasks stay visible until you finish them or change their deadline.
      </InfoNote>

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} />
      <ConfirmDialog
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete === "bulk") return removeSelected();
          const task = tasks.find((t) => t.id === confirmDelete);
          deleteMany("tasks", [confirmDelete]);
          setConfirmDelete(null);
          toast.success("Task deleted", `“${task?.title || "Task"}” was removed.`);
        }}
        title={confirmDelete === "bulk" ? `Delete ${selected.length} selected tasks?` : "Delete this task?"}
        message={confirmDelete === "bulk" ? "Selected tasks will be permanently removed from your workspace." : "This task will be permanently removed. This cannot be undone."}
        confirmLabel={confirmDelete === "bulk" ? "Delete tasks" : "Delete task"}
      />
    </PageShell>
  );
}
