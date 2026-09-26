import { Component } from 'react';
import type { ReactNode } from 'react';

type State = { failed: boolean };

export class ClinicErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main style={{ maxWidth: 560, margin: '12vh auto', padding: 24 }}>
        <h1 style={{ fontWeight: 500 }}>Bu ekran açılamadı</h1>
        <p>
          Kayıtlarınız silinmedi; danışan, seans ve ölçek kayıtlarınız bu cihazda durmaya devam ediyor.
          Sorun ekranın kendisinde. Sayfayı yenileyin, yine açılmazsa Ayarlar → Yedek al ile bir kopya indirin
          ve yöneticiyle paylaşın.
        </p>
        <button type="button" onClick={() => window.location.reload()}>Sayfayı yenile</button>
      </main>
    );
  }
}
