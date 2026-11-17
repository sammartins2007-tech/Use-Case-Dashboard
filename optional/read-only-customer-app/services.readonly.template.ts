/**
 * Data binding adapter — the ONLY source file (with radar.config.ts and src/assets) that differs between
 * radar instances. Every other module imports the list services from here, never from generated/ directly,
 * so the master app and each read-only customer app run the same code on their own lists.
 *
 * This instance: a READ-ONLY customer app on its own copy lists (*-{{ACC}}, synced from the master lists by
 * optional/read-only-customer-app/customer_copy.py). It carries no AI consumption log, no Agents and no SharePoint actions:
 * those services are stubs that refuse, and the UI hides everything that would use them.
 */
import type { getClient, IOperationResult } from "@microsoft/managed-apps/data";
import generatedDataSources from "../../generated/dataSources";
import { LIVE_READ_ONLY_MESSAGE } from "@/lib/read-only";

export { UseCases_{{ACC}}Service as UseCasesService } from "../../generated/services/UseCases_{{ACC}}Service";
export { Signals_{{ACC}}Service as SignalsService } from "../../generated/services/Signals_{{ACC}}Service";
export { Customers_{{ACC}}Service as CustomersService } from "../../generated/services/Customers_{{ACC}}Service";
export { FeatureRadar_{{ACC}}Service as FeatureRadarService } from "../../generated/services/FeatureRadar_{{ACC}}Service";

export type { UseCases_{{ACC}}Read as UseCasesRead, UseCases_{{ACC}}Write as UseCasesWrite } from "../../generated/models/UseCases_{{ACC}}Model";
export type { Signals_{{ACC}}Read as SignalsRead } from "../../generated/models/Signals_{{ACC}}Model";
export type { FeatureRadar_{{ACC}}Read as FeatureRadarRead } from "../../generated/models/FeatureRadar_{{ACC}}Model";

export const dataSources: Parameters<typeof getClient>[0] = generatedDataSources;

/** Whether this instance logs AI consumption (the meter, the FinOps consumption section). */
export const HAS_AI_CONSUMPTION = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;
const refused = <T,>(): Promise<IOperationResult<T>> => Promise.resolve({ success: false, error: new Error(LIVE_READ_ONLY_MESSAGE) } as IOperationResult<T>);

/** Not bound in this instance: reads return nothing, writes are refused. */
export class AIConsumptionService {
  static async getAll(_options?: unknown): Promise<IOperationResult<AnyRow[]>> {
    return { success: true, data: [] } as unknown as IOperationResult<AnyRow[]>;
  }
  static create(_record: unknown): Promise<IOperationResult<AnyRow>> {
    return refused();
  }
}

/** Not bound in this instance: AI agents are not available in a read-only app. */
export class AgentsService {
  static InvokeDefinition(_body: Record<string, unknown>): Promise<IOperationResult<AnyRow>> {
    return refused();
  }
}

/** Not bound in this instance: a read-only app never writes files to the library. */
export class SharePointService {
  static CreateFile(_dataset: string, _folderPath: string, _name: string, _body: string): Promise<IOperationResult<AnyRow>> {
    return refused();
  }
}
