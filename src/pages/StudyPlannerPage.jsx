import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addDays, addWeeks, format, isToday, startOfDay, startOfWeek } from "date-fns";
import {
  BarChart3, BookOpen, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Flame, Pencil,
  Play, Plus, SearchX, Target, Timer, Trash2, TrendingUp, Sparkles,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Field, IconButton, InfoNote, Input, Modal,
  PageHeader, PageShell, ProgressBar, ProgressRing, SearchInput, Select, StatCard, Tabs,
} from "../components/ui";
import { StudyForm } from "../components/forms";
import { DataToolsButton } from "../components/ImportExportPanel";
import { COURSE_COLORS, combineDateTime, fmtDate, fmtTime, formatHours, formatMinutes, pct, todayISO, courseShort } from "../lib/utils";

const WEEK_START = 1;

export default function StudyPlannerPage() {
  const { data, updateItem, deleteItem, updateSettings } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState("week");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [logging, setLogging] = useState(null);
  const [actual, setActual] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [goalInput, setGoalInput] = useState(data.settings.dailyStudyGoal || 180);
  const sessions = data.studySessions || [];
  const dailyGoal = data.settings.dailyStudyGoal || 180;

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => { setGoalInput(dailyGoal); }, [dailyGoal]);

  const weekStartDate = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: WEEK_START });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  const subjectColor = useMemo(() => {
    const map = {};
    Array.from(new Set(sessions.map((s) => s.subject).filter(Boolean))).forEach((subject, i) => { map[subject] = COURSE_COLORS[i % COURSE_COLORS.length]; });
    return map;
  }, [sessions]);

  const stats = useMemo(() => {
    const thisWeek = sessions.filter((s) => combineDateTime(s.date, "00:00") >= startOfDay(weekStartDate) && combineDateTime(s.date, "00:00") < addDays(startOfDay(weekStartDate), 7));
    const planned = thisWeek.reduce((sum, s) => sum + (Number(s.plannedMinutes) || 0), 0);
    const actualMins = thisWeek.reduce((sum, s) => sum + (Number(s.actualMinutes) || 0), 0);
    const today = sessions.filter((s) => s.date === todayISO());
    const todayActual = today.reduce((sum, s) => sum + (Number(s.actualMinutes) || 0), 0);
    return {
      planned, actual: actualMins, completion: pct(actualMins, planned),
      todayActual, todayPlanned: today.reduce((sum, s) => sum + (Number(s.plannedMinutes) || 0), 0),
      completed: sessions.filter((s) => s.status === "Completed").length,
      weekCount: thisWeek.length,
    };
  }, [sessions, weekStartDate]);

  const chartData = useMemo(() => weekDates.map((date) => {
    const iso = format(date, "yyyy-MM-dd");
    const items = sessions.filter((s) => s.date === iso);
    return {
      day: format(date, "EEE"),
      planned: Math.round(items.reduce((sum, s) => sum + (Number(s.plannedMinutes) || 0), 0) / 60 * 10) / 10,
      actual: Math.round(items.reduce((sum, s) => sum + (Number(s.actualMinutes) || 0), 0) / 60 * 10) / 10,
    };
  }), [sessions, weekDates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      const matchesQuery = !q || [s.subject, s.topic, s.goal, s.notes].join(" ").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || s.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [sessions, query, statusFilter]);

  const plannedDays = view === "upcoming"
    ? Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i))
    : view === "completed" ? [] : weekDates;

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((s) => { (map[s.date] = map[s.date] || []).push(s); });
    Object.values(map).forEach((list) => list.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")));
    return map;
  }, [filtered]);

  const displayedDates = useMemo(() => {
    if (view === "completed") {
      return Array.from(new Set(filtered.filter((s) => s.status === "Completed").map((s) => s.date))).sort().reverse();
    }
    return plannedDays.map((d) => format(d, "yyyy-MM-dd"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, weekOffset, filtered]);

  const nextSession = useMemo(() => [...sessions]
    .filter((s) => s.status === "Planned" && combineDateTime(s.date, s.startTime) >= new Date())
    .sort((a, b) => combineDateTime(a.date, a.startTime) - combineDateTime(b.date, b.startTime))[0], [sessions]);

  const openCreate = (date) => { setEditing(date ? { date } : null); setFormOpen(true); };
  const startFocus = (session) => {
    const params = new URLSearchParams({ subject: session.subject || "", topic: session.topic || "", session: session.id, minutes: String(Math.max(5, Math.min(60, Number(session.plannedMinutes) || 25))) });
    navigate(`/pomodoro?${params.toString()}`);
  };
  const openLog = (session) => { setLogging(session); setActual(Number(session.actualMinutes) || Number(session.plannedMinutes) || 0); };
  const markComplete = () => {
    updateItem("studySessions", logging.id, { status: "Completed", actualMinutes: Number(actual) || 0 });
    toast.success("Study session logged", `${formatMinutes(Number(actual) || 0)} recorded for “${logging.topic}”.`);
    setLogging(null);
  };
  const removeSession = () => {
    deleteItem("studySessions", deleting.id);
    toast.success("Study session deleted", "The session was removed from your study plan.");
    setDeleting(null);
  };
  const saveGoal = () => {
    const minutes = Math.max(15, Math.min(720, Number(goalInput) || 0));
    updateSettings({ dailyStudyGoal: minutes });
    toast.success("Daily goal updated", `New target: ${formatMinutes(minutes)} of focused study per day.`);
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Deliberate practice"
        title="Study Planner"
        description="Plan what to study, protect the time, and compare planned work with the minutes you actually complete."
        actions={<><DataToolsButton moduleKey="studySessions" /><Button icon={Plus} onClick={() => openCreate()}>Plan session</Button></>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="This week planned" value={formatHours(stats.planned)} sub={`${stats.weekCount} sessions`} icon={CalendarDays} tone="accent" />
        <StatCard label="Actual study" value={formatHours(stats.actual)} sub={`${stats.completion}% of plan completed`} icon={CheckCircle2} tone="success" progress={stats.completion} />
        <StatCard label="Today" value={formatMinutes(stats.todayActual)} sub={`${formatMinutes(Math.max(0, dailyGoal - stats.todayActual))} left of goal`} icon={Target} tone="warning" progress={pct(stats.todayActual, dailyGoal)} />
        <StatCard label="Completed sessions" value={stats.completed} sub="All time" icon={Flame} tone="info" />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-3 sm:p-4 xl:col-span-8">
          <div className="flex flex-col gap-2.5 border-b border-[var(--border)] pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {view === "week" && (
                <>
                  <IconButton label="Previous week" icon={ChevronLeft} variant="secondary" size="iconSm" onClick={() => setWeekOffset((w) => w - 1)} />
                  <Button size="sm" variant={weekOffset === 0 ? "soft" : "secondary"} onClick={() => setWeekOffset(0)}>This week</Button>
                  <IconButton label="Next week" icon={ChevronRight} variant="secondary" size="iconSm" onClick={() => setWeekOffset((w) => w + 1)} />
                </>
              )}
              <div className="ml-1">
                <p className="text-[12.5px] font-bold text-[var(--text)]">
                  {view === "upcoming" ? "Next 14 days" : view === "completed" ? "Completed sessions" : `${format(weekDates[0], "d MMM")} – ${format(weekDates[6], "d MMM yyyy")}`}
                </p>
                <p className="text-[10px] text-[var(--faint)]">{filtered.length} session{filtered.length === 1 ? "" : "s"} {view === "week" ? "in this week" : "shown"}</p>
              </div>
              <div className="ml-auto">
                <Tabs value={view} onChange={setView} tabs={[{ value: "week", label: "Week" }, { value: "upcoming", label: "Upcoming" }, { value: "completed", label: "Completed" }]} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput value={query} onChange={setQuery} placeholder="Search sessions…" className="flex-1 sm:max-w-[230px]" />
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 w-auto py-1 text-[11px]" aria-label="Filter by status">
                <option value="All">All statuses</option>
                {["Planned", "Completed", "Missed"].map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
          </div>

          <div className="mt-3 space-y-4">
            {displayedDates.map((iso) => {
              const day = new Date(`${iso}T00:00:00`);
              const list = (grouped[iso] || []).filter((s) => view !== "completed" || s.status === "Completed");
              if (view === "completed" && !list.length) return null;
              return (
                <div key={iso}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11.5px] font-bold ${isToday(day) ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{isToday(day) ? "Today" : format(day, "EEEE")}</span>
                      <span className="text-[10px] text-[var(--faint)]">{format(day, "d MMM")}</span>
                      {list.length > 0 && <Badge tone="neutral">{list.length}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-[9.5px] text-[var(--faint)]">
                      <span>{formatMinutes(list.reduce((sum, s) => sum + Number(s.actualMinutes || 0), 0))} logged / {formatMinutes(list.reduce((sum, s) => sum + Number(s.plannedMinutes || 0), 0))} planned</span>
                      <button onClick={() => openCreate(iso)} className="rounded p-1 text-[var(--faint)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)]" aria-label={`Add session on ${iso}`}><Plus size={12} /></button>
                    </div>
                  </div>
                  {list.length ? (
                    <div className="space-y-1.5">
                      {list.map((session) => {
                        const done = session.status === "Completed";
                        const missed = session.status === "Missed";
                        return (
                          <div key={session.id} className="group flex items-stretch gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 transition-colors hover:bg-[var(--surface-2)]/40">
                            <span className="w-[3px] shrink-0 rounded-full" style={{ background: subjectColor[session.subject] || "var(--accent)" }} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className={`truncate text-[12px] font-semibold ${done ? "text-[var(--muted)]" : "text-[var(--text)]"}`}>{session.topic}</p>
                                <Badge tone={done ? "success" : missed ? "danger" : "info"} dot>{session.status}</Badge>
                              </div>
                              <p className="mt-0.5 truncate text-[10.5px] text-[var(--faint)]">{courseShort(session.subject)} · {fmtTime(session.startTime)} – {fmtTime(session.endTime)} · {formatMinutes(session.plannedMinutes)} planned{done ? ` · ${formatMinutes(session.actualMinutes)} actual` : ""}</p>
                              {session.goal && <p className="mt-1 hidden truncate text-[10.5px] text-[var(--muted)] sm:block"><span className="font-semibold text-[var(--faint)]">Goal:</span> {session.goal}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              {!done && (
                                <>
                                  <IconButton icon={Play} label={`Focus on ${session.topic}`} size="iconSm" variant="soft" onClick={() => startFocus(session)} />
                                  <IconButton icon={CheckCircle2} label={`Complete ${session.topic}`} size="iconSm" onClick={() => openLog(session)} />
                                </>
                              )}
                              <IconButton icon={Pencil} label={`Edit ${session.topic}`} size="iconSm" onClick={() => { setEditing(session); setFormOpen(true); }} />
                              <IconButton icon={Trash2} label={`Delete ${session.topic}`} size="iconSm" className="hover:text-[var(--danger)]" onClick={() => setDeleting(session)} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <button onClick={() => openCreate(iso)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] py-2 text-[10.5px] font-medium text-[var(--faint)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                      <Plus size={12} /> Add a study session
                    </button>
                  )}
                </div>
              );
            })}
            {view === "completed" && !displayedDates.length && (
              <EmptyState icon={CheckCircle2} title="No completed sessions yet" description="When you finish a planned session, log the actual minutes to build your study history." />
            )}
            {view !== "completed" && !filtered.length && (
              <EmptyState icon={query || statusFilter !== "All" ? SearchX : BookOpen} title={query || statusFilter !== "All" ? "No sessions match those filters" : "No sessions planned for this period"} description={query || statusFilter !== "All" ? "Try clearing the search or status filter." : "Plan a focused session and protect the time in your week."} action={<Button size="sm" icon={query || statusFilter !== "All" ? undefined : Plus} onClick={query || statusFilter !== "All" ? () => { setQuery(""); setStatusFilter("All"); } : () => openCreate()}>{query || statusFilter !== "All" ? "Clear filters" : "Plan a session"}</Button>} />
            )}
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-[var(--faint)]">Daily study goal</p>
                <p className="mt-0.5 font-display text-[16px] font-bold text-[var(--text)]">{formatMinutes(Math.min(stats.todayActual, dailyGoal))} <span className="text-[11px] font-medium text-[var(--faint)]">of {formatMinutes(dailyGoal)}</span></p>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Target size={14} /></span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <ProgressRing value={pct(stats.todayActual, dailyGoal)} size={78} stroke={7}>
                <span className="font-display text-[16px] font-bold text-[var(--text)]">{pct(stats.todayActual, dailyGoal)}%</span>
              </ProgressRing>
              <div className="min-w-0 flex-1 space-y-1.5">
                <ProgressBar value={pct(stats.todayActual, dailyGoal)} />
                <p className="text-[10.5px] leading-relaxed text-[var(--muted)]">{stats.todayActual >= dailyGoal ? "Daily goal reached. Consistency compounds." : `${formatMinutes(dailyGoal - stats.todayActual)} of focused study left today.`}</p>
              </div>
            </div>
            <div className="mt-3 flex items-end gap-2 border-t border-[var(--border)] pt-3">
              <Field label="Goal for each day" htmlFor="goal-minutes" className="flex-1">
                <Input id="goal-minutes" type="number" min="15" max="720" step="15" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} />
              </Field>
              <Button size="sm" variant="secondary" onClick={saveGoal}>Save</Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-[var(--text)]">Week at a glance</p>
              <div className="flex items-center gap-2 text-[9px] text-[var(--faint)]"><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-sm bg-[var(--surface-3)]" />Plan</span><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-sm bg-[var(--accent)]" />Actual</span></div>
            </div>
            <div className="mt-3 h-[150px]">
              {sessions.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={2} margin={{ top: 2, right: 0, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--muted)" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--faint)" }} tickFormatter={(v) => `${v}h`} />
                    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }} />
                    <Bar dataKey="planned" fill="var(--surface-3)" radius={[2, 2, 0, 0]} maxBarSize={14} />
                    <Bar dataKey="actual" fill="var(--accent)" radius={[2, 2, 0, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex h-full items-center justify-center text-[11px] text-[var(--faint)]">No study data yet</div>}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[10.5px]">
              <span className="text-[var(--faint)]">Plan completion</span>
              <span className="font-semibold text-[var(--text)]">{stats.completion}%</span>
            </div>
            <ProgressBar value={stats.completion} className="mt-1.5" />
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-[var(--text)]">Next study session</p>
              <Timer size={13} className="text-[var(--faint)]" />
            </div>
            {nextSession ? (
              <div className="mt-2">
                <p className="text-[12px] font-semibold text-[var(--text)]">{nextSession.topic}</p>
                <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">{courseShort(nextSession.subject)} · {fmtDate(nextSession.date)} · {fmtTime(nextSession.startTime)}</p>
                <div className="mt-2.5 flex gap-2">
                  <Button size="sm" icon={Play} onClick={() => startFocus(nextSession)}>Focus now</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(nextSession); setFormOpen(true); }}>Edit</Button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-[11px] leading-relaxed text-[var(--muted)]">Nothing upcoming. A small planned session tomorrow keeps momentum going.</p>
                <Button size="sm" variant="secondary" icon={Plus} className="mt-2" onClick={() => openCreate()}>Plan a session</Button>
              </div>
            )}
          </Card>

          <InfoNote tone="neutral" icon={Timer}>
            Finished sessions link directly to the Pomodoro timer. Pomodoros you complete are recorded separately in focus statistics.
          </InfoNote>
        </div>
      </div>

      <StudyForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} />

      <Modal
        open={!!logging} onClose={() => setLogging(null)} size="sm" icon={CheckCircle2}
        title="Log study session" description={logging ? `“${logging.topic}” · planned ${formatMinutes(logging.plannedMinutes)}` : ""}
        footer={<><Button size="sm" variant="secondary" onClick={() => setLogging(null)}>Cancel</Button><Button size="sm" onClick={markComplete}>Mark completed</Button></>}
      >
        {logging && (
          <div className="space-y-3">
            <Field label="Actual focused minutes" htmlFor="actual-minutes" hint="Be honest — accuracy makes your analytics useful.">
              <Input id="actual-minutes" type="number" min="0" step="5" value={actual} onChange={(e) => setActual(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {[15, 25, 45, 60, 90].map((m) => <button key={m} onClick={() => setActual(m)} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">{m} min</button>)}
            </div>
            <p className="text-[10.5px] leading-relaxed text-[var(--faint)]">Goal: {logging.goal || "No goal set"}. Your weekly actual study hours update immediately.</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={removeSession} title="Delete this study session?" message={deleting ? `“${deleting.topic}” and its logged minutes will be removed from your plan.` : ""} confirmLabel="Delete session" />
    </PageShell>
  );
}
