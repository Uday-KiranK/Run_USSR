import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Lock } from 'lucide-react';
import api from '../api';
import './Layout.css';

const STATUS_COLORS = {
  EMPTY_CLOSED: 'available',
  BOOKED: 'booked',
  OCCUPIED_OPEN: 'occupied',
  OCCUPIED_CLOSED: 'occupied',
  DISABLED: 'disabled',
  CANCELLED: 'available',
};

const Layout = () => {
  const { terminalId } = useParams();
  const [boxes, setBoxes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/orders/terminals/${terminalId}/layout`)
      .then(res => setBoxes(res.data.boxes))
      .catch(() => navigate('/terminals'))
      .finally(() => setLoading(false));
  }, [terminalId, navigate]);

  const rows = [...new Set(boxes.map(b => b.row))].sort();

  const handleBook = async () => {
    if (!selected) return;
    setBooking(true);
    setError('');
    try {
      const res = await api.post('/orders/book', { boxId: selected._id });
      navigate(`/payment/${res.data.orderId}/${selected.identifiableName}`);
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

        <div className="legend">
          {[['available','Available'],['booked','Booked'],['occupied','In Use'],['disabled','Disabled']].map(([cls,label]) => (
            <div key={cls} className="legend-item">
              <div className={`legend-dot ${cls}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {loading ? <div className="layout-loading">Loading layout...</div> : (
          <motion.div className="locker-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {rows.map(row => (
              <div key={row} className="locker-row">
                <span className="row-label">{String.fromCharCode(65 + row)}</span>
                <div className="row-boxes">
                  {boxes.filter(b => b.row === row).sort((a,b) => a.col - b.col).map(box => {
                    const status = STATUS_COLORS[box.boxStatus] || 'disabled';
                    const isAvail = status === 'available';
                    const isSel = selected?._id === box._id;
                    return (
                      <motion.button
                        key={box._id}
                        className={`box-cell ${status} ${isSel ? 'selected' : ''}`}
                        onClick={() => isAvail && setSelected(isSel ? null : box)}
                        whileHover={isAvail ? { scale: 1.08 } : {}}
                        whileTap={isAvail ? { scale: 0.95 } : {}}
                        disabled={!isAvail}
                      >
                        {isSel ? <Lock size={14} /> : box.identifiableName.split('-')[1]}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {error && <div className="error-bar" style={{marginTop:16}}>{error}</div>}

        <motion.div className="bottom-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {selected ? (
            <div className="selected-info">
              <Package size={18} color="#7B6EF6" />
              <span>Box <strong>{selected.identifiableName}</strong> selected — <strong>{selected.type}</strong></span>
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