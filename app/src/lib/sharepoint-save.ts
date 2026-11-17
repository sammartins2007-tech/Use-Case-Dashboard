/**
 * Saves a downloaded file (offline copy, PDF) as a real file in the radar site's document library
 * ("Documents" > "Offline copies") through the SharePoint connector's Create file action, so it can be
 * opened, downloaded and shared from SharePoint, independent of the app.
 *
 * Never part of the offline viewer: vite.viewer.config.ts replaces this module with
 * src/viewer/sharepoint-save.ts, which has no connector client.
 */
import { SharePointService } from "@/data/services";
import { RADAR } from "@/radar.config";

/** The radar site, from radar.config.ts (siteUrl). Empty: saving to SharePoint is not offered. */
export const SP_SITE = (RADAR.siteUrl ?? "").replace(/\/+$/, "");
const SITE_PATH = SP_SITE ? new URL(SP_SITE).pathname : "";
const LIBRARY = "Shared Documents";
const FOLDER = "Offline copies";
/** The connector's folder path: relative to the site, the library's URL name first. */
export const SP_FOLDER_PATH = `/${LIBRARY}/${FOLDER}`;
export const SP_FOLDER_URL = `${SP_SITE}/${encodeURI(LIBRARY)}/${encodeURI(FOLDER)}`;

export type SavedFile = { name: string; url: string; serverRelativePath: string; isHtml: boolean };

/** The connector's own message (often JSON inside JSON inside an Error), with the HTTP status. */
export function errorText(e: unknown): string {
  let status: number | undefined;
  const dig = (v: unknown, depth: number): string | undefined => {
    if (depth > 6 || v == null) return undefined;
    if (typeof v === "string") {
      const t = v.trim();
      if (t.startsWith("{")) {
        try {
          return dig(JSON.parse(t), depth + 1) ?? t;
        } catch {
          return t;
        }
      }
      return t || undefined;
    }
    if (typeof v !== "object") return String(v);
    const o = v as { status?: unknown; statusCode?: unknown; message?: unknown; error?: unknown };
    const code = typeof o.status === "number" ? o.status : typeof o.statusCode === "number" ? o.statusCode : undefined;
    if (code && !status) status = code;
    return dig(o.message, depth + 1) ?? dig(o.error, depth + 1);
  };
  const msg = (dig(e, 0) ?? (e instanceof Error ? e.name : "unknown error")).split(/\r?\nclientRequestId:/)[0].trim();
  return `${status ? `HTTP ${status}: ` : ""}${msg}`;
}

const alreadyExists = (msg: string) => /already exists|nameAlreadyExists|HTTP 409/i.test(msg);

/** "a.html" -> "a-2.html" */
const suffixed = (name: string, n: number) => (n < 2 ? name : name.replace(/(\.[^.]+)?$/, (ext) => `-${n}${ext}`));

/** The library page that previews the file, with Download and Share in its toolbar. */
export function spFilePageUrl(serverRelativePath: string): string {
  const parent = serverRelativePath.slice(0, serverRelativePath.lastIndexOf("/"));
  return `${SP_SITE}/${encodeURI(LIBRARY)}/Forms/AllItems.aspx?id=${encodeURIComponent(serverRelativePath)}&parent=${encodeURIComponent(parent)}`;
}

/**
 * Uploads the bytes as `name` (the connector overwrites a file of the same name; if it refuses, -2, -3… is
 * appended). Bytes go as a binary body, so the stored file is byte-identical to `bytes`.
 */
export async function saveToSharePoint(name: string, bytes: Uint8Array): Promise<SavedFile> {
  if (!SP_SITE) throw new Error('No SharePoint site is set for this radar (siteUrl in radar.config.ts). Use "download it here" instead.');
  let last = "";
  for (let n = 1; n <= 9; n++) {
    const candidate = suffixed(name, n);
    // A Uint8Array body is sent as raw bytes (base64 over the host channel, application/octet-stream).
    const r = await SharePointService.CreateFile(SP_SITE, SP_FOLDER_PATH, candidate, bytes as unknown as string);
    if (r.success) {
      const saved = r.data ?? {};
      // Never report a save that did not keep the file intact: SharePoint returns the stored size.
      if (typeof saved.Size === "number" && saved.Size !== bytes.byteLength) {
        throw new Error(
          `SharePoint stored ${saved.Size.toLocaleString()} bytes instead of ${bytes.byteLength.toLocaleString()}: the saved file is damaged. Use "download it here" instead.`,
        );
      }
      const finalName = saved.Name || candidate;
      const rel = saved.Path || `${SP_FOLDER_PATH}/${finalName}`;
      const serverRelativePath = rel.startsWith(`${SITE_PATH}/`) ? rel : `${SITE_PATH}${rel.startsWith("/") ? "" : "/"}${rel}`;
      // SharePoint never runs the scripts of an HTML file in its preview (it shows a blank page), so an
      // offline copy is offered as a direct download; a PDF opens in SharePoint's own viewer.
      const isHtml = /\.html?$/i.test(finalName);
      const host = new URL(SP_SITE).origin;
      const url = isHtml ? `${host}${encodeURI(serverRelativePath)}?download=1` : spFilePageUrl(serverRelativePath);
      return { name: finalName, url, serverRelativePath, isHtml };
    }
    last = errorText(r.error);
    if (!alreadyExists(last)) break;
  }
  throw new Error(last);
}

/** Opens a SharePoint page in a new tab, without giving it a handle on the app. */
export function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
