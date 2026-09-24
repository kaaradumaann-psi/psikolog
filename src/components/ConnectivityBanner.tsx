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
        <strong>Çevrimdışısınız — kayıtlar bu cihazda tutulur.</strong>
        <span>
          {' '}Kaydettiğiniz kayıtlar yerel olarak kalır. Kaydedilmemiş formlar sayfa yenilenince kaybolabilir.
          {pendingCount > 0 ? ` ${pendingCount} bekleyen işlem için bağlantı döndüğünde durumu kontrol edin.` : ''}
        </span>
      </div>
    </div>
  );
}
