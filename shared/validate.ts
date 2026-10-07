// Small helpers shared by every validator / JSON library.

export type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** A stored, user-entered JSON document (custom class, spell collection). */
export interface LibraryRecord<T> {
  id: number;
  name: string;
  data: T;
  updatedAt: string;
}
