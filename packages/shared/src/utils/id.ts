import { randomUUID } from 'node:crypto';

export function generateId(prefix?: string): string {
  const uuid = randomUUID().replace(/-/g, '').substring(0, 16);
  return prefix ? `${prefix}_${uuid}` : uuid;
}
