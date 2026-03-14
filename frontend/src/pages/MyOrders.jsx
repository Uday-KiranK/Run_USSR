import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Package, Clock, CheckCircle, XCircle,
  AlertCircle, Unlock, Monitor, ArrowRight, MapPin,
} from 'lucide-react';
import api from '../api';
import CountdownTimer from '../components/CountdownTimer';
import './MyOrders.css';

const STATUS_CONFIG = {
  RESERVED:         { color: 'orange',  icon: Clock,        label: 'Pending Payment' },
  READY_FOR_PICKUP: { color: 'purple',  icon: Unlock,       label: 'Ready to Pick Up' },
  IN_PROGRESS:      { color: 'purple',  icon: Unlock,       label: 'In Progress' },
  COMPLETED:        { color: 'success', icon: CheckCircle,  label: 'Completed' },
  CANCELLED:        { color: 'danger',  icon: XCircle,      label: 'Cancelled' },
  EXPIRED:          { color: 'muted',   icon: AlertCircle,  label: 'Expired' },
};

const ACTIVE_STATUSES = new Set(['RESERVED', 'READY_FOR_PICKUP', 'IN_PROGRESS']);

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 10, fontWeight: 800, letterSpacing: 3,
    color: 'rgba(255,255,255,0.3)', marginBottom: 12, marginTop: 4,
  }}>
    {children}
  </p>
);

const OrderCard = ({ order, index, navigate }) => {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.EXPIRED;
  const Icon = cfg.icon;
  const isActive = ACTIVE_STATUSES.has(order.status);
  const isKiosk = order.source === 'KIOSK';
  const canPickup = order.status === 'READY_FOR_PICKUP';
  const canComplete = order.status === 'RESERVED';
  const boxLabel = order.boxId?.identifiableName || order.boxName;
  const terminalName = order.terminalId?.identifiableName;
  const terminalLoc = order.terminalId?.physicalLocation;

  return (
    <motion.div
      className={`order-card status-${cfg.color}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <div className="order-card-left">
        <div className={`order-status-icon ${cfg.color}`}>
          <Icon size={18} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p className="order-id" style={{ margin: 0 }}>{order.orderId}</p>
            {isKiosk && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                background: 'rgba(123,110,246,0.12)', color: '#7B6EF6',
                border: '1px solid rgba(123,110,246,0.25)', letterSpacing: 0.5,
              }}>
                <Monitor size={9} /> KIOSK
              </span>
            )}
          </div>
          <p className="order-box">
            Box {boxLabel}
            {terminalName ? ` · ${terminalName}` : ''}
          </p>
          {terminalLoc && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <MapPin size={10} /> {terminalLoc}
            </p>
          )}
          <p className="order-date">{new Date(order.createdAt).toLocaleString()}</p>
          {isActive && order.expiryTime && (
            <CountdownTimer expiryTime={order.expiryTime} style={{ marginTop: 4, display: 'block' }} />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div className={`order-badge ${cfg.color}`}>{cfg.label}</div>
        {order.slotPrice > 0 && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>₹{order.slotPrice}</span>
        )}
        {canComplete && (
          <button
            onClick={() => navigate(`/payment/${order.orderId}/${boxLabel}/${order.durationHours}/${order.slotPrice}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 12, border: 'none',
              background: '#7B6EF6', color: 'white',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans',
            }}>
            Pay Now <ArrowRight size={13} />
          </button>
        )}
        {canPickup && (
          <button
            onClick={() => navigate('/pickup')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 12, border: 'none',
              background: '#00E5A0', color: '#04050f',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans',
            }}>
            Pick Up <ArrowRight size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/orders/my')
      .then(res => setOrders(res.data.orders || []))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const pending = orders.filter(o => ACTIVE_STATUSES.has(o.status));
  const history = orders.filter(o => !ACTIVE_STATUSES.has(o.status));

  return (
    <div className="page-viewport">
      <div className="bg-glow" />
      <div className="page-container">
        <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <button className="back-btn" onClick={() => navigate('/terminals')}>
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <p className="page-eyebrow">MY ORDERS</p>
            <h1 className="page-title">RuntimeTerror</h1>
          </div>
        </motion.div>

        {loading ? (
          <div className="loading-grid">
            {[1, 2, 3].map(i => <div key={i} className="skeleton-card" style={{ height: 140 }} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <Package size={40} color="rgba(123,110,246,0.3)" />
            <p>No orders yet</p>
            <button className="main-btn purple" style={{ width: 'auto', padding: '14px 28px' }}
              onClick={() => navigate('/terminals')}>
              Book a Locker
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>

            {/* ── NOT YET PICKED UP ── */}
            {pending.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionLabel>NOT YET PICKED UP — {pending.length} ORDER{pending.length > 1 ? 'S' : ''}</SectionLabel>
                <div className="orders-list">
                  {pending.map((order, i) => (
                    <OrderCard key={order._id} order={order} index={i} navigate={navigate} />
                  ))}
                </div>
              </div>
            )}

            {/* ── HISTORY ── */}
            {history.length > 0 && (
              <div>
                <SectionLabel>HISTORY</SectionLabel>
                <div className="orders-list">
                  {history.map((order, i) => (
                    <OrderCard key={order._id} order={order} index={i} navigate={navigate} />
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
