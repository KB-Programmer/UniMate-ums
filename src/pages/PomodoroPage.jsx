import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, format, formatDistanceToNow, startOfDay } from "date-fns";
import {
  BarChart3, Bell, CheckCircle2, Coffee, Flame, Link2, Pause, Play, RotateCcw, Settings2, SkipForward,
  Sparkles, Timer, Volume2, VolumeX, Zap, ListTodo, BookOpen,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  Badge, Button, Card, EmptyState, Field, Input, PageHeader, PageShell, ProgressRing, Select,
  StatCard, Toggle,
} from "../components/ui";
import { useCourseOptions } from "../components/forms";
import { playChime, sendBrowserNotification } from "../lib/notificationService";
import { fmtDate, fmtTime, formatHours, formatMinutes, pct, todayISO } from "../lib/utils";

const STORAGE_KEY = "unimate_pomodoro_state";
const MODE_META = {
  focus: { label: "Focus", icon: Zap, color: "var(--accent)", description: "One task. No switching." },
  short: { label: "Short break", icon: Coffee, color: "var(--success)", description: "Stand up, breathe, hydrate." },
  long: { label: "Long break", icon: Sparkles, color: "var(--info)", description: "Step away and reset properly." },
};

function loadSaved() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw || !raw.mode) return null;
    return raw;
  } catch {
    return null;
  }
}

