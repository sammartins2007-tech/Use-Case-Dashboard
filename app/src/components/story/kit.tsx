import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** The story is drawn on a fixed 16:9 canvas, then scaled to the screen like a slide. */
export const STAGE_W = 1600;
export const STAGE_H = 900;

export const INK = "#0D2847";
export const BODY = "#34465E";
export const MUTED = "#55657A";
export const TEAL = "#0F6CBD";
export const GOLD = "#B8892B";
export const GOLD_TEXT = "#7A5718";
const STATUS = { G: "#2A9D78", O: "#E0A030", R: "#C94141" } as const;

export function Eyebrow({ children, className, dark }: { children: ReactNode; className?: string; dark?: boolean }) {
  return <p className={cn("font-mono text-[13px] uppercase tracking-[0.14em]", dark ? "text-[#9BD3F7]" : "text-[#0F6CBD]", className)}>{children}</p>;
}

export function SlideHead({ eyebrow, title, lead, className }: { eyebrow: ReactNode; title: ReactNode; lead?: ReactNode; className?: string }) {
  return (
    <header className={cn("max-w-[1380px]", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 font-[family-name:var(--font-serif)] text-[44px] font-normal leading-[1.08] tracking-[-0.01em] text-[#0D2847]">{title}</h2>
      {lead && <p className="mt-3 max-w-[1300px] text-[19px] leading-[1.45] text-[#34465E]">{lead}</p>}
    </header>
  );
}

export function Panel({ children, className, dark }: { children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[18px] border p-6",
        dark ? "border-transparent bg-[#0D2847] text-white shadow-[0_16px_40px_rgba(27,42,65,0.3)]" : "border-white/80 bg-white/80 shadow-[0_12px_36px_rgba(15,60,120,0.09)] backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

const PILL = {
  teal: "bg-[#0F6CBD] text-white",
  tealSoft: "bg-[#E3F0FB] text-[#0A4F8F]",
  gold: "bg-[#FFF4DE] text-[#6E4F12] ring-1 ring-[#E9C77E]",
  goldSolid: "bg-[#8A6417] text-white",
  grey: "bg-[#E9EEF4] text-[#4A5261]",
  red: "bg-[#FBE7E7] text-[#9B2C2C] ring-1 ring-[#EDB4B4]",
  navy: "bg-[#0D2847] text-white",
  green: "bg-[#E4F3EC] text-[#1E6F55]",
} as const;
export type PillTone = keyof typeof PILL;

export function Pill({ children, tone = "grey", className }: { children: ReactNode; tone?: PillTone; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold", PILL[tone], className)}>{children}</span>;
}

/** Fades and lifts its content in, `i` steps after the slide appears. */
export function Reveal({ i = 0, children, className, from = "up" }: { i?: number; children: ReactNode; className?: string; from?: "up" | "left" | "right" | "none" }) {
  const still = useReducedMotion();
  const offset = still || from === "none" ? {} : from === "up" ? { y: 14 } : from === "left" ? { x: -24 } : { x: 24 };
  return (
    <motion.div className={className} initial={{ opacity: 0, ...offset }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.45, delay: still ? 0 : 0.12 + i * 0.09, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

/** Counts up to a live number when the slide opens. */
export function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString("en-GB") }: { value: number; format?: (n: number) => string }) {
  const still = useReducedMotion();
  const [shown, setShown] = useState(still ? value : 0);
  const raf = useRef(0);
  useEffect(() => {
    if (still) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, still]);
  return <span className="tabular-nums">{format(shown)}</span>;
}

export function Tile({ value, label, sub, dark, compact, className }: { value: ReactNode; label: ReactNode; sub?: ReactNode; dark?: boolean; compact?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-[14px] border", compact ? "px-3.5 py-2.5" : "px-4 py-3", dark ? "border-white/15 bg-white/[0.07]" : "border-white/80 bg-white/85 shadow-[0_8px_24px_rgba(15,60,120,0.07)] backdrop-blur", className)}>
      <div className={cn("font-semibold leading-none tracking-tight", compact ? "text-[23px]" : "text-[30px]", dark ? "text-white" : "text-[#0D2847]")}>{value}</div>
      <div className={cn("mt-1.5 text-[14px] leading-snug", dark ? "text-[#C9D4DE]" : "text-[#34465E]")}>{label}</div>
      {sub && <div className={cn("mt-0.5 text-[12.5px] leading-snug", dark ? "text-[#A9B8C6]" : "text-[#55657A]")}>{sub}</div>}
    </div>
  );
}

/** A labelled horizontal bar; the value is always written, so colour is never the only cue. */
export function Bar({ label, value, max, text, tone = TEAL, className }: { label: ReactNode; value: number; max: number; text?: ReactNode; tone?: string; className?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1", className)}>
      <span className="min-w-0 truncate text-[14px] text-[#34465E]">{label}</span>
      <span className="text-[14px] font-semibold tabular-nums text-[#0D2847]">{text ?? value}</span>
      <span className="col-span-2 h-2.5 overflow-hidden rounded-full bg-[#E6EFF8]">
        <motion.span className="block h-full rounded-full" style={{ background: tone }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }} />
      </span>
    </div>
  );
}

export function Dot({ status, className }: { status: "G" | "O" | "R"; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-3.5 shrink-0 rounded-full", className)} style={{ background: STATUS[status] }} />;
}

export function NoUseCase() {
  return (
    <Panel className="mt-10 max-w-[760px]">
      <p className="text-[20px] text-[#34465E]">No use case to follow yet. Once the refresh has found one, the story follows it here.</p>
    </Panel>
  );
}
