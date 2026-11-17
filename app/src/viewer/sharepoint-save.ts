/**
 * Offline viewer replacement for src/lib/sharepoint-save.ts (see vite.viewer.config.ts): an offline copy
 * never talks to SharePoint, so it has no connector client and only ever downloads locally.
 */
import type { SavedFile } from "@/lib/sharepoint-save";

export const SP_SITE = "";
export const SP_FOLDER_PATH = "";
export const SP_FOLDER_URL = "";
export type { SavedFile };

export function spFilePageUrl(): string {
  return "";
}

export async function saveToSharePoint(): Promise<SavedFile> {
  throw new Error("Not available in an offline copy");
}

export function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
