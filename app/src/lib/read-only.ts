/**
 * Read-only modes. One code base serves the master radar (editable), the offline copies (static snapshot)
 * and the live read-only customer apps (radar.config `readOnly: true`, own copy lists, no AI, no file writes).
 *
 * READ_ONLY       no edits anywhere (offline copy or live read-only app)
 * LIVE_READ_ONLY  live read-only app: also hides what the offline copies still show (pickers, downloads,
 *                 PDF export, AI consumption) because its readers have Read on the copy lists only
 */
import { RADAR } from "@/radar.config";
import { IS_STATIC, READ_ONLY_MESSAGE } from "@/lib/static-copy";

export const LIVE_READ_ONLY = !IS_STATIC && RADAR.readOnly === true;
export const READ_ONLY = IS_STATIC || LIVE_READ_ONLY;
export const LIVE_READ_ONLY_MESSAGE = `This app is read-only. It is maintained by ${RADAR.owner}.`;
export const readOnlyMessage = () => (IS_STATIC ? READ_ONLY_MESSAGE : LIVE_READ_ONLY_MESSAGE);

/** Thrown by every write path of a read-only app. */
export class ReadOnlyError extends Error {
  constructor() {
    super(readOnlyMessage());
    this.name = "ReadOnlyError";
  }
}
