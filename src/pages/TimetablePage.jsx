import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, addWeeks, differenceInCalendarDays, format, isToday, parseISO, startOfWeek, subWeeks } from "date-fns";
import {
  BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock, Copy, DoorOpen, GraduationCap, Layers3,
  MapPin, Pencil, Plus, School, SearchX, Settings2, Trash2, User, Bell, ArrowRight,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Field, IconButton, InfoNote, Input, Modal,
  PageHeader, PageShell, SearchInput, Tabs,
} from "../components/ui";
import { ClassForm } from "../components/forms";
import { DataToolsButton } from "../components/ImportExportPanel";
import { DAYS, fmtTime, timeToMinutes, todayName } from "../lib/utils";
import { weekKeyFor } from "../lib/storageService";

const START = 7;
const END = 20;
const HOUR = 60;

export default function TimetablePage() {
  const {
    data, setActiveWeek, deleteTimetableClass, createWeekPlan, renameWeekPlan, deleteWeekPlan,
  } = useApp();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const weekStartsOn = data.settings.weekStart === "sunday" ? 0 : 1;
  const [weekOffset, setWeekOffset] = useState(() => {
    const saved = data.settings.activeWeekStart;
    if (!saved) return 0;
    try {
      const diff = differenceInCalendarDays(parseISO(saved), startOfWeek(new Date(), { weekStartsOn }));
      return Math.round(diff / 7);
    } catch {
      return 0;
    }
  });
  const [query, setQuery] = useState("");
  const [dayFilter, setDayFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateDate, setDuplicateDate] = useState("");
  const [deleteWeekKey, setDeleteWeekKey] = useState(null);
  const [weekLabel, setWeekLabel] = useState("");

  const isPermanent = data.settings.timetableMode === "permanent";
  const weekly = data.weeklyTimetables || [];
  const weekStartDate = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn });
  const currentKey = weekKeyFor(weekStartDate, data.settings.weekStart);
  const previousKey = weekKeyFor(subWeeks(weekStartDate, 1), data.settings.weekStart);
  const currentPlan = weekly.find((plan) => plan.weekStart === currentKey);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setActiveWeek(currentKey);
    setWeekLabel(currentPlan?.label || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  const classes = data.timetable || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return classes.filter((cls) => {
      const matchesQuery = !q || [cls.courseName, cls.courseCode, cls.lecturer, cls.classroom].join(" ").toLowerCase().includes(q);
      const matchesDay = dayFilter === "All" || cls.day === dayFilter;
      return matchesQuery && matchesDay;
    });
  }, [classes, query, dayFilter]);

  const classesFor = (day) =>
    filtered.filter((cls) => cls.day === day).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const todayList = useMemo(
    () => classes.filter((c) => c.day === todayName()).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    [classes]
  );

  const orderedDays = weekStartsOn === 0 ? [DAYS[6], ...DAYS.slice(0, 6)] : DAYS;
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const currentWeek = weekOffset === 0;

  const stats = useMemo(() => {
    const hours = classes.reduce((sum, c) => sum + Math.max(0, timeToMinutes(c.endTime) - timeToMinutes(c.startTime)), 0) / 60;
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const next = todayList.find((c) => timeToMinutes(c.startTime) >= nowMins);
    return { hours: hours.toFixed(1), today: todayList.length, next, courses: new Set(classes.map((c) => c.courseCode)).size };
  }, [classes, todayList]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (cls) => { setDetail(null); setEditing(cls); setFormOpen(true); };
  const confirmDelete = () => {
    deleteTimetableClass(editing?.id || detail?.id, currentKey);
    toast.success("Class removed", isPermanent ? "The class was removed from your permanent timetable." : `The class was removed from the week of ${format(weekStartDate, "d MMM")}.`);
    setDeleting(false);
    setEditing(null);
    setDetail(null);
  };

  const rangeLabel = `${format(weekDates[0], "d MMM")} – ${format(weekDates[6], "d MMM yyyy")}`;

  const navigateToKey = (key) => {
    try {
      const diff = differenceInCalendarDays(startOfWeek(parseISO(key), { weekStartsOn }), startOfWeek(new Date(), { weekStartsOn }));
      setWeekOffset(Math.round(diff / 7));
    } catch {
      setWeekOffset(0);
    }
  };

  const copyPreviousWeek = () => {
    if (isPermanent) {
      toast.warning("Permanent mode", "Switch to Weekly timetable mode in Settings to manage individual weeks.");
      return;
    }
    const source = weekly.find((plan) => plan.weekStart === previousKey);
    if (!source?.classes?.length) {
      toast.warning("Nothing to copy", "The previous week has no classes to copy.");
      return;
    }
    if (currentPlan?.classes?.length) {
      toast.warning("This week already has classes", "Duplicate the timetable into a different week instead of overwriting it.");
      return;
    }
    createWeekPlan(currentKey, { sourceWeekStart: previousKey, label: `Copied from ${format(subWeeks(weekStartDate, 1), "d MMM")}` });
    toast.success("Previous week copied", `${source.classes.length} classes were copied with new record IDs. Other weeks were left untouched.`);
  };

  const duplicateToWeek = () => {
    if (!duplicateDate) return;
    const targetKey = weekKeyFor(parseISO(duplicateDate), data.settings.weekStart);
    if (targetKey === currentKey) {
      toast.warning("Choose a different week", "This week already holds the timetable you are duplicating.");
      return;
    }
    if (weekly.some((plan) => plan.weekStart === targetKey && plan.classes?.length)) {
      toast.warning("Target week already has classes", "Choose an empty week so existing history is not overwritten.");
      return;
    }
    createWeekPlan(targetKey, { sourceWeekStart: currentKey, label: `Copy of ${format(weekStartDate, "d MMM")} week` });
    toast.success("Weekly timetable duplicated", "The copy has its own class records. The original week is unchanged.");
    navigateToKey(targetKey);
    setDuplicateOpen(false);
    setDuplicateDate("");
  };

  const orderedHistory = useMemo(() => [...weekly].sort((a, b) => b.weekStart.localeCompare(a.weekStart)), [weekly]);

  const ClassBlock = ({ cls, compact = false }) => {
    const top = ((timeToMinutes(cls.startTime) - START * 60) / 60) * HOUR;
    const height = ((timeToMinutes(cls.endTime) - timeToMinutes(cls.startTime)) / 60) * HOUR;
    return (
      <button
        onClick={() => setDetail(cls)}
        className={`absolute left-1 right-1 overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-left shadow-sm transition-all hover:z-10 hover:shadow-md ${compact ? "" : "hover:-translate-y-0.5"}`}
        style={{ top: Math.max(0, top), height: Math.max(34, height), background: `${cls.color}14`, borderColor: cls.color }}
        title={`${cls.courseName} · ${fmtTime(cls.startTime)}–${fmtTime(cls.endTime)}`}
      >
        <p className="truncate text-[10.5px] font-bold leading-tight" style={{ color: cls.color }}>{cls.courseCode}</p>
        <p className="truncate text-[10px] font-semibold leading-tight text-[var(--text)]">{cls.courseName}</p>
        <p className="mt-0.5 truncate text-[8.5px] text-[var(--muted)]">{fmtTime(cls.startTime)} · {cls.classroom || "TBA"}</p>
      </button>
    );
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow={isPermanent ? "Permanent schedule" : "Weekly schedule"}
        title="Timetable"
        description={isPermanent
          ? "Your permanent weekly rhythm is active. Switch to Weekly mode in Settings to manage individual weeks; switching never deletes either mode's data."
          : "Create, edit and duplicate a timetable for any week. Past weeks are preserved as history and overlaps are caught before saving."}
        actions={
          <>
            <DataToolsButton moduleKey="timetable" />
            <Button variant="secondary" icon={Settings2} onClick={() => { window.location.hash = "#/settings"; }}>Timetable settings</Button>
            <Button icon={Plus} onClick={openCreate}>Add class</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Today's classes", value: stats.today, sub: todayName(), icon: CalendarDays },
          { label: "Weekly contact hours", value: `${stats.hours}h`, sub: `${stats.courses} courses`, icon: Clock },
          { label: "Next class", value: stats.next ? fmtTime(stats.next.startTime) : "—", sub: stats.next ? stats.next.courseCode : "No class left today", icon: ArrowRight },
          { label: isPermanent ? "Mode" : "Current week", value: isPermanent ? "Permanent" : currentWeek ? "This week" : rangeLabel.split("–")[0], sub: isPermanent ? "Shared every week" : rangeLabel, icon: isPermanent ? Layers3 : School },
        ].map((s) => (
          <Card key={s.label} className="flex items-start justify-between gap-2 p-3.5">
            <div className="min-w-0">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[var(--faint)]">{s.label}</p>
              <p className="mt-1 truncate font-display text-[17px] font-bold text-[var(--text)]">{s.value}</p>
              <p className="truncate text-[10px] text-[var(--faint)]">{s.sub}</p>
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><s.icon size={14} /></span>
          </Card>
        ))}
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <IconButton label="Previous week" icon={ChevronLeft} variant="secondary" size="iconSm" onClick={() => setWeekOffset((w) => w - 1)} />
            <Button size="sm" variant={currentWeek ? "soft" : "secondary"} onClick={() => setWeekOffset(0)}>This week</Button>
            <IconButton label="Next week" icon={ChevronRight} variant="secondary" size="iconSm" onClick={() => setWeekOffset((w) => w + 1)} />
            <div className="ml-1">
              <p className="text-[12.5px] font-bold text-[var(--text)]">{rangeLabel}</p>
              <p className="text-[10px] text-[var(--faint)]">{filtered.length} of {classes.length} classes shown {isPermanent ? "· permanent mode" : `· week ${format(weekStartDate, "yyyy-MM-dd")}`}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Find a course…" className="w-full sm:w-48" />
            <Tabs value={dayFilter} onChange={setDayFilter} tabs={[{ value: "All", label: "All days" }, ...DAYS.map((d) => ({ value: d, label: d.slice(0, 3) }))]} />
          </div>
        </div>
      </Card>

      <Card className="p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[12px] font-bold text-[var(--text)]">{isPermanent ? "Permanent weekly pattern" : "Weekly timetable management"}</p>
            <p className="mt-0.5 max-w-xl text-[10.5px] leading-relaxed text-[var(--muted)]">
              {isPermanent
                ? "Permanent classes apply to every week. Weekly plans are kept safely in storage and are restored when you switch back."
                : "Each week keeps its own classes. Copy the previous week, duplicate this week into another date, or rename a week for semester planning."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={Copy} onClick={copyPreviousWeek}>Copy previous week</Button>
            <Button size="sm" variant="secondary" icon={Layers3} onClick={() => { setDuplicateDate(format(addDays(weekStartDate, 7), "yyyy-MM-dd")); setDuplicateOpen(true); }}>Duplicate this week</Button>
          </div>
        </div>
        {!isPermanent && (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-3">
            <div className="min-w-[220px] flex-1">
              <Field label={`Label for week of ${format(weekStartDate, "d MMM")}`} htmlFor="week-label">
                <Input id="week-label" value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} placeholder="e.g. Orientation week" />
              </Field>
            </div>
            <Button size="sm" variant="secondary" icon={Pencil} onClick={() => { renameWeekPlan(currentKey, weekLabel); toast.success("Week renamed", "The label was saved."); }}>Rename week</Button>
          </div>
        )}
      </Card>

      {!isPermanent && (
        <Card className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-[var(--text)]">Saved weeks</p>
              <p className="text-[10px] text-[var(--faint)]">Older weeks stay available. Nothing is deleted when you change week or mode.</p>
            </div>
            <Badge tone="neutral">{orderedHistory.length} week{orderedHistory.length === 1 ? "" : "s"}</Badge>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {orderedHistory.map((plan) => {
              const start = parseISO(plan.weekStart);
              const end = addDays(start, 6);
              return (
                <div key={plan.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-bold text-[var(--text)]">{plan.label || `Week of ${format(start, "d MMM")}`}</p>
                      <p className="text-[9.5px] text-[var(--faint)]">{format(start, "d MMM")} – {format(end, "d MMM yyyy")} · {(plan.classes || []).length} classes</p>
                    </div>
                    {plan.weekStart === currentKey && <Badge tone="accent">Open</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Button size="xs" variant="secondary" onClick={() => navigateToKey(plan.weekStart)}>Open</Button>
                    <Button size="xs" variant="ghost" icon={Copy} onClick={() => { setDuplicateDate(format(start, "yyyy-MM-dd")); setDuplicateOpen(true); }}>Duplicate</Button>
                    <Button size="xs" variant="dangerGhost" icon={Trash2} onClick={() => setDeleteWeekKey(plan.weekStart)}>Delete</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="hidden lg:block">
        <Card className="overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, minmax(0,1fr))" }}>
            <div className="border-b border-r border-[var(--border)] bg-[var(--surface-2)]/50" />
            {weekDates.map((date, i) => {
              const today = isToday(date);
              return (
                <div key={i} className={`border-b border-r border-[var(--border)] px-2 py-2.5 text-center last:border-r-0 ${today ? "bg-[var(--accent-soft)]" : "bg-[var(--surface-2)]/25"}`}>
                  <p className={`text-[9px] font-bold uppercase tracking-[0.09em] ${today ? "text-[var(--accent)]" : "text-[var(--faint)]"}`}>{orderedDays[i].slice(0, 3)}</p>
                  <p className={`mt-0.5 text-[15px] font-bold ${today ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{format(date, "d")}</p>
                  {today && <span className="text-[8px] font-semibold uppercase tracking-wide text-[var(--accent)]">Today</span>}
                </div>
              );
            })}
            <div className="border-r border-[var(--border)]">
              {Array.from({ length: END - START }, (_, i) => (
                <div key={i} className="relative border-b border-[var(--border)]/60" style={{ height: HOUR }}>
                  <span className="absolute -top-1.5 right-2 text-[9px] font-medium text-[var(--faint)]">{String(START + i).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>
            {orderedDays.map((day, i) => (
              <div key={day} className={`relative border-r border-[var(--border)] last:border-r-0 ${isToday(weekDates[i]) ? "bg-[var(--accent-soft)]/25" : ""}`} style={{ height: (END - START) * HOUR }}>
                {Array.from({ length: END - START }, (_, h) => (
                  <div key={h} className="absolute left-0 right-0 border-b border-[var(--border)]/45" style={{ top: h * HOUR, height: HOUR }} />
                ))}
                {isToday(weekDates[i]) && (
                  <div className="absolute left-0 right-0 z-10 border-t-2 border-dashed border-[var(--accent)]/60" style={{ top: ((new Date().getHours() * 60 + new Date().getMinutes()) - START * 60) / 60 * HOUR }}>
                    <span className="absolute -top-2 left-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  </div>
                )}
                {classesFor(day).map((cls) => <ClassBlock key={cls.id} cls={cls} />)}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-3 lg:hidden">
        {orderedDays.filter((day) => dayFilter === "All" || day === dayFilter).map((day) => {
          const date = weekDates[orderedDays.indexOf(day)];
          const today = isToday(date);
          const list = classesFor(day);
          if (!list.length && dayFilter === "All") return null;
          return (
            <Card key={day} className={`overflow-hidden ${today ? "border-[var(--accent)]/40" : ""}`}>
              <div className={`flex items-center justify-between border-b border-[var(--border)] px-3.5 py-2.5 ${today ? "bg-[var(--accent-soft)]" : "bg-[var(--surface-2)]/40"}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[12px] font-bold ${today ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{day}</span>
                  <span className="text-[10.5px] text-[var(--faint)]">{format(date, "d MMM")}</span>
                  {today && <Badge tone="accent" dot>Today</Badge>}
                </div>
                <span className="text-[10px] text-[var(--faint)]">{list.length} class{list.length === 1 ? "" : "es"}</span>
              </div>
              {list.length ? (
                <div className="divide-y divide-[var(--border)]">
                  {list.map((cls) => (
                    <button key={cls.id} onClick={() => setDetail(cls)} className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-[var(--surface-2)]/50">
                      <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: cls.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-[var(--text)]">{cls.courseName}</p>
                        <p className="truncate text-[10px] text-[var(--muted)]">{cls.courseCode} · {cls.classroom || "Room TBA"}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-[var(--faint)]"><Clock size={9} /> {fmtTime(cls.startTime)} – {fmtTime(cls.endTime)}</p>
                      </div>
                      <ChevronRight size={13} className="shrink-0 text-[var(--faint)]" />
                    </button>
                  ))}
                </div>
              ) : <div className="px-3 py-4 text-center text-[11px] text-[var(--faint)]">No classes scheduled</div>}
            </Card>
          );
        })}
        {!classes.length && <Card><EmptyState icon={School} title="Your timetable is empty" description="Add your first class to build a weekly schedule." action={<Button size="sm" icon={Plus} onClick={openCreate}>Add class</Button>} /></Card>}
      </div>

      {!classes.length && (
        <Card className="hidden lg:block">
          <EmptyState icon={School} title="Your timetable is empty" description="Add classes to see your weekly rhythm, contact hours and reminders." action={<Button size="sm" icon={Plus} onClick={openCreate}>Add your first class</Button>} />
        </Card>
      )}
      {classes.length > 0 && !filtered.length && (
        <Card><EmptyState compact icon={SearchX} title="No classes match your filters" description="Clear the search or choose another day." action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); setDayFilter("All"); }}>Clear filters</Button>} /></Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <InfoNote tone="neutral" icon={Bell}>
          Class reminders are scheduled from each class's reminder setting. In-app reminders only run while UniMate is open; browser notifications require permission and a supported browser.
        </InfoNote>
        <InfoNote tone="neutral" icon={BookOpen}>
          Weekly and Permanent timetables are separate. Overlaps are checked against the active mode only, and every week keeps its own history.
        </InfoNote>
      </div>

      <ClassForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} weekStart={currentKey} />

      <Modal
        open={duplicateOpen} onClose={() => setDuplicateOpen(false)} size="sm" icon={Copy}
        title="Duplicate this weekly timetable" description="The copy receives new class IDs and the original week stays unchanged."
        footer={<><Button size="sm" variant="secondary" onClick={() => setDuplicateOpen(false)}>Cancel</Button><Button size="sm" onClick={duplicateToWeek}>Duplicate</Button></>}
      >
        <Field label="Target week" htmlFor="duplicate-date" hint="Choose any date inside the week you want to create.">
          <Input id="duplicate-date" type="date" value={duplicateDate} onChange={(e) => setDuplicateDate(e.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={!!detail} onClose={() => setDetail(null)} size="sm" icon={School}
        title={detail ? `${detail.courseCode} · ${detail.courseName}` : "Class"} description={isPermanent ? "Permanent class details" : `Weekly class details · ${format(weekStartDate, "d MMM yyyy")}`}
        footer={detail && (
          <>
            <Button size="sm" variant="dangerGhost" icon={Trash2} onClick={() => { setEditing(detail); setDeleting(true); }}>Delete</Button>
            <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(detail)}>Edit class</Button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent" dot>{detail.day}</Badge>
              <Badge tone="neutral">{detail.startTime} – {detail.endTime}</Badge>
              {detail.day === todayName() && <Badge tone="success">Today</Badge>}
            </div>
            <div className="grid gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 text-[12px]">
              <div className="flex items-center gap-2 text-[var(--muted)]"><User size={13} className="text-[var(--faint)]" /> {detail.lecturer || "Lecturer not set"}</div>
              <div className="flex items-center gap-2 text-[var(--muted)]"><MapPin size={13} className="text-[var(--faint)]" /> {detail.classroom || "Classroom not set"}</div>
              <div className="flex items-center gap-2 text-[var(--muted)]"><DoorOpen size={13} className="text-[var(--faint)]" /> {detail.classroom || "Room not set"}</div>
              <div className="flex items-center gap-2 text-[var(--muted)]"><Clock size={13} className="text-[var(--faint)]" /> {fmtTime(detail.startTime)} – {fmtTime(detail.endTime)}</div>
              <div className="flex items-center gap-2 text-[var(--muted)]"><Bell size={13} className="text-[var(--faint)]" /> Reminder {detail.reminderMinutes === 0 ? "at class time" : `${detail.reminderMinutes} min before`}</div>
            </div>
            {detail.notes && <p className="rounded-xl bg-[var(--surface-2)]/50 p-3 text-[11.5px] leading-relaxed text-[var(--muted)]">{detail.notes}</p>}
            <Button size="sm" variant="secondary" icon={GraduationCap} className="w-full justify-center" onClick={() => { setDetail(null); setFormOpen(false); window.location.hash = "#/assignments?new=1"; }}>Add course assignment</Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} onConfirm={confirmDelete} title="Delete this class?" message={`“${editing?.courseName || "This class"}” will be removed from your ${isPermanent ? "permanent timetable" : "weekly timetable"}.`} confirmLabel="Delete class" />
      <ConfirmDialog
        open={!!deleteWeekKey}
        onClose={() => setDeleteWeekKey(null)}
        onConfirm={() => {
          deleteWeekPlan(deleteWeekKey);
          toast.success("Week removed", "That weekly timetable was deleted. Permanent timetable data was not touched.");
          setDeleteWeekKey(null);
        }}
        title="Delete this saved week?"
        message={deleteWeekKey ? `The timetable for the week of ${format(parseISO(deleteWeekKey), "d MMM yyyy")} will be removed. Other weeks and Permanent mode are unaffected.` : ""}
        confirmLabel="Delete week"
      />
    </PageShell>
  );
}
