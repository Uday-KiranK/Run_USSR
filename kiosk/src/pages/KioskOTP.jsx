import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, AlertCircle } from 'lucide-react';
import api from '../api';
import './Kiosk.css';

const KioskOTP = () => {
  const { terminalId } = useParams();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef([]);
  const navigate = useNavigate();

  const handleChange = (i, v) => {
    if (isNaN(v)) return;
    const newOtp = [...otp];
    newOtp[i] = v.substring(v.length - 1);
    setOtp(newOtp);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const handleVerify = async () => {
    setLoading(true); setError('');
    try {
      const phone = sessionStorage.getItem('kioskPhone');
      const res = await api.post('/auth/verify-otp', { phone, otp: otp.join('') });
      sessionStorage.setItem('kioskToken', res.data.token);
      navigate(`/kiosk/${terminalId}/layout`);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="kiosk-viewport">
      <div className="kiosk-glow" />
      <motion.div className="kiosk-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="kiosk-eyebrow">STEP 2 OF 4</p>
        <h1 className="kiosk-title" style={{ fontSize: 30, marginBottom: 8 }}>Verify OTP</h1>
        <p className="kiosk-sub" style={{ marginBottom: 32 }}>Enter the 6-digit code sent to your phone<br /><span style={{ color: '#7B6EF6' }}>(Check terminal console)</span></p>

        {error && <div className="kiosk-error"><AlertCircle size={16} />{error}</div>}

        <div className="kiosk-input-group">
          <label>VERIFICATION CODE</label>
          <div className="kiosk-otp-row">
            {otp.map((d, i) => (
              <input key={i} ref={el => refs.current[i] = el} maxLength={1} value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => e.key === 'Backspace' && !otp[i] && i > 0 && refs.current[i-1]?.focus()}
                className="kiosk-otp-input" />
            ))}
          </div>
        </div>

        <button className="kiosk-btn primary" onClick={handleVerify} disabled={loading}>
          {loading ? <span className="kiosk-spinner" /> : <><Lock size={20} /> Verify & Continue</>}
        </button>
        <button className="kiosk-btn ghost" onClick={() => navigate(`/kiosk/${terminalId}/book`)}>← Back</button>
      </motion.div>
    </div>
  );
};

export default KioskOTP;