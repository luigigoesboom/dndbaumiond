import type { Character, CharacterRecord, CharacterSummary } from '../shared/character.ts';
import type { CustomClassFile, CustomClassRecord } from '../shared/customClass.ts';
import type { SpellCollectionFile } from '../shared/customSpells.ts';

/** An API error, with the server's validation details when it sent any. */
export class ApiError extends Error {
  readonly details: string[];
  constructor(message: string, details: string[] = []) {
    super(message);
    this.details = details;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; details?: string[] } | null;
    throw new ApiError(body?.error ?? `${init?.method ?? 'GET'} ${url} failed (${res.status})`, body?.details ?? []);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface LibraryRecord<T> {
  id: number;
  name: string;
  data: T;
  updatedAt: string;
}

/** CRUD for a user-entered JSON library (server/jsonLibrary.ts). */
export function libraryApi<T>(base: string) {
  return {
    list: () => request<LibraryRecord<T>[]>(base),
    template: () => request<T>(`${base}/template`),
    create: (data: unknown) => request<LibraryRecord<T>>(base, { method: 'POST', body: JSON.stringify(data) }),
    save: (id: number, data: unknown) => request<LibraryRecord<T>>(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`${base}/${id}`, { method: 'DELETE' }),
  };
}

export const classApi = libraryApi<CustomClassFile>('/api/classes');
export const spellCollectionApi = libraryApi<SpellCollectionFile>('/api/spell-collections');
export type { CustomClassRecord };

export const api = {
  list: () => request<CharacterSummary[]>('/api/characters'),
  get: (id: number) => request<CharacterRecord>(`/api/characters/${id}`),
  create: (data: Partial<Character> = {}) =>
    request<CharacterRecord>('/api/characters', { method: 'POST', body: JSON.stringify(data) }),
  save: (id: number, data: Character) =>
    request<CharacterRecord>(`/api/characters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/api/characters/${id}`, { method: 'DELETE' }),
};
