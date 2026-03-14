import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Box, ChevronRight, LogOut, Package, Unlock, Clock, ArrowRight } from 'lucide-react';
import api from '../api';
import CountdownTimer from '../components/CountdownTimer';
import './Terminals.css';

const Terminals = () => {
  const [terminals, setTerminals] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/orders/terminals'),
      api.get('/orders/my'),
    ])
      .then(([termRes, ordersRes]) => {
        setTerminals(termRes.data.terminals || []);
        const open = (ordersRes.data.orders || []).filter(o =>
          ['RESERVED', 'READY_FOR_PICKUP'].includes(o.status)
        );
        setActiveOrders(open);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('phone');
    navigate('/');
  };

  return (
    <div className="page-viewport">
      <div className="bg-glow" />
      <div className="page-container">
        <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <p className="page-eyebrow">WELCOME BACK</p>
            <h1 className="page-title">Select Terminal</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="icon-btn" onClick={() => navigate('/my-orders')} title="My Orders">
              <Package size={20} />
            </button>
            <button className="icon-btn danger" onClick={logout} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </motion.div>

        {/* Active orders / pickup prompt */}
        {!loading && activeOrders.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
              YOUR ACTIVE ORDERS
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeOrders.map(order => {
                const isReady = order.status === 'READY_FOR_PICKUP';
                const isPending = order.status === 'RESERVED';
                const boxLabel = order.boxId?.identifiableName || order.boxName;
                return (
                  <div key={order._id} style={{
                    background: isReady ? 'rgba(0,229,160,0.06)' : 'rgba(123,110,246,0.06)',
                    border: `1px solid ${isReady ? 'rgba(0,229,160,0.25)' : 'rgba(123,110,246,0.2)'}`,
                    borderRadius: 18, padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: isReady ? 'rgba(0,229,160,0.1)' : 'rgba(123,110,246,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isReady ? <Unlock size={18} color="#00E5A0" /> : <Clock size={18} color="#7B6EF6" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>
                        {order.orderId}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                        Box {boxLabel}
                        {order.terminalId?.identifiableName ? ` · ${order.terminalId.identifiableName}` : ''}
                      </p>
                      {order.expiryTime && <CountdownTimer expiryTime={order.expiryTime} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                        color: isReady ? '#00E5A0' : '#7B6EF6',
                        background: isReady ? 'rgba(0,229,160,0.1)' : 'rgba(123,110,246,0.1)',
                      }}>
                        {isReady ? 'READY' : 'PENDING'}
                      </span>
                      {isPending && (
                        <button onClick={() => navigate(`/payment/${order.orderId}/${boxLabel}/${order.durationHours}/${order.slotPrice}`)}
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
                      {isReady && (
                        <button onClick={() => navigate('/pickup')}
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
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Terminals grid */}
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
          BOOK A NEW LOCKER
        </p>

        {loading ? (
          <div className="loading-grid">
            {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        ) : (
          <motion.div className="terminals-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            {terminals.map((t, i) => (
              <motion.div
                key={t.terminalId}
                className="terminal-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(`/layout/${t.terminalId}`)}
                whileHover={{ y: -4 }}
              >
                <div className="terminal-card-header">
                  <div className="terminal-icon">
                    <Box size={22} color="#7B6EF6" />
                  </div>
                  <div className="terminal-status">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A0', display: 'inline-block' }} />
                    <span>ACTIVE</span>
                  </div>
                </div>
                <h3 className="terminal-name">{t.terminalName}</h3>
                <div className="terminal-location">
                  <MapPin size={13} />
                  <span>{t.location}</span>
                </div>
                <div className="terminal-footer">
                  <div className="available-badge">
                    <span className="available-dot" />
                    <span>{t.availableCount} boxes available</span>
                  </div>
                  <ChevronRight size={18} color="#7B6EF6" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && activeOrders.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button className="text-btn" onClick={() => navigate('/pickup')}
              style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
              <Package size={13} style={{ marginRight: 6 }} />
              Already booked? Pick up here
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Terminals;
