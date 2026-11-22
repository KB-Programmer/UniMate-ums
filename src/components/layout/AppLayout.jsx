import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Grid3x3, CheckSquare, BookOpenCheck, Timer, GraduationCap,
  NotebookPen, Bell, Settings, ChevronLeft, ChevronRight, Menu, Search, Plus, X,
  HardDrive, Command, ArrowUpRight, Sparkles, ListTodo, CalendarPlus, School, ClipboardList, StickyNote,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { cn } from "../../utils/cn";
import { fmtDate, fmtTime, statusTone } from "../../lib/utils";
import { Badge, Button, IconButton, ProgressBar } from "../ui";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Planning",
    items: [
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/timetable", label: "Timetable", icon: Grid3x3 },
    ],
  },
  {
    label: "Academic",
    items: [
      { to: "/tasks", label: "Tasks", icon: CheckSquare },
      { to: "/study", label: "Study Planner", icon: BookOpenCheck },
      { to: "/pomodoro", label: "Pomodoro", icon: Timer },
      { to: "/assignments", label: "Assignments", icon: ClipboardList },
      { to: "/exams", label: "Exams", icon: GraduationCap },
      { to: "/academic", label: "Academic overview", short: "Overview", icon: GraduationCap },
      { to: "/notes", label: "Notes", icon: NotebookPen },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const PAGE_META = {
  "/": { label: "Dashboard", title: "Your academic workspace" },
  "/calendar": { label: "Calendar", title: "Plan your semester" },
  "/timetable": { label: "Timetable", title: "Weekly class schedule" },
  "/tasks": { label: "Tasks", title: "Stay on top of your work" },
  "/study": { label: "Study Planner", title: "Study with intention" },
  "/pomodoro": { label: "Pomodoro", title: "Focus timer" },
  "/academic": { label: "Academic overview", title: "Assignments and exams together" },
  "/assignments": { label: "Assignments", title: "Deadlines, grades and priorities" },
  "/exams": { label: "Exams", title: "Dates, venues and preparation" },
  "/notes": { label: "Notes", title: "Your knowledge base" },
  "/notifications": { label: "Notifications", title: "Reminders and updates" },
  "/settings": { label: "Settings", title: "Preferences and data" },
};

function Brand({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm">
        <GraduationCap size={19} strokeWidth={2.1} />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="font-display text-[17px] font-extrabold leading-none tracking-tight text-[var(--sidebar-text)]">UniMate</p>
          <p className="mt-1 truncate text-[10px] font-medium tracking-[0.02em] text-[var(--sidebar-muted)]">Your student workspace</p>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ collapsed, onNavigate, unreadCount, storage, storageMode }) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-[62px] shrink-0 items-center border-b border-[var(--border)]", collapsed ? "justify-center px-2" : "px-4")}>
        <Brand collapsed={collapsed} />
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 py-4" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            {!collapsed && <p className="mb-1.5 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.15em] text-[var(--faint)]">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  title={collapsed ? item.short || item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center rounded-lg text-[12.5px] font-medium transition-colors",
                      collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-[7.5px]",
                      isActive
                        ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                        : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {!collapsed && isActive && <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />}
                      <item.icon size={16} strokeWidth={isActive ? 2.2 : 1.9} className="shrink-0" />
                      {!collapsed && <span className="flex-1 truncate">{item.short || item.label}</span>}
                      {!collapsed && item.to === "/notifications" && unreadCount > 0 && (
                        <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9.5px] font-bold text-[var(--accent-contrast)]">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                      {collapsed && item.to === "/notifications" && unreadCount > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-[var(--border)] p-2.5">
        {collapsed ? (
          <NavLink to="/settings" title="Storage & backups" className="flex h-9 w-full items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]">
            <HardDrive size={16} />
          </NavLink>
        ) : (
          <NavLink to="/settings" className="block rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-3 transition-colors hover:bg-[var(--surface-2)]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                <HardDrive size={12} /> {storageMode === "hybrid" ? "Hybrid storage" : "Local storage"}
              </span>
              <span className="text-[10px] font-semibold text-[var(--muted)]">{storage.percent}%</span>
            </div>
            <ProgressBar value={storage.percent} className="mt-2 h-1" color={storage.percent > 85 ? "var(--danger)" : "var(--accent)"} />
            <p className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--faint)]">
              <span>{storage.label} used</span>
              <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--accent)]">Backup <ArrowUpRight size={10} /></span>
            </p>
          </NavLink>
        )}
      </div>
    </div>
  );
}

