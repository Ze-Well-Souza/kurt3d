import type { Order } from "../domain/types";
import { logger } from "./logger.server";

export const ORDER_NOTIFICATION_FEATURES = {
  emailEnabled: false,
  smsEnabled: false,
};

export function getOrderNotificationProviderConfig() {
  return {
    resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY),
    twilioSidConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID),
    twilioTokenConfigured: Boolean(process.env.TWILIO_AUTH_TOKEN),
    twilioPhoneConfigured: Boolean(process.env.TWILIO_PHONE_NUMBER),
  };
}

export async function notifyOrderStatusChange(input: {
  order: Order;
  previousStatus?: Order["status"];
  nextStatus: Order["status"];
}) {
  if (!ORDER_NOTIFICATION_FEATURES.emailEnabled && !ORDER_NOTIFICATION_FEATURES.smsEnabled) {
    logger.debug("orders.notifications.disabled", {
      orderId: input.order.id,
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
      providerConfig: getOrderNotificationProviderConfig(),
    });
    return { sent: false as const, reason: "disabled" as const };
  }

  return { sent: false as const, reason: "not_implemented" as const };
}
