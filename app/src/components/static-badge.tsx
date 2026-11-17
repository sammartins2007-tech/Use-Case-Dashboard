import { format, parseISO } from "date-fns";
import { UCX } from "@/lib/static-copy";

/** Fixed marker on an offline copy: when it was taken and who it is for. */
export function StaticBadge() {
  if (!UCX) return null;
  let day = UCX.createdAt.slice(0, 10);
  try {
    day = format(parseISO(UCX.createdAt), "d MMM yyyy");
  } catch {
    /* keep the ISO date */
  }
  const label = UCX.edition === "customer" ? "Read-only copy" : "Internal read-only copy · not for distribution";
  return (
    <div
      role="note"
      data-pdf-exclude
      className="pointer-events-none fixed bottom-3 left-3 z-[9999] rounded-full bg-[#1B2A41]/90 px-3 py-1.5 text-xs text-white shadow"
    >
      {label} · {day}
    </div>
  );
}
