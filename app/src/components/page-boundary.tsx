import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportPrivateRuntimeError } from "@/lib/console-capture";

const RELOAD_KEY = "radar-auto-reload-at";

/** Keeps a crash inside one page or panel: the header and navigation stay usable.
 *  A crash right after a new version is published (old and new code mixed) reloads the app once. */
export class PageBoundary extends Component<{ children: ReactNode; label?: string; compact?: boolean; silent?: boolean; onReset?: () => void }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportPrivateRuntimeError(`[${this.props.label ?? "Page"} Error]`, error, info.componentStack);
    const stale = /is not a function|dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(error.message);
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
      if (stale && Date.now() - last > 60_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {
      /* storage unavailable: show the message instead */
    }
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.silent) return null;
    return (
      <div className={this.props.compact ? "p-4" : "mx-auto flex max-w-xl flex-1 items-center justify-center p-10"}>
        <div className="w-full rounded-2xl border border-[#E8D9B8] bg-[#FFFDF8] p-6">
          <h2 className="font-[family-name:var(--font-serif)] text-xl">This {this.props.label?.toLowerCase() ?? "page"} could not be shown</h2>
          <p className="mt-2 text-sm text-muted-foreground">Something in the data or the page did not load as expected. The rest of the app still works.</p>
          <p className="mt-2 rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">{this.state.error.message.slice(0, 200)}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={this.reset} className="rounded-full bg-[#1B2A41] px-4 py-1.5 text-sm text-white hover:opacity-90">
              Try again
            </button>
            <button type="button" onClick={() => window.location.reload()} className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-muted">
              Reload the app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