function QuickAdd({ open, onClose }) {
  const navigate = useNavigate();
  const actions = [
    { label: "New task", hint: "Track something to do", icon: ListTodo, to: "/tasks?new=1" },
    { label: "New event", hint: "Add to your calendar", icon: CalendarPlus, to: "/calendar?new=1" },
    { label: "Add class", hint: "Update your timetable", icon: School, to: "/timetable?new=1" },
    { label: "Study session", hint: "Plan focused study", icon: BookOpenCheck, to: "/study?new=1" },
    { label: "New assignment", hint: "Track a submission", icon: ClipboardList, to: "/assignments?new=1" },
    { label: "New exam", hint: "Track an assessment", icon: GraduationCap, to: "/exams?new=1" },
    { label: "New note", hint: "Capture an idea", icon: StickyNote, to: "/notes?new=1" },
  ];
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,320px)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl animate-slideUp">
        <p className="px-2.5 pb-1.5 pt-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[var(--faint)]">Quick add</p>
        {actions.map((action) => (
          <button
            key={action.to}
            onClick={() => { onClose(); navigate(action.to); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><action.icon size={14} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold text-[var(--text)]">{action.label}</span>
              <span className="block truncate text-[10.5px] text-[var(--faint)]">{action.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function useGlobalResults(query) {
  const { data } = useApp();
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    const push = (type, route, item, title, subtitle, meta, tone) =>
      results.push({ id: `${type}-${item.id}`, type, route, title, subtitle, meta, tone });
    (data.tasks || []).filter((t) => [t.title, t.course, (t.tags || []).join(" ")].join(" ").toLowerCase().includes(q))
      .forEach((t) => push("Task", "/tasks", t, t.title, t.course || "No course", t.status, statusTone(t.status)));
    (data.events || []).filter((e) => [e.title, e.location, e.category].join(" ").toLowerCase().includes(q))
      .forEach((e) => push("Event", "/calendar", e, e.title, `${fmtDate(e.date)} · ${fmtTime(e.startTime)}`, e.category, "info"));
    (data.timetable || []).filter((c) => [c.courseName, c.courseCode, c.lecturer].join(" ").toLowerCase().includes(q))
      .forEach((c) => push("Class", "/timetable", c, `${c.courseCode} · ${c.courseName}`, `${c.day} · ${fmtTime(c.startTime)}`, c.classroom, "accent"));
    (data.assignments || []).filter((a) => [a.title, a.course].join(" ").toLowerCase().includes(q))
      .forEach((a) => push("Assignment", "/assignments", a, a.title, a.course, fmtDate(a.dueDate), statusTone(a.status)));
    (data.exams || []).filter((e) => [e.title, e.course].join(" ").toLowerCase().includes(q))
      .forEach((e) => push("Exam", "/exams", e, e.title, e.course, fmtDate(e.examDate || e.dueDate), statusTone(e.status)));
    (data.notes || []).filter((n) => [n.title, n.content, n.course, (n.tags || []).join(" ")].join(" ").toLowerCase().includes(q))
      .forEach((n) => push("Note", "/notes", n, n.title, n.course || "Unfiled", n.category, "warning"));
    return results.slice(0, 20);
  }, [data, query]);
}

function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useGlobalResults(query);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  const go = useCallback((result) => {
    if (!result) return;
    onClose();
    navigate(result.route);
  }, [navigate, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Search UniMate">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fadeIn" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-slideUp">
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4">
          <Search size={17} className="text-[var(--faint)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search tasks, classes, events, notes…"
            className="h-12 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
            aria-label="Global search"
          />
          <button onClick={onClose} className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--faint)] hover:text-[var(--text)]">ESC</button>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {!query && (
            <div className="px-3 py-8 text-center">
              <Search size={22} className="mx-auto mb-2 text-[var(--faint)]" />
              <p className="text-[13px] font-semibold text-[var(--text)]">Search your entire workspace</p>
              <p className="mt-1 text-[11.5px] text-[var(--muted)]">Find tasks, events, classes, assignments, exams and notes from one place.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {["Database", "Exam", "Study", "Note"].map((s) => (
                  <button key={s} onClick={() => setQuery(s)} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[10.5px] font-medium text-[var(--muted)] hover:text-[var(--text)]">{s}</button>
                ))}
              </div>
            </div>
          )}
          {query && !results.length && (
            <div className="px-3 py-8 text-center">
              <p className="text-[13px] font-semibold text-[var(--text)]">No matches for “{query}”</p>
              <p className="mt-1 text-[11.5px] text-[var(--muted)]">Try a course code, title, tag or keyword. Clear the search to browse tips.</p>
            </div>
          )}
          {results.map((result, index) => (
            <button
              key={result.id}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(result)}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left", index === active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-2)]")}
            >
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold", index === active ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--surface-3)] text-[var(--muted)]")}>
                {result.type.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-[var(--text)]">{result.title}</span>
                <span className="block truncate text-[10.5px] text-[var(--faint)]">{result.subtitle}</span>
              </span>
              <Badge tone={result.tone}>{result.type}</Badge>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-2 text-[10px] text-[var(--faint)]">
          <span className="flex items-center gap-2"><span><kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1">↑</kbd> <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1">↓</kbd> navigate</span><span><kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1">↵</kbd> open</span></span>
          <span className="inline-flex items-center gap-1"><Command size={10} /> K to open search</span>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { unreadCount, storage, storageMode } = useApp();
  const [collapsed, setCollapsed] = useState(() => {
    try { return window.localStorage.getItem("unimate_sidebar_collapsed") === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const meta = PAGE_META[location.pathname] || { label: "UniMate", title: "" };

  useEffect(() => {
    try { window.localStorage.setItem("unimate_sidebar_collapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

  useEffect(() => { setMobileOpen(false); setQuickOpen(false); }, [location.pathname, location.search]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <a href="#main-content" className="fixed left-3 top-3 z-[80] -translate-y-20 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-contrast)] focus:translate-y-0">Skip to content</a>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-[var(--border)] bg-[var(--sidebar)] transition-[width] duration-200 lg:block",
          collapsed ? "w-[68px]" : "w-[244px]"
        )}
      >
        <SidebarContent collapsed={collapsed} unreadCount={unreadCount} storage={storage} storageMode={storageMode} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[74px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] shadow-sm hover:text-[var(--text)]"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fadeIn" onClick={() => setMobileOpen(false)} />
          <div className="relative flex h-full w-[278px] flex-col border-r border-[var(--border)] bg-[var(--sidebar)] shadow-2xl animate-[slideIn_.2s_ease-out]">
            <button onClick={() => setMobileOpen(false)} className="absolute right-2.5 top-4 z-10 rounded-lg p-1.5 text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)]" aria-label="Close navigation">
              <X size={17} />
            </button>
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} unreadCount={unreadCount} storage={storage} storageMode={storageMode} />
          </div>
        </div>
      )}

      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-200", collapsed ? "lg:pl-[68px]" : "lg:pl-[244px]")}>
        <header className="sticky top-0 z-30 flex h-[62px] shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)]/90 px-3 backdrop-blur-md sm:px-5">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] lg:hidden" aria-label="Open navigation menu">
            <Menu size={19} />
          </button>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="hidden text-[11px] font-medium text-[var(--faint)] sm:inline">UniMate</span>
            <ChevronRight size={12} className="hidden shrink-0 text-[var(--faint)] sm:inline" />
            <h1 className="truncate text-[13px] font-bold text-[var(--text)]">{meta.label}</h1>
            <span className="ml-1 hidden truncate text-[11px] text-[var(--faint)] xl:inline">— {meta.title}</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden h-8 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/70 px-2.5 text-[11px] text-[var(--faint)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--muted)] sm:flex md:w-52"
              aria-label="Open global search"
            >
              <Search size={13} />
              <span className="flex-1 text-left">Search workspace…</span>
              <span className="flex items-center gap-0.5 rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 text-[9px] font-semibold"><Command size={8} />K</span>
            </button>
            <button onClick={() => setSearchOpen(true)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] sm:hidden" aria-label="Search">
              <Search size={18} />
            </button>
            <div className="relative">
              <button onClick={() => setQuickOpen((q) => !q)} className="hidden h-8 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-[11.5px] font-semibold text-[var(--accent-contrast)] shadow-sm hover:opacity-90 sm:inline-flex" aria-haspopup="menu" aria-expanded={quickOpen}>
                <Plus size={14} /> Quick add
              </button>
              <button onClick={() => setQuickOpen((q) => !q)} className="rounded-lg bg-[var(--accent)] p-2 text-[var(--accent-contrast)] sm:hidden" aria-label="Quick add">
                <Plus size={18} />
              </button>
              <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
            </div>
            <button
              onClick={() => navigate("/notifications")}
              className="relative rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[8.5px] font-bold text-[var(--accent-contrast)] ring-2 ring-[var(--surface)]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <div className="ml-0.5 hidden h-7 w-px bg-[var(--border)] sm:block" />
            <NavLink to="/settings" className="hidden items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--text)] sm:flex" title="Appearance settings">
              <Sparkles size={13} className="text-[var(--accent)]" />
              <span className="hidden xl:inline">Workspace</span>
            </NavLink>
          </div>
        </header>

        <main id="main-content" className="flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
          <Outlet />
        </main>
        <footer className="mt-auto border-t border-[var(--border)] px-5 py-3 text-[10px] text-[var(--faint)]">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
            <span><span className="font-semibold text-[var(--muted)]">UniMate v1.0</span> · Local-first student workspace. Data stays in this browser.</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> Saved automatically</span>
          </div>
        </footer>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
