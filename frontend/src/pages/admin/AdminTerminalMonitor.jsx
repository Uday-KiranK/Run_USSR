import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Box, User, Clock, Hash, Phone } from 'lucide-react';
import api from '../../api';
import AdminLayout from './AdminLayout';
import './Admin.css';

const STATUS_CONFIG = {
  EMPTY_CLOSED:       { label: 'Available',  color: '#00E5A0', bg: 'rgba(0,229,160,0.08)',   border: 'rgba(0,229,160,0.3)' },
  BOOKED:             { label: 'Booked',     color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)' },
  OCCUPIED_OPEN:      { label: 'Open',       color: '#7B6EF6', bg: 'rgba(123,110,246,0.12)', border: 'rgba(123,110,246,0.4)' },
  OCCUPIED_CLOSED:    { label: 'In Use',     color: '#FF4D6D', bg: 'rgba(255,77,109,0.08)',  border: 'rgba(255,77,109,0.3)' },
  DISABLED:           { label: 'Disabled',   color: '#6B7280', bg: 'rgba(107,114,128,0.06)', border: 'rgba(107,114,128,0.2)' },
  BLOCKED:            { label: 'Blocked',    color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.3)' },
  CANCELLED:          { label: 'Cancelled',  color: '#6B7280', bg: 'rgba(107,114,128,0.06)', border: 'rgba(107,114,128,0.2)' },
  AWAITING_PAYMENT:   { label: 'Awaiting $', color: '#F59E0B', bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.2)' },
  OPEN_REQUESTED:     { label: 'Opening…',  color: '#7B6EF6', bg: 'rgba(123,110,246,0.08)', border: 'rgba(123,110,246,0.3)' },
  CANCEL_REQUESTED:   { label: 'Cancelling', color: '#EF4444', bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.2)' },
  TERMINATE_REQUESTED:{ label: 'Terminating',color: '#EF4444', bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.2)' },
};

const TERMINAL_STATUS_CONFIG = {
  ACTIVE:            { label: 'Active',           color: '#00E5A0', bg: 'rgba(0,229,160,0.1)' },
  SETUP_IN_PROGRESS: { label: 'Setup in Progress',color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  DECOMMISSIONED:    { label: 'Decommissioned',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
};

const AdminTerminalMonitor = () => {
  const { terminalId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await api.get(`/terminals/${terminalId}/monitor`);
      setData(res.data.data);
    } catch {
      setError('Failed to load terminal data');
    } finally {
      setLoading(false);
    }
  }, [terminalId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AdminLayout title="Terminal Monitor">
        <div style={{ textAlign: 'center', padding: 80, color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="Terminal Monitor">
        <div style={{ textAlign: 'center', padding: 80, color: '#FF4D6D' }}>{error || 'No data'}</div>
      </AdminLayout>
    );
  }

  const { terminal, boxes, stats } = data;
  const tStatus = TERMINAL_STATUS_CONFIG[terminal.status] || { label: terminal.status, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
  const rows = [...new Set(boxes.map(b => b.row))].sort((a, b) => a - b);

  return (
    <AdminLayout title={`Monitor — ${terminal.identifiableName}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="admin-btn secondary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => navigate('/admin/terminals')}>
          <ArrowLeft size={15} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{terminal.identifiableName}</h2>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, color: tStatus.color, background: tStatus.bg }}>
              {tStatus.label}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            {terminal.physicalLocation} {terminal.siteId?.name ? `· ${terminal.siteId.name}` : ''}
          </p>
        </div>
        <button className="admin-btn secondary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Boxes', value: stats.total,     color: 'rgba(255,255,255,0.6)' },
          { label: 'Available',   value: stats.available, color: '#00E5A0' },
          { label: 'Booked / In Use', value: stats.booked + stats.occupied, color: '#F59E0B' },
          { label: 'Disabled',    value: stats.disabled,  color: '#6B7280' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '18px 20px' }}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedBox ? '1fr 340px' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Box Grid */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
          <p style={{ margin: '0 0 20px', fontSize: 11, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.3)' }}>BOX LAYOUT</p>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            {[['#00E5A0','Available'],['#F59E0B','Booked'],['#FF4D6D','In Use'],['#7B6EF6','Open'],['#6B7280','Disabled']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
              </div>
            ))}
          </div>

          {rows.map(row => (
            <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 24, fontSize: 12, fontWeight: 700, color: 'rgba(123,110,246,0.6)', textAlign: 'center' }}>
                {String.fromCharCode(65 + row)}
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {boxes.filter(b => b.row === row).sort((a, b) => a.col - b.col).map(box => {
                  const cfg = STATUS_CONFIG[box.boxStatus] || STATUS_CONFIG.DISABLED;
                  const isSel = selectedBox?._id === box._id;
                  const hasOrder = !!box.order;
                  return (
                    <motion.button key={box._id}
                      onClick={() => setSelectedBox(isSel ? null : box)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        width: 56, height: 56, borderRadius: 12,
                        background: isSel ? 'rgba(123,110,246,0.25)' : cfg.bg,
                        border: `1.5px solid ${isSel ? '#7B6EF6' : cfg.border}`,
                        color: isSel ? 'white' : cfg.color,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                        boxShadow: isSel ? '0 0 16px rgba(123,110,246,0.4)' : 'none',
                        position: 'relative',
                        fontFamily: 'inherit',
                      }}>
                      <span>{box.identifiableName.split('-')[1]}</span>
                      {hasOrder && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, position: 'absolute', top: 6, right: 6 }} />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Box Detail Panel */}
        {selectedBox && (() => {
          const cfg = STATUS_CONFIG[selectedBox.boxStatus] || STATUS_CONFIG.DISABLED;
          const o = selectedBox.order;
          return (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}
            >
              {/* Box header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Box size={18} color="#7B6EF6" />
                    <span style={{ fontSize: 18, fontWeight: 800 }}>Box {selectedBox.identifiableName}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    {cfg.label}
                  </span>
                </div>
                <button onClick={() => setSelectedBox(null)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
              </div>

              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
                Type: <span style={{ color: 'rgba(255,255,255,0.6)' }}>{selectedBox.type}</span>
                &nbsp;·&nbsp;Row {String.fromCharCode(65 + selectedBox.row)}, Col {selectedBox.col + 1}
              </div>

              {o ? (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>ACTIVE ORDER</p>

                  {[
                    { icon: <Hash size={13} />,   label: 'Order ID',   value: o.orderId },
                    { icon: <Phone size={13} />,  label: 'Phone',      value: o.phoneNumber || '—' },
                    { icon: <User size={13} />,   label: 'Status',     value: o.status },
                    { icon: <Clock size={13} />,  label: 'Booked At',  value: fmt(o.startTime) },
                    { icon: <Clock size={13} />,  label: 'Expires At', value: fmt(o.expiryTime) },
                  ].map(({ icon, label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                        {icon}{label}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'white', maxWidth: 160, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                    </div>
                  ))}

                  {o.slotPrice > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Amount Paid</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#00E5A0' }}>₹{o.slotPrice}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                  No active order for this box
                </div>
              )}
            </motion.div>
          );
        })()}
      </div>
    </AdminLayout>
  );
};

export default AdminTerminalMonitor;
