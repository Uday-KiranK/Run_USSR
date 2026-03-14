import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, AlertCircle, Unlock, Monitor, ArrowRight } from 'lucide-react';
import api from '../api';
import CountdownTimer from '../components/CountdownTimer';
import './MyOrders.css';

const STATUS_CONFIG = {
  RESERVED:         { color: 'orange',  icon: Clock,        label: 'Pending' },
  READY_FOR_PICKUP: { color: 'purple',  icon: Unlock,       label: 'Ready' },
  IN_PROGRESS:      { color: 'purple',  icon: Unlock,       label: 'In Progress' },
  COMPLETED:        { color: 'success', icon: CheckCircle,  label: 'Completed' },
  CANCELLED:        { color: 'danger',  icon: XCircle,      label: 'Cancelled' },
  EXPIRED:          { color: 'muted',   icon: AlertCircle,  label: 'Expired' },
};

const ACTIVE_STATUSES = new Set(['RESERVED', 'READY_FOR_PICKUP', 'IN_PROGRESS']);

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/orders/my')
      .then(res => setOrders(res.data.orders))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="page-viewport">
      <div className="bg-glow" />
      <div className="page-container">
        <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <button className="back-btn" onClick={() => navigate('/terminals')}>
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <p className="page-eyebrow">HISTORY</p>
            <h1 className="page-title">My Orders</h1>
          </div>
        </motion.div>

        {loading ? (
          <div className="loading-grid">
            {[1,2,3].map(i => <div key={i} className="skeleton-card" style={{height:140}} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <Package size={40} color="rgba(123,110,246,0.3)" />
            <p>No orders yet</p>
            <button className="main-btn purple" style={{width:'auto', padding:'14px 28px'}} onClick={() => navigate('/terminals')}>
              Book a Locker
            </button>
          </div>
        ) : (
          <motion.div className="orders-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            {orders.map((order, i) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.EXPIRED;
              const Icon = cfg.icon;
              const isActive = ACTIVE_STATUSES.has(order.status);
              const isKiosk = order.source === 'KIOSK';
              const canPickup = order.status === 'READY_FOR_PICKUP';
              const canComplete = order.status === 'RESERVED';
              const boxLabel = order.boxId?.identifiableName || order.boxName;

              return (
                <motion.div
                  key={order._id}
                  className={`order-card status-${cfg.color}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
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
                        Box {order.boxId?.identifiableName || order.boxName}
                        {order.terminalId?.identifiableName ? ` · ${order.terminalId.identifiableName}` : ''}
                        {order.terminalId?.physicalLocation ? ` · ${order.terminalId.physicalLocation}` : ''}
                      </p>
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
                        Complete <ArrowRight size={13} />
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
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
