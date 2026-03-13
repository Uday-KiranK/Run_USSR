import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Unlock, CheckCircle, AlertCircle, Hash } from 'lucide-react';
import api from '../api';
import './Pickup.css';

const Pickup = () => {
  const [orderId, setOrderId] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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
    setLoading(true);
    setError('');
    try {
      await api.post(`/orders/pickup/${orderId}`, { pin: pin.join('') });
      setSuccess(true);
      setTimeout(() => navigate('/my-orders'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect PIN');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="page-viewport">
      <div className="bg-glow success-glow" />
      <div className="page-container center-content">
        <motion.div className="payment-card" style={{textAlign:'center'}} initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <motion.div className="success-icon" style={{margin:'0 auto 24px'}} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
            <CheckCircle size={40} color="#00E5A0" />
          </motion.div>
          <h1 className="page-title" style={{color:'#00E5A0', marginBottom:12}}>Box Opened!</h1>
          <p style={{color:'rgba(255,255,255,0.4)', fontSize:14}}>Enjoy your pickup. Redirecting...</p>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="page-viewport">
      <div className="bg-glow" />
      <div className="page-container center-content">
        <motion.div className="payment-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="pin-icon-wrap" style={{marginBottom:20}}>
            <Unlock size={28} color="#7B6EF6" />
          </div>
          <p className="page-eyebrow" style={{textAlign:'center', marginBottom:8}}>TERMINAL ACCESS</p>
          <h1 className="page-title" style={{textAlign:'center', marginBottom:8}}>Open Your Box</h1>
          <p className="pin-desc">Enter your Order ID and PIN to unlock your locker</p>

          <div className="input-group">
            <label>ORDER ID</label>
            <div className="input-field">
              <Hash size={18} className="icon" />
              <input
                type="text"
                placeholder="PU-2026-XXXXXX"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>YOUR PIN</label>
            <div className="pin-row">
              {pin.map((d, i) => (
                <input
                  key={i}
                  ref={el => refs.current[i] = el}
                  type="password"
                  maxLength={1}
                  value={d}
                  onChange={e => handlePinChange(i, e.target.value)}
                  onKeyDown={e => e.key === 'Backspace' && !pin[i] && i > 0 && refs.current[i-1]?.focus()}
                  className="pin-input"
                />
              ))}
            </div>
          </div>

          {error && (
            <motion.div className="error-bar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{marginBottom:16}}>
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}

          <button className="main-btn purple" onClick={handlePickup} disabled={loading || !orderId || pin.some(d => !d)}>
            {loading ? <span className="spinner white" /> : <><Unlock size={17} /> Unlock Box</>}
          </button>

          <button className="text-btn" onClick={() => navigate('/my-orders')}>View my orders</button>
        </motion.div>
      </div>
    </div>
  );
};

export default Pickup;