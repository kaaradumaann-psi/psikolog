import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

import {
  CLIENT_TABS,
  DEFAULT_CLIENT_TAB,
  clientSessionFromAppointmentPath,
  clientTabPath,
  parseAppointmentParam,
  parseClientTab,
} from '../src/components/clinical/clientTabs.ts';

test('client tab deep links resolve to one canonical key', () => {
  // Canonical ids round-trip untouched.
  for (const tab of CLIENT_TABS) {
    assert.equal(parseClientTab(`?sekme=${tab.id}`), tab.id);
  }
  // The Turkish spelling that used to fall through to the sessions tab.
  assert.equal(parseClientTab('?sekme=formulasyon'), 'formulation');
  assert.equal(parseClientTab('?sekme=Formulasyon'), 'formulation');
  // Other Turkish aliases.
  assert.equal(parseClientTab('?sekme=olcekler'), 'tests');
  assert.equal(parseClientTab('?sekme=gelisim'), 'progress');
  assert.equal(parseClientTab('?sekme=anamnez'), 'overview');
  // Missing / unknown values fall back instead of silently guessing.
  assert.equal(parseClientTab(''), DEFAULT_CLIENT_TAB);
  assert.equal(parseClientTab('?sekme=olmayan-sekme'), DEFAULT_CLIENT_TAB);
  assert.equal(clientTabPath('abc', 'formulation'), '/danisanlar/abc?sekme=formulation');
});

/**
 * End-to-end at the render layer: the dashboard "Formülasyon" control must point
 * at a URL that actually opens the formulation section of the client file, and
 * must not land on the sessions tab. Rendered through Vite so the real
 * components, router helper and stores are exercised.
 */
