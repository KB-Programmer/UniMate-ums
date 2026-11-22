import { Component } from "react";
import { AlertTriangle, Download, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Console-only diagnostics; no data leaves the browser.
    console.error("UniMate recovered from a UI error", error, info);
  }

  downloadRawData() {
    try {
      const raw = window.localStorage.getItem("unimate_data");
      if (!raw) return;
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `UniMate_RawData_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F7FB] p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle size={20} /></span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">UniMate hit an unexpected error</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            Your workspace data is still stored in this browser. Reload the application to recover, or download the raw data first as a safety copy.
          </p>
          <pre className="mt-3 max-h-24 overflow-auto rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500">{String(this.state.error?.message || "Unknown error")}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => window.location.reload()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-[12px] font-semibold text-white hover:bg-indigo-700">
              <RotateCcw size={14} /> Reload application
            </button>
            <button onClick={() => this.downloadRawData()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
              <Download size={14} /> Download raw data
            </button>
          </div>
          <p className="mt-4 text-[10px] text-slate-400">No data is sent anywhere. If the problem repeats, export the raw file and reset the workspace in Settings after reloading.</p>
        </div>
      </div>
    );
  }
}
