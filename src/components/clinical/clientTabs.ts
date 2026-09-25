/**
 * Danışan dosyası sekmeleri — tek canonical kaynak.
 *
 * Both the tab bar and every deep link (`?sekme=…`) must go through this module.
 * Previously the dashboard emitted `?sekme=formulasyon` while the detail page
 * only accepted `formulation`, so the "Formülasyon" button silently landed on
 * the sessions tab. Canonical ids are the `ClientTab` values; Turkish aliases
 * are accepted on read only, so existing bookmarks keep working.
 */

export type ClientTab =
  | 'overview'
  | 'sessions'
  | 'formulation'
  | 'tests'
  | 'progress'
  | 'reports'
  | 'notes'
  | 'documents';

export const CLIENT_TABS: { id: ClientTab; label: string }[] = [
  { id: 'sessions', label: 'Seans notları' },
  { id: 'formulation', label: 'Formülasyon' },
  { id: 'tests', label: 'Ölçekler' },
  { id: 'progress', label: 'Gelişim' },
  { id: 'overview', label: 'Anamnez' },
  { id: 'notes', label: 'Notlar' },
  { id: 'documents', label: 'Belgeler' },
  { id: 'reports', label: 'Raporlar' },
];

export const DEFAULT_CLIENT_TAB: ClientTab = 'sessions';

/** Read-only aliases: Turkish spellings that older links may still carry. */
const TAB_ALIASES: Record<string, ClientTab> = {
  anamnez: 'overview',
  profil: 'overview',
  seans: 'sessions',
  seanslar: 'sessions',
  formulasyon: 'formulation',
  olcek: 'tests',
  olcekler: 'tests',
  testler: 'tests',
  gelisim: 'progress',
  ilerleme: 'progress',
  rapor: 'reports',
  raporlar: 'reports',
  not: 'notes',
  notlar: 'notes',
  belge: 'documents',
  belgeler: 'documents',
};

const TAB_IDS = new Set<string>(CLIENT_TABS.map((tab) => tab.id));

/** Canonical query string for a client file deep link. Always use this to build links. */
export function clientTabQuery(tab: ClientTab): string {
  return `sekme=${tab}`;
}

export function clientTabPath(clientId: string, tab: ClientTab): string {
  return `/danisanlar/${encodeURIComponent(clientId)}?${clientTabQuery(tab)}`;
}

/** Resolve `?sekme=…` to a canonical tab. Unknown or missing values fall back to the default. */
export function parseClientTab(search: string): ClientTab {
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(search).get('sekme');
  } catch {
    return DEFAULT_CLIENT_TAB;
  }
  if (!raw) return DEFAULT_CLIENT_TAB;
  const key = raw.trim().toLowerCase();
  if (TAB_IDS.has(key)) return key as ClientTab;
  return TAB_ALIASES[key] ?? DEFAULT_CLIENT_TAB;
}

export function clientTabLabel(tab: ClientTab): string {
  return CLIENT_TABS.find((item) => item.id === tab)?.label ?? '';
}

/**
 * Deep link that opens a client's session tab with the SOAP form prefilled from
 * a specific appointment, so the appointment → session link is preserved.
 */
export function clientSessionFromAppointmentPath(clientId: string, appointmentId: string): string {
  return `/danisanlar/${encodeURIComponent(clientId)}?${clientTabQuery('sessions')}&randevu=${encodeURIComponent(appointmentId)}`;
}

export function parseAppointmentParam(search: string): string | null {
  try {
    const value = new URLSearchParams(search).get('randevu');
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}
