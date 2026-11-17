/**
 * Data binding adapter — the ONLY source file (with radar.config.ts and src/assets) that differs between
 * radar instances. Every other module imports the list services from here, never from generated/ directly,
 * so the master app and each read-only customer app run the same code on their own lists.
 *
 * This instance: the master radar (lists *-704f56, AI consumption log, Agents and SharePoint actions).
 * A read-only customer app binds its own copy lists (e.g. UseCases-<ACCOUNT>) and exports refusing stubs for
 * the services it does not carry (AI consumption, Agents, SharePoint actions).
 */
import type { getClient } from "@microsoft/managed-apps/data";
import generatedDataSources from "../../generated/dataSources";

export { UseCases_704f56Service as UseCasesService } from "../../generated/services/UseCases_704f56Service";
export { Signals_704f56Service as SignalsService } from "../../generated/services/Signals_704f56Service";
export { Customers_704f56Service as CustomersService } from "../../generated/services/Customers_704f56Service";
export { FeatureRadar_704f56Service as FeatureRadarService } from "../../generated/services/FeatureRadar_704f56Service";
export { AIConsumption_704f56Service as AIConsumptionService } from "../../generated/services/AIConsumption_704f56Service";
export { AgentsService } from "../../generated/services/AgentsService";
export { SharePointService } from "../../generated/services/SharePointService";

export type { UseCases_704f56Read as UseCasesRead, UseCases_704f56Write as UseCasesWrite } from "../../generated/models/UseCases_704f56Model";
export type { Signals_704f56Read as SignalsRead } from "../../generated/models/Signals_704f56Model";
export type { FeatureRadar_704f56Read as FeatureRadarRead } from "../../generated/models/FeatureRadar_704f56Model";

export const dataSources: Parameters<typeof getClient>[0] = generatedDataSources;

/** Whether this instance logs AI consumption (the meter, the FinOps consumption section). */
export const HAS_AI_CONSUMPTION = true;
