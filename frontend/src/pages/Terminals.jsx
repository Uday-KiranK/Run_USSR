import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Box, ChevronRight, LogOut, ClipboardList, Wifi } from 'lucide-react';
import api from '../api';
import './Terminals.css';

const Terminals = () => {
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/orders/terminals')
      .then(res => setTerminals(res.data.terminals))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = () => { localStorage.clear(); navigate('/'); };

  return (
    <div className="page-viewport">
      <div className="bg-glow" />
      <div className="page-container">
        <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <p className="page-eyebrow">WELCOME BACK</p>
            <h1 className="page-title">Select Terminal</h1>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={() => navigate('/my-orders')} title="My Orders">
              <ClipboardList size={20} />
            </button>
            <button className="icon-btn danger" onClick={logout} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </motion.div>

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
                    <Wifi size={12} />
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
      </div>
    </div>
  );
};

export default Terminals;