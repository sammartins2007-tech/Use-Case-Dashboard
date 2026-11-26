import { Backlog, Close, Decide, Editions, Kit, LastRun, Pipeline } from "./slides-run";
import { Arbitrate, Board, Solution, Triggers } from "./slides-solve";
import { Anatomy, Born, Cover, Features, Gates, Ledger, Rules, Sources, Timeline } from "./slides-understand";
import type { SlideDef, StoryCtx } from "./types";

const ruleBook = () => ({ to: "/method", label: "Read the rule book" });
const dossier = (ctx: StoryCtx) => (ctx.uc ? { to: `/use-case/${ctx.uc.id}`, label: "Open the dossier" } : null);
const realDesign = (ctx: StoryCtx) => (ctx.uc ? { to: `/use-case/${ctx.uc.id}/solution`, label: "Open the real design" } : null);

/** The whole story, in presentation order: seven chapters. */
export const SLIDES: SlideDef[] = [
  { key: "cover", chapter: 1, name: "Inside the Radar", Render: Cover },
  { key: "gates", chapter: 1, name: "A use case is a business pain", Render: Gates, link: ruleBook },
  { key: "anatomy", chapter: 1, name: "The use case we follow", Render: Anatomy, link: dossier },
  { key: "sources", chapter: 2, name: "What it reads", Render: Sources, link: ruleBook },
  { key: "born", chapter: 2, name: "Born from one sentence", Render: Born, link: dossier },
  { key: "ledger", chapter: 2, name: "Every statement accounted for", Render: Ledger, link: dossier },
  { key: "timeline", chapter: 3, name: "Every source makes it sharper", Render: Timeline, link: dossier },
  { key: "rules", chapter: 3, name: "Four rules", Render: Rules, link: ruleBook },
  { key: "features", chapter: 3, name: "Product news meets customer pain", Render: Features, link: () => ({ to: "/features", label: "Open the feature radar" }) },
  { key: "triggers", chapter: 4, name: "When the SE agents are called", Render: Triggers, link: ruleBook },
  { key: "board", chapter: 4, name: "The SE agent call", Render: Board, link: realDesign },
  { key: "arbitrate", chapter: 4, name: "How the orchestrator decides", Render: Arbitrate, link: realDesign },
  { key: "solution", chapter: 4, name: "From verdict to solution", Render: Solution, link: realDesign },
  { key: "decide", chapter: 5, name: "The AI proposes, people decide", Render: Decide, link: realDesign },
  { key: "editions", chapter: 5, name: "Each audience sees the right version", Render: Editions },
  { key: "pipeline", chapter: 6, name: "One run, nine steps", Render: Pipeline, link: ruleBook },
  { key: "lastrun", chapter: 6, name: "The latest run, replayed", Render: LastRun, link: () => ({ to: "/finops", label: "Open FinOps" }) },
  { key: "kit", chapter: 7, name: "Your own radar", Render: Kit },
  { key: "backlog", chapter: 7, name: "What comes next", Render: Backlog, link: () => ({ to: "/backlog", label: "Open the backlog" }) },
  { key: "close", chapter: 7, name: "What will your radar hear?", Render: Close },
];
