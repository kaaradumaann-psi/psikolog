import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import type { AuthenticatedUser } from '../src/auth/authTypes';

const admin: AuthenticatedUser = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: 'administrator@example.test', firstName: 'Test', lastName: 'Admin',
  role: 'ADMIN', active: true, organizationId: null,
};

test('kurumsuz gerçek ADMIN SSR: klinik dosyası yerine güvenli yönetim kurulumu ve zorunlu kurum seçimi görünür', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { AdminSetupPage } = await vite.ssrLoadModule('/src/components/practice/AdminSetupPage.tsx');
    const html = renderToString(createElement(AdminSetupPage, {
      user: admin, onLogout: () => {}, onOwnOrganizationAssigned: () => {}, logoutError: null,
    }));
    assert.match(html, /Sistem yöneticisi kurulumu/);
    assert.match(html, /Kurum ve hesap yönetimi/);
    assert.match(html, /Kurum seçin/);
    assert.match(html, /disabled=""/);
    assert.doesNotMatch(html, /Danışan Dosyaları/);
    const { CloudAdminPanel } = await vite.ssrLoadModule('/src/components/practice/CloudAdminPanel.tsx');
    const orgAdminHtml = renderToString(createElement(CloudAdminPanel, {
      user: { ...admin, role: 'ORG_ADMIN', organizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    }));
    assert.match(orgAdminHtml, /Yönettiğiniz kurum/);
    assert.doesNotMatch(orgAdminHtml, /Yeni kurum adı/);
    assert.doesNotMatch(orgAdminHtml, /Kurum atanmamış/);
  } finally {
    await vite.close();
  }
});
