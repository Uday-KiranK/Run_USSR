import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '../api';
import './Kiosk.css';

const KioskPin = () => {
  const { terminalId, orderId, boxName, duration, amount } = useParams();
  const [pin, setPin] = useState(['', '', '', '']);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef([]);
  const navigate = useNavigate();

  const handleChange = (i, v) => {
    if (isNaN(v)) return;
    const newPin = [...pin];
    newPin[i] = v.substring(v.length - 1);
    setPin(newPin);
    if (v && i < 3) refs.current[i + 1]?.focus();
  };

  const handleSubmit = async () => {
    if (pin.some(d => !d)) return setError('Enter all 4 digits');
    setLoading(true); setError('');
    try {
      await api.post(`/orders/set-pin/${orderId}`, { pin: pin.join('') });
      navigate(`/kiosk/${terminalId}/success?box=${boxName}&order=${orderId}&mode=book`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="kiosk-viewport">
      <div className="kiosk-glow" />
      <motion.div className="kiosk-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="kiosk-icon">
          <KeyRound size={34} color="#7B6EF6" />
        </div>
        <p className="kiosk-eyebrow">STEP 4 OF 4</p>
        <h1 className="kiosk-title" style={{ fontSize: 30, marginBottom: 8 }}>Set Your PIN</h1>
        <p className="kiosk-sub" style={{ marginBottom: 32 }}>
          Remember this PIN — you'll use it to open box <strong style={{ color: 'white' }}>{boxName}</strong>
        </p>

        {error && <div className="kiosk-error"><AlertCircle size={16} />{error}</div>}

        <div className="kiosk-input-group">
          <label>YOUR 4-DIGIT PIN</label>
          <div className="kiosk-pin-row">
            {pin.map((d, i) => (
              <input key={i} ref={el => refs.current[i] = el}
                type={show ? 'text' : 'password'} maxLength={1} value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => e.key === 'Backspace' && !pin[i] && i > 0 && refs.current[i-1]?.focus()}
                className="kiosk-pin-input" />
            ))}
          </div>
          <button onClick={() => setShow(!show)}
            style={{ background: 'none', border: 'none', color: 'rgba(123,110,246,0.7)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, margin: '8px auto 0', fontFamily: 'Plus Jakarta Sans' }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Hide' : 'Show'} PIN
          </button>
        </div>

        {/* Order summary */}
        <div style={{ background: 'rgba(123,110,246,0.08)', border: '1px solid rgba(123,110,246,0.15)', borderRadius: 14, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
            <span>Box</span><span style={{ color: 'white', fontWeight: 700 }}>{boxName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
            <span>Duration</span><span style={{ color: 'white', fontWeight: 700 }}>{duration} hour{duration > 1 ? 's' : ''}</span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            <span>Total</span>
            <span style={{ color: '#00E5A0', fontWeight: 800, fontSize: 18 }}>₹{amount}</span>
          </div>
        </div>

        <button className="kiosk-btn primary" onClick={handleSubmit} disabled={loading}>
          {loading ? <span className="kiosk-spinner" /> : <>Confirm & Pay ₹{amount} <ArrowRight size={20} /></>}
        </button>
        <button className="kiosk-btn ghost" onClick={() => navigate(`/kiosk/${terminalId}/layout`)}>← Back</button>
      </motion.div>
    </div>
  );
};

export default KioskPin;