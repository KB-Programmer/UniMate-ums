import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight, Info, Search, X } from "lucide-react";
import { cn } from "../utils/cn";

const BUTTON_VARIANTS = {
  primary: "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm hover:opacity-90 active:opacity-95",
  secondary: "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]",
  soft: "bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-80",
  ghost: "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
  dangerGhost: "bg-[var(--danger-soft)] text-[var(--danger)] hover:opacity-80",
};
const BUTTON_SIZES = {
  xs: "h-7 px-2 text-[11px] gap-1 rounded-lg",
  sm: "h-8 px-2.5 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-xl",
  lg: "h-11 px-5 text-sm gap-2 rounded-xl",
  icon: "h-9 w-9 p-0 rounded-xl",
  iconSm: "h-8 w-8 p-0 rounded-lg",
};

export function Button({ variant = "primary", size = "md", icon: Icon, iconRight: IconRight, className, children, ...props }) {
  return (
    <button
      type={props.type || "button"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className
      )}
      {...props}
    >
      {Icon && <Icon size={size === "lg" ? 17 : 15} strokeWidth={2} aria-hidden="true" />}
      {children}
      {IconRight && <IconRight size={15} strokeWidth={2} aria-hidden="true" />}
    </button>
  );
}

export function SaveStatus({ status, lastSavedAt }) {
  if (!status || status === "idle") return null;
  const config = {
    dirty: { label: "Unsaved changes", dot: "bg-[var(--warning)]" },
    restored: { label: "Draft restored", dot: "bg-[var(--info)]" },
    saving: { label: "Saving...", dot: "bg-[var(--accent)] animate-pulse" },
    saved: { label: "Saved", dot: "bg-[var(--success)]" },
    error: { label: "Save failed", dot: "bg-[var(--danger)]" },
  }[status] || { label: status, dot: "bg-[var(--faint)]" };
  const suffix = status === "saved" && lastSavedAt ? ` · ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "";
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-[var(--muted)]" aria-live="polite">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
      {config.label}{suffix}
    </span>
  );
}

export function IconButton({ label, icon: Icon, variant = "ghost", size = "icon", className, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center transition-colors disabled:opacity-50",
        BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className
      )}
      {...props}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}

export function Card({ className, children, as: Tag = "div", ...props }) {
  return <Tag className={cn("card", className)} {...props}>{children}</Tag>;
}

export function SectionHeading({ title, subtitle, action, icon: Icon, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <Icon size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[14px] font-bold text-[var(--text)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--faint)]">{eyebrow}</p>}
        <h1 className="text-[22px] font-bold leading-tight text-[var(--text)] sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, required, children, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <label htmlFor={htmlFor} className="field-label">
          {label} {required && <span className="text-[var(--danger)]">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[var(--danger)]" role="alert">
          <AlertTriangle size={11} /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-[var(--faint)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, invalid, icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />}
      <input
        className={cn("field-input", Icon && "pl-9", invalid && "border-[var(--danger)]", className)}
        aria-invalid={invalid ? "true" : undefined}
        {...props}
      />
    </div>
  );
}

export function Select({ className, invalid, children, ...props }) {
  return (
    <select className={cn("field-input cursor-pointer appearance-none bg-[var(--surface)] pr-8", invalid && "border-[var(--danger)]", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, invalid, ...props }) {
  return <textarea rows={3} className={cn("field-input resize-y", invalid && "border-[var(--danger)]", className)} {...props} />;
}

export function Badge({ tone = "neutral", children, dot, className }) {
  const tones = {
    neutral: "bg-[var(--surface-2)] text-[var(--muted)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
    info: "bg-[var(--info-soft)] text-[var(--info)]",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold leading-4", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, description, icon: Icon, children, footer, size = "md" }) {
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      const firstInput = panelRef.current?.querySelector("input:not([type=hidden]), select, textarea, button[data-autofocus]");
      firstInput?.focus?.();
    }, 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fadeIn" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={cn("relative z-10 flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-slideUp sm:rounded-2xl", sizes[size])}
        style={{ maxWidth: size === "sm" ? 460 : size === "md" ? 560 : size === "lg" ? 720 : 960 }}
      >
        <header className="flex items-start gap-3 border-b border-[var(--border)] px-5 py-4">
          {Icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon size={18} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-[var(--text)]">{title}</h2>
            {description && <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--faint)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]" aria-label="Close dialog">
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-5 py-3.5">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = "Are you sure?", message, confirmLabel = "Delete", tone = "danger", children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={AlertTriangle}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} data-autofocus>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-[var(--muted)]">{message}</p>
      {children}
    </Modal>
  );
}

export function EmptyState({ icon: Icon, title, description, action, compact }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-7" : "py-12")}>
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--faint)]">
          <Icon size={20} />
        </span>
      )}
      <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, tone = "accent", to, hint, progress }) {
  const tones = {
    accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
    info: "bg-[var(--info-soft)] text-[var(--info)]",
  };
  const Wrapper = to ? Link : "div";
  return (
    <Wrapper
      {...(to ? { to } : {})}
      className={cn(
        "card group block p-4 transition-all",
        to && "hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">{label}</p>
        {Icon && <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", tones[tone])}><Icon size={14} /></span>}
      </div>
      <p className="mt-2.5 font-display text-[26px] font-bold leading-none tracking-tight text-[var(--text)]">{value}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {sub && <p className="truncate text-[11px] text-[var(--muted)]">{sub}</p>}
        {hint && <span className="shrink-0 text-[10.5px] font-semibold text-[var(--accent)]">{hint}</span>}
      </div>
      {typeof progress === "number" && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
    </Wrapper>
  );
}

export function ProgressRing({ value = 0, size = 96, stroke = 8, children, color = "var(--accent)", track = "var(--surface-3)", label }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label || `${clamped}% complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={circumference - (clamped / 100) * circumference}
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value = 0, className, color = "var(--accent)" }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]", className)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[var(--text)]">{label}</p>
        {description && <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--muted)]">{description}</p>}
      </div>
      <button
        type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn("relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]")}
      >
        <span className={cn("absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-all", checked ? "left-[19px]" : "left-[3px]")} />
      </button>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1", className)} role="tablist">
      {tabs.map((tab) => {
        const key = tab.value ?? tab;
        const label = tab.label ?? tab;
        const active = value === key;
        return (
          <button
            key={key} role="tab" aria-selected={active} onClick={() => onChange(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              active ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            {tab.icon && <tab.icon size={13} />}
            {label}
            {tab.count !== undefined && (
              <span className={cn("rounded px-1 py-px text-[10px]", active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface-3)] text-[var(--muted)]")}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className, onClear }) {
  return (
    <div className={cn("relative", className)}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
      <input
        type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="field-input pl-9 pr-8" aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => (onClear ? onClear() : onChange(""))}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--faint)] hover:text-[var(--text)]"
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

export function InfoNote({ children, tone = "info", icon: Icon = Info, className }) {
  const tones = {
    info: "border-[var(--info)]/20 bg-[var(--info-soft)] text-[var(--info)]",
    warning: "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]",
    neutral: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
  };
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[11.5px] leading-relaxed", tones[tone], className)}>
      <Icon size={15} className="mt-px shrink-0" />
      <div className="min-w-0 text-[var(--muted)]">{children}</div>
    </div>
  );
}

export function InlineLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center gap-0.5 font-semibold text-[var(--accent)] hover:underline">
      {children} <ChevronRight size={12} />
    </Link>
  );
}

export function PageShell({ children, className }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] space-y-5", className)}>{children}</div>;
}

export function Divider({ className }) {
  return <div className={cn("h-px w-full bg-[var(--border)]", className)} />;
}

/* Lightweight, safe Markdown renderer (no HTML injection) */
function InlineText({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function Markdown({ content = "", className }) {
  const lines = String(content).split("\n");
  const blocks = [];
  let list = null;
  const flush = () => {
    if (list) { blocks.push(list); list = null; }
  };
  lines.forEach((line, i) => {
    if (/^\s*[-*]\s+/.test(line)) {
      if (!list || list.type !== "ul") { flush(); list = { type: "ul", items: [] }; }
      list.items.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (/^\s*\d+\.\s+/.test(line)) {
      if (!list || list.type !== "ol") { flush(); list = { type: "ol", items: [] }; }
      list.items.push(line.replace(/^\s*\d+\.\s+/, ""));
    } else {
      flush();
      blocks.push({ type: "line", text: line, key: i });
    }
  });
  flush();
  return (
    <div className={cn("markdown", className)}>
      {blocks.map((block, i) => {
        if (block.type === "ul" || block.type === "ol") {
          const Tag = block.type;
          return <Tag key={i}>{block.items.map((item, j) => <li key={j}><InlineText text={item} /></li>)}</Tag>;
        }
        const text = block.text;
        if (!text.trim()) return <div key={i} className="h-2" />;
        if (text.startsWith("### ")) return <h3 key={i}>{text.slice(4)}</h3>;
        if (text.startsWith("## ")) return <h2 key={i}>{text.slice(3)}</h2>;
        if (text.startsWith("# ")) return <h1 key={i}>{text.slice(2)}</h1>;
        if (text.startsWith("> ")) return <blockquote key={i}><InlineText text={text.slice(2)} /></blockquote>;
        if (/^---+$/.test(text.trim())) return <hr key={i} className="my-3 border-[var(--border)]" />;
        return <p key={i}><InlineText text={text} /></p>;
      })}
    </div>
  );
}
