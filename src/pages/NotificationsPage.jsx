import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isYesterday } from "date-fns";
import {
  AlertCircle, Bell, BellOff, BellRing, BookOpen, Check, CheckCheck, CheckSquare, ChevronRight, Clock,
  ExternalLink, GraduationCap, School, ShieldAlert, Sparkles, Trash2, X, MailOpen, Volume2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, InfoNote, PageHeader, PageShell, Select,
  StatCard, Tabs, Toggle,
} from "../components/ui";
import {
  REMINDER_PRESETS, getNotificationPermission, reminderLabel, requestNotificationPermission,
  sendBrowserNotification,
} from "../lib/notificationService";
import { getNotificationCleanupInfo } from "../lib/notificationCleanup";
import NotificationCleanupDialog from "../components/NotificationCleanupDialog";

const TYPE_ROUTE = {
  tasks: "/tasks", events: "/calendar", timetable: "/timetable",
  academicItems: "/academic", assignments: "/assignments", exams: "/exams", studySessions: "/study",
};

function typeMeta(notification) {
  const type = (notification.type || "").toLowerCase();
  if (type.includes("exam")) return { icon: GraduationCap, color: "var(--danger)" };
  if (type.includes("assignment") || type.includes("deadline")) return { icon: Clock, color: "var(--warning)" };
  if (type.includes("class")) return { icon: School, color: "var(--info)" };
  if (type.includes("study")) return { icon: BookOpen, color: "var(--success)" };
  if (type.includes("task")) return { icon: CheckSquare, color: "var(--accent)" };
  return { icon: Bell, color: "var(--accent)" };
}