export default function PomodoroPage() {
  const { data, updateItem, addItem, updateSettings, addNotification } = useApp();
  const toast = useToast();
  const courses = useCourseOptions();
  const [searchParams, setSearchParams] = useSearchParams();
  const saved = useRef(loadSaved()).current;
  const settingsDurations = useMemo(() => ({
    focus: Number(data.settings.focusDuration) || 25,
    short: Number(data.settings.shortBreak) || 5,
    long: Number(data.settings.longBreak) || 15,
  }), [data.settings.focusDuration, data.settings.shortBreak, data.settings.longBreak]);

  const [mode, setMode] = useState(saved?.mode || "focus");
  const [durations, setDurations] = useState(settingsDurations);
  const [duration, setDuration] = useState(saved?.duration || (settingsDurations[saved?.mode || "focus"] || 25) * 60);
  const [remaining, setRemaining] = useState(saved?.remaining ?? (settingsDurations[saved?.mode || "focus"] || 25) * 60);
  const [running, setRunning] = useState(Boolean(saved?.running && saved?.endsAt && saved.endsAt > Date.now()));
  const [endsAt, setEndsAt] = useState(saved?.endsAt || null);
  const [subject, setSubject] = useState(saved?.subject || "");
  const [taskId, setTaskId] = useState(saved?.taskId || "");
  const [linkedSession, setLinkedSession] = useState(saved?.sessionId || searchParams.get("session") || "");
  const [focusCount, setFocusCount] = useState(saved?.focusCount || 0);
  const [interrupted, setInterrupted] = useState(Boolean(saved?.running && saved?.endsAt && saved.endsAt <= Date.now()));
  const [focusDraft, setFocusDraft] = useState(settingsDurations.focus);
  const [shortDraft, setShortDraft] = useState(settingsDurations.short);
  const [longDraft, setLongDraft] = useState(settingsDurations.long);
  const completionLock = useRef(false);
  const finishRef = useRef(() => {});

  useEffect(() => {
    setDurations(settingsDurations);
    setFocusDraft(settingsDurations.focus);
    setShortDraft(settingsDurations.short);
    setLongDraft(settingsDurations.long);
  }, [settingsDurations]);

  useEffect(() => {
    const savedLinked = data.studySessions?.find((s) => s.id === saved?.sessionId);
    if (savedLinked) {
      setSubject(saved?.subject || savedLinked.subject || "");
      setLinkedSession(saved.sessionId);
    }
    const params = new URLSearchParams(searchParams);
    const pSubject = params.get("subject");
    const pSession = params.get("session");
    const pMinutes = Number(params.get("minutes"));
    if (pSubject) setSubject(pSubject);
    if (pSession) {
      setLinkedSession(pSession);
      const linkedFromUrl = data.studySessions?.find((s) => s.id === pSession);
      if (linkedFromUrl && !pSubject) setSubject(linkedFromUrl.subject || "");
    }
    if (Number.isFinite(pMinutes) && pMinutes >= 1 && pMinutes <= 180) {
      const seconds = Math.round(pMinutes) * 60;
      setDuration(seconds);
      setRemaining(seconds);
      setRunning(false);
      setEndsAt(null);
      setMode("focus");
    }
    if (pSubject || pSession || pMinutes) {
      params.delete("subject"); params.delete("session"); params.delete("minutes"); params.delete("topic");
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!running || !endsAt) return;
    const tick = () => {
      const seconds = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds <= 0) finishRef.current();
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [running, endsAt]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode, duration, remaining, running, endsAt, subject, taskId, sessionId: linkedSession, focusCount,
      }));
    } catch {
      /* ignore */
    }
    // Intentionally not persisted on every ticking second while running; `endsAt` restores the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, duration, running, endsAt, subject, taskId, linkedSession, focusCount]);

  useEffect(() => {
    if (running) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode, duration, remaining, running: false, endsAt: null, subject, taskId, sessionId: linkedSession, focusCount,
      }));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running]);

  const start = () => {
    const seconds = remaining > 0 ? remaining : duration;
    setRemaining(seconds);
    setEndsAt(Date.now() + seconds * 1000);
    setRunning(true);
    setInterrupted(false);
  };
  const pause = () => {
    if (endsAt) setRemaining(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    setRunning(false);
    setEndsAt(null);
  };
  const reset = () => {
    setRunning(false);
    setEndsAt(null);
    setRemaining(duration);
  };
  const switchMode = (nextMode, nextCount = focusCount) => {
    setMode(nextMode);
    setRunning(false);
    setEndsAt(null);
    const seconds = (durations[nextMode] || 25) * 60;
    setDuration(seconds);
    setRemaining(seconds);
    setFocusCount(nextCount);
    setInterrupted(false);
  };
  const skip = () => {
    const next = mode === "focus" ? (focusCount + 1) % 4 === 0 ? "long" : "short" : "focus";
    switchMode(next, mode === "focus" ? focusCount : focusCount);
    toast.info("Session skipped", mode === "focus" ? "No focus minutes were recorded." : "Break skipped — ready when you are.");
  };

  finishRef.current = () => {
    if (completionLock.current) return;
    completionLock.current = true;
    setTimeout(() => { completionLock.current = false; }, 1200);
    setRunning(false);
    setEndsAt(null);
    const minutes = Math.max(1, Math.round(duration / 60));
    const endedMode = mode;
    if (endedMode === "focus") {
      addItem("focusSessions", {
        subject: subject || "General", taskId: taskId || null, mode: "Focus",
        minutes, date: todayISO(), completedAt: new Date().toISOString(), sessionId: linkedSession || null,
      });
      if (linkedSession) {
        const linked = data.studySessions?.find((s) => s.id === linkedSession);
        if (linked) updateItem("studySessions", linkedSession, { actualMinutes: (Number(linked.actualMinutes) || 0) + minutes });
      }
      addNotification({
        title: "Focus session complete",
        message: `${minutes} focused minutes recorded${subject ? ` for ${subject}` : ""}. Take a real break.`,
        type: "system",
      }, { dedupe: false });
      if (data.settings.browserNotifications) sendBrowserNotification("Focus session complete", `${minutes} focused minutes logged. Time for a break.`, "pomodoro-complete");
      if (data.settings.soundEnabled) playChime();
      toast.success("Focus session complete", `${formatMinutes(minutes)} recorded. Take a ${durations.short}-minute break.`);
      const nextCount = focusCount + 1;
      const next = nextCount % 4 === 0 ? "long" : "short";
      switchMode(next, nextCount);
    } else {
      addNotification({ title: "Break finished", message: "Your break is over. Ready for another focused block?", type: "system" }, { dedupe: false });
      if (data.settings.browserNotifications) sendBrowserNotification("Break finished", "Ready for another focused block?", "pomodoro-break");
      if (data.settings.soundEnabled) playChime();
      toast.info("Break complete", "Choose your next task and start another focus block.");
      switchMode("focus");
    }
  };

  const saveSettings = () => {
    const next = {
      focusDuration: Math.max(1, Math.min(180, Number(focusDraft) || 25)),
      shortBreak: Math.max(1, Math.min(60, Number(shortDraft) || 5)),
      longBreak: Math.max(1, Math.min(90, Number(longDraft) || 15)),
    };
    updateSettings(next);
    setDurations({ focus: next.focusDuration, short: next.shortBreak, long: next.longBreak });
    if (!running) {
      const durationKey = mode === "focus" ? "focusDuration" : mode === "short" ? "shortBreak" : "longBreak";
      const seconds = next[durationKey] * 60;
      setDuration(seconds);
      setRemaining(seconds);
    }
    toast.success("Timer settings saved", `Focus ${next.focusDuration}m · short ${next.shortBreak}m · long ${next.longBreak}m.`);
  };

  const focusSessions = data.focusSessions || [];
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i - 6));
    return days.map((day) => {
      const iso = format(day, "yyyy-MM-dd");
      const items = focusSessions.filter((s) => s.date === iso);
      return { day: format(day, "EEE"), minutes: items.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0), sessions: items.length };
    });
  }, [focusSessions]);

  const stats = useMemo(() => {
    const today = focusSessions.filter((s) => s.date === todayISO());
    const weekTotal = week.reduce((sum, d) => sum + d.minutes, 0);
    return {
      today: today.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0),
      todayCount: today.length,
      week: weekTotal,
      total: focusSessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0),
      weekSessions: week.reduce((sum, d) => sum + d.sessions, 0),
    };
  }, [focusSessions, week]);

  const linked = data.studySessions?.find((s) => s.id === linkedSession);
  const openTasks = (data.tasks || []).filter((t) => t.status !== "Completed");
  const totalSeconds = Math.max(1, duration);
  const progress = pct(totalSeconds - remaining, totalSeconds);
  const meta = MODE_META[mode];
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const elapsedMinutes = Math.round((totalSeconds - remaining) / 60);
  const recent = [...focusSessions].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 5);
  const dailyGoal = data.settings.dailyStudyGoal || 180;

  useEffect(() => {
    document.title = running ? `${mm}:${ss} · ${meta.label} · UniMate` : "Pomodoro · UniMate";
    return () => { document.title = "UniMate · Student Workspace"; };
  }, [running, mm, ss, meta.label]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Deep work"
        title="Pomodoro"
        description="A single, reliable focus timer. Work in deliberate blocks, take real breaks, and log every focused minute."
        actions={<Badge tone={running ? "success" : "neutral"} dot>{running ? "Timer running" : "Timer ready"}</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="relative overflow-hidden p-5 sm:p-6 xl:col-span-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-[0.07]" style={{ background: meta.color }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
              {Object.entries(MODE_META).map(([key, m]) => (
                <button
                  key={key} onClick={() => switchMode(key)} disabled={running}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${mode === key ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
                  title={running ? "Pause the timer before switching modes" : m.description}
                >
                  <m.icon size={12} /> {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--faint)]"><Flame size={11} className="text-[var(--accent)]" /> {stats.todayCount} today</span>
              <button onClick={() => updateSettings({ soundEnabled: !data.settings.soundEnabled })} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]" aria-label={data.settings.soundEnabled ? "Mute timer sound" : "Enable timer sound"}>
                {data.settings.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
            </div>
          </div>

          {interrupted && (
            <div className="mt-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-2.5 text-[11px] leading-relaxed text-[var(--muted)]">
              <span className="font-semibold text-[var(--warning)]">Previous timer ended while UniMate was closed.</span> It was not recorded automatically — log the minutes with your study session if you completed the work.
            </div>
          )}

          <div className="mt-5 flex flex-col items-center">
            <div className="relative">
              <ProgressRing value={progress} size={264} stroke={10} color={meta.color} label={`${remaining} seconds remaining`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: meta.color }}>{meta.label}</p>
                <p className="mt-1 font-display text-[54px] font-bold leading-none tracking-tight text-[var(--text)] tabular-nums sm:text-[62px]">{mm}:{ss}</p>
                <p className="mt-1.5 text-[10.5px] text-[var(--faint)]">{running ? "Stay with it" : remaining < duration ? "Paused — resume when ready" : meta.description}</p>
              </ProgressRing>
              {running && <span className="absolute right-5 top-5 h-2 w-2 animate-[pulseSoft_2s_infinite] rounded-full bg-[var(--success)]" title="Running" />}
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Button variant="secondary" size="lg" icon={RotateCcw} onClick={reset} aria-label="Reset timer">Reset</Button>
              <Button size="lg" icon={running ? Pause : Play} onClick={running ? pause : start} className="min-w-[132px] text-[13.5px]">{running ? "Pause" : remaining < duration && remaining > 0 ? "Resume" : "Start focus"}</Button>
              <Button variant="secondary" size="lg" icon={SkipForward} onClick={skip} aria-label="Skip session">Skip</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10.5px] text-[var(--faint)]">
              <span><span className="font-semibold text-[var(--muted)]">{formatMinutes(remaining < duration ? elapsedMinutes : 0)}</span> focused this block</span>
              <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
              <span>Round {focusCount + 1} · long break every 4 sessions</span>
            </div>
          </div>

          <div className="mt-5 grid gap-2.5 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
            <Field label="Focus subject" htmlFor="focus-subject">
              <Select id="focus-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">General focus</option>
                {courses.map((course) => <option key={course}>{course}</option>)}
              </Select>
            </Field>
            <Field label="Link a task" htmlFor="focus-task">
              <Select id="focus-task" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">No task linked</option>
                {openTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
              </Select>
            </Field>
            {linked && (
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 px-2.5 py-1.5 text-[10.5px] text-[var(--muted)]">
                <Link2 size={12} className="text-[var(--accent)]" />
                <span>Linked study session: <span className="font-semibold text-[var(--text)]">{linked.topic}</span> · {linked.actualMinutes || 0} of {linked.plannedMinutes} min logged</span>
                <button onClick={() => setLinkedSession("")} className="ml-auto rounded px-1 text-[10px] font-semibold text-[var(--accent)] hover:underline">Unlink</button>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Focused today" value={formatMinutes(stats.today)} sub={`${stats.todayCount} sessions`} icon={Timer} tone="accent" progress={pct(stats.today, dailyGoal)} />
            <StatCard label="This week" value={formatHours(stats.week)} sub={`${stats.weekSessions} sessions`} icon={BarChart3} tone="success" />
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-bold text-[var(--text)]">Timer configuration</p>
                <p className="text-[10px] text-[var(--faint)]">Defaults apply to new sessions and are included in backups.</p>
              </div>
              <Settings2 size={14} className="text-[var(--faint)]" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Field label="Focus" htmlFor="cfg-focus"><Input id="cfg-focus" type="number" min="1" max="180" value={focusDraft} onChange={(e) => setFocusDraft(e.target.value)} /></Field>
              <Field label="Short break" htmlFor="cfg-short"><Input id="cfg-short" type="number" min="1" max="60" value={shortDraft} onChange={(e) => setShortDraft(e.target.value)} /></Field>
              <Field label="Long break" htmlFor="cfg-long"><Input id="cfg-long" type="number" min="1" max="90" value={longDraft} onChange={(e) => setLongDraft(e.target.value)} /></Field>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[10px] text-[var(--faint)]">Minutes · changes apply next reset</p>
              <Button size="sm" variant="secondary" onClick={saveSettings}>Save defaults</Button>
            </div>
            <div className="mt-2 border-t border-[var(--border)] pt-1">
              <Toggle checked={data.settings.soundEnabled} onChange={(v) => updateSettings({ soundEnabled: v })} label="Completion sound" description="A short chime when a timer ends." />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-[var(--text)]">Focus this week</p>
              <span className="text-[10px] text-[var(--faint)]">{formatHours(stats.week)} total</span>
            </div>
            <div className="mt-2 h-[132px]">
              {focusSessions.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={week} margin={{ top: 4, right: 0, left: -32, bottom: 0 }}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--muted)" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--faint)" }} tickFormatter={(v) => `${v}m`} />
                    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }} formatter={(v) => [`${v} minutes`, "Focused"]} />
                    <Bar dataKey="minutes" radius={[3, 3, 0, 0]} maxBarSize={22}>
                      {week.map((entry, i) => <Cell key={i} fill={entry.minutes ? "var(--accent)" : "var(--surface-3)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex h-full flex-col items-center justify-center text-[11px] text-[var(--faint)]"><Timer size={18} className="mb-1" />Complete a focus block to see your week.</div>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-[var(--text)]">Recent focus sessions</p>
              <span className="text-[10px] text-[var(--faint)]">All time {formatHours(stats.total)}</span>
            </div>
            <div className="mt-2 divide-y divide-[var(--border)]">
              {recent.length ? recent.map((session) => (
                <div key={session.id} className="flex items-center gap-2.5 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--success-soft)] text-[var(--success)]"><CheckCircle2 size={13} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-semibold text-[var(--text)]">{session.subject || "General focus"}</p>
                    <p className="text-[10px] text-[var(--faint)]">{fmtDate(session.date)} · {session.completedAt ? formatDistanceToNow(new Date(session.completedAt), { addSuffix: true }) : ""}</p>
                  </div>
                  <Badge tone="accent">{formatMinutes(session.minutes)}</Badge>
                </div>
              )) : <EmptyState compact icon={Timer} title="No focus sessions yet" description="Start the timer to log your first focused block." />}
            </div>
          </Card>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[10.5px] leading-relaxed text-[var(--faint)]">
            <span className="font-semibold text-[var(--muted)]">How sessions are recorded:</span> a completed focus block writes an immutable focus record with its duration and subject. Skipped or reset blocks are not counted. Timer state is saved locally so an interrupted session can be resumed when you return.
          </div>
        </div>
      </div>
    </PageShell>
  );
}
