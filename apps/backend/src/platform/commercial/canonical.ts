export function canonicalWebhookBody(input: {
  eventId: string;
  type: string;
  checkoutId: string;
  occurredAt?: string;
}): string {
  return JSON.stringify({
    eventId: input.eventId,
    type: input.type,
    checkoutId: input.checkoutId,
    occurredAt: input.occurredAt || '',
  });
}
