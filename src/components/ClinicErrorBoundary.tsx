import { Component, Fragment } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { supabaseConfig } from '../auth/supabaseClient';
import { Icon } from './Icon';

type State = { failed: boolean; retryKey: number };

export class ClinicErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidMount() {
    window.addEventListener('popstate', this.resetAfterNavigation);
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.resetAfterNavigation);
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the technical diagnosis in the console, not on a clinical screen.
    // Do not log error.message: a third-party error can contain patient content.
    console.error('Klinik arayüzünde beklenmedik hata', {
      type: error.name,
      component: info.componentStack,
    });
  }

  private resetAfterNavigation = () => {
    if (this.state.failed) this.setState((state) => ({ failed: false, retryKey: state.retryKey + 1 }));
  };

  private retry = () => {
    this.setState((state) => ({ failed: false, retryKey: state.retryKey + 1 }));
  };

  private openSafeSettings = () => {
    window.history.replaceState({}, '', '/ayarlar');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  render() {
    if (!this.state.failed) return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>;

    return (
      <main className="workspace-recovery-page" role="alert">
        <section className="workspace-recovery-card" aria-labelledby="workspace-recovery-title">
          <span className="workspace-recovery-mark" aria-hidden="true"><Icon name="alert" size={22} /></span>
          <div className="workspace-recovery-copy">
            <span className="workspace-recovery-kicker">Güvenli kurtarma</span>
            <h1 id="workspace-recovery-title">Çalışma alanı açılamadı</h1>
            {supabaseConfig.configured ? (
              <p>
                Beklenmedik bir arayüz hatası oluştu. Klinik kayıtların ana kaynağı sunucudur; bu cihazda henüz
                gönderilmemiş değişiklikler bulunabilir. <strong>Tarayıcı verilerini silmeyin.</strong>
              </p>
            ) : (
              <p>
                Bu cihazdaki yerel çalışma alanı görüntülenemedi. Kayıtları korumak için
                <strong> tarayıcı verilerini silmeyin.</strong>
              </p>
            )}
          </div>

          <div className="workspace-recovery-steps" aria-label="Kurtarma adımları">
            <div><span>1</span><p>Önce aynı ekranı veri kaybetmeden yeniden kurmayı deneyin.</p></div>
            <div><span>2</span><p>Hata sürerse güvenli Ayarlar ekranını açıp bağlantı durumunu kontrol edin.</p></div>
            <div><span>3</span><p>Tekrarlayan hatada yöneticinize ekran adını ve saati iletin; klinik veri paylaşmayın.</p></div>
          </div>

          <div className="workspace-recovery-actions">
            <button type="button" className="btn-primary" onClick={this.retry}>
              <Icon name="refresh" size={16} /> Yeniden dene
            </button>
            <button type="button" className="btn-secondary" onClick={this.openSafeSettings}>
              <Icon name="shield" size={16} /> Güvenli Ayarlar ekranını aç
            </button>
            <button type="button" className="workspace-recovery-reload" onClick={() => window.location.reload()}>
              Sayfayı tamamen yenile
            </button>
          </div>
          <p className="workspace-recovery-footnote">Bu işlem tarayıcı deposunu temizlemez ve kayıt silmez.</p>
        </section>
      </main>
    );
  }
}