function dayLabel(iso) {
  const date = new Date(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMMM");
}

export default function NotificationsPage() {
  const {
    data, storage, unreadCount, markNotificationRead, markAllNotificationsRead, deleteNotification,
    deleteMany, clearNotifications, addNotification, updateSettings,
  } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("All");
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [requesting, setRequesting] = useState(false);
  const notifications = data.notifications || [];
  const settings = data.settings;

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const types = useMemo(() => Array.from(new Set(notifications.map((n) => n.type).filter(Boolean))), [notifications]);
  const cleanupInfo = useMemo(() => getNotificationCleanupInfo(notifications, data), [notifications, data]);

  const filtered = useMemo(() => {
    return [...notifications]
      .filter((n) => (tab === "unread" ? !n.readAt : true))
      .filter((n) => typeFilter === "All" || n.type === typeFilter)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, tab, typeFilter]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((n) => {
      const key = n.createdAt ? format(new Date(n.createdAt), "yyyy-MM-dd") : "unknown";
      (map[key] = map[key] || []).push(n);
    });
    return map;
  }, [filtered]);

  const todayCount = notifications.filter((n) => n.createdAt && isToday(new Date(n.createdAt))).length;

  const requestPermission = async () => {
    setRequesting(true);
    const result = await requestNotificationPermission();
    setPermission(result);
    setRequesting(false);
    if (result === "granted") {
      updateSettings({ browserNotifications: true });
      toast.success("Browser notifications enabled", "UniMate can now deliver alerts while the app is open in a tab.");
    } else if (result === "denied") {
      updateSettings({ browserNotifications: false });
      toast.error("Permission denied", "Your browser will not ask again. Enable notifications in the browser's site settings if you change your mind.");
    } else if (result === "unsupported") {
      toast.info("Not supported", "This browser does not support the Notification API. In-app reminders still work.");
    }
  };

  const sendTest = () => {
    addNotification({
      title: "Test notification",
      message: "In-app notifications are working. Browser alerts are sent only when permission is granted.",
      type: "system",
    }, { dedupe: false });
    if (settings.browserNotifications && permission === "granted") {
      const sent = sendBrowserNotification("UniMate test notification", "Browser notifications are working on this device.", "unimate-test");
      if (sent) toast.success("Test sent", "Check your system notification area.");
      else toast.warning("Browser alert blocked", "The in-app notification was created, but the browser could not display an alert.");
    } else {
      toast.success("Test notification created", "It appears in your notification list.");
    }
  };

  const openSource = (notification) => {
    if (!notification.readAt) markNotificationRead(notification.id);
    const route = TYPE_ROUTE[notification.sourceType];
    if (route) navigate(route);
    else toast.info("System notification", "This update is not linked to a specific record.");
  };

  const clearAll = () => {
    clearNotifications();
    setConfirmClear(false);
    toast.success("Notification history cleared", "All in-app notifications were removed.");
  };

  const cleanupDelete = (ids) => {
    deleteMany("notifications", ids);
    setCleanupOpen(false);
    toast.success("Notifications removed", `${ids.length} selected notice${ids.length === 1 ? "" : "s"} deleted. Source records were not changed.`);
  };

  const permissionTone = permission === "granted" ? "success" : permission === "denied" ? "danger" : permission === "unsupported" ? "neutral" : "warning";

  return (
    <PageShell>
      <PageHeader
        eyebrow="Reminder center"
        title="Notifications"
        description="Deadline alerts, class reminders and system updates in one list. In-app history stays in your browser."
        actions={
          <>
            <Button variant="secondary" icon={CheckCheck} onClick={() => { markAllNotificationsRead(); toast.success("All caught up", "Every notification is marked as read."); }} disabled={!unreadCount}>Mark all read</Button>
            <Button variant="secondary" icon={ShieldAlert} onClick={() => setCleanupOpen(true)} disabled={!notifications.length}>Review old</Button>
            <Button variant="dangerGhost" icon={Trash2} onClick={() => setConfirmClear(true)} disabled={!notifications.length}>Clear all</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Unread" value={unreadCount} sub="Need your attention" icon={BellRing} tone="accent" />
        <StatCard label="Today" value={todayCount} sub="Recent activity" icon={Clock} tone="info" />
        <StatCard label="In-app alerts" value={settings.notificationsEnabled ? "On" : "Off"} sub={settings.notificationsEnabled ? "Generating reminders" : "Paused in settings"} icon={settings.notificationsEnabled ? Bell : BellOff} tone={settings.notificationsEnabled ? "success" : "neutral"} />
        <StatCard label="Browser alerts" value={permission === "granted" ? settings.browserNotifications ? "On" : "Ready" : permission === "denied" ? "Blocked" : permission === "unsupported" ? "N/A" : "Ask"} sub="This device only" icon={ShieldAlert} tone={permission === "granted" ? "success" : "warning"} />
      </div>

      {(cleanupInfo.warning.length > 0 || cleanupInfo.eligible.length > 0 || storage.percent > 85) && (
        <Card className="flex flex-col gap-2 border-[var(--warning)]/30 bg-[var(--warning-soft)]/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)]"><ShieldAlert size={15} /></span>
            <div>
              <p className="text-[12px] font-bold text-[var(--text)]">
                {storage.percent > 85 ? "Storage is almost full" : `${cleanupInfo.eligible.length} notice${cleanupInfo.eligible.length === 1 ? "" : "s"} ready for review`}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-[var(--muted)]">
                {cleanupInfo.warning.length > 0 && `${cleanupInfo.warning.length} more will reach the 14-day review point soon. `}
                Nothing is deleted automatically. Notes, assignments, exams and active tasks stay protected, and cleanup always asks for confirmation.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate("/settings?tab=data")}>Storage settings</Button>
            <Button size="sm" icon={ShieldAlert} onClick={() => setCleanupOpen(true)} disabled={!notifications.length}>Review notifications</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
          <Card className="p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Tabs value={tab} onChange={setTab} tabs={[{ value: "all", label: "All", count: notifications.length }, { value: "unread", label: "Unread", count: unreadCount }]} />
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 w-auto py-1 text-[11px]" aria-label="Filter notification type">
                <option value="All">All types</option>
                {types.map((t) => <option key={t} value={t}>{t.replace(/-/g, " ")}</option>)}
              </Select>
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={tab === "unread" ? CheckCheck : BellOff}
                title={tab === "unread" ? "You're all caught up" : "No notifications yet"}
                description={tab === "unread" ? "Unread reminders will appear here when something needs your attention." : settings.notificationsEnabled ? "Create a task or event with a reminder and it will notify you while UniMate is open." : "In-app notifications are currently disabled. Turn them back on in the settings panel."}
                action={tab === "unread" ? <Button size="sm" variant="secondary" onClick={() => setTab("all")}>View all history</Button> : <Button size="sm" variant="secondary" onClick={sendTest}>Send a test notification</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([day, list]) => (
                <div key={day}>
                  <p className="mb-1.5 flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--faint)]">
                    {dayLabel(list[0].createdAt)} <span className="h-px flex-1 bg-[var(--border)]" />
                    <span className="font-medium normal-case tracking-normal">{list.length}</span>
                  </p>
                  <Card className="divide-y divide-[var(--border)] overflow-hidden">
                    {list.map((notification) => {
                      const meta = typeMeta(notification);
                      const unread = !notification.readAt;
                      return (
                        <div key={notification.id} className={`group flex items-start gap-2.5 p-3 transition-colors hover:bg-[var(--surface-2)]/40 ${unread ? "bg-[var(--accent-soft)]/25" : ""}`}>
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${meta.color}16`, color: meta.color }}>
                            <meta.icon size={15} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className={`text-[12px] ${unread ? "font-bold text-[var(--text)]" : "font-medium text-[var(--muted)]"}`}>{notification.title}</p>
                              {unread && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" title="Unread" />}
                              <Badge tone="neutral">{notification.type?.replace(/-/g, " ") || "system"}</Badge>
                            </div>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">{notification.message}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9.5px] text-[var(--faint)]">
                              <span>{notification.createdAt ? format(new Date(notification.createdAt), "h:mm a") : "Unknown time"}</span>
                              {TYPE_ROUTE[notification.sourceType] && (
                                <button onClick={() => openSource(notification)} className="inline-flex items-center gap-0.5 font-semibold text-[var(--accent)] hover:underline">Open source <ExternalLink size={9} /></button>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            {unread && <IconButton icon={MailOpen} label={`Mark ${notification.title} as read`} size="iconSm" onClick={() => markNotificationRead(notification.id)} />}
                            <IconButton icon={Trash2} label={`Delete ${notification.title}`} size="iconSm" className="hover:text-[var(--danger)]" onClick={() => { deleteNotification(notification.id); toast.success("Notification deleted", "The reminder was removed from your history."); }} />
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                </div>
              ))}
            </div>
          )}

          <InfoNote tone="warning" icon={AlertCircle}>
            <strong className="text-[var(--text)]">Important limitation:</strong> UniMate is a local-first app. In-app reminders and browser notifications run only while this browser tab is open. Reliable alerts while the browser is closed require a push server. JavaScript timers are also paused on some mobile browsers when the device sleeps.
          </InfoNote>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12.5px] font-bold text-[var(--text)]">Delivery settings</p>
                <p className="text-[10px] text-[var(--faint)]">Control how UniMate reaches you.</p>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><BellRing size={14} /></span>
            </div>
            <div className="mt-2 divide-y divide-[var(--border)]">
              <Toggle
                checked={settings.notificationsEnabled}
                onChange={(v) => { updateSettings({ notificationsEnabled: v }); toast.success(v ? "In-app notifications on" : "In-app notifications paused", v ? "Reminder alerts will be generated while the app is open." : "Existing history remains available."); }}
                label="In-app notifications" description="Create reminders inside UniMate for deadlines, classes and sessions."
              />
              <Toggle
                checked={!!settings.browserNotifications}
                onChange={(v) => {
                  if (v && permission !== "granted") { requestPermission(); return; }
                  updateSettings({ browserNotifications: v });
                  toast.success(v ? "Browser alerts on" : "Browser alerts off", v ? "Alerts appear while this tab is open." : "In-app notifications continue to work.");
                }}
                label="Browser notifications" description="System alerts when your browser supports them and permission is granted."
                disabled={permission === "unsupported"}
              />
              <Toggle
                checked={settings.soundEnabled}
                onChange={(v) => updateSettings({ soundEnabled: v })}
                label="Completion sound" description="Play a chime when a Pomodoro timer ends."
              />
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-[12.5px] font-bold text-[var(--text)]">Browser permission</p>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${permission === "granted" ? "bg-[var(--success-soft)] text-[var(--success)]" : permission === "denied" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning)]"}`}>
                  {permission === "granted" ? <Check size={15} /> : permission === "denied" ? <X size={15} /> : <ShieldAlert size={15} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold capitalize text-[var(--text)]">{permission === "unsupported" ? "Not supported" : permission === "default" ? "Not requested yet" : permission}</p>
                  <p className="text-[9.5px] text-[var(--faint)]">{permission === "denied" ? "Re-enable in browser site settings." : permission === "granted" ? "Permission granted on this device." : "UniMate only asks once."}</p>
                </div>
              </div>
              <Badge tone={permissionTone}>{permission === "default" ? "pending" : permission}</Badge>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={requestPermission} disabled={requesting || permission === "granted" || permission === "denied" || permission === "unsupported"} className="flex-1">
                {requesting ? "Requesting…" : permission === "denied" ? "Blocked" : "Request permission"}
              </Button>
              <Button size="sm" variant="secondary" onClick={sendTest} className="flex-1">Send test</Button>
            </div>
            {permission === "denied" && (
              <p className="mt-2 text-[10px] leading-relaxed text-[var(--faint)]">Your browser has remembered the denial. UniMate will not ask again. Use the padlock icon in your address bar to change the site permission manually.</p>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-[12.5px] font-bold text-[var(--text)]">Default reminder timing</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-[var(--muted)]">Applied to new tasks, events, classes and study sessions. You can override each record individually.</p>
            <Select className="mt-2.5" value={settings.defaultReminderMinutes ?? 15} onChange={(e) => { updateSettings({ defaultReminderMinutes: Number(e.target.value) }); toast.success("Default reminder updated", `New records will remind you ${reminderLabel(Number(e.target.value)).toLowerCase()}.`); }} aria-label="Default reminder time">
              {REMINDER_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--border)] p-2.5 text-[10px] leading-relaxed text-[var(--faint)]">
              <Volume2 size={13} className="mt-0.5 shrink-0 text-[var(--accent)]" />
              <span>The built-in scheduler checks reminders every 30 seconds and de-duplicates them. Editing a record creates a new reminder signature instead of a duplicate alert.</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-bold text-[var(--text)]">Reminder presets</p>
              <Sparkles size={13} className="text-[var(--faint)]" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {REMINDER_PRESETS.slice(0, 7).map((p) => (
                <span key={p.value} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/60 px-1.5 py-0.5 text-[9.5px] font-medium text-[var(--muted)]">{p.label}</span>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--faint)]">Custom timing is available on each record through the reminder selector.</p>
          </Card>
        </div>
      </div>

      <NotificationCleanupDialog
        open={cleanupOpen}
        onClose={() => setCleanupOpen(false)}
        notifications={notifications}
        data={data}
        onDelete={cleanupDelete}
      />

      <ConfirmDialog
        open={confirmClear} onClose={() => setConfirmClear(false)} onConfirm={clearAll}
        title="Clear all notifications?" message={`${notifications.length} in-app notifications will be permanently removed from your history. Your tasks, events and source records are not affected.`}
        confirmLabel="Clear history"
      />
    </PageShell>
  );
}