test('dashboard Formülasyon link opens the formulation tab, not sessions', async () => {
  const storage = new Map<string, string>();
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  Object.assign(globalThis, {
    window: {
      location: { pathname: '/', search: '', hash: '' },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    },
  });

  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const clinicalStore = await vite.ssrLoadModule('/src/clinical/clinicalStore.ts');
    const recordRules = await vite.ssrLoadModule('/src/clinical/recordRules.ts');
    const { Dashboard } = await vite.ssrLoadModule('/src/components/Dashboard.tsx');
    const { ClientDetailPage } = await vite.ssrLoadModule('/src/components/clinical/ClientDetailPage.tsx');

    const today = recordRules.clinicToday();
    const clientId = 'cli_formulation_test';
    clinicalStore.saveClient({
      id: clientId,
      fileNumber: 'HK-2026-900',
      firstName: 'Deneme',
      lastName: 'Danışan',
      birthDate: '1990-01-01',
      age: 36,
      gender: 'KADIN',
      phone: '',
      email: '',
      occupation: '',
      education: '',
      maritalStatus: '',
      emergencyContact: { name: '', phone: '', relation: '' },
      presentingComplaint: '',
      medicalHistory: '',
      psychiatricHistory: '',
      medications: '',
      familyHistory: '',
      allergiesNotes: '',
      diagnoses: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    clinicalStore.saveAppointment({
      id: 'apt_formulation_test',
      clientId,
      clientName: 'Deneme Danışan',
      date: today,
      time: '14:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      location: 'Klinik (Yüz Yüze)',
      status: 'scheduled',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
    });

    // 1 · The dashboard control carries the canonical URL.
    const dashboardHtml = renderToString(
      createElement(Dashboard, {
        user: {
          id: 'u1', email: 'a@b.c', firstName: 'Elif', lastName: 'Demir',
          role: 'PSYCHOLOG', active: true, organizationId: null,
        },
      }),
    );
    const href = /href="(\/danisanlar\/[^"]*sekme=[^"]*)"[^>]*>Formülasyon</.exec(dashboardHtml);
    assert.ok(href, 'Dashboard should render a Formülasyon deep link');
    assert.equal(href![1], clientTabPath(clientId, 'formulation'));

    // 2 · That exact URL opens the formulation section.
    const search = href![1].slice(href![1].indexOf('?'));
    assert.equal(parseClientTab(search), 'formulation');
    window.location.pathname = `/danisanlar/${clientId}`;
    window.location.search = search;
    const detailHtml = renderToString(createElement(ClientDetailPage, { clientId }));
    assert.match(detailHtml, /Vaka formülasyonu/);
    assert.doesNotMatch(detailHtml, /Kronolojik Seans Geçmişi/);

    // 3 · The old Turkish value still lands on formulation (bookmarks keep working).
    window.location.search = '?sekme=formulasyon';
    const legacyHtml = renderToString(createElement(ClientDetailPage, { clientId }));
    assert.match(legacyHtml, /Vaka formülasyonu/);
    assert.doesNotMatch(legacyHtml, /Kronolojik Seans Geçmişi/);

    // 4 · Default still opens the sessions tab.
    window.location.search = '';
    const defaultHtml = renderToString(createElement(ClientDetailPage, { clientId }));
    assert.match(defaultHtml, /Kronolojik Seans Geçmişi/);
    assert.doesNotMatch(defaultHtml, /Vaka formülasyonu/);
  } finally {
    await vite.close();
    Object.assign(globalThis, { window: previousWindow, localStorage: previousStorage });
  }
});


test('randevudan seans bağlantısı doğru danışanı ve seans sekmesini hedefler', () => {
  const href = clientSessionFromAppointmentPath('cli_1', 'apt_2');
  assert.equal(href, '/danisanlar/cli_1?sekme=sessions&randevu=apt_2');
  const search = href.slice(href.indexOf('?'));
  assert.equal(parseClientTab(search), 'sessions');
  assert.equal(parseAppointmentParam(search), 'apt_2');
  assert.equal(parseAppointmentParam('?sekme=sessions'), null);
  assert.equal(parseAppointmentParam('?randevu=%20'), null);
});

/**
 * §8 of the P0 scope: converting an appointment into a session must keep the
 * appointment link. The dashboard prep card links to the client's session tab
 * carrying ?randevu=…, and that link must resolve to the session section.
 */
test('panodaki hazırlık kartı seans notunu randevu bağlantısıyla açar', async () => {
  const storage = new Map<string, string>();
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  Object.assign(globalThis, {
    window: {
      location: { pathname: '/', search: '', hash: '' },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    },
  });

  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const clinicalStore = await vite.ssrLoadModule('/src/clinical/clinicalStore.ts');
    const recordRules = await vite.ssrLoadModule('/src/clinical/recordRules.ts');
    const { Dashboard } = await vite.ssrLoadModule('/src/components/Dashboard.tsx');
    const { ClientDetailPage } = await vite.ssrLoadModule('/src/components/clinical/ClientDetailPage.tsx');

    const clientId = 'cli_elif_yilmaz';
    const appointmentId = 'apt_elif_yilmaz';
    clinicalStore.saveClient({
      id: clientId,
      fileNumber: 'HY-2026-001',
      firstName: 'Elif',
      lastName: 'Yılmaz',
      birthDate: '1990-01-01',
      age: 36,
      gender: 'KADIN',
      phone: '', email: '', occupation: '', education: '', maritalStatus: '',
      emergencyContact: { name: '', phone: '', relation: '' },
      presentingComplaint: '', medicalHistory: '', psychiatricHistory: '',
      medications: '', familyHistory: '', allergiesNotes: '', diagnoses: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    clinicalStore.saveAppointment({
      id: appointmentId,
      clientId,
      clientName: 'Elif Yılmaz',
      date: recordRules.clinicToday(),
      time: '09:30',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      location: 'Klinik (Yüz Yüze)',
      status: 'scheduled',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
    });

    const dashboardHtml = renderToString(
      createElement(Dashboard, {
        user: {
          id: 'u1', email: 'a@b.c', firstName: 'Elif', lastName: 'Demir',
          role: 'PSYCHOLOG', active: true, organizationId: null,
        },
      }),
    );
    const link = /href="(\/danisanlar\/[^"]*randevu=[^"]*)"[^>]*>Seans notu</.exec(dashboardHtml);
    assert.ok(link, 'hazırlık kartı randevuyu taşıyan bir seans notu bağlantısı render etmeli');
    // React escapes "&" to "&amp;" in the attribute; the browser hands the
    // router the decoded form, so compare against the decoded href.
    const target = link![1].replaceAll('&amp;', '&');
    assert.equal(target, clientSessionFromAppointmentPath(clientId, appointmentId));

    // The link resolves to the session tab, and the prefilled form is opened
    // with the appointment id so the session row keeps its appointment link.
    window.location.pathname = `/danisanlar/${clientId}`;
    window.location.search = target.slice(target.indexOf('?'));
    assert.equal(parseClientTab(window.location.search), 'sessions');
    assert.equal(parseAppointmentParam(window.location.search), appointmentId);

    const detailHtml = renderToString(createElement(ClientDetailPage, { clientId }));
    assert.match(detailHtml, /Kronolojik Seans Geçmişi/);
  } finally {
    await vite.close();
    Object.assign(globalThis, { window: previousWindow, localStorage: previousStorage });
  }
});
