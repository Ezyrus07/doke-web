// Stage 61B: stable frontend data contract for notification entities.
export const notificationContract = Object.freeze({
  entity: 'notification',
  version: 1,
  required: Object.freeze(['id']),
  fields: Object.freeze(['id', 'type', 'title', 'body', 'href', 'readAt', 'createdAt']),
});

export function getNotificationContract() {
  return notificationContract;
}
