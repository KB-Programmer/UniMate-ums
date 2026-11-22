import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Download, FileJson, FileSpreadsheet, FolderInput, HardDriveDownload,
  Info, Table2, Upload, X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { Badge, Button, Field, Modal, Select, Tabs } from "./ui";
import { MODULES, MODULE_KEYS, downloadTemplate, exportModule, parseImportFile, validImportRecords } from "../lib/importExport";
import { fmtDate } from "../lib/utils";

const STEP_LABELS = ["Choose file", "Review records", "Import report"];

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-1.5">
          <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${i <= step ? "text-[var(--accent)]" : "text-[var(--faint)]"}`}>
            <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] ${i < step ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : i === step ? "border border-[var(--accent)] text-[var(--accent)]" : "border border-[var(--border-strong)]"}`} style={{ height: 18, width: 18 }}>
              {i < step ? "✓" : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < STEP_LABELS.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />}
        </div>
      ))}
    </div>
  );
}

export function DataToolsButton({ moduleKey = "tasks", allowModuleSelect = false, variant = "secondary", size = "sm", label = "Import / export" }) {
  const { data, importModule } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(moduleKey);
  const [tab, setTab] = useState("import");
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);
  const [report, setReport] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const mod = MODULES[selected];

  useEffect(() => {
    if (open) {
      setSelected(moduleKey);
      setParsed(null);
      setFileName("");
      setReport(null);
      setTab("import");
    }
  }, [open, moduleKey]);

  useEffect(() => {
    setParsed(null);
    setFileName("");
    setReport(null);
  }, [selected]);

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setReading(true);
    setReport(null);
    try {
      const result = await parseImportFile(file, selected, data);
      setParsed(result);
      if (!result.ok) toast.error("Import could not be prepared", result.error);
    } catch (error) {
      toast.error("Invalid file", error.message || "The selected file could not be read.");
      setParsed({ ok: false, error: error.message });
    } finally {
      setReading(false);
    }
  };

  const confirmImport = () => {
    const records = validImportRecords(parsed);
    if (!records.length) return;
    const imported = importModule(selected, records);
    const nextReport = {
      total: parsed.summary.total, imported, skipped: parsed.summary.duplicates + parsed.summary.invalid,
      duplicates: parsed.summary.duplicates, invalid: parsed.summary.invalid,
      errors: parsed.records.filter((r) => r.errors.length).slice(0, 8),
    };
    setReport(nextReport);
    setParsed(null);
    toast.success("Import completed", `${imported} ${mod.label.toLowerCase()} record${imported === 1 ? "" : "s"} added to your workspace.`);
  };

  const previewFields = mod.fields.slice(0, 6);

  return (
    <>
      <Button variant={variant} size={size} icon={FolderInput} onClick={() => setOpen(true)}>{label}</Button>
      <Modal
        open={open} onClose={() => setOpen(false)} size="xl" icon={FolderInput}
        title={`Import & export ${mod.label.toLowerCase()}`}
        description="Files are parsed locally in your browser. Imported formulas or scripts are never executed."
      >
        <div className="space-y-4">
          {allowModuleSelect && (
            <Field label="Data module" htmlFor="data-module">
              <Select id="data-module" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {MODULE_KEYS.map((key) => <option key={key} value={key}>{MODULES[key].label}</option>)}
              </Select>
            </Field>
          )}
          <Tabs
            value={tab} onChange={setTab}
            tabs={[{ value: "import", label: "Import", icon: Upload }, { value: "export", label: "Export", icon: Download }]}
          />

          {tab === "import" && (
            <div className="space-y-4">
              <StepBar step={report ? 2 : parsed?.ok ? 1 : 0} />
              {report ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-xl border border-[var(--success)]/25 bg-[var(--success-soft)] p-3.5">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--success)]" />
                    <div>
                      <p className="text-[13px] font-bold text-[var(--text)]">Import report · {mod.label}</p>
                      <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">File: {fileName}. Valid records were saved to your workspace.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      { label: "Total rows", value: report.total },
                      { label: "Imported", value: report.imported },
                      { label: "Skipped", value: report.skipped },
                      { label: "Duplicates", value: report.duplicates },
                      { label: "Invalid", value: report.invalid },
                    ].map((row) => (
                      <div key={row.label} className="rounded-xl border border-[var(--border)] p-2.5">
                        <p className="text-[9.5px] font-bold uppercase tracking-wide text-[var(--faint)]">{row.label}</p>
                        <p className="mt-0.5 font-display text-[19px] font-bold text-[var(--text)]">{row.value}</p>
                      </div>
                    ))}
                  </div>
                  {report.errors.length > 0 && (
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <p className="mb-1.5 text-[11px] font-bold text-[var(--text)]">Rows not imported</p>
                      <ul className="space-y-1 text-[11px] text-[var(--muted)]">
                        {report.errors.map((error, i) => <li key={i} className="flex gap-1.5"><AlertTriangle size={11} className="mt-0.5 shrink-0 text-[var(--danger)]" /><span>Row {error.row}: {error.errors.join(" ")}</span></li>)}
                      </ul>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => { setReport(null); setFileName(""); }}>Import another file</Button>
                    <Button onClick={() => setOpen(false)}>Done</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${dragging ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-strong)] bg-[var(--surface-2)]/40"}`}
                  >
                    <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--accent)] shadow-sm">
                      {reading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" /> : <Upload size={18} />}
                    </span>
                    <p className="text-[13px] font-semibold text-[var(--text)]">{reading ? "Reading your file…" : "Drop an Excel or JSON file here"}</p>
                    <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-[var(--muted)]">Supports .xlsx, .xls and .json. Required columns: {mod.fields.filter((f) => f.required).map((f) => f.label).join(", ")}.</p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <Button size="sm" icon={FileSpreadsheet} onClick={() => inputRef.current?.click()}>Choose file</Button>
                      <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadTemplate(selected)}>Excel template</Button>
                    </div>
                    <input ref={inputRef} type="file" accept=".xlsx,.xls,.json" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} aria-label="Choose import file" />
                    <p className="mt-2 text-[10px] text-[var(--faint)]">Files never leave your device.</p>
                  </div>

                  {parsed && !parsed.ok && (
                    <div className="flex items-start gap-2 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-3 text-[11.5px] text-[var(--text)]">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                      <div><p className="font-semibold">Could not import this file</p><p className="mt-0.5 text-[var(--muted)]">{parsed.error}</p>{parsed.unmapped?.length > 0 && <p className="mt-1 text-[10.5px] text-[var(--faint)]">Detected columns: {parsed.unmapped.join(", ")}</p>}</div>
                    </div>
                  )}

                  {parsed?.ok && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-2.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text)]"><FileSpreadsheet size={13} className="text-[var(--accent)]" /> {fileName}</span>
                        <Badge tone="success">{parsed.summary.valid} valid</Badge>
                        <Badge tone="warning">{parsed.summary.duplicates} duplicates</Badge>
                        <Badge tone="danger">{parsed.summary.invalid} invalid</Badge>
                        <Badge tone="neutral">{parsed.summary.total} rows</Badge>
                        <button onClick={() => { setParsed(null); setFileName(""); }} className="ml-auto rounded p-1 text-[var(--faint)] hover:text-[var(--text)]" aria-label="Remove file"><X size={13} /></button>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text)]"><Table2 size={12} /> Preview · first {Math.min(6, parsed.records.length)} rows</p>
                          <span className="text-[10px] text-[var(--faint)]">Duplicates are skipped automatically</span>
                        </div>
                        <div className="max-h-56 overflow-auto">
                          <table className="w-full text-left text-[10.5px]">
                            <thead className="sticky top-0 bg-[var(--surface-2)] text-[var(--faint)]">
                              <tr>{previewFields.map((f) => <th key={f.key} className="whitespace-nowrap px-2.5 py-1.5 font-semibold">{f.label}</th>)}<th className="px-2.5 py-1.5 font-semibold">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                              {parsed.records.slice(0, 6).map((row, i) => (
                                <tr key={i} className={row.errors.length ? "bg-[var(--danger-soft)]/40" : row.duplicate ? "bg-[var(--warning-soft)]/30" : ""}>
                                  {previewFields.map((f) => <td key={f.key} className="max-w-[160px] truncate px-2.5 py-1.5 text-[var(--muted)]">{String(row.record[f.key] ?? "—")}</td>)}
                                  <td className="px-2.5 py-1.5">{row.errors.length ? <Badge tone="danger">Row {row.row} invalid</Badge> : row.duplicate ? <Badge tone="warning">Duplicate</Badge> : <Badge tone="success">Ready</Badge>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {parsed.unmapped.length > 0 && (
                        <p className="flex items-start gap-1.5 text-[10.5px] text-[var(--muted)]"><Info size={12} className="mt-0.5 shrink-0 text-[var(--info)]" /> Ignored columns: {parsed.unmapped.join(", ")}. Use the template to match all fields.</p>
                      )}
                      {parsed.summary.invalid > 0 && (
                        <div className="max-h-28 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-2.5">
                          {parsed.records.filter((r) => r.errors.length).slice(0, 8).map((r, i) => (
                            <p key={i} className="text-[10.5px] text-[var(--muted)]"><span className="font-semibold text-[var(--danger)]">Row {r.row}:</span> {r.errors.join(" ")}</p>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                        <p className="text-[10.5px] text-[var(--faint)]">Nothing is imported until you confirm.</p>
                        <Button icon={CheckCircle2} disabled={!parsed.summary.valid} onClick={confirmImport}>Import {parsed.summary.valid} valid record{parsed.summary.valid === 1 ? "" : "s"}</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "export" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3.5">
                <p className="text-[12.5px] font-bold text-[var(--text)]">{mod.label} · {(data[mod.collection] || []).filter((r) => !mod.type || r.type === mod.type).length} records</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">Exports always contain your current, saved workspace data — never sample placeholders.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" icon={FileSpreadsheet} onClick={() => { const count = exportModule(selected, data, "xlsx"); toast.success("Excel export ready", `${count} ${mod.label.toLowerCase()} record${count === 1 ? "" : "s"} exported.`); }}>Export Excel</Button>
                  <Button size="sm" variant="secondary" icon={FileJson} onClick={() => { const count = exportModule(selected, data, "json"); toast.success("JSON export ready", `${count} ${mod.label.toLowerCase()} record${count === 1 ? "" : "s"} exported.`); }}>Export JSON</Button>
                  <Button size="sm" variant="ghost" icon={Download} onClick={() => { downloadTemplate(selected); toast.info("Template downloaded", "Column names and an example row are included."); }}>Download template</Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <FileSpreadsheet size={16} className="mb-1.5 text-[var(--success)]" />
                  <p className="text-[11.5px] font-semibold text-[var(--text)]">Excel (.xlsx)</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-[var(--muted)]">One row per record with readable column headers. Useful for editing and sharing.</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <FileJson size={16} className="mb-1.5 text-[var(--info)]" />
                  <p className="text-[11.5px] font-semibold text-[var(--text)]">JSON (.json)</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-[var(--muted)]">Complete module records, including metadata, ready for re-import.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 text-[10.5px] text-[var(--muted)]">
                <HardDriveDownload size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <p>Need a complete copy of every module, setting and focus record? Create a full backup from <a href="#/settings" className="font-semibold text-[var(--accent)] hover:underline">Settings → Data management</a>.</p>
              </div>
              <p className="text-[10px] text-[var(--faint)]">Exported {fmtDate(new Date(), "dd MMM yyyy")} · formats: Excel, JSON.</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
