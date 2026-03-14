import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Lock, Clock } from 'lucide-react';
import api from '../api';
import './Layout.css';

const STATUS_COLORS = {
  EMPTY_CLOSED:    'available',
  BOOKED:          'booked',
  OCCUPIED_OPEN:   'booked',
  OCCUPIED_CLOSED: 'booked',
  DISABLED:        'disabled',
  CANCELLED:       'available',
};

const BOX_TYPE_CFG = {
  SMALL:       { letter: 'S', size: 22, fontSize: 9,  radius: 4 },
  MEDIUM:      { letter: 'M', size: 34, fontSize: 11, radius: 6 },
  LARGE:       { letter: 'L', size: 46, fontSize: 14, radius: 8 },
  EXTRA_LARGE: { letter: 'XL', size: 52, fontSize: 13, radius: 9 },
};

const SLOT_OPTIONS = [1, 2, 3, 6, 12];

const Layout = () => {
  const { terminalId } = useParams();
  const [boxes, setBoxes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [duration, setDuration] = useState(1);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get(`/orders/terminals/${terminalId}/layout`),
      api.get(`/orders/terminals/${terminalId}/pricing`)
    ]).then(([layoutRes, pricingRes]) => {
      setBoxes(layoutRes.data.boxes);
      setPricing(pricingRes.data.rates);
    }).catch(() => navigate('/terminals'))
      .finally(() => setLoading(false));
  }, [terminalId, navigate]);

  const rows = [...new Set(boxes.map(b => b.row))].sort();

  const getPrice = () => {
    if (!selected || !pricing) return 0;
    const rate = pricing[selected.type] || 30;
    return rate * duration;
  };

  const handleBook = async () => {
    if (!selected) return;
    setBooking(true);
    setError('');
    try {
      const res = await api.post('/orders/book', {
        boxId: selected._id,
        durationHours: duration
      });
      navigate(`/payment/${res.data.orderId}/${selected.identifiableName}/${duration}/${res.data.amountDue}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="page-viewport">
      <div className="bg-glow" />
      <div className="page-container">
        <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <button className="back-btn" onClick={() => navigate('/terminals')}>
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <p className="page-eyebrow">STEP 1 OF 3</p>
            <h1 className="page-title">Choose Your Box</h1>
          </div>
        </motion.div>

        {/* Legend */}
        <div className="legend">
          <div className="legend-item"><div className="legend-dot available" /><span>Available</span></div>
          <div className="legend-item"><div className="legend-dot booked" /><span>Taken</span></div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
            {Object.entries(BOX_TYPE_CFG).map(([type, cfg]) => (
              <div key={type} className="legend-item" style={{ gap: 6 }}>
                <div style={{
                  width: cfg.size * 0.45, height: cfg.size * 0.45,
                  border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,0.4)',
                }}>{cfg.letter}</div>
                <span style={{ fontSize: 11 }}>{type.charAt(0) + type.slice(1).toLowerCase().replace('_large', ' Large')}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? <div className="layout-loading">Loading layout...</div> : (
          <motion.div className="locker-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {rows.map(row => (
              <div key={row} className="locker-row">
                <span className="row-label">{String.fromCharCode(65 + row)}</span>
                <div className="row-boxes">
                  {boxes.filter(b => b.row === row).sort((a, b) => a.col - b.col).map(box => {
                    const status = STATUS_COLORS[box.boxStatus] || 'disabled';
                    const isAvail = status === 'available';
                    const isSel = selected?._id === box._id;
                    const typeCfg = BOX_TYPE_CFG[box.type] || BOX_TYPE_CFG.MEDIUM;
                    return (
                      <motion.button
                        key={box._id}
                        className={`box-cell ${status} ${isSel ? 'selected' : ''}`}
                        onClick={() => isAvail && setSelected(isSel ? null : box)}
                        whileHover={isAvail ? { scale: 1.08 } : {}}
                        whileTap={isAvail ? { scale: 0.95 } : {}}
                        disabled={!isAvail}
                      >
                        {isSel ? <Lock size={14} /> : (
                          <div style={{
                            width: typeCfg.size, height: typeCfg.size,
                            border: '2px solid currentColor', borderRadius: typeCfg.radius,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: typeCfg.fontSize, fontWeight: 900,
                          }}>{typeCfg.letter}</div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Time slot selector — only show after box is selected */}
        {selected && pricing && (
          <motion.div
            className="slot-selector"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="slot-header">
              <Clock size={16} color="#7B6EF6" />
              <span>How long do you need it?</span>
              <span className="slot-rate">₹{pricing[selected.type] || 30}/hr for {selected.type?.toLowerCase()}</span>
            </div>
            <div className="slot-options">
              {SLOT_OPTIONS.map(h => (
                <button
                  key={h}
                  className={`slot-btn ${duration === h ? 'active' : ''}`}
                  onClick={() => setDuration(h)}
                >
                  <span className="slot-hours">{h}h</span>
                  <span className="slot-price">₹{(pricing[selected.type] || 30) * h}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {error && <div className="error-bar" style={{ marginTop: 16 }}>{error}</div>}

        <motion.div className="bottom-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {selected ? (
            <div className="selected-info">
              <Package size={18} color="#7B6EF6" />
              <span>
                Box <strong>{selected.identifiableName}</strong> · {duration}hr · <strong style={{ color: '#00E5A0' }}>₹{getPrice()}</strong>
              </span>
            </div>
          ) : (
            <p className="select-hint">Tap an available box to select it</p>
          )}
          <button className="main-btn purple" onClick={handleBook} disabled={!selected || booking}>
            {booking ? <span className="spinner white" /> : 'Continue to Payment'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Layout;