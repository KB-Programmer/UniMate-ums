import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow, addDays, startOfDay, subDays } from "date-fns";
import {
  ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays, CalendarPlus, CheckCircle2, CheckSquare,
  ClipboardList, Clock, Flame, GraduationCap, ListTodo, MapPin, NotebookPen, Play, Plus, Sparkles,
  Target, Timer, TrendingUp, X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  Badge, Button, Card, EmptyState, InfoNote, PageHeader, PageShell, ProgressBar, ProgressRing,
  SectionHeading, StatCard,
} from "../components/ui";
import {
  DAYS, combineDateTime, fmtDate, fmtTime, formatHours, formatMinutes, greeting, isOverdue,
  pct, statusTone, todayISO, todayName, courseShort,
} from "../lib/utils";

function relativeTime(iso) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return ""; }
}

function MiniIcon({ icon: Icon, color }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}1A`, color }}>
      <Icon size={13.5} />
    </span>
  );
}

function chartTooltip() {
  return {
    contentStyle: {
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
      fontSize: 11, color: "var(--text)", boxShadow: "var(--shadow)",
    },
    labelStyle: { color: "var(--muted)", fontWeight: 600, marginBottom: 4 },
    cursor: { fill: "var(--accent-soft)" },
  };
}

export default function Dashboard() {
  const { data, clearSampleData } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmFresh, setConfirmFresh] = useState(false);
  const tasks = data.tasks || [];
  const events = data.events || [];
  const classes = data.timetable || [];
  const academic = data.academicItems || [];
  const sessions = data.studySessions || [];
  const focus = data.focusSessions || [];
  const notifications = data.notifications || [];

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "Completed");
    const open = tasks.filter((t) => t.status !== "Completed");
    const overdueTasks = open.filter((t) => isOverdue(t.dueDate, t.dueTime));
    const pendingAcademic = academic.filter((a) => !["Submitted", "Completed"].includes(a.status));
    const nextEvents = events
      .filter((e) => combineDateTime(e.date, e.endTime || e.startTime)?.getTime() >= Date.now() || e.date === todayISO())
      .sort((a, b) => (combineDateTime(a.date, a.startTime)?.getTime() || 0) - (combineDateTime(b.date, b.startTime)?.getTime() || 0));
    const todaySessions = sessions.filter((s) => s.date === todayISO());
    const plannedToday = todaySessions.reduce((sum, s) => sum + (Number(s.plannedMinutes) || 0), 0);
    const doneToday = todaySessions.reduce((sum, s) => sum + (Number(s.actualMinutes) || 0), 0);
    const todayFocus = focus.filter((s) => s.date === todayISO()).reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
    const weekStart = subDays(startOfDay(new Date()), 6);
    const weekSessions = sessions.filter((s) => combineDateTime(s.date, "00:00") >= weekStart);
    const weekActual = weekSessions.reduce((sum, s) => sum + (Number(s.actualMinutes) || 0), 0);
    const weekPlanned = weekSessions.reduce((sum, s) => sum + (Number(s.plannedMinutes) || 0), 0);
    const completedThisWeek = tasks.filter((t) => t.completedAt && new Date(t.completedAt) >= weekStart).length;
    return {
      completed, open, overdueTasks, pendingAcademic, nextEvents, plannedToday, doneToday, todayFocus,
      weekActual, weekPlanned, completedThisWeek,
      nextDeadline: [...pendingAcademic].sort((a, b) => (combineDateTime(a.dueDate, a.dueTime)?.getTime() || 0) - (combineDateTime(b.dueDate, b.dueTime)?.getTime() || 0))[0],
    };
  }, [tasks, academic, events, sessions, focus]);

  const todayClasses = useMemo(
    () => classes.filter((c) => c.day === todayName()).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [classes]
  );

  const upcoming = useMemo(
    () => stats.nextEvents.slice(0, 4),
    [stats.nextEvents]
  );

  const upcomingWork = useMemo(
    () => [...academic]
      .filter((a) => !["Submitted", "Completed"].includes(a.status))
      .sort((a, b) => (combineDateTime(a.dueDate, a.dueTime)?.getTime() || 0) - (combineDateTime(b.dueDate, b.dueTime)?.getTime() || 0))
      .slice(0, 5),
    [academic]
  );

  const weekChart = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(startOfDay(new Date()), i - 6);
      const iso = format(day, "yyyy-MM-dd");
      const items = sessions.filter((s) => s.date === iso);
      return {
        day: format(day, "EEE"),
        date: format(day, "dd MMM"),
        planned: Math.round(items.reduce((sum, s) => sum + (Number(s.plannedMinutes) || 0), 0) / 60 * 10) / 10,
        actual: Math.round(items.reduce((sum, s) => sum + (Number(s.actualMinutes) || 0), 0) / 60 * 10) / 10,
      };
    });
  }, [sessions]);

  const taskPie = useMemo(() => {
    const counts = {
      Pending: tasks.filter((t) => t.status === "Pending").length,
      "In Progress": tasks.filter((t) => t.status === "In Progress").length,
      Completed: stats.completed.length,
    };
    return [
      { name: "Pending", value: counts.Pending, color: "var(--warning)" },
      { name: "In Progress", value: counts["In Progress"], color: "var(--info)" },
      { name: "Completed", value: counts.Completed, color: "var(--success)" },
    ];
  }, [tasks, stats.completed.length]);

  const recentNotifications = [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  const completionPct = pct(stats.completed.length, tasks.length);
  const goalPct = pct(stats.todayFocus, data.settings.dailyStudyGoal || 180);
  const studyPct = pct(stats.doneToday, stats.plannedToday);

  const quickActions = [
    { label: "Add task", icon: ListTodo, to: "/tasks?new=1" },
    { label: "New event", icon: CalendarPlus, to: "/calendar?new=1" },
    { label: "Focus session", icon: Timer, to: "/pomodoro" },
    { label: "New note", icon: NotebookPen, to: "/notes?new=1" },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow={format(new Date(), "EEEE, d MMMM yyyy")}
        title={`${greeting()}. Here's your academic snapshot.`}
        description="Everything important across your courses, deadlines and study plans — in one calm view."
        actions={
          <>
            <Button variant="secondary" size="md" icon={CalendarPlus} onClick={() => navigate("/calendar?new=1")}>New event</Button>
            <Button size="md" icon={Plus} onClick={() => navigate("/tasks?new=1")}>Add task</Button>
          </>
        }
      />

      {data.settings.sampleData && (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Sparkles size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <p className="text-[11.5px] leading-relaxed text-[var(--muted)]">
              <span className="font-semibold text-[var(--text)]">You're exploring a sample semester.</span> Every number below is calculated from these editable records. Start fresh whenever you're ready.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!confirmFresh ? (
              <button onClick={() => setConfirmFresh(true)} className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]">Start fresh</button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--muted)]">Remove sample data?</span>
                <button onClick={() => { clearSampleData(); setConfirmFresh(false); toast.success("Workspace cleared", "Sample records removed. Your settings were kept."); }} className="rounded-lg bg-[var(--danger)] px-2.5 py-1 text-[11px] font-semibold text-white">Yes, clear</button>
                <button onClick={() => setConfirmFresh(false)} className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface)]" aria-label="Cancel"><X size={13} /></button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="relative overflow-hidden p-5 sm:p-6 xl:col-span-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--accent-soft)] blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-[var(--info-soft)] blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge tone="accent" dot>{format(new Date(), "EEEE")}</Badge>
                <span className="text-[11px] text-[var(--faint)]">{stats.nextEvents.length} upcoming events</span>
              </div>
              <h2 className="mt-3 font-display text-[21px] font-bold leading-snug text-[var(--text)] sm:text-[24px]">
                {stats.nextDeadline
                  ? <>Next up: <span className="text-[var(--accent)]">{stats.nextDeadline.title}</span> is due {fmtDate(stats.nextDeadline.dueDate)}.</>
                  : "No deadlines breathing down your neck. Plan ahead and keep momentum."}
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]">
                {stats.nextDeadline
                  ? `${stats.nextDeadline.course || "Academic work"} · ${fmtTime(stats.nextDeadline.dueTime)} · ${stats.nextDeadline.type === "exam" ? "Exam" : "Assignment"}`
                  : "Use the quick actions to add your first task, event or assignment."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label} onClick={() => navigate(action.to)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <action.icon size={13} /> {action.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
              <ProgressRing value={completionPct} size={88} stroke={8} label={`${completionPct}% of tasks complete`}>
                <span className="font-display text-[19px] font-bold text-[var(--text)]">{completionPct}%</span>
                <span className="text-[8.5px] font-semibold uppercase tracking-wide text-[var(--faint)]">tasks done</span>
              </ProgressRing>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--faint)]">Semester progress</p>
                <p className="text-[12px] text-[var(--muted)]"><span className="font-bold text-[var(--text)]">{stats.completed.length}</span> of {tasks.length} tasks</p>
                <p className="flex items-center gap-1 text-[11px] font-semibold text-[var(--success)]"><TrendingUp size={12} /> {stats.completedThisWeek} finished this week</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col p-5 xl:col-span-4">
          <SectionHeading title="Today's focus" subtitle={`Daily goal · ${formatMinutes(data.settings.dailyStudyGoal || 180)}`} icon={Target} />
          <div className="mt-4 flex items-center gap-4">
            <ProgressRing value={goalPct} size={86} stroke={8} color="var(--accent)" label={`${goalPct}% of daily focus goal`}>
              <span className="font-display text-[17px] font-bold text-[var(--text)]">{formatMinutes(stats.todayFocus)}</span>
              <span className="text-[8.5px] font-semibold uppercase tracking-wide text-[var(--faint)]">focused</span>
            </ProgressRing>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]"><span className="text-[var(--muted)]">Goal progress</span><span className="font-semibold text-[var(--text)]">{goalPct}%</span></div>
              <ProgressBar value={goalPct} />
              <p className="text-[10.5px] leading-relaxed text-[var(--faint)]">
                {stats.todayFocus >= (data.settings.dailyStudyGoal || 180)
                  ? "Goal reached — excellent consistency."
                  : `${formatMinutes(Math.max(0, (data.settings.dailyStudyGoal || 180) - stats.todayFocus))} left to reach today's target.`}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--faint)]">Planned today</p>
              <p className="mt-0.5 text-[13px] font-bold text-[var(--text)]">{formatMinutes(stats.plannedToday)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--faint)]">Study completed</p>
              <p className="mt-0.5 text-[13px] font-bold text-[var(--text)]">{formatMinutes(stats.doneToday)} <span className="text-[10px] font-medium text-[var(--faint)]">· {studyPct}%</span></p>
            </div>
          </div>
          <Button size="sm" icon={Play} className="mt-3 w-full" onClick={() => navigate("/pomodoro")}>Start a focus session</Button>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total tasks" value={tasks.length} sub={`${stats.open.length} still open`} icon={CheckSquare} tone="accent" to="/tasks" progress={completionPct} />
        <StatCard label="Completed" value={stats.completed.length} sub="This semester" icon={CheckCircle2} tone="success" to="/tasks" />
        <StatCard label="Pending" value={stats.open.length} sub={stats.overdueTasks.length ? `${stats.overdueTasks.length} overdue` : "Nothing overdue"} icon={Clock} tone={stats.overdueTasks.length ? "danger" : "warning"} to="/tasks" />
        <StatCard label="Assignments" value={academic.filter((a) => a.type === "assignment" && !["Submitted", "Completed"].includes(a.status)).length} sub="Awaiting submission" icon={ClipboardList} tone="info" to="/assignments" />
        <StatCard label="Exams" value={academic.filter((a) => a.type === "exam" && a.status !== "Completed").length} sub="Upcoming or preparing" icon={GraduationCap} tone="warning" to="/exams" />
        <StatCard label="Weekly study" value={formatHours(stats.weekActual)} sub={`${formatHours(stats.weekPlanned)} planned`} icon={BookOpen} tone="success" to="/study" progress={pct(stats.weekActual, stats.weekPlanned)} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="p-4 sm:p-5 xl:col-span-5">
          <SectionHeading title="Today's timetable" subtitle={format(new Date(), "EEEE, d MMMM")} icon={CalendarDays} action={<Link to="/timetable" className="text-[11px] font-semibold text-[var(--accent)] hover:underline">Full week</Link>} />
          <div className="mt-3.5 space-y-2">
            {todayClasses.length ? todayClasses.map((cls) => {
              const active = new Date().toTimeString().slice(0, 5) >= cls.startTime && new Date().toTimeString().slice(0, 5) <= cls.endTime;
              return (
                <Link key={cls.id} to="/timetable" className="group flex items-center gap-3 rounded-xl border border-[var(--border)] p-2.5 transition-colors hover:bg-[var(--surface-2)]">
                  <div className="flex w-[62px] shrink-0 flex-col items-center justify-center rounded-lg py-1.5" style={{ background: `${cls.color}12`, color: cls.color }}>
                    <span className="text-[11px] font-bold">{fmtTime(cls.startTime)}</span>
                    <span className="text-[9.5px] opacity-80">{fmtTime(cls.endTime)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[12.5px] font-semibold text-[var(--text)]">{cls.courseName}</p>
                      {active && <Badge tone="success" dot>Now</Badge>}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] text-[var(--faint)]"><MapPin size={10} /> {cls.classroom || "Room TBA"} · {cls.courseCode}</p>
                  </div>
                  <ArrowUpRight size={13} className="shrink-0 text-[var(--faint)] opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            }) : <EmptyState compact icon={CalendarDays} title="No classes today" description="Enjoy the space — or use it for a focused study session." action={<Button size="sm" variant="secondary" onClick={() => navigate("/timetable?new=1")}>Add a class</Button>} />}
          </div>
        </Card>

        <Card className="p-4 sm:p-5 xl:col-span-4">
          <SectionHeading title="Task overview" subtitle={`${stats.open.length} open · ${stats.overdueTasks.length} overdue`} icon={ListTodo} action={<Link to="/tasks" className="text-[11px] font-semibold text-[var(--accent)] hover:underline">View all</Link>} />
          {tasks.length ? (
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-[116px] w-[116px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskPie} dataKey="value" innerRadius={37} outerRadius={54} paddingAngle={3} strokeWidth={0}>
                      {taskPie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...chartTooltip()} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[19px] font-bold text-[var(--text)]">{completionPct}%</span>
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-[var(--faint)]">complete</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {taskPie.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate text-[11px] text-[var(--muted)]"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.color }} />{item.name}</span>
                    <span className="text-[11px] font-bold text-[var(--text)]">{item.value}</span>
                  </div>
                ))}
                <div className="mt-3 border-t border-[var(--border)] pt-2">
                  <div className="flex items-center justify-between text-[10.5px]"><span className="text-[var(--faint)]">Due this week</span><span className="font-semibold text-[var(--text)]">{stats.open.filter((t) => combineDateTime(t.dueDate, t.dueTime) >= startOfDay(new Date()) && combineDateTime(t.dueDate, t.dueTime) <= addDays(startOfDay(new Date()), 7)).length}</span></div>
                </div>
              </div>
            </div>
          ) : <EmptyState compact icon={ListTodo} title="No tasks yet" description="Add a task to start tracking your progress." action={<Button size="sm" onClick={() => navigate("/tasks?new=1")}>Add task</Button>} />}
        </Card>

        <Card className="p-4 sm:p-5 xl:col-span-3">
          <SectionHeading title="Upcoming events" icon={CalendarDays} action={<Link to="/calendar" className="text-[11px] font-semibold text-[var(--accent)] hover:underline">Calendar</Link>} />
          <div className="mt-3 space-y-2.5">
            {upcoming.length ? upcoming.map((event) => (
              <Link key={event.id} to="/calendar" className="group flex gap-2.5">
                <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                  <span className="text-[8px] font-bold uppercase text-[var(--faint)]">{fmtDate(event.date, "MMM")}</span>
                  <span className="text-[11px] font-bold leading-none text-[var(--text)]">{fmtDate(event.date, "d")}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">{event.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-[var(--faint)]"><Clock size={9} /> {fmtTime(event.startTime)}{event.location ? ` · ${event.location}` : ""}</p>
                  <span className="mt-1 inline-block h-0.5 w-5 rounded-full" style={{ background: event.color || "var(--accent)" }} />
                </div>
              </Link>
            )) : <EmptyState compact icon={CalendarDays} title="No upcoming events" description="Your calendar is clear." action={<Button size="sm" variant="secondary" onClick={() => navigate("/calendar?new=1")}>Add event</Button>} />}
          </div>
          {upcoming.length > 0 && (
            <Button size="sm" variant="ghost" className="mt-3 w-full justify-center" iconRight={ArrowRight} onClick={() => navigate("/calendar")}>Open calendar</Button>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="p-4 sm:p-5 xl:col-span-7">
          <SectionHeading
            title="Weekly study analytics" subtitle="Planned vs actual study time · last 7 days" icon={TrendingUp}
            action={<div className="flex items-center gap-3 text-[10px] font-medium text-[var(--muted)]"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--surface-3)]" /> Planned</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--accent)]" /> Actual</span></div>}
          />
          <div className="mt-4 h-[190px] w-full">
            {sessions.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekChart} barGap={3} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted)" }} dy={6} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--faint)" }} tickFormatter={(v) => `${v}h`} />
                  <Tooltip {...chartTooltip()} formatter={(value, name) => [`${value}h`, name === "actual" ? "Actual" : "Planned"]} />
                  <Bar dataKey="planned" fill="var(--surface-3)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="actual" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState compact icon={BookOpen} title="No study sessions yet" description="Plan a study session to see your weekly analytics." action={<Button size="sm" onClick={() => navigate("/study?new=1")}>Plan study</Button>} />}
          </div>
          <div className="mt-2 grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border)] pt-3">
            <div className="pr-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--faint)]">Actual</p><p className="mt-0.5 text-[14px] font-bold text-[var(--text)]">{formatHours(stats.weekActual)}</p></div>
            <div className="px-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--faint)]">Planned</p><p className="mt-0.5 text-[14px] font-bold text-[var(--text)]">{formatHours(stats.weekPlanned)}</p></div>
            <div className="pl-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--faint)]">Completion</p><p className="mt-0.5 text-[14px] font-bold text-[var(--text)]">{pct(stats.weekActual, stats.weekPlanned)}%</p></div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 xl:col-span-5">
          <SectionHeading title="Upcoming academic work" subtitle="Assignments and exams by deadline" icon={GraduationCap} action={<Link to="/academic" className="text-[11px] font-semibold text-[var(--accent)] hover:underline">View all</Link>} />
          <div className="mt-3 divide-y divide-[var(--border)]">
            {upcomingWork.length ? upcomingWork.map((item) => {
              const overdue = isOverdue(item.dueDate, item.dueTime);
              return (
                <Link key={item.id} to={item.type === "exam" ? "/exams" : "/assignments"} className="flex items-center gap-2.5 py-2.5 transition-colors hover:bg-[var(--surface-2)]/50">
                  <MiniIcon icon={item.type === "exam" ? GraduationCap : ClipboardList} color={overdue ? "var(--danger)" : item.type === "exam" ? "var(--warning)" : "var(--accent)"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[var(--text)]">{item.title}</p>
                    <p className="truncate text-[10.5px] text-[var(--faint)]">{courseShort(item.course)} · {fmtDate(item.dueDate)} · {fmtTime(item.dueTime)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {overdue ? <Badge tone="danger">Overdue</Badge> : <Badge tone={statusTone(item.status)}>{item.status}</Badge>}
                    <span className="text-[9.5px] font-medium text-[var(--faint)]">{item.priority}</span>
                  </div>
                </Link>
              );
            }) : <EmptyState compact icon={ClipboardList} title="No upcoming coursework" description="Assignments and exams you add will appear here." action={<Button size="sm" variant="secondary" onClick={() => navigate("/assignments?new=1")}>Track work</Button>} />}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="p-4 sm:p-5 xl:col-span-7">
          <SectionHeading title="Productivity overview" subtitle="Habits that move your semester forward" icon={Flame} action={<Link to="/pomodoro" className="text-[11px] font-semibold text-[var(--accent)] hover:underline">Focus timer</Link>} />
          <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: "Focus today", value: formatMinutes(stats.todayFocus), sub: `${focus.filter((f) => f.date === todayISO()).length} sessions`, icon: Timer },
              { label: "Study goal", value: `${goalPct}%`, sub: formatMinutes(data.settings.dailyStudyGoal || 180), icon: Target },
              { label: "Tasks done", value: stats.completed.length, sub: "all time", icon: CheckCircle2 },
              { label: "This week", value: formatHours(stats.weekActual), sub: "study time", icon: TrendingUp },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-2.5">
                <div className="flex items-center justify-between"><p className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--faint)]">{m.label}</p><m.icon size={12} className="text-[var(--accent)]" /></div>
                <p className="mt-1.5 font-display text-[16px] font-bold text-[var(--text)]">{m.value}</p>
                <p className="text-[10px] text-[var(--faint)]">{m.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]"><span className="text-[var(--muted)]">Task completion</span><span className="font-semibold text-[var(--text)]">{completionPct}%</span></div>
              <ProgressBar value={completionPct} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]"><span className="text-[var(--muted)]">Weekly study plan</span><span className="font-semibold text-[var(--text)]">{pct(stats.weekActual, stats.weekPlanned)}%</span></div>
              <ProgressBar value={pct(stats.weekActual, stats.weekPlanned)} color="var(--success)" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 xl:col-span-5">
          <SectionHeading title="Recent notifications" subtitle={`${notifications.filter((n) => !n.readAt).length} unread`} icon={Bell} action={<Link to="/notifications" className="text-[11px] font-semibold text-[var(--accent)] hover:underline">Open center</Link>} />
          <div className="mt-3 space-y-1">
            {recentNotifications.length ? recentNotifications.map((notification) => (
              <Link key={notification.id} to="/notifications" className="flex items-start gap-2.5 rounded-lg px-1 py-2 transition-colors hover:bg-[var(--surface-2)]">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${notification.readAt ? "bg-[var(--border-strong)]" : "bg-[var(--accent)]"}`} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[11.5px] ${notification.readAt ? "font-medium text-[var(--muted)]" : "font-semibold text-[var(--text)]"}`}>{notification.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-[10.5px] text-[var(--faint)]">{notification.message}</p>
                </div>
                <span className="shrink-0 text-[9.5px] text-[var(--faint)]">{relativeTime(notification.createdAt)}</span>
              </Link>
            )) : <EmptyState compact icon={Bell} title="All quiet" description="Reminders and deadline alerts will appear here." />}
          </div>
          <InfoNote tone="warning" icon={Clock} className="mt-2">
            In-app reminders run while UniMate is open. Closed-browser alerts require browser notification permission and are not guaranteed without a push server.
          </InfoNote>
        </Card>
      </div>
    </PageShell>
  );
}
