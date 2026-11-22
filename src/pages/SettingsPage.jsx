import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle, Bell, BookOpen, Check, CheckCircle2, ChevronRight, Clock3, CloudOff, Database,
  Download, FileJson, FileSpreadsheet, FolderInput, Globe2, HardDrive, Info, Layers, Monitor,
  Moon, Palette, RefreshCw, RotateCcw, Save, ShieldCheck, Sparkles, Sun, Trash2, Upload, UserRound,
  X, Zap, Timer, ListChecks, Lock,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { THEMES, useTheme } from "../context/ThemeContext";
import {
  Badge, Button, Card, ConfirmDialog, Divider, EmptyState, Field, IconButton, InfoNote, Input, Modal,
  PageHeader, PageShell, ProgressBar, Select, Tabs, Toggle,
} from "../components/ui";
import { DataToolsButton } from "../components/ImportExportPanel";
import { MODULES, MODULE_KEYS, downloadTemplate, exportAllExcel, exportFullJSON } from "../lib/importExport";
import { summarizeBackup, validateBackup } from "../lib/backupService";
import { formatBytes } from "../lib/storageService";
import { REMINDER_PRESETS, getNotificationPermission, requestNotificationPermission } from "../lib/notificationService";
import { fmtDate } from "../lib/utils";

const TABS = [
  { value: "appearance", label: "Appearance", icon: Palette },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "study", label: "Study", icon: BookOpen },
  { value: "data", label: "Data management", icon: Database },
  { value: "about", label: "About", icon: Info },
];

const TIMEZONES = ["Africa/Kigali", "Africa/Nairobi", "Africa/Lagos", "Africa/Johannesburg", "Europe/London", "Europe/Paris", "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney", "UTC"];
const ACCENTS = ["#6366F1", "#0EA5E9", "#059669", "#D97706", "#DC2626", "#DB2777", "#8B5CF6", "#0F766E", "#D4A93A", "#475569"];

function SectionCard({ title, description, icon: Icon, children, action }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {Icon && <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={15} /></span>}
          <div>
            <h2 className="text-[13.5px] font-bold text-[var(--text)]">{title}</h2>
            {description && <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-3.5">{children}</div>
    </Card>
  );
}

