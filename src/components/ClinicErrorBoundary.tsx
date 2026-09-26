import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { supabaseConfig } from '../auth/supabaseClient';

type State = { failed: boolean };

export class ClinicErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the technical diagnosis in the console, not on a clinical screen.
    // Do not log error.message: a third-party error can contain patient content.
    console.error('Klinik arayüzünde beklenmedik hata', {
      type: error.name,
      component: info.componentStack,
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main style={{ maxWidth: 560, margin: '12vh auto', padding: 24 }} role="alert">
        <h1 style={{ fontWeight: 500 }}>Çalışma alanı açılamadı</h1>
        {supabaseConfig.configured ? (
          <p>Beklenmedik bir arayüz hatası oluştu. Klinik kayıtların kaynağı sunucudur; bu cihazda henüz gönderilmemiş kayıtlar da olabilir. Tarayıcı verilerini silmeyin. Sayfayı yenileyin; sürerse yöneticinizle iletişime geçin.</p>
        ) : (
          <p>Bu cihazdaki yerel kayıtlar yüklenemedi. Tarayıcı verilerini silmeyin. Sayfayı yenileyin; sürerse yöneticinizle iletişime geçin.</p>
        )}
        <button type="button" onClick={() => window.location.reload()}>Yenile</button>
      </main>
    );
  }
}
