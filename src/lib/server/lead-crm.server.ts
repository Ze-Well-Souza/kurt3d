import type { Lead } from "../domain/types";
import { logger } from "./logger.server";

export const LEAD_CRM_FEATURES = {
  enabled: false,
};

export function getLeadCrmProviderConfig() {
  return {
    hubspotConfigured: Boolean(process.env.HUBSPOT_ACCESS_TOKEN),
    pipefyConfigured: Boolean(process.env.PIPEFY_TOKEN),
    notionConfigured: Boolean(process.env.NOTION_TOKEN),
  };
}

export async function syncLeadToCrm(lead: Lead) {
  if (!LEAD_CRM_FEATURES.enabled) {
    logger.debug("leads.crm.disabled", {
      leadId: lead.id,
      providerConfig: getLeadCrmProviderConfig(),
    });
    return { synced: false as const, reason: "disabled" as const };
  }

  return { synced: false as const, reason: "not_implemented" as const };
}
