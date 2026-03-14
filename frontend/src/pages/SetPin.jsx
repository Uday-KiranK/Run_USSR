import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';
import api from '../api';
import './SetPin.css';

const SetPin = () => {
  const { orderId, boxName } = useParams();
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
    if (pin.some(d => d === '')) return setError('Please enter all 4 digits');
    setLoading(true);
    setError('');
    try {
      await api.post(`/orders/set-pin/${orderId}`, { pin: pin.join('') });
      navigate(`/confirmation/${orderId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-viewport">
      <div className="bg-glow" />
      <div className="page-container center-content">
        <motion.div className="payment-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="pin-icon-wrap">
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <KeyRound size={30} color="#7B6EF6" />
            </motion.div>
          </div>
          <p className="page-eyebrow" style={{textAlign:'center', marginBottom:8}}>STEP 3 OF 3</p>
          <h1 className="page-title" style={{textAlign:'center', marginBottom:8}}>Set Your PIN</h1>
          <p className="pin-desc">You'll use this PIN at the terminal to open box <strong>{boxName}</strong></p>

          <div className="pin-row">
            {pin.map((d, i) => (
              <input
                key={i}
                ref={el => refs.current[i] = el}
                type={show ? 'text' : 'password'}
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => e.key === 'Backspace' && !pin[i] && i > 0 && refs.current[i-1]?.focus()}
                className="pin-input"
              />
            ))}
          </div>

          <button className="show-toggle" onClick={() => setShow(!show)}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
            {show ? 'Hide PIN' : 'Show PIN'}
          </button>

          {error && <div className="error-bar">{error}</div>}

          <button className="main-btn purple" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner white" /> : <>Confirm PIN <ArrowRight size={18} /></>}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default SetPin;