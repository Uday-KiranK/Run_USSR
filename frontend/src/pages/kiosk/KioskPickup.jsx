import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Unlock, Hash, AlertCircle } from 'lucide-react';
import kioskApi from '../../kioskApi';
import './Kiosk.css';

const KioskPickup = () => {
  const { terminalId } = useParams();
  const [orderId, setOrderId] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef([]);
  const navigate = useNavigate();

  const handlePinChange = (i, v) => {
    if (isNaN(v)) return;
    const newPin = [...pin];
    newPin[i] = v.substring(v.length - 1);
    setPin(newPin);
    if (v && i < 3) refs.current[i + 1]?.focus();
  };

  const handlePickup = async () => {
    setLoading(true); setError('');
    try {
      const res = await kioskApi.post(`/orders/pickup/${orderId}`, { pin: pin.join('') });
      navigate(`/kiosk/${terminalId}/success?box=${res.data.boxName}&order=${orderId}&mode=pickup`);
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect PIN or Order ID');
    } finally { setLoading(false); }
  };

  return (
    <div className="kiosk-viewport">
      <div className="kiosk-glow" />
      <motion.div className="kiosk-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="kiosk-icon">
          <Unlock size={34} color="#7B6EF6" />
        </div>
        <p className="kiosk-eyebrow">PICKUP MODE</p>
        <h1 className="kiosk-title" style={{ fontSize: 30, marginBottom: 8 }}>Open Your Box</h1>
        <p className="kiosk-sub" style={{ marginBottom: 32 }}>Enter your Order ID and PIN to unlock</p>

        {error && <div className="kiosk-error"><AlertCircle size={16} />{error}</div>}

        <div className="kiosk-input-group">
          <label>ORDER ID</label>
          <div className="kiosk-input-field">
            <Hash size={20} className="kiosk-icon-sm" />
            <input type="text" placeholder="PU-2026-XXXXXX" value={orderId} onChange={e => setOrderId(e.target.value)} />
          </div>
        </div>

        <div className="kiosk-input-group">
          <label>YOUR PIN</label>
          <div className="kiosk-pin-row">
            {pin.map((d, i) => (
              <input key={i} ref={el => refs.current[i] = el}
                type="password" maxLength={1} value={d}
                onChange={e => handlePinChange(i, e.target.value)}
                onKeyDown={e => e.key === 'Backspace' && !pin[i] && i > 0 && refs.current[i-1]?.focus()}
                className="kiosk-pin-input" />
            ))}
          </div>
        </div>

        <button className="kiosk-btn primary" onClick={handlePickup}
          disabled={loading || !orderId || pin.some(d => !d)}>
          {loading ? <span className="kiosk-spinner" /> : <><Unlock size={20} /> Unlock Box</>}
        </button>
        <button className="kiosk-btn ghost" onClick={() => navigate(`/kiosk/${terminalId}`)}>← Back</button>
      </motion.div>
    </div>
  );
};

export default KioskPickup;
