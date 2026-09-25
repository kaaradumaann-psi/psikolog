import { supabaseConfig } from '../auth/supabaseClient';
import { isValidUuid } from '../lib/validation';

const MAP_KEY = 'psikolog_client_id_map_v1';

export function isCanonicalClientId(id: string): boolean {
  return isValidUuid(id);
}

export function isLegacyClientId(id: string): boolean {
  return id.startsWith('cli_') && id.length >= 8 && id.length <= 80 && !isCanonicalClientId(id);
}

export function newClientId(): string {
  if (supabaseConfig.configured && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function loadClientIdMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [legacy, canonical] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof canonical === 'string' && isCanonicalClientId(canonical)) out[legacy] = canonical;
    }
    return out;
  } catch {
    return {};
  }
}

export function rememberClientIdMapping(legacyId: string, canonicalId: string): void {
  if (!isLegacyClientId(legacyId) || !isCanonicalClientId(canonicalId)) return;
  const map = loadClientIdMap();
  map[legacyId] = canonicalId;
  localStorage.setItem(MAP_KEY, JSON.stringify(map));
}

export function resolveClientId(id: string): string {
  if (isCanonicalClientId(id)) return id;
  return loadClientIdMap()[id] ?? id;
}
