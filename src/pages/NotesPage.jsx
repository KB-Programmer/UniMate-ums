import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  FileText,
  FolderOpen,
  Pencil,
  Pin,
  PinOff,
  Plus,
  SearchX,
  Tag,
  Trash2,
  NotebookPen,
  Copy,
  Check,
  BookMarked,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  InfoNote,
  Markdown,
  Modal,
  PageHeader,
  PageShell,
  SearchInput,
  Select,
  StatCard,
} from "../components/ui";
import { NoteForm } from "../components/forms";
import { DataToolsButton } from "../components/ImportExportPanel";
import { formatDistanceToNow } from "date-fns";
import { downloadText, fmtDate } from "../lib/utils";

export default function NotesPage() {
  const { data, updateItem, deleteItem } = useApp();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("All");
  const [category, setCategory] = useState("All");
  const [tagFilter, setTagFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [reading, setReading] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [copied, setCopied] = useState(false);
  const notes = data.notes || [];

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const courses = useMemo(
    () =>
      Array.from(new Set(notes.map((n) => n.course).filter(Boolean))).sort(),
    [notes],
  );
  const categories = useMemo(
    () =>
      Array.from(new Set(notes.map((n) => n.category).filter(Boolean))).sort(),
    [notes],
  );
  const tags = useMemo(
    () =>
      Array.from(new Set(notes.flatMap((n) => n.tags || [])))
        .sort()
        .slice(0, 12),
    [notes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = notes.filter((note) => {
      const queryOk =
        !q ||
        [
          note.title,
          note.content,
          note.course,
          (note.tags || []).join(" "),
          note.category,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const courseOk = course === "All" || note.course === course;
      const categoryOk = category === "All" || note.category === category;
      const tagOk = !tagFilter || (note.tags || []).includes(tagFilter);
      return queryOk && courseOk && categoryOk && tagOk;
    });
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
  }, [notes, query, course, category, tagFilter]);

  const activeFilters =
    (query ? 1 : 0) +
    (course !== "All" ? 1 : 0) +
    (category !== "All" ? 1 : 0) +
    (tagFilter ? 1 : 0);

  const togglePin = (note) => {
    updateItem("notes", note.id, { pinned: !note.pinned });
    toast.success(
      note.pinned ? "Note unpinned" : "Note pinned",
      `“${note.title}” ${note.pinned ? "removed from" : "moved to"} the top of your list.`,
    );
  };
  const exportNote = (note) => {
    const content = `# ${note.title}\n\n**Course:** ${note.course || "Unfiled"}  \n**Category:** ${note.category || "General"}  \n**Tags:** ${(note.tags || []).join(", ") || "—"}  \n**Updated:** ${fmtDate(note.updatedAt)}\n\n---\n\n${note.content}\n`;
    const safe =
      note.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "note";
    downloadText(content, `${safe}.md`, "text/markdown;charset=utf-8");
    toast.success(
      "Note exported",
      "The note was downloaded as a Markdown file.",
    );
  };
  const copyNote = async (note) => {
    try {
      await navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
      setCopied(true);
      toast.success("Note copied", "Markdown content is on your clipboard.");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(
        "Copy failed",
        "Your browser blocked clipboard access. You can still export the note.",
      );
    }
  };
  const remove = () => {
    deleteItem("notes", deleting.id);
    toast.success("Note deleted", `“${deleting.title}” was removed.`);
    setDeleting(null);
    setReading(null);
  };
  const resetFilters = () => {
    setQuery("");
    setCourse("All");
    setCategory("All");
    setTagFilter("");
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Personal knowledge base"
        title="Notes"
        description="Capture lecture insights, summaries and study plans. Autosave keeps existing notes safe while you write."
        actions={
          <>
            <DataToolsButton moduleKey="notes" />
            <Button
              icon={Plus}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New note
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total notes"
          value={notes.length}
          sub={`${notes.filter((n) => n.pinned).length} pinned`}
          icon={NotebookPen}
          tone="accent"
        />
        <StatCard
          label="Courses covered"
          value={courses.filter((c) => c !== "Personal").length}
          sub="Across your semester"
          icon={BookMarked}
          tone="info"
        />
        <StatCard
          label="Categories"
          value={categories.length}
          sub={categories.slice(0, 2).join(", ") || "None yet"}
          icon={FolderOpen}
          tone="warning"
        />
        <StatCard
          label="Tags"
          value={new Set(notes.flatMap((n) => n.tags || [])).size}
          sub="Cross-linking ideas"
          icon={Tag}
          tone="success"
        />
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search titles, content and tags…"
              className="w-full sm:w-72"
            />
            <Select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="h-8 w-auto max-w-[220px] py-1 text-[11px]"
              aria-label="Filter by course"
            >
              <option value="All">All courses</option>
              {courses.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 w-auto py-1 text-[11px]"
              aria-label="Filter by category"
            >
              <option value="All">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            {activeFilters > 0 && (
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                Clear ({activeFilters})
              </Button>
            )}
            <span className="ml-auto text-[10.5px] text-[var(--faint)]">
              {filtered.length} of {notes.length} notes
            </span>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9.5px] font-bold uppercase tracking-wide text-[var(--faint)]">
                Tags
              </span>
              <button
                onClick={() => setTagFilter("")}
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${!tagFilter ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]"}`}
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag === tagFilter ? "" : tag)}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${tagFilter === tag ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]"}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={notes.length ? SearchX : FileText}
            title={
              notes.length
                ? "No notes match these filters"
                : "Start your academic knowledge base"
            }
            description={
              notes.length
                ? "Clear the filters or search for a different keyword."
                : "Write a lecture summary, capture a formula sheet or plan an essay. Notes support Markdown and autosave."
            }
            action={
              <Button
                size="sm"
                icon={notes.length ? undefined : Plus}
                onClick={notes.length ? resetFilters : () => setFormOpen(true)}
              >
                {notes.length ? "Clear filters" : "Write your first note"}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <Card
              key={note.id}
              className="group flex flex-col p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                    <FileText size={13} />
                  </span>
                  <button
                    onClick={() => setReading(note)}
                    className="min-w-0 text-left"
                  >
                    <p className="line-clamp-2 text-[12.5px] font-bold leading-snug text-[var(--text)] group-hover:text-[var(--accent)]">
                      {note.title}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--faint)]">
                      {note.course || "Unfiled"}
                      {note.category ? ` · ${note.category}` : ""}
                    </p>
                  </button>
                </div>
                <button
                  onClick={() => togglePin(note)}
                  className={`rounded-md p-1 ${note.pinned ? "text-[var(--accent)]" : "text-[var(--faint)] opacity-0 hover:text-[var(--text)] group-hover:opacity-100"}`}
                  aria-label={
                    note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`
                  }
                  title={note.pinned ? "Unpin note" : "Pin note"}
                >
                  {note.pinned ? (
                    <Pin size={13} fill="currentColor" />
                  ) : (
                    <Pin size={13} />
                  )}
                </button>
              </div>
              <button
                onClick={() => setReading(note)}
                className="mt-2.5 flex-1 text-left"
              >
                <p className="line-clamp-3 whitespace-pre-line text-[11px] leading-relaxed text-[var(--muted)]">
                  {note.content.replace(/[#*`>]/g, "").slice(0, 190)}
                </p>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                {(note.tags || []).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--muted)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5">
                <span className="truncate text-[9.5px] text-[var(--faint)]">
                  Updated{" "}
                  {note.updatedAt
                    ? formatDistanceToNow(new Date(note.updatedAt), {
                        addSuffix: true,
                      })
                    : "recently"}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    icon={Download}
                    label={`Export ${note.title}`}
                    size="iconSm"
                    onClick={() => exportNote(note)}
                  />
                  <IconButton
                    icon={Pencil}
                    label={`Edit ${note.title}`}
                    size="iconSm"
                    onClick={() => {
                      setEditing(note);
                      setFormOpen(true);
                    }}
                  />
                  <IconButton
                    icon={Trash2}
                    label={`Delete ${note.title}`}
                    size="iconSm"
                    className="hover:text-[var(--danger)]"
                    onClick={() => setDeleting(note)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <InfoNote tone="neutral" icon={NotebookPen}>
        Notes are stored in this browser's local storage. Export important notes
        or create a full backup in Settings before clearing browser data.
      </InfoNote>

      <NoteForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        defaultCourse={course !== "All" ? course : ""}
      />

      <Modal
        open={!!reading}
        onClose={() => setReading(null)}
        size="lg"
        icon={FileText}
        title={reading?.title || "Note"}
        description={
          reading
            ? `${reading.course || "Unfiled"} · ${reading.category || "General"} · updated ${fmtDate(reading.updatedAt)}`
            : ""
        }
        footer={
          reading && (
            <>
              <Button
                size="sm"
                variant="ghost"
                icon={copied ? Check : Copy}
                onClick={() => copyNote(reading)}
              >
                Copy
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={() => exportNote(reading)}
              >
                Export .md
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={Pencil}
                onClick={() => {
                  setEditing(reading);
                  setReading(null);
                  setFormOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="dangerGhost"
                icon={Trash2}
                onClick={() => setDeleting(reading)}
              >
                Delete
              </Button>
            </>
          )
        }
      >
        {reading && (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {reading.pinned && (
                <Badge tone="accent">
                  <Pin size={9} /> Pinned
                </Badge>
              )}
              {(reading.tags || []).map((tag) => (
                <Badge key={tag} tone="neutral">
                  #{tag}
                </Badge>
              ))}
            </div>
            <Markdown content={reading.content} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete this note?"
        message={
          deleting
            ? `“${deleting.title}” will be permanently removed from your notes.`
            : ""
        }
        confirmLabel="Delete note"
      />
    </PageShell>
  );
}
