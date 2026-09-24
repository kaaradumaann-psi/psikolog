import { useState } from 'react';
import { signIn } from '../../auth/supabaseAuth';
import { supabaseConfig } from '../../auth/supabaseClient';
import { showToast } from '../../components/ui/Toast';

type Props = {
  onSuccess: () => void;
};

export function LoginPage({ onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      showToast('Giriş başarılı', 'success');
      onSuccess();
    } catch (err) {
      const msg = (err as Error).message || 'Giriş başarısız';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!supabaseConfig.configured) {
    return (
      <div className="auth-page">
        <main className="auth-shell">
          <h1>Yapılandırma Eksik</h1>
          <p className="auth-sub">
            Supabase bağlantısı yapılandırılmamış. VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY
            değişkenlerini tanımlayın. Bu derleme çevrimdışıdır.
          </p>
          <div className="empty-state-card" style={{ marginTop: 16 }}>
            <h4>Kurulum</h4>
            <p>
              <code>.env</code> oluşturun:
              <br />
              VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
              <br />
              VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <main className="auth-shell">
        <div style={{ marginBottom: 20 }}>
          <div className="kicker">
            <span className="kicker-dot" /> Psikolog Platformu
          </div>
        </div>
        <h1>Giriş Yap</h1>
        <p className="auth-sub">
          Profesyonel çalışma platformu. Public kayıt kapalıdır — hesabınız admin tarafından oluşturulur.
        </p>

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="email">
              E-posta
            </label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              required
              autoComplete="email"
              inputMode="email"
              maxLength={254}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">
              Şifre
            </label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              maxLength={128}
            />
          </div>

          {error && (
            <div
              style={{
                background: 'var(--danger-soft)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                marginTop: 12,
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <button type="submit" className="btn btn--primary btn--full" disabled={loading} style={{ marginTop: 16 }}>
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>

          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            Hesabınız yoksa kurum admininiz ile iletişime geçin. Şifre sıfırlama admin üzerinden yapılır.
          </div>
        </form>
      </main>
    </div>
  );
}
