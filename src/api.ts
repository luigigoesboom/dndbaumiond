import type { Character, CharacterRecord, CharacterSummary } from '../shared/character.ts';
import type { CustomClassFile } from '../shared/customClass.ts';
import type { SpellCollectionFile } from '../shared/customSpells.ts';
import type { LibraryRecord } from '../shared/validate.ts';

/** An API error, with the HTTP status and the server's validation details when it sent any. */
export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];
  readonly body: unknown;
  constructor(message: string, status: number, details: string[] = [], body: unknown = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.body = body;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  } catch {
    throw new ApiError('Could not reach the server', 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; details?: string[] } | null;
    throw new ApiError(body?.error ?? `${init?.method ?? 'GET'} ${url} failed (${res.status})`, res.status, body?.details ?? [], body);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
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

export type { LibraryRecord };
export const classApi = libraryApi<CustomClassFile>('/api/classes');
export const spellCollectionApi = libraryApi<SpellCollectionFile>('/api/spell-collections');

const characterUrl = (id: number) => `/api/characters/${id}`;
/** `baseVersion` null = overwrite whatever is on the server (used after the player chose "Keep mine"). */
const versionHeader = (baseVersion: number | null): Record<string, string> =>
  baseVersion === null ? {} : { 'X-Base-Version': String(baseVersion) };

export const api = {
  list: () => request<CharacterSummary[]>('/api/characters'),
  get: (id: number) => request<CharacterRecord>(characterUrl(id)),
  create: (data: Partial<Character> = {}) =>
    request<CharacterRecord>('/api/characters', { method: 'POST', body: JSON.stringify(data) }),
  save: (id: number, data: Character, baseVersion: number | null) =>
    request<CharacterRecord>(characterUrl(id), {
      method: 'PUT',
      headers: versionHeader(baseVersion),
      body: JSON.stringify(data),
    }),
  /**
   * Best-effort save while the page is being closed. keepalive requests are limited to
   * 64 KB, so big sheets fall back to the beforeunload "unsaved changes" warning.
   */
  saveOnExit(id: number, data: Character, baseVersion: number): boolean {
    const body = JSON.stringify(data);
    if (body.length > 60_000) return false;
    void fetch(characterUrl(id), {
      method: 'PUT',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...versionHeader(baseVersion) },
      body,
    }).catch(() => {});
    return true;
  },
  remove: (id: number) => request<void>(characterUrl(id), { method: 'DELETE' }),
};
