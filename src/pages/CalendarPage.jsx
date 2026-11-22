import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  addDays, addMonths, addWeeks, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, isToday, startOfMonth, startOfWeek, subMonths, subWeeks,
} from "date-fns";
import {
  CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock, Filter, GraduationCap, LayoutGrid,
  List, MapPin, Pencil, Repeat, Rows3, Trash2, Columns3, ClipboardList, Bell,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { Badge, Button, Card, ConfirmDialog, EmptyState, IconButton, InfoNote, Modal, PageHeader, PageShell, SearchInput, Select, Tabs } from "../components/ui";
import { EventForm } from "../components/forms";
import { DataToolsButton } from "../components/ImportExportPanel";
import { CATEGORY_COLORS, EVENT_CATEGORIES, combineDateTime, fmtDate, fmtTime, todayISO } from "../lib/utils";

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 52;

function iso(date) { return format(date, "yyyy-MM-dd"); }

function AcademicFormLink({ item, onDone }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3 text-[11.5px] text-[var(--muted)]">
      <p className="font-semibold text-[var(--text)]">This item is connected to tracked academic work</p>
      <p className="mt-0.5">Edit the assignment or exam to keep the calendar, dashboard and reminders in sync. No duplicate record is created.</p>
      <Button size="sm" className="mt-2" icon={Pencil} onClick={onDone}>Open academic record</Button>
    </div>
  );
}

function EventMeta({ event }) {
  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex items-center gap-2 text-[var(--muted)]"><Clock size={13} className="text-[var(--faint)]" /> {fmtDate(event.date, "EEEE, d MMMM yyyy")} · {fmtTime(event.startTime)} – {fmtTime(event.endTime)}</div>
      {event.location && <div className="flex items-center gap-2 text-[var(--muted)]"><MapPin size={13} className="text-[var(--faint)]" /> {event.location}</div>}
      {event.repeat === "weekly" && <div className="flex items-center gap-2 text-[var(--muted)]"><Repeat size={13} className="text-[var(--faint)]" /> Repeats weekly</div>}
      <div className="flex items-center gap-2 text-[var(--muted)]"><Bell size={13} className="text-[var(--faint)]" /> Reminder saved · browser alerts require permission</div>
    </div>
  );
}

