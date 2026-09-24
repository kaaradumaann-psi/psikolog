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
        <h1 style={{ fontWeight: 500 }}>Çalışma alanı açılamadı</h1>
        <p>Kayıtlar bu cihazda duruyor. Sayfayı yenileyin. Sürerse Ayarlar’dan aldığınız yedeği başka bir tarayıcıda açmayın; önce bu cihazı kontrol edin.</p>
        <button type="button" onClick={() => window.location.reload()}>Yenile</button>
      </main>
    );
  }
}