function ThemePreview({ theme }) {
  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: theme.vars["--border"], background: theme.vars["--bg"] }}>
      <div className="flex h-[58px]">
        <div className="flex w-[24%] flex-col gap-1 p-1.5" style={{ background: theme.vars["--sidebar"] }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.accent }} />
          <span className="mt-1 h-0.5 w-4/5 rounded-full" style={{ background: theme.vars["--border-strong"] }} />
          <span className="h-0.5 w-3/5 rounded-full" style={{ background: theme.vars["--border"] }} />
          <span className="h-0.5 w-2/3 rounded-full" style={{ background: theme.vars["--border"] }} />
        </div>
        <div className="flex-1 p-1.5" style={{ background: theme.vars["--bg"] }}>
          <div className="flex items-center justify-between">
            <span className="h-1 w-1/3 rounded-full" style={{ background: theme.vars["--text"], opacity: 0.5 }} />
            <span className="h-2 w-2 rounded-sm" style={{ background: theme.accent }} />
          </div>
          <div className="mt-1.5 flex gap-1">
            <span className="h-6 flex-1 rounded border" style={{ background: theme.vars["--surface"], borderColor: theme.vars["--border"] }} />
            <span className="h-6 flex-1 rounded border" style={{ background: theme.vars["--surface"], borderColor: theme.vars["--border"] }} />
          </div>
          <div className="mt-1 h-1.5 rounded-full" style={{ background: theme.vars["--border"] }}>
            <div className="h-full w-2/3 rounded-full" style={{ background: theme.accent }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Appearance() {
  const { data, updateSettings } = useApp();
  const { themeMeta, isDark } = useTheme();
  const toast = useToast();
  const settings = data.settings;
  const selected = settings.theme;
  const accent = settings.accentColor || themeMeta.accent;

  const choose = (theme) => {
    updateSettings({ theme: theme.id, accentColor: theme.accent });
    toast.success(`${theme.name} theme applied`, "Your appearance preference is saved and included in backups.");
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Theme" description="Eight considered palettes plus System Default. Changes apply instantly across every page, chart, form and modal." icon={Palette}>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {THEMES.map((theme) => {
            const active = selected === theme.id;
            return (
              <button key={theme.id} onClick={() => choose(theme)} className={`rounded-xl border p-2.5 text-left transition-all ${active ? "border-[var(--accent)] ring-2 ring-[var(--accent-ring)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}>
                <ThemePreview theme={theme} />
                <div className="mt-2 flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-[11.5px] font-bold text-[var(--text)]">{theme.dark ? <Moon size={10} /> : <Sun size={10} />} {theme.name}</p>
                    <p className="truncate text-[9.5px] text-[var(--faint)]">{theme.description}</p>
                  </div>
                  {active && <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]"><Check size={10} /></span>}
                </div>
              </button>
            );
          })}
          <button onClick={() => { updateSettings({ theme: "system" }); toast.success("System theme enabled", "UniMate will follow your operating system preference."); }} className={`rounded-xl border p-2.5 text-left transition-all ${selected === "system" ? "border-[var(--accent)] ring-2 ring-[var(--accent-ring)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}>
            <div className="flex h-[58px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-gradient-to-r from-[var(--surface)] to-[var(--surface-3)]">
              <Monitor size={14} className="text-[var(--muted)]" />
              <span className="text-[9px] font-semibold text-[var(--muted)]">Follows device</span>
            </div>
            <div className="mt-2 flex items-start justify-between gap-1">
              <div>
                <p className="text-[11.5px] font-bold text-[var(--text)]">System Default</p>
                <p className="text-[9.5px] text-[var(--faint)]">Auto light or dark</p>
              </div>
              {selected === "system" && <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]"><Check size={10} /></span>}
            </div>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2 text-[10.5px] text-[var(--muted)]">
          <Monitor size={12} className="text-[var(--accent)]" />
          Currently rendering <span className="font-semibold text-[var(--text)]">{selected === "system" ? `System (${isDark ? "Dark" : "Light"})` : themeMeta.name}</span> · reduced-motion preferences are respected automatically.
        </div>
      </SectionCard>

      <SectionCard title="Accent colour" description="Choose the single highlight colour used by primary actions, focus rings and charts." icon={Sparkles}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            {ACCENTS.map((color) => (
              <button key={color} onClick={() => { updateSettings({ accentColor: color }); toast.success("Accent colour updated", "Saved to your appearance preferences."); }} aria-label={`Use accent ${color}`}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 ${accent.toLowerCase() === color.toLowerCase() ? "border-[var(--text)]" : "border-transparent"}`} style={{ background: color }}>
                {accent.toLowerCase() === color.toLowerCase() && <Check size={13} className="text-white" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={accent} onChange={(e) => updateSettings({ accentColor: e.target.value })} aria-label="Custom accent colour" className="h-8 w-10 cursor-pointer rounded-md border border-[var(--border-strong)] bg-[var(--surface)]" />
            <Input value={accent} onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) updateSettings({ accentColor: e.target.value }); }} className="w-24 font-mono text-[11px]" aria-label="Accent hex value" />
            <Button size="sm" variant="secondary" onClick={() => { updateSettings({ accentColor: themeMeta.accent }); toast.info("Accent restored", `Back to the ${themeMeta.name} default.`); }}>Reset</Button>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
          <p className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[var(--faint)]">Live component preview</p>
          <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-2.5 text-xs font-semibold text-[var(--accent-contrast)]"><Zap size={13} /> Primary action</span>
            <span className="inline-flex h-8 items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--text)]">Secondary</span>
            <Badge tone="accent" dot>Accent badge</Badge>
            <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-[10.5px] font-semibold text-[var(--accent)]">Soft accent</span>
            <span className="h-2 w-2 rounded-full ring-2 ring-[var(--accent-ring)]" style={{ background: accent }} />
          </div>
          <div className="mt-2.5"><ProgressBar value={64} /></div>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--faint)]">Use a colour with sufficient contrast against the theme surface. UniMate automatically chooses a light or dark foreground for accent buttons.</p>
      </SectionCard>
    </div>
  );
}

function NotificationsSettings() {
  const { data, updateSettings } = useApp();
  const toast = useToast();
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const settings = data.settings;

  const ask = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      updateSettings({ browserNotifications: true });
      toast.success("Browser notifications enabled", "System alerts will display while UniMate is open.");
    } else if (result === "denied") {
      toast.error("Permission denied", "UniMate will not ask again. Change the site permission in your browser if needed.");
    } else if (result === "unsupported") {
      toast.info("Not supported here", "This browser does not support the Notification API.");
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="In-app notifications" description="Control reminder alerts inside UniMate. Notification history is always kept unless you clear it." icon={Bell}>
        <div className="divide-y divide-[var(--border)]">
          <Toggle checked={settings.notificationsEnabled} onChange={(v) => { updateSettings({ notificationsEnabled: v }); toast.success(v ? "Notifications on" : "Notifications paused", v ? "New reminders will be generated while the app is open." : "No new in-app reminders will be generated."); }} label="Enable in-app notifications" description="Deadlines, classes, study sessions and system updates." />
          <Toggle checked={!!settings.browserNotifications} onChange={(v) => { if (v && permission !== "granted") { ask(); return; } updateSettings({ browserNotifications: v }); toast.success(v ? "Browser alerts enabled" : "Browser alerts disabled", v ? "Alerts require an open tab and browser permission." : "In-app notifications remain unchanged."); }} label="Enable browser notifications" description="Uses the browser Notification API. UniMate asks only once for permission." />
          <Toggle checked={settings.soundEnabled} onChange={(v) => updateSettings({ soundEnabled: v })} label="Pomodoro completion sound" description="Play a short chime when a focus timer ends." />
          <Toggle checked={settings.autoBackupEnabled} onChange={(v) => { updateSettings({ autoBackupEnabled: v }); toast.success(v ? "Automatic backups on" : "Automatic backups off", v ? "Snapshots are created after meaningful changes." : "Your data is still saved locally, but no new snapshots are made."); }} label="Automatic internal backups" description="Keeps a small rolling history of workspace snapshots in this browser." />
        </div>
      </SectionCard>

      <SectionCard title="Default reminder timing" description="Applied to newly created records. Each task, event, class and assessment can override it." icon={Clock3}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Default lead time">
            <Select value={settings.defaultReminderMinutes ?? 15} onChange={(e) => updateSettings({ defaultReminderMinutes: Number(e.target.value) })}>
              {REMINDER_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="Browser permission">
            <div className="flex h-9 items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 px-2.5">
              <span className="text-[11.5px] font-semibold capitalize text-[var(--text)]">{permission === "unsupported" ? "Not supported" : permission === "default" ? "Not requested yet" : permission}</span>
              <Button size="xs" variant="secondary" onClick={ask} disabled={permission === "granted" || permission === "denied" || permission === "unsupported"}>{permission === "denied" ? "Blocked" : "Request"}</Button>
            </div>
          </Field>
        </div>
        <InfoNote tone="warning" className="mt-3" icon={CloudOff}>
          <strong className="text-[var(--text)]">Honest limitation:</strong> UniMate has no server. In-app reminders run while this browser tab is open; browser notifications require permission and a supporting browser. UniMate cannot guarantee alerts while the browser is closed. Service workers can display notifications only when triggered by an active page or push infrastructure, which v1 does not include.
        </InfoNote>
        <p className="mt-2 text-[10.5px] leading-relaxed text-[var(--faint)]">Permission is never requested repeatedly after denial. You can revisit the notification center for a full history and permission status.</p>
      </SectionCard>
    </div>
  );
}

function StudySettings() {
  const { data, updateSettings, setTimetableMode, storageMode } = useApp();
  const toast = useToast();
  const settings = data.settings;
  const [draft, setDraft] = useState({
    focusDuration: settings.focusDuration, shortBreak: settings.shortBreak, longBreak: settings.longBreak,
    dailyStudyGoal: settings.dailyStudyGoal, timezone: settings.timezone, weekStart: settings.weekStart,
  });
  const set = (key, value) => setDraft((p) => ({ ...p, [key]: value }));

  const save = () => {
    updateSettings({
      focusDuration: Math.max(1, Math.min(180, Number(draft.focusDuration) || 25)),
      shortBreak: Math.max(1, Math.min(60, Number(draft.shortBreak) || 5)),
      longBreak: Math.max(1, Math.min(90, Number(draft.longBreak) || 15)),
      dailyStudyGoal: Math.max(15, Math.min(720, Number(draft.dailyStudyGoal) || 180)),
      timezone: draft.timezone,
      weekStart: draft.weekStart,
    });
    toast.success("Study preferences saved", "Pomodoro defaults, daily goal, timezone and week start are updated.");
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Pomodoro defaults" description="Starting durations for focus blocks and breaks. Existing timer sessions are not altered retroactively." icon={Timer}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Focus duration (minutes)" htmlFor="set-focus"><Input id="set-focus" type="number" min="1" max="180" value={draft.focusDuration} onChange={(e) => set("focusDuration", e.target.value)} /></Field>
          <Field label="Short break (minutes)" htmlFor="set-short"><Input id="set-short" type="number" min="1" max="60" value={draft.shortBreak} onChange={(e) => set("shortBreak", e.target.value)} /></Field>
          <Field label="Long break (minutes)" htmlFor="set-long"><Input id="set-long" type="number" min="1" max="90" value={draft.longBreak} onChange={(e) => set("longBreak", e.target.value)} /></Field>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--surface-2)]/50 px-2.5 py-2 text-[10.5px] text-[var(--muted)]">
          <Zap size={12} className="text-[var(--accent)]" /> Cycle preview: {draft.focusDuration || 25}m focus · {draft.shortBreak || 5}m short break · {draft.longBreak || 15}m long break after four focus blocks.
        </div>
      </SectionCard>

      <SectionCard title="Study planning" description="Set a daily target and define how your weeks are displayed." icon={BookOpen}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Daily study goal (minutes)" htmlFor="set-goal" hint="Used by the dashboard and study planner progress rings.">
            <Input id="set-goal" type="number" min="15" max="720" step="15" value={draft.dailyStudyGoal} onChange={(e) => set("dailyStudyGoal", e.target.value)} />
          </Field>
          <Field label="Time zone" htmlFor="set-tz" hint="Reminder times use your device clock; this preference is stored in backups.">
            <Select id="set-tz" value={draft.timezone} onChange={(e) => set("timezone", e.target.value)}>
              {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
            </Select>
          </Field>
          <Field label="Week starts on" htmlFor="set-week" hint="Changes the first day of calendar and timetable weeks.">
            <Select id="set-week" value={draft.weekStart} onChange={(e) => set("weekStart", e.target.value)}>
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex justify-end"><Button size="sm" icon={Save} onClick={save}>Save preferences</Button></div>
      </SectionCard>

      <SectionCard title="Timetable mode" description="Weekly timetables are the default. Switch to a permanent weekly pattern whenever your schedule is stable." icon={Layers}>
        <Tabs
          value={data.settings.timetableMode || "weekly"}
          onChange={(value) => {
            setTimetableMode(value);
            toast.success(value === "weekly" ? "Weekly timetable active" : "Permanent timetable active", value === "weekly" ? "Your saved weeks are available again." : "Your permanent pattern applies to every week. Weekly plans were kept intact.");
          }}
          tabs={[{ value: "weekly", label: "Weekly" }, { value: "permanent", label: "Permanent" }]}
        />
        <p className="mt-2 text-[10.5px] leading-relaxed text-[var(--muted)]">
          Switching modes never deletes or overwrites the other mode. Weekly plans stay in saved history and the permanent pattern stays available when you switch back.
        </p>
      </SectionCard>

      <SectionCard title="Storage & privacy context" description="Understand exactly how UniMate v1 handles your information." icon={ShieldCheck}>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { icon: HardDrive, title: "Hybrid local storage", text: `${storageMode === "hybrid" ? "Settings and lightweight UI state use LocalStorage; larger records use IndexedDB." : "IndexedDB is unavailable, so records currently use LocalStorage only."} A LocalStorage mirror is kept when space allows.` },
            { icon: CloudOff, title: "No account, no server", text: "There is no sign-in, cloud sync or backend. Clearing browser data removes your workspace." },
            { icon: Lock, title: "Not encrypted", text: "LocalStorage is not encrypted by UniMate. Do not store passwords or highly sensitive information." },
            { icon: Download, title: "You own portability", text: "Export full JSON backups, module Excel files or JSON records whenever you need a copy." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-[var(--border)] p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--text)]"><item.icon size={13} className="text-[var(--accent)]" /> {item.title}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[var(--muted)]">{item.text}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function DataManagement() {
  const {
    data, backups, storage, storageMode, backupNow, deleteBackupSnapshot, clearAllBackups, restoreData,
    resetAllData, clearSampleData, refreshBackups, updateSettings,
  } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [candidate, setCandidate] = useState(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [clearBackupsOpen, setClearBackupsOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [maxBackupsDraft, setMaxBackupsDraft] = useState(data.settings.maxBackups || 5);
  const [fileError, setFileError] = useState("");

  const readFile = async (file) => {
    setFileError("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setFileError("Select a UniMate JSON backup file (.json).");
      toast.error("Unsupported file", "Backups must be JSON files created by UniMate or a compatible export.");
      return;
    }
    try {
      const text = await file.text();
      const result = validateBackup(text);
      if (!result.ok) {
        setFileError(result.errors.join(" "));
        toast.error("Backup validation failed", result.errors[0]);
        return;
      }
      setCandidate({ ...result, fileName: file.name, source: "file" });
    } catch {
      setFileError("The selected file could not be read.");
      toast.error("File error", "The backup could not be read. It might be corrupted.");
    }
  };

  const chooseSnapshot = (snapshot) => {
    const result = validateBackup(snapshot.data);
    if (!result.ok) { toast.error("Snapshot invalid", result.errors[0]); return; }
    setCandidate({ ...result, fileName: snapshot.reason, source: "snapshot" });
  };

  const doRestore = (mode) => {
    if (!candidate) return;
    setRestoring(true);
    try {
      const result = restoreData(candidate.data, mode);
      setReport({ mode, ...result, counts: summarizeBackup(candidate.data), fileName: candidate.fileName });
      setCandidate(null);
      setReplaceOpen(false);
      refreshBackups();
      toast.success(mode === "merge" ? "Backup merged" : "Backup restored", mode === "merge" ? "New records were added without duplicating existing IDs." : "Your workspace was replaced after a safety snapshot was created.");
    } catch {
      toast.error("Restore failed", "The backup was not applied. Your existing data is unchanged.");
    } finally {
      setRestoring(false);
    }
  };

  const doReset = () => {
    resetAllData();
    setResetOpen(false);
    toast.success("Workspace reset", "All records removed. A safety snapshot was created first. Preferences were kept.");
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Import & export" description="Reusable Excel and JSON import with validation previews, plus module-level exports and templates." icon={FolderInput}
        action={<DataToolsButton moduleKey="tasks" allowModuleSelect label="Open import center" />}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" className="justify-start" icon={FileSpreadsheet} onClick={() => { const count = exportAllExcel(data); if (count) toast.success("Excel workbook exported", `${count} sheets containing your current data were downloaded.`); else toast.info("Nothing to export", "Add records before exporting a workbook."); }}>Export all modules to Excel</Button>
          <Button variant="secondary" className="justify-start" icon={FileJson} onClick={() => { exportFullJSON(data); toast.success("Full backup downloaded", "The JSON file contains every module, focus session and setting."); }}>Download full JSON backup</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {MODULE_KEYS.map((key) => (
            <button key={key} onClick={() => { downloadTemplate(key); toast.info("Template downloaded", `${MODULES[key].label} template with example data.`); }} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 px-1.5 py-1 text-[10px] font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
              <Download size={9} /> {MODULES[key].label} template
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--faint)]">Full-system exports include tasks, events, timetable, study sessions, academic work, notes, notifications, focus sessions, settings, theme and appearance preferences.</p>
      </SectionCard>

      <SectionCard title="Restore from backup" description="Validate a UniMate backup, then choose whether to replace or merge. Existing data is never overwritten before validation succeeds." icon={Upload}>
        <div className="rounded-xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-2)]/30 p-4 text-center">
          <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--accent)] shadow-sm"><Upload size={16} /></span>
          <p className="text-[12px] font-semibold text-[var(--text)]">Select a full JSON backup</p>
          <p className="mt-0.5 text-[10.5px] text-[var(--muted)]">UniMate verifies the application identity, format version and data sections before anything changes.</p>
          <Button size="sm" variant="secondary" icon={Upload} className="mt-2.5" onClick={() => fileRef.current?.click()}>Choose backup file</Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ""; }} aria-label="Choose backup file" />
        </div>
        {fileError && <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium text-[var(--danger)]"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {fileError}</p>}
        <InfoNote tone="neutral" className="mt-3" icon={ShieldCheck}>
          A safety snapshot of your current workspace is created before every restore. Restore uses a validated copy; malformed files are rejected safely.
        </InfoNote>
      </SectionCard>

      <SectionCard title="Automatic internal backups" description="Rolling snapshots saved inside this browser. These are separate from downloadable external backups." icon={RefreshCw}
        action={<Button size="sm" variant="secondary" icon={Save} onClick={() => { const result = backupNow("Manual internal snapshot"); toast.success(result.created ? "Snapshot created" : "Snapshot unchanged", result.created ? "Your current workspace is stored in backup history." : "No meaningful changes since the latest snapshot."); }}>Snapshot now</Button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="divide-y divide-[var(--border)]">
            <Toggle checked={data.settings.autoBackupEnabled} onChange={(v) => updateSettings({ autoBackupEnabled: v })} label="Automatic snapshots" description="Created a few seconds after meaningful changes." />
          </div>
          <div className="flex items-end gap-2">
            <Field label="Snapshots to keep" htmlFor="max-backups" className="flex-1">
              <Select id="max-backups" value={maxBackupsDraft} onChange={(e) => { setMaxBackupsDraft(Number(e.target.value)); updateSettings({ maxBackups: Number(e.target.value) }); toast.success("Backup limit updated", `Keeping the latest ${e.target.value} snapshots plus safety copies.`); }}>
                {[3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n} snapshots</option>)}
              </Select>
            </Field>
            <Button size="sm" variant="dangerGhost" onClick={() => setClearBackupsOpen(true)} disabled={!backups.length}>Clear</Button>
          </div>
        </div>
        <div className="mt-3 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
          {backups.length ? backups.map((snapshot) => (
            <div key={snapshot.id} className="flex flex-wrap items-center gap-2 p-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><RefreshCw size={12} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-semibold text-[var(--text)]">{snapshot.reason || "Snapshot"}</p>
                <p className="text-[9.5px] text-[var(--faint)]">{format(new Date(snapshot.createdAt), "d MMM yyyy · HH:mm")} · {formatBytes(snapshot.size)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="xs" variant="secondary" icon={RotateCcw} onClick={() => chooseSnapshot(snapshot)}>Restore</Button>
                <IconButton icon={Trash2} label="Delete snapshot" size="iconSm" className="hover:text-[var(--danger)]" onClick={() => { deleteBackupSnapshot(snapshot.id); toast.success("Snapshot deleted", "The internal backup was removed."); }} />
              </div>
            </div>
          )) : <EmptyState compact icon={RefreshCw} title="No internal snapshots" description="A snapshot will be created automatically after your next meaningful change, or use Snapshot now." />}
        </div>
      </SectionCard>

      <SectionCard title="Storage usage" description={`${storageMode === "hybrid" ? "Hybrid storage active: LocalStorage for preferences, IndexedDB for records." : "LocalStorage-only fallback active."} LocalStorage has a browser-dependent limit, typically around 5 MB per origin.`} icon={HardDrive}
        action={<Badge tone={storage.percent > 85 ? "danger" : storage.percent > 70 ? "warning" : "success"}>{storage.percent}%</Badge>}>
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10.5px] text-[var(--muted)]">
          <span>Preferences <span className="font-semibold text-[var(--text)]">{formatBytes(storage.settingsBytes || 0)}</span></span>
          <span>Local mirror <span className="font-semibold text-[var(--text)]">{formatBytes(storage.dataBytes)}</span></span>
          <span>Backups <span className="font-semibold text-[var(--text)]">{formatBytes(storage.backupBytes)}</span></span>
          <span>IndexedDB <span className="font-semibold text-[var(--text)]">{storage.idbLabel || "0 B"}</span></span>
        </div>
        <ProgressBar value={storage.percent} className="mt-1.5" color={storage.percent > 85 ? "var(--danger)" : "var(--accent)"} />
        <p className="mt-1.5 text-[10px] text-[var(--faint)]">{storage.label} of an approximate 5 MB LocalStorage limit · {storage.idbLabel || "0 B"} in IndexedDB. Records are saved in IndexedDB first; the local mirror is best-effort.</p>
        {storage.percent > 85 && (
          <div className="mt-2 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-2.5 text-[10.5px] leading-relaxed text-[var(--muted)]">
            <span className="font-bold text-[var(--warning)]">Storage almost full.</span> Export a full backup, then remove old snapshots or review old notifications in Notifications. Nothing is deleted automatically — cleanup always requires your confirmation.
          </div>
        )}
      </SectionCard>

      <SectionCard title="Danger zone" description="These operations remove data. Every destructive action creates a safety snapshot first and requires confirmation." icon={AlertTriangle}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11.5px] font-semibold text-[var(--text)]">Reset the workspace</p>
            <p className="text-[10.5px] text-[var(--muted)]">Delete all records but keep appearance and study preferences.</p>
          </div>
          <Button size="sm" variant="dangerGhost" icon={Trash2} onClick={() => setResetOpen(true)}>Reset application data</Button>
        </div>
        {data.settings.sampleData && (
          <div className="mt-2 flex flex-col gap-2 border-t border-[var(--border)] pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11.5px] font-semibold text-[var(--text)]">Remove sample semester data</p>
              <p className="text-[10.5px] text-[var(--muted)]">Clear the demo records and start with your own workspace.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { clearSampleData(); toast.success("Sample data cleared", "Your workspace is ready for the real semester."); }}>Clear sample data</Button>
          </div>
        )}
      </SectionCard>

      <Modal
        open={!!candidate} onClose={() => setCandidate(null)} size="md" icon={Upload}
        title="Review backup before restoring" description={candidate?.fileName || "Selected backup"}
        footer={<><Button variant="secondary" size="sm" onClick={() => setCandidate(null)}>Cancel</Button><Button size="sm" variant="secondary" icon={Layers} onClick={() => doRestore("merge")} disabled={restoring}>Merge records</Button><Button size="sm" variant="danger" icon={RotateCcw} onClick={() => setReplaceOpen(true)} disabled={restoring}>Replace all</Button></>}
      >
        {candidate && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {[
                ["Application", candidate.meta.app], ["Backup version", `v${candidate.meta.version}`],
                ["Exported", candidate.meta.exportedAt ? fmtDate(candidate.meta.exportedAt, "d MMM yyyy · HH:mm") : "Unknown"],
                ["Records", summarizeBackup(candidate.data).total],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[var(--border)] p-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--faint)]">{label}</p>
                  <p className="mt-0.5 font-semibold text-[var(--text)]">{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[var(--border)] p-2.5">
              <p className="mb-1.5 text-[10.5px] font-bold text-[var(--text)]">Sections detected</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(candidate.meta.counts || {}).map(([key, count]) => <span key={key} className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9.5px] text-[var(--muted)]">{key}: {count}</span>)}
              </div>
            </div>
            {candidate.warnings?.length > 0 && <p className="text-[10.5px] text-[var(--warning)]">{candidate.warnings.join(" ")}</p>}
            <div className="space-y-2">
              <div className="rounded-lg border border-[var(--border)] p-2.5">
                <p className="text-[11px] font-bold text-[var(--text)]">Merge</p>
                <p className="text-[10px] leading-relaxed text-[var(--muted)]">Keeps your current workspace and adds records that do not already exist. Duplicate IDs and matching deadlines/titles are skipped. Settings are kept.</p>
              </div>
              <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)]/50 p-2.5">
                <p className="text-[11px] font-bold text-[var(--danger)]">Replace</p>
                <p className="text-[10px] leading-relaxed text-[var(--muted)]">Removes all current records and restores the backup exactly. A safety snapshot is created first and you will be asked to confirm.</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={replaceOpen} onClose={() => setReplaceOpen(false)}
        onConfirm={() => doRestore("replace")}
        title="Replace all current data?" confirmLabel="Yes, replace everything" tone="danger"
        message="Your existing tasks, events, timetable, study sessions, academic work, notes, notifications, focus history and settings will be replaced by the selected backup. A safety snapshot is created automatically first."
      />

      <Modal
        open={!!report} onClose={() => setReport(null)} size="sm" icon={CheckCircle2}
        title={report?.mode === "merge" ? "Backup merged successfully" : "Backup restored successfully"}
        description="A report of what changed in your workspace."
        footer={<Button size="sm" onClick={() => setReport(null)}>Done</Button>}
      >
        {report && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[var(--border)] p-2"><p className="text-[9px] font-bold uppercase text-[var(--faint)]">Mode</p><p className="text-[12px] font-semibold capitalize text-[var(--text)]">{report.mode}</p></div>
              <div className="rounded-lg border border-[var(--border)] p-2"><p className="text-[9px] font-bold uppercase text-[var(--faint)]">Safety snapshot</p><p className="text-[12px] font-semibold text-[var(--success)]">{report.safetyCreated ? "Created" : "Recent snapshot kept"}</p></div>
            </div>
            {report.mode === "merge" ? (
              <div>
                <p className="mb-1 text-[10.5px] font-bold text-[var(--text)]">Records added per section</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(report.added || {}).map(([key, count]) => <span key={key} className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9.5px] text-[var(--muted)]">{key}: +{count}</span>)}
                </div>
                <p className="mt-1.5 text-[10px] text-[var(--faint)]">Duplicate records were skipped by stable ID and content comparison.</p>
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">Restored from “{report.fileName}”. {report.counts.total} records are now in your workspace. Theme and appearance preferences were restored with the backup.</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setReport(null); navigate("/"); }}>Go to dashboard</Button>
              <Button size="sm" variant="ghost" onClick={() => setReport(null)}>Stay in settings</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={doReset} title="Reset all UniMate data?" confirmLabel="Reset workspace" message="All tasks, events, classes, study sessions, academic records, notes, notifications and focus history will be deleted. Appearance and study preferences are kept. A safety snapshot is created first." />
      <ConfirmDialog open={clearBackupsOpen} onClose={() => setClearBackupsOpen(false)} onConfirm={() => { clearAllBackups(); setClearBackupsOpen(false); toast.success("Backup history cleared", "All internal snapshots were removed. Downloadable backups are unaffected."); }} title="Delete all internal backups?" confirmLabel="Delete snapshots" message="Every automatic and manual internal snapshot will be removed from this browser. This cannot be undone. Download a full JSON backup first if you might need them." />
    </div>
  );
}

function About() {
  const { data, backups, storage } = useApp();
  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[var(--accent-soft)] blur-2xl" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm"><Layers size={21} /></span>
          <div>
            <p className="font-display text-[20px] font-extrabold tracking-tight text-[var(--text)]">UniMate</p>
            <p className="text-[11px] font-medium text-[var(--faint)]">Personal University Management &amp; Productivity System · v1.0</p>
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[var(--muted)]">
              UniMate brings classes, deadlines, focused study and personal notes into one calm, local-first workspace. It is built for a single student and requires no account or cloud service.
            </p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Record sections", value: 8 }, { label: "Backups stored", value: backups.length },
            { label: "Storage used", value: storage.label }, { label: "Workspace version", value: `v${data.version || 1}` },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--faint)]">{s.label}</p>
              <p className="mt-0.5 text-[13px] font-bold text-[var(--text)]">{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="What's included" icon={ListChecks}>
          <ul className="space-y-1.5">
            {["Deadline-driven dashboard built entirely from your data", "Month, week, day and agenda calendar views", "Weekly timetable with overlap detection", "Task board with priorities, reminders and bulk actions", "Study planner with planned vs actual analytics", "Configurable Pomodoro timer and focus history", "Assignment and exam tracker with grading insights", "Markdown notes with autosave, pinning and export", "Validated Excel/JSON import with preview and reports", "Full backup, merge/replace restore and safety snapshots", "Eight themes, System Default and custom accent colour"].map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--muted)]"><Check size={12} className="mt-0.5 shrink-0 text-[var(--success)]" /> {item}</li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Privacy & limitations" icon={ShieldCheck}>
          <div className="space-y-2.5 text-[11px] leading-relaxed text-[var(--muted)]">
            <p><span className="font-semibold text-[var(--text)]">No accounts, no tracking, no backend.</span> Your data stays in this browser's LocalStorage. UniMate does not transmit your records anywhere.</p>
            <p><span className="font-semibold text-[var(--text)]">Not encrypted.</span> LocalStorage is plain browser storage. Anyone with access to this browser profile could inspect it. Do not store passwords or sensitive credentials.</p>
            <p><span className="font-semibold text-[var(--text)]">Closed-browser reminders are limited.</span> In-app reminders run only while UniMate is open. Browser notifications need permission and a supported browser. True background push requires a server, which is outside this version.</p>
            <p><span className="font-semibold text-[var(--text)]">Clearing browser data deletes your workspace.</span> Export a full JSON backup regularly and keep it somewhere safe.</p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Built for future extension" icon={Database}>
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">
          UniMate v1 uses a modular service layer: a storage service, import/export engine, backup service and notification scheduler behind one shared application context. The data model carries a schema version and migration-ready shape, so a future cloud backend can replace LocalStorage without rewriting the interface or module logic.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {["React", "Vite", "Tailwind CSS", "Lucide", "React Router", "date-fns", "Recharts", "SheetJS", "LocalStorage", "Notification API"].map((tech) => <Badge key={tech} tone="neutral">{tech}</Badge>)}
        </div>
      </SectionCard>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState("appearance");
  const { data } = useApp();
  return (
    <PageShell>
      <PageHeader
        eyebrow="Workspace preferences"
        title="Settings"
        description="Shape UniMate around your study habits, manage appearance, and keep a reliable copy of your academic workspace."
        actions={<Badge tone="accent" dot>{data.settings.sampleData ? "Sample workspace" : "Local workspace"}</Badge>}
      />
      <Card className="p-2">
        <Tabs value={tab} onChange={setTab} tabs={TABS} className="w-full overflow-x-auto border-0 bg-transparent p-0" />
      </Card>
      {tab === "appearance" && <Appearance />}
      {tab === "notifications" && <NotificationsSettings />}
      {tab === "study" && <StudySettings />}
      {tab === "data" && <DataManagement />}
      {tab === "about" && <About />}
    </PageShell>
  );
}
