export function canonicalWebhookBody(input: {
  eventId: string;
  type: string;
  checkoutId: string;
}): string {
  return JSON.stringify({
    eventId: input.eventId,
    type: input.type,
    checkoutId: input.checkoutId,
  });
}
