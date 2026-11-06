import { getClient } from "@microsoft/managed-apps/data";
import dataSources from "../../generated/dataSources";
import { AgentsService } from "../../generated/services/AgentsService";

// Set this to the `data_source` that DataSourceAdd returned for shared_agentnode. It is
// usually "agentnode", but the binding allocates a suffixed name such as "agentnode_1"
// when an existing data source already uses that name.
export const AGENTNODE_DATA_SOURCE = "agentnode";

export type AgentNodeFailure = "config" | "start" | "failed" | "empty" | "timeout" | "malformed";

export class AgentNodeError extends Error {
  readonly failure: AgentNodeFailure;
  readonly conversationId?: string;

  constructor(failure: AgentNodeFailure, message: string, conversationId?: string) {
    super(message);
    this.name = "AgentNodeError";
    this.failure = failure;
    this.conversationId = conversationId;
  }
}

export interface InlineAgentAnswer {
  conversationId?: string;
  message?: string;
  structuredOutput?: unknown;
  activities?: unknown[];
  files?: unknown[];
}

export interface AgentPollOptions {
  locale?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1_000;
const MAX_RESUME_MS = 60 * 60 * 1_000;
const MAX_POLL_FAILURES = 3;
const MAX_TIMER_MS = 2_147_483_647;
// Only these statuses keep polling; any other unrecognised status fails fast instead of
// polling until the deadline.
const RUNNING_STATUSES = new Set(["running", "inprogress", "in_progress", "queued", "notstarted", "pending", "accepted", "started"]);
const SUCCEEDED_STATUSES = new Set(["completed", "succeeded"]);

export const INLINE_AGENT_DEFINITION = {
  components: [],
  environmentVariables: [],
  flows: [],
  dataverseTableSearchs: [],
  dataverseTableSearchGlossaryConfigurations: [],
  dataverseTableSearchEntityConfigurations: [],
  dataverseTableSearchEntityColumnSynonyms: [],
  connectionReferences: [],
  connectorDefinitions: [],
  aIModelDefinitions: [],
  aIPluginOperations: [],
  connectedAgentDefinitions: [],
  componentCollections: [],
  connectedBots: [],
  diagnostics: [],
  entity: {
    authorizedSecurityGroupIds: [],
    supportedLanguages: [],
    diagnostics: [],
    schemaName: "inline_agent",
    language: 1033,
    accessControlPolicy: "Any",
    authenticationMode: "Integrated",
    authenticationTrigger: "Always",
    synchronizationStatus: {
      graphDriveItems: [],
      diagnostics: [],
      lastPublishedDetails: {
        diagnosticDetails: [],
        diagnostics: [],
        authenticationMode: "Integrated",
        $kind: "SuccessfulPublishResultDetails",
      },
      $kind: "BotSynchronizationDetails",
    },
    configuration: {
      categories: [],
      channels: [],
      settings: {},
      diagnostics: [],
      recognizer: { diagnostics: [], $kind: "CLICopilotRecognizer" },
      agentSettings: {
        conversationStarters: [],
        diagnostics: [],
        instructions: { segments: [], diagnostics: [], $kind: "Instructions" },
        $kind: "AgentSettings",
      },
      $kind: "BotConfiguration",
    },
    $kind: "BotEntity",
  },
  $kind: "BotDefinition",
} as const;

interface OperationResult {
  success: boolean;
  data?: unknown;
  error?: unknown;
}

type Payload = Record<string, unknown>;
type Outcome = { done: true; answer: InlineAgentAnswer } | { done: false } | { done: "failed" } | { done: "empty" };

export async function invokeInlineAgent(
  message: string,
  options: AgentPollOptions = {},
): Promise<InlineAgentAnswer> {
  const requestedInterval = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const requestedTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (
    !Number.isFinite(requestedInterval) ||
    requestedInterval <= 0 ||
    !Number.isFinite(requestedTimeout) ||
    requestedTimeout <= 0
  ) {
    throw new AgentNodeError("config", "pollIntervalMs and timeoutMs must be positive finite numbers.");
  }
  // setTimeout fires immediately for a delay above 2^31-1 ms, so a longer budget is clamped.
  const interval = Math.min(requestedInterval, MAX_TIMER_MS);
  const timeout = Math.min(requestedTimeout, MAX_TIMER_MS);
  // An empty or blank locale takes the default, so it shares the default's single-flight key.
  const locale = options.locale?.trim() || "en-US";
  const deadline = Date.now() + timeout;
  if (!dataSources[AGENTNODE_DATA_SOURCE]?.apis?.InvokeDefinition) {
    throw new AgentNodeError(
      "config",
      `AGENTNODE_DATA_SOURCE "${AGENTNODE_DATA_SOURCE}" has no InvokeDefinition in generated/dataSources.ts; set it to the data_source that DataSourceAdd returned.`,
    );
  }
  return start(message, locale, interval, deadline, ++calls);
}

const pollFailures = new Map<string, number>();

async function finish(
  response: OperationResult,
  interval: number,
  ceiling: () => number,
): Promise<InlineAgentAnswer> {
  const payload: Payload = isEmptyBody(response.data) ? {} : payloadOf(response.data);
  const outcome = readOutcome(payload);
  if (outcome.done === true) return outcome.answer;

  const conversationId = typeof payload.conversationId === "string" ? payload.conversationId : "";
  terminate(outcome, conversationId || undefined);
  if (!conversationId) {
    throw new AgentNodeError("empty", "The assistant returned no response. Please try again.");
  }
  return pollUntil(conversationId, interval, ceiling);
}

// Polls a started conversation to the ceiling. A failed poll and a timeout are resumable: the
// conversation may still be running, so a same-message retry polls it again instead of paying
// for a second start.
async function pollUntil(
  conversationId: string,
  interval: number,
  ceiling: () => number,
): Promise<InlineAgentAnswer> {
  let first = true;
  while (Date.now() < ceiling()) {
    // The first sleep leaves half the budget, so a timeout shorter than the interval still polls.
    const budget = ceiling() - Date.now();
    await sleep(Math.min(interval, first ? budget / 2 : budget));
    first = false;
    const remaining = ceiling() - Date.now();
    if (remaining <= 0) break;
    const pending = dispatchPoll(conversationId);
    let polled = await withinDeadline(pending, remaining);
    // A joiner may raise the ceiling while this poll is bounded by the old one: keep awaiting the
    // same GET against the new ceiling rather than discarding its answer and dispatching another.
    while (polled === TIMED_OUT) {
      const left = ceiling() - Date.now();
      if (left <= 0) break;
      polled = await withinDeadline(pending, left);
    }
    if (polled === TIMED_OUT) break;
    if (polled === POLL_FAILED) {
      throw resumable(
        new AgentNodeError("failed", "The assistant could not finish. Please try again.", conversationId),
      );
    }
    if (!polled.success) {
      const failures = (pollFailures.get(conversationId) ?? 0) + 1;
      if (failures >= MAX_POLL_FAILURES) {
        pollFailures.delete(conversationId);
        throw new AgentNodeError("failed", "The assistant could not finish. Please try again.", conversationId);
      }
      pollFailures.set(conversationId, failures);
      throw resumable(
        new AgentNodeError("failed", "The assistant could not finish. Please try again.", conversationId),
      );
    }
    pollFailures.delete(conversationId);
    // An empty 202 body means the conversation is still running.
    let payload: Record<string, unknown>;
    try {
      payload = isEmptyBody(polled.data) ? {} : payloadOf(polled.data, conversationId);
    } catch (error) {
      // A malformed poll body is a failed poll: the conversation may still be running.
      if (error instanceof AgentNodeError) throw resumable(error);
      throw error;
    }
    const outcome = readOutcome(payload);
    if (outcome.done === true) return outcome.answer;
    terminate(outcome, conversationId);
  }
  throw resumable(new AgentNodeError("timeout", TOO_LONG, conversationId));
}

const RESUMABLE = new WeakSet<object>();

function resumable(error: AgentNodeError): AgentNodeError {
  RESUMABLE.add(error);
  return error;
}

// Holds the slot until its answer settles. A resumable rejection keeps the slot, marked
// resumable, so a same-message retry polls the same conversation; it is dropped at the
// hard release, or as soon as a different request arrives.
// An answer that settles while no caller can still receive it within its own deadline is kept
// (marked completed) so a same-message retry receives it instead of paying for a second start;
// it is dropped DEFAULT_TIMEOUT_MS later, or as soon as a different request arrives.
function hold(slot: StartSlot, answer: Promise<InlineAgentAnswer>): void {
  answer.then(
    () => {
      if (activeStart !== slot || slot.answer !== answer) return;
      if (hasLiveWaiter(slot)) {
        activeStart = undefined;
      } else {
        retain(slot);
      }
    },
    (error: unknown) => {
      if (activeStart !== slot || slot.answer !== answer) return;
      if (typeof error === "object" && error !== null && RESUMABLE.has(error) && slot.conversationId) {
        slot.resumable = true;
        slot.abandonedAt = Date.now();
        slot.firstAbandonedAt ??= slot.abandonedAt;
      } else {
        activeStart = undefined;
      }
    },
  );
}

function hasLiveWaiter(slot: StartSlot): boolean {
  const now = Date.now();
  return slot.waiters.some((deadline) => deadline >= now);
}

function enter(slot: StartSlot, deadline: number): void {
  slot.waiters.push(deadline);
}

function leave(slot: StartSlot, deadline: number): void {
  const index = slot.waiters.indexOf(deadline);
  if (index >= 0) slot.waiters.splice(index, 1);
}

function retain(slot: StartSlot): void {
  slot.completed = true;
  slot.abandonedAt = Date.now();
  slot.firstAbandonedAt ??= slot.abandonedAt;
}

// A settled answer reaches its caller only within that caller's deadline. An overdue caller
// times out instead, and the answer is kept for a same-message retry.
function deliver(slot: StartSlot, deadline: number, value: InlineAgentAnswer): InlineAgentAnswer {
  if (Date.now() > deadline) {
    if (activeStart === undefined || activeStart === slot) {
      activeStart = slot;
      if (!slot.completed) retain(slot);
    }
    throw new AgentNodeError("timeout", TOO_LONG, slot.conversationId);
  }
  return value;
}

function resume(slot: StartSlot, interval: number, deadline: number): Promise<InlineAgentAnswer> {
  slot.resumable = false;
  slot.abandonedAt = undefined;
  slot.onRaise = undefined;
  slot.ceiling = boundedCeiling(slot, Math.max(deadline, Date.now() + DEFAULT_TIMEOUT_MS));
  const answer = pollUntil(slot.conversationId!, interval, () => slot.ceiling);
  slot.answer = answer;
  hold(slot, answer);
  return shared(slot, deadline);
}

const TIMED_OUT = Symbol("timed-out");
const ABANDONED = Symbol("abandoned");
const POLL_FAILED = Symbol("poll-failed");
const TOO_LONG = "The assistant took too long to respond. Please try again.";
const STILL_WORKING = "The assistant is still working on an earlier request. Please wait a moment, then try again.";
const EARLIER_ANSWER =
  "The assistant finished an earlier request. Send that request again to see its answer, or send this one again to start over.";
const COULD_NOT_START = "The assistant could not start. Please try again.";
const MAY_BE_WORKING = "The assistant may still be working on your request. Please wait a moment before trying again.";

interface StartSlot {
  key: string;
  // Resolves to undefined when the request rejected; never rejects.
  result: Promise<OperationResult | undefined>;
  // Its caller's deadline passed, so the settled response is kept for a retry to adopt.
  abandoned: boolean;
  // When its caller gave up; completed answers expire relative to this time.
  abandonedAt?: number;
  // When it was first abandoned on any hold path (a resumable poll failure or its caller's
  // timeout); never reset, so resends resume it for at most MAX_RESUME_MS from then.
  firstAbandonedAt?: number;
  // Resolves when its caller gives up, so a waiter that began before then re-arms at the expiry.
  abandonment: Promise<typeof ABANDONED>;
  markAbandoned: () => void;
  // Other requests refused in favour of this unadopted response, each with the call count at
  // its refusal: a call of that request issued after its refusal discards the response.
  refused: Map<string, number>;
  // The answer (start response plus polling). It is polled to the slot's ceiling, which each
  // caller sharing it raises to its own deadline, and the slot stays active until it settles.
  answer?: Promise<InlineAgentAnswer>;
  ceiling: number;
  conversationId?: string;
  // Its polling failed or timed out while the conversation may still be running.
  resumable?: boolean;
  // The deadline of each caller currently waiting on the answer.
  waiters: number[];
  // The start request settled (answered, failed or skipped); until then it may still be running.
  settled: boolean;
  // The SDK rejected the start, so whether a conversation began is unknown: never redispatch it.
  uncertain?: boolean;
  // The answer settled successfully with no caller waiting; kept for a same-message retry.
  completed?: boolean;
  // Arms the owner's own deadline once a joiner raises the ceiling past it.
  onRaise?: () => void;
}

// Completed answers abandoned DEFAULT_TIMEOUT_MS or more ago are dropped. Unsettled starts use
// the separate hard release so no second InvokeDefinition is dispatched inside the safety window.
// Inclusive, so the waiter's timer that wakes exactly at the expiry sees it expired.
function expired(slot: StartSlot): boolean {
  return slot.abandonedAt !== undefined && Date.now() - slot.abandonedAt >= DEFAULT_TIMEOUT_MS;
}

function absoluteExpiry(slot: StartSlot): number {
  return slot.firstAbandonedAt === undefined ? Infinity : slot.firstAbandonedAt + MAX_RESUME_MS;
}

function hardReleased(slot: StartSlot): boolean {
  return Date.now() >= absoluteExpiry(slot);
}

function boundedCeiling(slot: StartSlot, ceiling: number): number {
  return Math.min(ceiling, absoluteExpiry(slot));
}

// InvokeDefinition consumes AI credits, is not idempotent, and cannot be cancelled. Starts are
// therefore single-flight for the whole page (module scope, not per component or call site):
// the slot is reserved synchronously before dispatch and held until the request settles and,
// when it started a conversation, until that conversation's polling settles too, even
// after its caller times out. An unsettled abandoned start is hard-released after MAX_RESUME_MS,
// when a new start may dispatch. Any other call waits for it
// within its own deadline. A retry of the same message and locale adopts a late response
// instead of starting a second conversation. The adopted conversation is polled once, to a
// ceiling of at least DEFAULT_TIMEOUT_MS and at most the hard release, and the slot is held until that answer settles:
// meanwhile every same-message caller shares it within its own deadline and other requests
// wait for it. Once it answers, the slot is released. When its polling fails or times out, the
// conversation may still be running, so the slot is kept resumable: a same-message resend polls
// that conversation again rather than paying for a second start, and a different request, or
// the hard release, drops it. A terminal failure releases the slot. While an
// unadopted late answer exists, every call with a different request is refused; a resend of
// the refused request discards the answer and starts over.
let activeStart: StartSlot | undefined;
let calls = 0;

async function start(
  message: string,
  locale: string,
  interval: number,
  deadline: number,
  seq: number,
): Promise<InlineAgentAnswer> {
  const key = JSON.stringify([message, locale.toLowerCase()]);
  for (let current = activeStart; current; current = activeStart) {
    if (hardReleased(current)) {
      activeStart = undefined;
      continue;
    }
    if (current.uncertain) {
      throw new AgentNodeError("timeout", MAY_BE_WORKING);
    }
    if (current.resumable) {
      if (current.key === key) return resume(current, interval, deadline);
      activeStart = undefined;
      continue;
    }
    if (current.completed) {
      if (current.key === key && !expired(current)) return shared(current, deadline);
      activeStart = undefined;
      continue;
    }
    if (current.answer) {
      if (current.key === key) return shared(current, deadline);
      const waitDeadline = Math.min(deadline, absoluteExpiry(current));
      const settled = await withinDeadline(
        current.answer.then(
          () => undefined,
          () => undefined,
        ),
        waitDeadline - Date.now(),
      );
      if (settled === TIMED_OUT) {
        if (hardReleased(current) && activeStart === current) {
          activeStart = undefined;
          continue;
        }
        throw new AgentNodeError("timeout", STILL_WORKING);
      }
      continue;
    }
    if (expired(current)) {
      // An unsettled start may still begin a conversation: never dispatch a second one beside it.
      if (!current.settled) throw new AgentNodeError("timeout", STILL_WORKING);
      activeStart = undefined;
      continue;
    }
    // Wake at the abandonment expiry too, so a waiter never holds on a start past it.
    const expiry = current.abandonedAt === undefined ? Infinity : current.abandonedAt + DEFAULT_TIMEOUT_MS;
    const outcome = await withinDeadline(
      current.abandonedAt === undefined ? Promise.race([current.result, current.abandonment]) : current.result,
      Math.min(deadline, expiry) - Date.now(),
    );
    // Its caller gave up while this one waited: re-read the slot to wait no later than its expiry.
    if (outcome === ABANDONED) continue;
    // The SDK rejected the start while this one waited: a conversation may have begun.
    if (current.uncertain && activeStart === current) continue;
    if (expired(current)) {
      if (!current.settled) throw new AgentNodeError("timeout", STILL_WORKING);
      if (activeStart === current && !current.answer) activeStart = undefined;
      if (Date.now() >= deadline) throw new AgentNodeError("timeout", STILL_WORKING);
      continue;
    }
    if (outcome === TIMED_OUT) throw new AgentNodeError("timeout", STILL_WORKING);
    // Another caller adopted it while this one waited: share that answer even if it already
    // settled and released the slot, so a same-message retry never dispatches a second start.
    if (current.answer && current.key === key) return shared(current, deadline);
    // Another caller settled or adopted it while this one waited: re-read the slot.
    if (activeStart !== current || current.answer) continue;
    if (!current.abandoned || !outcome?.success) {
      // Its own caller handled it, or it failed definitively: nothing to adopt.
      activeStart = undefined;
    } else if (current.key === key) {
      const adopted = current;
      adopted.ceiling = boundedCeiling(adopted, Math.max(deadline, Date.now() + DEFAULT_TIMEOUT_MS));
      adopted.conversationId = conversationIdOf(outcome);
      adopted.answer = finish(outcome, interval, () => adopted.ceiling);
      hold(adopted, adopted.answer);
      return shared(adopted, deadline);
    } else if (!(seq > (current.refused.get(key) ?? Infinity))) {
      current.refused.set(key, calls);
      throw new AgentNodeError("start", EARLIER_ANSWER);
    } else {
      activeStart = undefined;
    }
  }
  if (Date.now() >= deadline) throw new AgentNodeError("timeout", STILL_WORKING);
  let markAbandoned = () => {};
  const abandonment = new Promise<typeof ABANDONED>((resolve) => {
    markAbandoned = () => resolve(ABANDONED);
  });
  const slot: StartSlot = {
    key,
    result: Promise.resolve(undefined),
    abandoned: false,
    abandonment,
    markAbandoned,
    refused: new Map(),
    ceiling: deadline,
    // The owner waits from dispatch: an answer that settles before it resumes was still received.
    waiters: [deadline],
    settled: false,
  };
  // SDK/bridge rejections carry raw connector or transport text; never let it reach the UI.
  slot.result = Promise.resolve()
    .then(() => {
      // The page may have stalled past the deadline before this continuation ran: never pay
      // for a start no caller can still wait for.
      if (Date.now() >= deadline) return undefined;
      return AgentsService.InvokeDefinition({
        botDefinition: JSON.stringify(INLINE_AGENT_DEFINITION),
        message,
        locale,
      }) as Promise<OperationResult>;
    })
    .then(
      (response) => response,
      () => {
        slot.uncertain = true;
        return undefined;
      },
    )
    .then((response) => {
      slot.settled = true;
      if (slot.uncertain) {
        // The start may have begun a conversation this page cannot see: hold the slot until the
        // expiry so no second start dispatches while it may still be running.
        if (activeStart === slot && slot.abandonedAt === undefined) {
          slot.abandonedAt = Date.now();
          slot.firstAbandonedAt ??= slot.abandonedAt;
        }
        return response;
      }
      if (activeStart === slot && !slot.abandoned) {
        if (response?.success) {
          // Hold the slot through polling, set before any waiter resumes, so no other start
          // dispatches while this conversation is still running. A same-message caller with a
          // longer budget raises the poll's ceiling to its own deadline when it joins.
          slot.conversationId = conversationIdOf(response);
          slot.answer = finish(response, interval, () => slot.ceiling);
          hold(slot, slot.answer);
        } else {
          activeStart = undefined;
        }
      }
      return response;
    });
  activeStart = slot;
  const response = await withinDeadline(slot.result, deadline - Date.now());
  if (response === TIMED_OUT || !response?.success || !slot.answer) leave(slot, deadline);
  if (response === TIMED_OUT) {
    if (slot.answer) return shared(slot, deadline);
    slot.abandoned = true;
    slot.abandonedAt = Date.now();
    slot.firstAbandonedAt ??= slot.abandonedAt;
    slot.markAbandoned();
    throw new AgentNodeError("timeout", TOO_LONG);
  }
  if (slot.uncertain) throw new AgentNodeError("start", MAY_BE_WORKING);
  if (!response?.success) throw new AgentNodeError("start", COULD_NOT_START);
  if (!slot.answer) return finish(response, interval, () => deadline);
  // The poll's ceiling is the owner's deadline until a joiner raises it; only then is the owner
  // bounded separately, so it still gives up at its own deadline.
  const answer = slot.answer;
  return new Promise<InlineAgentAnswer>((resolve, reject) => {
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
    let waiting = true;
    const stop = () => {
      if (waiting) leave(slot, deadline);
      waiting = false;
    };
    const arm = () => {
      if (timer !== undefined) return;
      timer = globalThis.setTimeout(
        () => {
          stop();
          reject(new AgentNodeError("timeout", TOO_LONG, slot.conversationId));
        },
        timerDelay(deadline - Date.now()),
      );
    };
    if (slot.ceiling > deadline) arm();
    else slot.onRaise = arm;
    answer.then(
      (value) => {
        globalThis.clearTimeout(timer);
        stop();
        try {
          resolve(deliver(slot, deadline, value));
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        globalThis.clearTimeout(timer);
        stop();
        reject(error);
      },
    );
  });
}

// A caller shares the slot's answer, extending its poll to the caller's own deadline, but never
// waits past that deadline.
async function shared(slot: StartSlot, deadline: number): Promise<InlineAgentAnswer> {
  if (deadline > slot.ceiling) {
    slot.ceiling = boundedCeiling(slot, deadline);
    slot.onRaise?.();
    slot.onRaise = undefined;
  }
  const effectiveDeadline = Math.min(deadline, absoluteExpiry(slot));
  if (Date.now() >= effectiveDeadline) {
    if (activeStart === slot && hardReleased(slot)) activeStart = undefined;
    throw new AgentNodeError("timeout", TOO_LONG, slot.conversationId);
  }
  enter(slot, effectiveDeadline);
  let result: InlineAgentAnswer | typeof TIMED_OUT;
  try {
    result = await withinDeadline(slot.answer!, effectiveDeadline - Date.now());
  } finally {
    leave(slot, effectiveDeadline);
  }
  if (result === TIMED_OUT) {
    if (hardReleased(slot) && activeStart === slot) activeStart = undefined;
    throw new AgentNodeError("timeout", TOO_LONG, slot.conversationId);
  }
  result = deliver(slot, deadline, result);
  // A retained answer is released once a caller receives it.
  if (slot.completed && activeStart === slot) activeStart = undefined;
  return result;
}

// Labels a shared caller's timeout only; finish() reports a malformed or empty response itself.
function conversationIdOf(response: OperationResult): string | undefined {
  try {
    const id = payloadOf(response.data).conversationId;
    return typeof id === "string" && id ? id : undefined;
  } catch {
    return undefined;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, timerDelay(ms)));
}

async function withinDeadline<T>(request: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  const expired = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = globalThis.setTimeout(() => resolve(TIMED_OUT), timerDelay(ms));
  });
  try {
    return await Promise.race([request, expired]);
  } finally {
    globalThis.clearTimeout(timer);
  }
}

