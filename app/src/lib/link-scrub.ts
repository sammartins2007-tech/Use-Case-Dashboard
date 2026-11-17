/**
 * Rule for every downloaded file (offline copies, PDF): never a link to an internal Microsoft 365 item
 * (Teams messages/chats/channels, OneDrive/SharePoint files, Outlook mail). Public links stay.
 */
const NO_LINK = "No direct link available";
const INTERNAL_HOST = /(^|\.)(teams\.microsoft\.com|teams\.cloud\.microsoft|teams\.live\.com|sharepoint\.com|sharepoint-df\.com|office\.com|office365\.com|office\.net|outlook\.com|outlook\.live\.com|mail\.microsoft\.com|microsoft365\.com|loop\.microsoft\.com|cloud\.microsoft|onedrive\.com|1drv\.ms|svc\.ms)$/i;
const URL_RE = /(?:https?:\/\/|www\.)[^\s"'<>()[\]{}\\|]+|(?<![\w@.-])[\w-]+(?:\.[\w-]+)*\.(?:sharepoint\.com|1drv\.ms|onedrive\.live\.com|teams\.microsoft\.com)(?:\/[^\s"'<>()[\]{}\\|]*)?/gi;

export function isInternalUrl(url: string): boolean {
  const raw = url.trim();
  if (/onedrive|\/owa\/|\/_layouts\//i.test(raw)) return true;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return INTERNAL_HOST.test(u.hostname);
  } catch {
    return /(teams\.microsoft|sharepoint\.com|outlook\.office|office\.com|1drv\.ms)/i.test(raw);
  }
}

const hasInternal = (s: string) => [...s.matchAll(URL_RE)].some((m) => isInternalUrl(m[0]));
const dropUrls = (s: string) => s.replace(URL_RE, (m) => (isInternalUrl(m) ? "" : m));
const tidy = (s: string) =>
  s
    .replace(/\[\s*\]\(\s*\)|\(\s*\)|\[\s*\]|<\s*>/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.;:])/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/(^|\n)[ \t]+/g, "$1");

/** Removes internal links from free text; in "Type | Title | Date | URL" lines the URL becomes "No direct link available". */
export function scrubText(s: string): string {
  if (!hasInternal(s)) return s;
  return s
    .split("\n")
    .map((line) => {
      if (!hasInternal(line)) return line;
      const parts = line.split("|");
      if (parts.length >= 3) {
        return parts
          .map((p) => {
            if (!hasInternal(p)) return p;
            const rest = tidy(dropUrls(p)).trim();
            const pad = (x: string) => `${p.startsWith(" ") ? " " : ""}${x}${p.endsWith(" ") ? " " : ""}`;
            return pad(rest || NO_LINK);
          })
          .join("|");
      }
      return tidy(dropUrls(line));
    })
    .join("\n");
}

/** Recursively scrubs every string; an object key or array item that is only an internal link is dropped. */
export function scrubDeep<T>(o: T): T {
  const only = (v: unknown) => typeof v === "string" && v.trim() !== "" && isInternalUrl(v.trim()) && v.trim().match(URL_RE)?.[0] === v.trim();
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return scrubText(v);
    if (Array.isArray(v)) return v.filter((x) => !only(x)).map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([, x]) => !only(x)).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(o) as T;
}

/** For a DOM capture (PDF): scrubs text and internal anchors under `root`; returns a function that restores the page. */
export function scrubDom(root: HTMLElement): () => void {
  const undo: (() => void)[] = [];
  for (const a of Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    const href = a.getAttribute("href") ?? "";
    if (/^https?:|^www\./i.test(href) && isInternalUrl(href)) {
      a.removeAttribute("href");
      undo.push(() => a.setAttribute("href", href));
    }
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    const before = t.nodeValue ?? "";
    const after = scrubText(before);
    if (after !== before) {
      t.nodeValue = after;
      undo.push(() => (t.nodeValue = before));
    }
  }
  return () => undo.reverse().forEach((f) => f());
}
