// Stage 61B: stable frontend data contract for message entities.
export const messageContract = Object.freeze({
  entity: 'message',
  version: 1,
  required: Object.freeze(['id']),
  fields: Object.freeze(['id', 'conversationId', 'sender', 'body', 'attachments', 'readAt', 'createdAt']),
});

export function getMessageContract() {
  return messageContract;
}
