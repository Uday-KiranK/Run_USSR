import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../api';
import './MyOrders.css';

const STATUS_CONFIG = {
  RESERVED:         { color: 'orange',  icon: Clock,        label: 'Reserved' },
  READY_FOR_PICKUP: { color: 'purple',  icon: Package,      label: 'Ready' },
  COMPLETED:        { color: 'success', icon: CheckCircle,  label: 'Completed' },
  CANCELLED:        { color: 'danger',  icon: XCircle,      label: 'Cancelled' },
  EXPIRED:          { color: 'muted',   icon: AlertCircle,  label: 'Expired' },
};

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
                      <p className="order-id">{order.orderId}</p>
                      <p className="order-box">
                        Box {order.boxId?.identifiableName || order.boxName} · {order.terminalId?.identifiableName}
                      </p>
                      <p className="order-date">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className={`order-badge ${cfg.color}`}>{cfg.label}</div>
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