/** The eight platform routes of the AI Use Case Radar classification method. */
export interface Route {
  key: string; // exact value stored in SharePoint
  short: string;
  color: string;
  definition: string;
  when: string;
  signals: string;
}

export const ROUTES: Route[] = [
  {
    key: "1 · No AI",
    short: "No AI",
    color: "#8A8F98",
    definition: "The problem is solved by rules, data or reporting, not by AI.",
    when: "Process mining, Power BI, Power Automate, ERP modules or data engineering already solve the pain.",
    signals: "Fixed checks, alerts, dashboards, reconciliations with clear rules.",
  },
  {
    key: "2 · No AI – Code App (Power Platform)",
    short: "No AI – App",
    color: "#6B8E5A",
    definition: "The need is an application: data capture, workflow and screens with rules-based logic. AI can come later.",
    when: "People need a place to enter, track and approve things.",
    signals: "Shop-floor apps, simulators, back-office apps.",
  },
  {
    key: "3 · M365 Copilot",
    short: "M365 Copilot",
    color: "#0E7C86",
    definition: "One person drafts, summarises, translates or researches inside Word, PowerPoint, Excel or Teams.",
    when: "The work is individual and happens document by document.",
    signals: "Drafting from templates, per-document checks, one-off research, translation.",
  },
  {
    key: "4 · Copilot Cowork",
    short: "Copilot Cowork",
    color: "#B8892B",
    definition: "One analyst or team runs multi-step work across mail, files, Teams and Power BI and gets a finished deliverable.",
    when: "Several sources must be combined into a pack, plan or analysis, on demand or on a schedule.",
    signals: "Monthly packs, plans built from several sources, bid or spend analyses, newsletters.",
  },
  {
    key: "5 · Copilot Studio",
    short: "Copilot Studio",
    color: "#1B2A41",
    definition: "A shared agent or agent flow that serves many users or runs a process.",
    when: "Knowledge Q&A, document processing, triggers, or connectors to SAP, Salesforce, ServiceNow or Helix.",
    signals: "Chatbots over SharePoint, mailbox-triggered extraction, classification and routing.",
  },
  {
    key: "6 · Microsoft Fabric (data agents & apps)",
    short: "Fabric",
    color: "#2A9D78",
    definition: "The value comes from unifying structured data so people can ask questions or receive alerts.",
    when: "SAP, BW, PI or Salesforce data must be joined in semantic models, data agents or real-time alerts.",
    signals: "Control towers, KPI diagnostics, ask-your-data, real-time alerts.",
  },
  {
    key: "7 · Microsoft Foundry",
    short: "Foundry",
    color: "#C2556B",
    definition: "Custom models or pro-code: machine learning, computer vision, forecasting, optimisation or large-scale retrieval.",
    when: "Off-the-shelf agents are not enough and data scientists are needed.",
    signals: "Soft sensors, anomaly detection, set-point optimisation, very large archives.",
  },
  {
    key: "8 · Unknown – not enough information",
    short: "Unknown",
    color: "#BDB4A3",
    definition: "Only a title, or details deferred to a meeting: the route cannot be chosen yet.",
    when: "Ask the owner for the problem, users, data sources and volumes.",
    signals: "'To be defined', title only.",
  },
];

export const UNCLASSIFIED: Route = {
  key: "none",
  short: "Not classified",
  color: "#E4DED3",
  definition: "Not yet assessed.",
  when: "",
  signals: "",
};

export function routeOf(key?: string): Route {
  return ROUTES.find((r) => r.key === key) ?? UNCLASSIFIED;
}

/** Text colour that stays readable on a route colour. */
export function onRoute(r: Route) {
  return ["#BDB4A3", "#E4DED3", "#B8892B", "#8A8F98"].includes(r.color) ? "#1B2A41" : "#FFFFFF";
}
