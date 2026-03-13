import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, ArrowRight, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import api from '../api';
import './Login.css';

const Login = () => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef([]);
  const navigate = useNavigate();

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp: otp.join('') });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('phone', phone);
      navigate('/terminals');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-viewport">
      <div className="glow-orb" />
      <motion.div
        className="login-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="card-top">
          <motion.div
            className="shield-wrapper"
            animate={{ boxShadow: ['0 0 20px rgba(123,110,246,0.3)', '0 0 40px rgba(123,110,246,0.6)', '0 0 20px rgba(123,110,246,0.3)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <ShieldCheck size={32} color="#7B6EF6" />
          </motion.div>
          <h1>CLOAK<span>BE</span></h1>
          <p className="subtitle">SMART LOCKER SYSTEM</p>
        </div>

        {error && (
          <motion.div className="error-bar" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSendOtp}
            >
              <div className="input-group">
                <label>MOBILE NUMBER</label>
                <div className="input-field">
                  <Smartphone size={20} className="icon" />
                  <input
                    type="tel"
                    placeholder="+91 00000 00000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="main-btn" disabled={loading}>
                {loading ? <span className="spinner" /> : <>{' '}Send OTP <ArrowRight size={18} /></>}
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="input-group">
                <label>VERIFICATION CODE</label>
                <div className="otp-row">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      maxLength={1}
                      value={d}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => e.key === 'Backspace' && !otp[i] && i > 0 && otpRefs.current[i - 1]?.focus()}
                      className="otp-input"
                    />
                  ))}
                </div>
                <p className="otp-hint">Check your terminal console for the OTP</p>
              </div>
              <button className="main-btn purple" onClick={handleVerifyOtp} disabled={loading}>
                {loading ? <span className="spinner white" /> : <>Authorize Access <Lock size={18} /></>}
              </button>
              <button className="text-btn" onClick={() => { setStep(1); setOtp(['','','','','','']); }}>
                ← Use another number
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="card-footer">
          <ShieldCheck size={13} /> <span>END-TO-END ENCRYPTED SESSION</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;