function timerDelay(ms: number): number {
  if (!Number.isFinite(ms)) return MAX_TIMER_MS;
  return Math.min(Math.max(0, ms), MAX_TIMER_MS);
}

// SDK/bridge rejections carry raw connector or transport text; never let it reach the UI. The
// promise never rejects, so a poll that outlives one deadline can be awaited again under the next.
function dispatchPoll(conversationId: string): Promise<OperationResult | typeof POLL_FAILED> {
  return Promise.resolve()
    .then(() => poll(conversationId))
    .catch(() => POLL_FAILED);
}

function isEmptyBody(data: unknown): boolean {
  return data === undefined || data === null || (typeof data === "string" && data.trim() === "");
}

// Some connector versions answer in `text` or `response` instead of `message`.
function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

function readOutcome(payload: Payload): Outcome {
  const status = typeof payload.status === "string" ? payload.status.toLowerCase() : undefined;
  // A non-terminal status may carry interim activities; only a successful terminal status
  // (or a statusless immediate answer) completes the conversation.
  if (status && RUNNING_STATUSES.has(status)) return { done: false };
  if (status && !SUCCEEDED_STATUSES.has(status)) return { done: "failed" };
  const answer: InlineAgentAnswer = {
    conversationId: typeof payload.conversationId === "string" ? payload.conversationId : undefined,
    message: firstText(payload.message, payload.text, payload.response),
    structuredOutput: "structuredOutput" in payload ? payload.structuredOutput : undefined,
    activities: Array.isArray(payload.activities) && payload.activities.length ? payload.activities : undefined,
    files: Array.isArray(payload.files) && payload.files.length ? payload.files : undefined,
  };
  if (answer.message || answer.structuredOutput !== undefined || answer.activities || answer.files) {
    return { done: true, answer };
  }
  return status ? { done: "empty" } : { done: false };
}

