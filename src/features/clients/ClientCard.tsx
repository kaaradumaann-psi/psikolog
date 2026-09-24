import type { Client } from './clientTypes';
import { CLIENT_STATUS_LABEL } from './clientTypes';
import { formatDateTR } from '../../lib/dateGuards';
import { navigate } from '../../app/router';

type Props = {
  client: Client;
};

export function ClientCard({ client }: Props) {
  return (
    <div
      className="card card--interactive"
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/clients/${client.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/clients/${client.id}`);
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {client.firstName} {client.lastName}
            </span>
            <span className={`badge badge--${client.status === 'active' ? 'success' : 'default'}`}>
              {CLIENT_STATUS_LABEL[client.status]}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span>{client.fileNumber}</span>
            {client.birthDate && <span>• {formatDateTR(client.birthDate)}</span>}
            {client.profession && <span>• {client.profession}</span>}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
          {new Date(client.createdAt).toLocaleDateString('tr-TR')}
        </div>
      </div>

      {(client.phone || client.email) && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--soft)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {client.phone && <span>{client.phone}</span>}
          {client.email && <span>{client.email}</span>}
        </div>
      )}
    </div>
  );
}
