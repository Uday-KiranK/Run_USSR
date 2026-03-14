import React, { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import api from '../../api';
import CountdownTimer from '../../components/CountdownTimer';

const STATUS_BADGE = {
  RESERVED:         'warning',
  READY_FOR_PICKUP: 'accent',
  IN_PROGRESS:      'accent',
  COMPLETED:        'success',
  CANCELLED:        'danger',
  EXPIRED:          'muted',
};

const STATUS_LABEL = {
  RESERVED:         'Pending',
  READY_FOR_PICKUP: 'Ready',
  IN_PROGRESS:      'In Progress',
  COMPLETED:        'Completed',
  CANCELLED:        'Cancelled',
  EXPIRED:          'Expired',
};

const ACTIVE_STATUSES = new Set(['RESERVED', 'READY_FOR_PICKUP', 'IN_PROGRESS']);

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api.get('/orders/all')
      .then(res => setOrders(res.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  return (
    <AdminLayout title="Orders">
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['ALL', 'RESERVED', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'EXPIRED'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
              background: filter === f ? '#7B6EF6' : 'rgba(255,255,255,0.06)',
              color: filter === f ? 'white' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.15s',
            }}>
            {f === 'ALL' ? 'All' : STATUS_LABEL[f] || f}
            {f === 'ALL'
              ? ` (${orders.length})`
              : ` (${orders.filter(o => o.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ORDER ID</th>
              <th>PHONE</th>
              <th>BOX</th>
              <th>TERMINAL</th>
              <th>STATUS</th>
              <th>TIME LEFT</th>
              <th>AMOUNT</th>
              <th>DATE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>No orders</td></tr>
            ) : filtered.map(o => (
              <tr key={o._id}>
                <td style={{ color: 'white', fontWeight: 600 }}>{o.orderId}</td>
                <td>{o.phoneNumber}</td>
                <td>{o.boxId?.identifiableName || o.boxName}</td>
                <td style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  {o.terminalId?.identifiableName || '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`badge ${STATUS_BADGE[o.status] || 'muted'}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                    {o.source === 'KIOSK' && (
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 8, background: 'rgba(123,110,246,0.12)', color: '#7B6EF6', border: '1px solid rgba(123,110,246,0.25)' }}>
                        KIOSK
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {ACTIVE_STATUSES.has(o.status) && o.expiryTime
                    ? <CountdownTimer expiryTime={o.expiryTime} />
                    : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>—</span>}
                </td>
                <td>₹{o.slotPrice || 0}</td>
                <td style={{ fontSize: 11 }}>{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
