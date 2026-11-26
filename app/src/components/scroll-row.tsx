import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** A horizontal row that can be scrolled with the mouse: arrow buttons appear when content overflows,
 *  the wheel scrolls sideways, and the selected item is kept in view. */
export function ScrollRow({ children, className, label, dark = false, activeKey }: { children: ReactNode; className?: string; label: string; dark?: boolean; activeKey?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY });
    };
    el.addEventListener("scroll", measure, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
      el.removeEventListener("wheel", onWheel);
    };
  }, [measure]);
  useEffect(() => {
    const el = ref.current;
    const sel = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !sel) return;
    const l = sel.offsetLeft - 48;
    const r = sel.offsetLeft + sel.offsetWidth + 48 - el.clientWidth;
    if (l < el.scrollLeft) el.scrollTo({ left: l, behavior: "smooth" });
    else if (r > el.scrollLeft) el.scrollTo({ left: r, behavior: "smooth" });
  }, [activeKey]);
  const step = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * Math.max(240, (ref.current?.clientWidth ?? 600) * 0.6), behavior: "smooth" });
  const btn = cn(
    "absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border shadow-sm transition-opacity",
    dark ? "border-white/20 bg-[#0D2847] text-white hover:bg-[#24364F]" : "border-border bg-white text-foreground hover:bg-muted",
  );
  return (
    <div className={cn("relative", className)}>
      <div ref={ref} role="tablist" aria-label={label} className={cn("flex gap-1 overflow-x-auto no-scrollbar", edge.left && "pl-9", edge.right && "pr-9")}>
        {children}
      </div>
      {edge.left && (
        <button type="button" aria-label="Scroll left" onClick={() => step(-1)} className={cn(btn, "left-0")}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
      )}
      {edge.right && (
        <button type="button" aria-label="Scroll right" onClick={() => step(1)} className={cn(btn, "right-0")}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
