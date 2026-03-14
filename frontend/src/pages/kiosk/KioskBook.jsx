import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Smartphone, ArrowRight, AlertCircle } from 'lucide-react';
import kioskApi from '../../kioskApi';
import './Kiosk.css';

const KioskBook = () => {
  const { terminalId } = useParams();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await kioskApi.post('/auth/send-otp', { phone });
      sessionStorage.setItem('kioskPhone', phone);
      navigate(`/kiosk/${terminalId}/otp`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="kiosk-viewport">
      <div className="kiosk-glow" />
      <motion.div className="kiosk-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="kiosk-eyebrow">STEP 1 OF 4</p>
        <h1 className="kiosk-title" style={{ fontSize: 30, marginBottom: 8 }}>Enter Your Number</h1>
        <p className="kiosk-sub" style={{ marginBottom: 32 }}>We'll send a verification code to confirm your identity</p>

        {error && <div className="kiosk-error"><AlertCircle size={16} />{error}</div>}

        <form onSubmit={handleSendOtp}>
          <div className="kiosk-input-group">
            <label>MOBILE NUMBER</label>
            <div className="kiosk-input-field">
              <Smartphone size={22} className="kiosk-icon-sm" />
              <input type="tel" placeholder="+91 00000 00000" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="kiosk-btn primary" disabled={loading}>
            {loading ? <span className="kiosk-spinner" /> : <>Send OTP <ArrowRight size={20} /></>}
          </button>
        </form>

        <button className="kiosk-btn ghost" style={{ marginTop: 8 }} onClick={() => navigate(`/kiosk/${terminalId}`)}>
          ← Back
        </button>
      </motion.div>
    </div>
  );
};

export default KioskBook;
