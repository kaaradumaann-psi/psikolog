import { useOnlineStatus } from '../workspace/useOnlineStatus';
import { Icon } from './Icon';

/**
 * Uygulama genelinde çevrimdışı şeridi. Pedagogjik ilke: kullanıcı internet
 * gittiğinde ne olduğunu ve verisinin nerede olduğunu tek cümlede anlamalı.
 */
export function ConnectivityBanner({ pendingCount = 0 }: { pendingCount?: number }) {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="connectivity-banner" role="alert">
      <Icon name="alert" size={16} />
      <div>
        <strong>Çevrimdışısınız — verileriniz korunuyor.</strong>
        <span>
          {' '}Girdileriniz bu cihazda taslak olarak saklanıyor; F5 yapsanız bile kaybolmaz.
          {pendingCount > 0
            ? ` Bağlantı gelince ${pendingCount} bekleyen kayıt otomatik gönderilecek.`
            : ' Bağlantı gelince kayda devam edebilirsiniz.'}
        </span>
      </div>
    </div>
  );
}
