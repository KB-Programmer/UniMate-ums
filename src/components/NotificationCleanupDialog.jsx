import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Download, ShieldCheck, Trash2 } from "lucide-react";
import { Badge, Button, EmptyState, InfoNote, Modal, Tabs } from "../components/ui";
import { downloadBlob, fmtDate } from "../lib/utils";
import {
  ELIGIBLE_AFTER_DAYS, WARNING_AFTER_DAYS, getNotificationCleanupInfo, notificationAgeDays,
} from "../lib/notificationCleanup";

export default function NotificationCleanupDialog({ open, onClose, notifications = [], data, onDelete }) {
  const [scope, setScope] = useState("suggested");
  const [selected, setSelected] = useState(() => new Set());

  const info = useMemo(() => getNotificationCleanupInfo(notifications, data), [notifications, data]);
  const oldNotifications = useMemo(() => {
    const oldIds = new Set([...info.warning, ...info.eligible, ...info.protectedIds]);
    return notifications.filter((n) => oldIds.has(n.id) || notificationAgeDays(n) >= WARNING_AFTER_DAYS);
  }, [notifications, info]);

  useEffect(() => {
    if (!open) return;
    setScope("suggested");
    setSelected(new Set(info.eligible));
  }, [open, info.eligible]);

  const visible = scope === "suggested"
    ? [...oldNotifications].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const toggle = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportSelected = () => {
    const records = notifications.filter((n) => selected.has(n.id));
    const payload = {
      exportedAt: new Date().toISOString(),
      kind: "unimate-notification-cleanup",
      warningAfterDays: WARNING_AFTER_DAYS,
      eligibleAfterDays: ELIGIBLE_AFTER_DAYS,
      notifications: records,
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `unimate-notifications-${format(new Date(), "yyyy-MM-dd")}.json`);
  };

  const confirmDelete = () => {
    const ids = [...selected];
    if (!ids.length) return;
    onDelete(ids);
    setSelected(new Set());
  };

  const selectedList = notifications.filter((n) => selected.has(n.id));
  const nonEligible = selectedList.filter((n) => !info.eligible.includes(n.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review old notifications"
      description="Nothing is deleted automatically. Choose exactly which in-app notices to remove."
      icon={ShieldCheck}
      size="lg"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10.5px] text-[var(--muted)]">
            {selected.size} selected{nonEligible.length ? ` · ${nonEligible.length} not in the suggested list` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={Download} onClick={exportSelected} disabled={!selected.size}>Export selected</Button>
            <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={confirmDelete} disabled={!selected.size}>Delete selected</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <InfoNote tone="warning" icon={AlertCircle}>
          Notices older than {WARNING_AFTER_DAYS} days are shown for review. Only notices at least {ELIGIBLE_AFTER_DAYS} days old are pre-selected. Notes, assignments, exams and active tasks are protected from automatic selection. Source records are never deleted here.
        </InfoNote>

        <Tabs
          value={scope}
          onChange={setScope}
          tabs={[
            { value: "suggested", label: "Suggested", count: oldNotifications.length },
            { value: "all", label: "All notifications", count: notifications.length },
          ]}
        />

        <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--border)] p-2">
          {visible.length === 0 ? (
            <EmptyState compact icon={ShieldCheck} title="No old notices" description="There is nothing to clean up right now. New notices appear here after 10 days." />
          ) : visible.map((n) => {
            const age = notificationAgeDays(n);
            const isEligible = info.eligible.includes(n.id);
            const isProtected = info.protectedIds.includes(n.id);
            return (
              <label key={n.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent p-2 transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                <input
                  type="checkbox"
                  checked={selected.has(n.id)}
                  onChange={() => toggle(n.id)}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                  aria-label={`Select ${n.title}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11.5px] font-semibold text-[var(--text)]">{n.title}</span>
                    {isEligible && <Badge tone="warning">Eligible · {age}d</Badge>}
                    {!isEligible && age >= WARNING_AFTER_DAYS && <Badge tone="info">Review · {age}d</Badge>}
                    {isProtected && <Badge tone="success">Protected source</Badge>}
                  </span>
                  <span className="mt-0.5 block truncate text-[10.5px] text-[var(--muted)]">{n.message}</span>
                  <span className="mt-0.5 block text-[9.5px] text-[var(--faint)]">{n.createdAt ? fmtDate(n.createdAt) : "Unknown date"}</span>
                </span>
              </label>
            );
          })}
        </div>

        <p className="text-[10px] leading-relaxed text-[var(--faint)]">
          You can export selected notices before deleting them. Cancel closes this dialog without changing anything. Deleting a notice does not modify the task, class, assignment, exam or session that created it.
        </p>
      </div>
    </Modal>
  );
}
