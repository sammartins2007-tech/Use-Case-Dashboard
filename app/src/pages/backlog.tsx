import { Sparkles } from "lucide-react";
import { AREA_TONE, BACKLOG, LANES, SIZE_LABEL } from "@/data/backlog";
import { cn } from "@/lib/utils";

const LANE_DOT: Record<string, string> = { now: "bg-[#0F6CBD]", next: "bg-[#3BB0E8]", later: "bg-[#A9B9CB]" };

export function BacklogPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8">
      <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(120deg,#FFFFFF_0%,#EAF5FD_45%,#CDE8FA_100%)] px-7 py-8 shadow-[0_18px_50px_rgba(15,60,120,0.10)] sm:px-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-[340px] rounded-full bg-[radial-gradient(circle,rgba(59,176,232,0.35),transparent_65%)]" />
        <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.16em] text-[#0F6CBD]">
          <Sparkles className="size-4" aria-hidden="true" /> Backlog
        </p>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-[-0.02em] text-[#0D2847] sm:text-[40px]">What the radar learns next</h1>
        <p className="mt-2 max-w-[820px] text-[16px] leading-relaxed text-[#34465E]">
          Potential improvements, ordered by when they could land. Ideas, not commitments: each one is shaped with the people who use the radar before it is built.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Items per lane">
          {LANES.map((l) => (
            <li key={l.key} className="flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3.5 py-1 text-[13.5px] text-[#0D2847] backdrop-blur">
              <span aria-hidden="true" className={cn("size-2.5 rounded-full", LANE_DOT[l.key])} />
              <span className="font-semibold">{l.label}</span>
              <span className="tabular-nums text-[#55657A]">{BACKLOG.filter((b) => b.lane === l.key).length}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        {LANES.map((l) => {
          const items = BACKLOG.filter((b) => b.lane === l.key);
          return (
            <section key={l.key} aria-labelledby={`lane-${l.key}`} className="rounded-[24px] border border-[#D8E6F3] bg-white/60 p-4 backdrop-blur-md">
              <div className="flex items-baseline justify-between gap-3 px-1 pb-3">
                <h2 id={`lane-${l.key}`} className="flex items-center gap-2 text-[18px] font-semibold text-[#0D2847]">
                  <span aria-hidden="true" className={cn("size-3 rounded-full", LANE_DOT[l.key])} />
                  {l.label}
                </h2>
                <span className="text-[13px] text-[#55657A]">{l.hint}</span>
              </div>
              <ul className="flex flex-col gap-3">
                {items.map((b) => (
                  <li key={b.title} className="rounded-[18px] border border-[#E1ECF6] bg-white p-4 shadow-[0_6px_20px_rgba(15,60,120,0.06)] transition-shadow hover:shadow-[0_10px_28px_rgba(15,60,120,0.12)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-semibold", AREA_TONE[b.area])}>{b.area}</span>
                      <span className="rounded-full bg-[#F1F5FA] px-2.5 py-0.5 text-[12px] text-[#55657A]">{SIZE_LABEL[b.size]}</span>
                    </div>
                    <h3 className="mt-2.5 text-[16px] font-semibold leading-snug text-[#0D2847]">{b.title}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-[#34465E]">{b.why}</p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