export default function CalendarPage() {
  const { data, deleteItem } = useApp();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState("month");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [defaultDate, setDefaultDate] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [managing, setManaging] = useState(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setDefaultDate(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const weekStartsOn = data.settings.weekStart === "sunday" ? 0 : 1;
  const weekDayLabels = weekStartsOn === 0
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const derived = useMemo(
    () => (data.academicItems || []).map((item) => ({
      id: `academic-${item.id}`, academicId: item.id, derived: true,
      title: item.title, description: item.description, category: item.type === "exam" ? "Exam" : "Assignment",
      date: item.dueDate, startTime: item.dueTime || "23:59", endTime: item.dueTime || "23:59",
      status: item.status, color: item.type === "exam" ? "#EF4444" : "#F59E0B",
      repeat: "none", reminderMinutes: item.reminderMinutes, source: item,
    })),
    [data.academicItems]
  );

  const allEvents = useMemo(() => [...(data.events || []), ...derived], [data.events, derived]);

  const matches = (event) => {
    const q = query.trim().toLowerCase();
    const catOk = category === "All" || event.category === category;
    const queryOk = !q || [event.title, event.description, event.location, event.category].join(" ").toLowerCase().includes(q);
    return catOk && queryOk;
  };

  const occursOn = (event, dateISO) => {
    if (event.repeat === "weekly" && !event.derived) {
      const base = combineDateTime(event.date, "00:00");
      const target = combineDateTime(dateISO, "00:00");
      if (!base || !target) return false;
      return target >= base && target.getDay() === base.getDay();
    }
    return event.date === dateISO;
  };

  const eventsOn = (dateISO) =>
    allEvents
      .filter((event) => matches(event) && occursOn(event, dateISO))
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
      .map((event) => ({ ...event, occurrenceDate: dateISO }));

  const weekStart = startOfWeek(cursor, { weekStartsOn });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = startOfMonth(cursor);
  const monthDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn }),
  });
  const agendaDays = Array.from({ length: 60 }, (_, i) => addDays(new Date(), i));

  const rangeLabel = view === "month"
    ? format(cursor, "MMMM yyyy")
    : view === "week"
      ? `${format(weekDays[0], "d MMM")} – ${format(weekDays[6], "d MMM yyyy")}`
      : view === "day" ? format(cursor, "EEEE, d MMMM yyyy") : "Next 60 days";

  const navigateDate = (dir) => {
    if (view === "month") setCursor(dir > 0 ? addMonths(cursor, 1) : subMonths(cursor, 1));
    else if (view === "week") setCursor(dir > 0 ? addWeeks(cursor, 1) : subWeeks(cursor, 1));
    else setCursor(addDays(cursor, dir));
  };

  const openCreate = (date) => { setEditing(null); setDefaultDate(date || null); setFormOpen(true); };
  const openEdit = (event) => {
    if (event.derived) { setDetail(null); setManaging(event.source); return; }
    setEditing(event); setDetail(null); setFormOpen(true);
  };
  const remove = () => {
    deleteItem("events", deleting.id);
    toast.success("Event deleted", `“${deleting.title}” was removed from your calendar.`);
    setDeleting(null); setDetail(null);
  };

  const visibleCount = useMemo(() => {
    if (view === "month") return monthDays.reduce((sum, day) => sum + eventsOn(iso(day)).length, 0);
    if (view === "week") return weekDays.reduce((sum, day) => sum + eventsOn(iso(day)).length, 0);
    if (view === "day") return eventsOn(iso(cursor)).length;
    return agendaDays.reduce((sum, day) => sum + eventsOn(iso(day)).length, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cursor, allEvents, query, category, monthDays.length, weekDays.length]);

  const eventBlock = (event) => (
    <button
      key={`${event.id}-${event.occurrenceDate}`}
      onClick={() => setDetail(event)}
      className="absolute left-1 right-1 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left shadow-sm transition-transform hover:z-10 hover:scale-[1.02]"
      style={{
        top: Math.max(0, ((Number(event.startTime?.split(":")[0]) * 60 + Number(event.startTime?.split(":")[1] || 0)) - START_HOUR * 60) / 60 * HOUR_HEIGHT),
        height: Math.max(24, ((Number(event.endTime?.split(":")[0]) * 60 + Number(event.endTime?.split(":")[1] || 0) - Number(event.startTime?.split(":")[0]) * 60 - Number(event.startTime?.split(":")[1] || 0)) / 60) * HOUR_HEIGHT),
        background: `${event.color || CATEGORY_COLORS[event.category] || "#6366F1"}18`,
        borderColor: event.color || CATEGORY_COLORS[event.category] || "#6366F1",
      }}
    >
      <p className="truncate text-[9.5px] font-bold text-[var(--text)]">{event.title}</p>
      <p className="truncate text-[8.5px] text-[var(--muted)]">{fmtTime(event.startTime)}</p>
    </button>
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Semester planning"
        title="Calendar"
        description="Classes, deadlines, meetings and focus time across your semester. Assignments and exams appear here from one shared record."
        actions={<><DataToolsButton moduleKey="events" /><Button icon={CalendarPlus} onClick={() => openCreate()}>New event</Button></>}
      />

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-1.5">
            <IconButton label="Previous period" icon={ChevronLeft} variant="secondary" size="iconSm" onClick={() => navigateDate(-1)} />
            <Button size="sm" variant="secondary" onClick={() => setCursor(new Date())}>Today</Button>
            <IconButton label="Next period" icon={ChevronRight} variant="secondary" size="iconSm" onClick={() => navigateDate(1)} />
            <div className="ml-1 min-w-0">
              <p className="truncate text-[13px] font-bold text-[var(--text)]">{rangeLabel}</p>
              <p className="text-[10px] text-[var(--faint)]">{visibleCount} event{visibleCount === 1 ? "" : "s"} in view{category !== "All" ? ` · ${category}` : ""}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search events…" className="w-full sm:w-44" />
            <div className="relative">
              <Filter size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-[140px] pl-7 text-[11px]" aria-label="Filter by category">
                <option>All</option>
                {EVENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <Tabs
              value={view} onChange={setView}
              tabs={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }, { value: "day", label: "Day" }, { value: "agenda", label: "Agenda" }]}
            />
          </div>
        </div>
      </Card>

      {view === "month" && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-2)]/50">
            {weekDayLabels.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--faint)]">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day, i) => {
              const dayEvents = eventsOn(iso(day));
              const inMonth = isSameMonth(day, cursor);
              const today = isToday(day);
              return (
                <div
                  key={iso(day)}
                  className={`group relative min-h-[92px] border-b border-r border-[var(--border)] p-1.5 sm:min-h-[108px] ${!inMonth ? "bg-[var(--surface-2)]/40" : ""} ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <button
                      onClick={() => { setCursor(day); setView("day"); }}
                      className={`flex h-5.5 w-5.5 items-center justify-center rounded-full text-[11px] font-semibold ${today ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : inMonth ? "text-[var(--text)] hover:bg-[var(--surface-2)]" : "text-[var(--faint)]"}`}
                      aria-label={`View ${format(day, "d MMMM yyyy")}`}
                    >
                      {format(day, "d")}
                    </button>
                    <button onClick={() => openCreate(iso(day))} className="hidden rounded p-0.5 text-[var(--faint)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)] group-hover:block" aria-label={`Add event on ${format(day, "d MMMM")}`}>
                      <CalendarPlus size={12} />
                    </button>
                  </div>
                  <div className="space-y-[3px]">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={`${event.id}-${event.occurrenceDate}`}
                        onClick={() => setDetail(event)}
                        className="flex w-full items-center gap-1 overflow-hidden rounded px-1 py-[3px] text-left transition-opacity hover:opacity-80"
                        style={{ background: `${event.color || "#6366F1"}16` }}
                        title={`${event.title} · ${fmtTime(event.startTime)}`}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: event.color || "#6366F1" }} />
                        <span className="truncate text-[9.5px] font-semibold text-[var(--text)]">{event.title}</span>
                        {event.derived && <ClipboardList size={8} className="ml-auto shrink-0 text-[var(--faint)]" />}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <button onClick={() => { setCursor(day); setView("day"); }} className="w-full rounded px-1 text-left text-[9px] font-semibold text-[var(--accent)] hover:underline">+{dayEvents.length - 3} more</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === "week" && (
        <Card className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b border-[var(--border)]">
              <div className="border-r border-[var(--border)] bg-[var(--surface-2)]/50" />
              {weekDays.map((day) => (
                <div key={iso(day)} className={`border-r border-[var(--border)] px-2 py-2 text-center last:border-r-0 ${isToday(day) ? "bg-[var(--accent-soft)]" : "bg-[var(--surface-2)]/30"}`}>
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-[var(--faint)]">{format(day, "EEE")}</p>
                  <button onClick={() => { setCursor(day); setView("day"); }} className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-bold ${isToday(day) ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[var(--text)] hover:bg-[var(--surface-3)]"}`}>{format(day, "d")}</button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[52px_repeat(7,1fr)]">
              <div className="border-r border-[var(--border)]">
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                  <div key={i} className="relative border-b border-[var(--border)]/60 text-right" style={{ height: HOUR_HEIGHT }}>
                    <span className="absolute -top-1.5 right-1.5 text-[9px] font-medium text-[var(--faint)]">{String(START_HOUR + i).padStart(2, "0")}:00</span>
                  </div>
                ))}
              </div>
              {weekDays.map((day) => (
                <div key={iso(day)} className={`relative border-r border-[var(--border)] last:border-r-0 ${isToday(day) ? "bg-[var(--accent-soft)]/30" : ""}`} style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
                  {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-b border-[var(--border)]/50" style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
                  ))}
                  {eventsOn(iso(day)).map((event) => eventBlock(event))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {view === "day" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="p-4 xl:col-span-8">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--faint)]">{format(cursor, "EEEE")}</p>
                <h2 className="font-display text-[19px] font-bold text-[var(--text)]">{format(cursor, "d MMMM yyyy")}</h2>
              </div>
              <Button size="sm" icon={CalendarPlus} onClick={() => openCreate(iso(cursor))}>Add event</Button>
            </div>
            <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <div key={i} className="absolute left-0 right-0 flex border-b border-[var(--border)]/60" style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                  <span className="w-12 shrink-0 pt-0.5 text-right text-[9.5px] font-medium text-[var(--faint)]">{String(START_HOUR + i).padStart(2, "0")}:00</span>
                  <div className="relative ml-1 flex-1" />
                </div>
              ))}
              <div className="absolute inset-y-0 left-[52px] right-0">
                {eventsOn(iso(cursor)).map((event) => (
                  <button
                    key={`${event.id}-${event.occurrenceDate}`}
                    onClick={() => setDetail(event)}
                    className="absolute left-1 right-1 overflow-hidden rounded-lg border-l-[3px] px-2.5 py-1.5 text-left shadow-sm transition-transform hover:scale-[1.005]"
                    style={{
                      top: Math.max(0, ((Number(event.startTime?.split(":")[0]) * 60 + Number(event.startTime?.split(":")[1] || 0)) - START_HOUR * 60) / 60 * HOUR_HEIGHT),
                      height: Math.max(30, ((Number(event.endTime?.split(":")[0]) * 60 + Number(event.endTime?.split(":")[1] || 0) - Number(event.startTime?.split(":")[0]) * 60 - Number(event.startTime?.split(":")[1] || 0)) / 60) * HOUR_HEIGHT),
                      background: `${event.color || "#6366F1"}14`, borderColor: event.color || "#6366F1",
                    }}
                  >
                    <p className="truncate text-[11px] font-bold text-[var(--text)]">{event.title}</p>
                    <p className="truncate text-[9.5px] text-[var(--muted)]">{fmtTime(event.startTime)} – {fmtTime(event.endTime)} {event.location ? `· ${event.location}` : ""}</p>
                  </button>
                ))}
              </div>
            </div>
          </Card>
          <div className="space-y-3 xl:col-span-4">
            <Card className="p-4">
              <h3 className="text-[12px] font-bold text-[var(--text)]">Day overview</h3>
              <div className="mt-2.5 divide-y divide-[var(--border)]">
                {eventsOn(iso(cursor)).length ? eventsOn(iso(cursor)).map((event) => (
                  <button key={`${event.id}-${event.occurrenceDate}`} onClick={() => setDetail(event)} className="flex w-full items-start gap-2.5 py-2 text-left">
                    <span className="mt-0.5 h-8 w-1 shrink-0 rounded-full" style={{ background: event.color || "#6366F1" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-semibold text-[var(--text)]">{event.title}</span>
                      <span className="block text-[10px] text-[var(--faint)]">{fmtTime(event.startTime)} · {event.category}</span>
                    </span>
                    {event.derived && <Badge tone="warning">Tracked</Badge>}
                  </button>
                )) : <EmptyState compact icon={CalendarDays} title="No events this day" description="Add an event or choose another date." action={<Button size="sm" variant="secondary" onClick={() => openCreate(iso(cursor))}>Add event</Button>} />}
              </div>
            </Card>
            <InfoNote tone="neutral">
              Academic deadlines are pulled automatically from Assignments &amp; Exams. Editing them here opens the original record, so nothing is duplicated.
            </InfoNote>
          </div>
        </div>
      )}

      {view === "agenda" && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--faint)]">Agenda</p>
              <h2 className="font-display text-[18px] font-bold text-[var(--text)]">The next 60 days</h2>
            </div>
            <Button size="sm" icon={CalendarPlus} onClick={() => openCreate()}>New event</Button>
          </div>
          <div className="mt-4 space-y-5">
            {agendaDays.map((day) => {
              const dayEvents = eventsOn(iso(day));
              if (!dayEvents.length) return null;
              return (
                <div key={iso(day)} className="grid gap-2 sm:grid-cols-[120px_1fr]">
                  <div className="flex items-baseline gap-2 sm:block">
                    <p className={`text-[12px] font-bold ${isToday(day) ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{isToday(day) ? "Today" : format(day, "EEEE")}</p>
                    <p className="text-[10.5px] text-[var(--faint)]">{format(day, "d MMMM yyyy")}</p>
                  </div>
                  <div className="space-y-1.5">
                    {dayEvents.map((event) => (
                      <button key={`${event.id}-${event.occurrenceDate}`} onClick={() => setDetail(event)} className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--border)] p-2.5 text-left transition-colors hover:bg-[var(--surface-2)]">
                        <span className="w-[72px] shrink-0 text-[10px] font-semibold text-[var(--muted)]">{fmtTime(event.startTime)}</span>
                        <span className="h-7 w-[3px] shrink-0 rounded-full" style={{ background: event.color || "#6366F1" }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold text-[var(--text)]">{event.title}</span>
                          <span className="block truncate text-[10px] text-[var(--faint)]">{event.category}{event.location ? ` · ${event.location}` : ""}</span>
                        </span>
                        {event.derived ? <Badge tone="warning">Academic</Badge> : <Badge tone="neutral">{event.category}</Badge>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {agendaDays.every((day) => !eventsOn(iso(day)).length) && (
              <EmptyState icon={CalendarDays} title={query || category !== "All" ? "No events match your filters" : "Your agenda is clear"} description={query || category !== "All" ? "Try a different keyword or category." : "Add an event to start planning the next two months."} action={(query || category !== "All") ? <Button size="sm" variant="secondary" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</Button> : <Button size="sm" onClick={() => openCreate()}>Add event</Button>} />
            )}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10.5px] text-[var(--faint)]">
        <span className="font-semibold text-[var(--muted)]">Legend</span>
        {EVENT_CATEGORIES.map((cat) => (
          <span key={cat} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />{cat}</span>
        ))}
        <span className="ml-auto flex items-center gap-1"><ClipboardList size={10} /> Assignment / exam deadline</span>
      </div>

      <EventForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} defaultDate={defaultDate} />

      <Modal
        open={!!detail} onClose={() => setDetail(null)} title={detail?.title || "Event"} size="sm"
        icon={detail?.category === "Exam" ? GraduationCap : CalendarDays}
        description={detail?.derived ? "Connected academic deadline" : "Calendar event"}
        footer={detail && (
          <>
            {!detail.derived && <Button variant="dangerGhost" size="sm" icon={Trash2} onClick={() => setDeleting(detail)}>Delete</Button>}
            <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(detail)}>{detail.derived ? "Manage" : "Edit event"}</Button>
            <Button size="sm" onClick={() => setDetail(null)}>Close</Button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={detail.derived ? "warning" : "accent"} dot>{detail.derived ? "Academic deadline" : detail.category}</Badge>
              {detail.status && <Badge tone="neutral">{detail.status}</Badge>}
              {detail.repeat === "weekly" && <Badge tone="info">Weekly</Badge>}
            </div>
            <EventMeta event={detail} />
            {detail.description && <p className="rounded-xl bg-[var(--surface-2)]/60 p-3 text-[12px] leading-relaxed text-[var(--muted)]">{detail.description}</p>}
            {detail.derived && <AcademicFormLink item={detail} onDone={() => { setManaging(detail.source); setDetail(null); }} />}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove}
        title="Delete this event?" message={deleting ? `“${deleting.title}” will be removed from your calendar. This cannot be undone.` : ""} confirmLabel="Delete event"
      />

      <CalendarManageNotice managing={managing} onClose={() => setManaging(null)} />
    </PageShell>
  );
}

/* Lightweight bridge to the academic editor without importing an extra page-level form twice */
function CalendarManageNotice({ managing, onClose }) {
  if (!managing) return null;
  return (
    <Modal
      open={!!managing} onClose={onClose} title="Manage academic record" size="sm" icon={ClipboardList}
      description="Change status, due date or details in the assignment & exam tracker."
      footer={<Button size="sm" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-2.5 text-[12px] text-[var(--muted)]">
        <p className="font-semibold text-[var(--text)]">{managing.title}</p>
        <p>{managing.course} · due {fmtDate(managing.dueDate)} at {fmtTime(managing.dueTime)}</p>
        <p>Open <a href={managing.type === "exam" ? "#/exams" : "#/assignments"} className="font-semibold text-[var(--accent)] hover:underline">{managing.type === "exam" ? "Exams" : "Assignments"}</a> to edit or delete this record. The calendar updates automatically and no duplicate events are created.</p>
      </div>
    </Modal>
  );
}
