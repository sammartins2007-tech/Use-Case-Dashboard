/** People and next steps are stored as plain lines so the refresh and people can both edit them. */

export interface Person {
  name: string;
  title: string;
  org: string;
  location: string;
  role: string;
  owner: boolean;
  /** How the person contributes: Business, Technical or Microsoft (empty = inferred, see contributionOf). */
  contribution: Contribution | "";
}

export const CONTRIBUTIONS = ["Business", "Technical", "Microsoft"] as const;
export type Contribution = (typeof CONTRIBUTIONS)[number];

const TECH_UPPER = /\b(IT|ICT)\b/;
const TECH = /\b(data|digital|architect\w*|engineer\w*|developer|platform|technical|tech|integration|infrastructure|cloud|security|devops|analytics engineer|power platform|copilot studio|automation|crm|erp|sap|salesforce|application|solution architect|maker|admin\w*)\b/i;

/** The contribution shown for a person: the stored value, else inferred from organisation, job title and role. */
export function contributionOf(p: Pick<Person, "org" | "title" | "role" | "contribution">, account?: string): Contribution {
  if (p.contribution) return p.contribution;
  if (/microsoft/i.test(p.org)) return "Microsoft";
  const customer = !p.org || (account ? p.org.toLowerCase().includes(account.toLowerCase()) : true);
  if (!customer) return "Technical"; // partners and integrators
  return TECH.test(`${p.title} ${p.role}`) || TECH_UPPER.test(`${p.title} ${p.role}`) ? "Technical" : "Business";
}

export interface Step {
  done: boolean;
  due: string;
  who: string;
  action: string;
  detail: string;
}

const clean = (s?: string) => (s ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
const nonEmptyLines = (s?: string) =>
  (s ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

export function parsePeople(s?: string): Person[] {
  return nonEmptyLines(s)
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((f) => f[0])
    .map((f) => {
      const c = (CONTRIBUTIONS as readonly string[]).find((x) => x.toLowerCase() === (f[6] ?? "").toLowerCase()) as Contribution | undefined;
      return { name: f[0], title: f[1] ?? "", org: f[2] ?? "", location: f[3] ?? "", role: f[4] ?? "", owner: /^y/i.test(f[5] ?? ""), contribution: c ?? "" };
    });
}

export function serializePeople(list: Person[]): string {
  return list
    .filter((p) => p.name.trim())
    .map((p) => [p.name, p.title, p.org, p.location, p.role, p.owner ? "Y" : "N", p.contribution].map(clean).join(" | ").replace(/ \| $/, ""))
    .join("\n");
}

/** The business owner: the person flagged Owner, else the first words of the Owner text. */
export function ownerOf(people: Person[], ownerText?: string): Person | undefined {
  const flagged = people.find((p) => p.owner);
  if (flagged) return flagged;
  const t = (ownerText ?? "").trim();
  if (!t) return undefined;
  const [name, ...rest] = t.split(/\s+[—–-]\s+|,\s*/);
  return { name: name.trim(), title: rest.join(", ").trim(), org: "", location: "", role: "Business owner", owner: true, contribution: "" };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseSteps(s?: string): Step[] {
  return nonEmptyLines(s)
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((f) => f.length >= 4 && /^(open|done)$/i.test(f[0]))
    .map((f) => ({ done: /^done$/i.test(f[0]), due: DATE.test(f[1]) ? f[1] : "", who: f[2] ?? "", action: f[3] ?? "", detail: f.slice(4).join(" / ") }));
}

export function serializeSteps(list: Step[]): string {
  return list
    .filter((x) => x.action.trim())
    .map((x) => [x.done ? "Done" : "Open", DATE.test(x.due) ? x.due : "", clean(x.who), clean(x.action), clean(x.detail)].join(" | "))
    .join("\n");
}

/** Open steps first by due date (undated last), then done steps. */
export function sortSteps(list: Step[]): Step[] {
  const key = (x: Step) => `${x.done ? 1 : 0}-${x.due || "9999"}`;
  return [...list].sort((a, b) => key(a).localeCompare(key(b)));
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function initials(name: string) {
  const p = name.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