function terminate(outcome: Outcome, conversationId?: string): void {
  if (outcome.done === "failed") {
    throw new AgentNodeError("failed", "The assistant could not finish. Please try again.", conversationId);
  }
  if (outcome.done === "empty") {
    throw new AgentNodeError("empty", "The assistant returned no response. Please try again.", conversationId);
  }
}

function payloadOf(data: unknown, conversationId?: string): Payload {
  const value = typeof data === "string" ? parseJson(data) : data;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AgentNodeError("malformed", "The assistant returned an unexpected response. Please try again.", conversationId);
  }
  return value as Payload;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

type ApiDefinition = Parameters<typeof getClient>[0][string]["apis"][string];
const pathParameter = (name: string) => ({ name, in: "path", required: true, type: "string" });
const GET_AGENT_CONVERSATION: ApiDefinition = {
  path: "/{connectionId}/copilotflows/agentnodes/conversations/{conversationId}",
  method: "GET",
  parameters: [pathParameter("connectionId"), pathParameter("conversationId")],
  responseInfo: { "200": { type: "object" }, "202": { type: "object" }, default: { type: "void" } },
};
let extendedClient: ReturnType<typeof getClient> | undefined;

function poll(conversationId: string): Promise<OperationResult> {
  const source = dataSources[AGENTNODE_DATA_SOURCE];
  extendedClient ??= getClient({
    ...dataSources,
    [AGENTNODE_DATA_SOURCE]: {
      ...source,
      apis: { ...source.apis, GetAgentConversation: GET_AGENT_CONVERSATION },
    },
  });
  return extendedClient.executeAsync<{ conversationId: string }, Payload>({
    connectorOperation: {
      tableName: AGENTNODE_DATA_SOURCE,
      operationName: "GetAgentConversation",
      parameters: { conversationId },
    },
  }) as Promise<OperationResult>;
}
