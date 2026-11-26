/** Potential improvements for the radar, ordered by when they could land. Ideas, not commitments. */

export type BacklogLane = "now" | "next" | "later";
export type BacklogArea = "Detect" | "Learn" | "Solve" | "Share" | "FinOps" | "Install";

export interface BacklogItem {
  title: string;
  why: string;
  area: BacklogArea;
  lane: BacklogLane;
  size: "S" | "M" | "L";
}

export const LANES: { key: BacklogLane; label: string; hint: string }[] = [
  { key: "now", label: "Now", hint: "In flight or ready to start" },
  { key: "next", label: "Next", hint: "Shaped, waiting for a slot" },
  { key: "later", label: "Later", hint: "Ideas to explore" },
];

export const SIZE_LABEL: Record<BacklogItem["size"], string> = { S: "Small", M: "Medium", L: "Large" };

export const BACKLOG: BacklogItem[] = [
  { lane: "now", area: "Share", size: "S", title: "Show mode on by default for audiences", why: "Account and people names are masked automatically when the radar is shown outside the account team." },
  { lane: "now", area: "Detect", size: "S", title: "Read-budget guard", why: "Each run warns before it reaches its read budget, so a busy week never cuts a refresh short." },
  { lane: "now", area: "Detect", size: "S", title: "Second try on unreadable sources", why: "Mails and documents a run could not open are retried in the next run and reported, never silently skipped." },
  { lane: "next", area: "Share", size: "M", title: "Customer stages on the portfolio", why: "Idea, Shaping, Pilot, Live, Parked: one word tells the customer where each use case stands." },
  { lane: "next", area: "Share", size: "M", title: "One-page use case view to share", why: "The pain, the answer, the value and the cost on one page a customer can forward internally." },
  { lane: "next", area: "FinOps", size: "S", title: "Monthly AI cost ceiling with an 80% alert", why: "The owner is warned before the monthly AI budget is spent, not after." },
  { lane: "next", area: "FinOps", size: "S", title: "Euro amounts next to dollars", why: "Value and cost shown in the customer's own currency." },
  { lane: "next", area: "FinOps", size: "M", title: "Measured credits instead of estimates", why: "Each run's cost comes from measured usage, so the FinOps page shows facts, not estimates." },
  { lane: "later", area: "Install", size: "L", title: "Team radar", why: "Several specialists feed one radar, each with their own accounts, and share one portfolio." },
  { lane: "later", area: "Solve", size: "M", title: "SE agent feedback loop", why: "Specialists rate each agent opinion; the ratings sharpen the agents' instructions in Copilot Studio over time." },
  { lane: "later", area: "Detect", size: "M", title: "CRM as a fifth source", why: "Opportunities and visit reports become signals, next to mails, chats, meetings and documents." },
  { lane: "later", area: "Learn", size: "M", title: "Agents that prepare the next meeting", why: "For each prioritised use case, a ready brief with the open questions and the designed answer." },
];

export const AREA_TONE: Record<BacklogArea, string> = {
  Detect: "bg-[#E3F0FB] text-[#0A4F8F]",
  Learn: "bg-[#E6F6FB] text-[#0B6A86]",
  Solve: "bg-[#EEE9FB] text-[#4B3A9A]",
  Share: "bg-[#E4F3EC] text-[#1E6F55]",
  FinOps: "bg-[#FFF4DE] text-[#6E4F12]",
  Install: "bg-[#E9EEF4] text-[#34465E]",
};
