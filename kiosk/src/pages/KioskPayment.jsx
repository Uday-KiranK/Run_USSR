import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Smartphone, ArrowRight } from 'lucide-react';
import api from '../api';
import './Kiosk.css';

const KioskPayment = () => {
  const { terminalId, orderId, boxName, duration, amount } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState('confirm'); // confirm | processing | success
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/orders/cancel/${orderId}`);
    } catch (_) {}
    navigate(`/kiosk/${terminalId}/layout`);
  };

  const handleConfirm = async () => {
    setStep('processing');
    setError('');
    await new Promise(r => setTimeout(r, 2200));
    try {
      await api.post(`/orders/pay/${orderId}`);
      setStep('success');
      setTimeout(() => {
        navigate(`/kiosk/${terminalId}/pin/${orderId}/${boxName}/${duration}/${amount}`);
      }, 1400);
    } catch (e) {
      setStep('confirm');
      setError(e.response?.data?.message || 'Payment failed. Try again.');
    }
  };

  return (
    <div className="kiosk-viewport">
      <div className="kiosk-glow" />
      <AnimatePresence mode="wait">
        {step === 'processing' ? (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', zIndex: 2, position: 'relative' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: 72, height: 72, borderRadius: '50%',
                border: '4px solid rgba(123,110,246,0.15)', borderTop: '4px solid #7B6EF6',
                margin: '0 auto 32px' }} />
            <p style={{ color: 'white', fontWeight: 800, fontSize: 24 }}>Processing Payment…</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', marginTop: 12, fontSize: 14 }}>Please wait</p>
          </motion.div>
        ) : step === 'success' ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', zIndex: 2, position: 'relative' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(0,229,160,0.1)',
                border: '2px solid rgba(0,229,160,0.4)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle size={48} color="#00E5A0" />
            </motion.div>
            <p style={{ color: '#00E5A0', fontWeight: 800, fontSize: 28 }}>₹{amount} Paid!</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 14 }}>Setting up your PIN…</p>
          </motion.div>
        ) : (
          <motion.div key="confirm" className="kiosk-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            <div className="kiosk-icon">
              <Smartphone size={34} color="#7B6EF6" />
            </div>
            <p className="kiosk-eyebrow">STEP 3 OF 5</p>
            <h1 className="kiosk-title" style={{ fontSize: 28, marginBottom: 8 }}>Confirm Payment</h1>
            <p className="kiosk-sub" style={{ marginBottom: 28 }}>
              Use the payment terminal or scan below to pay
            </p>

            {/* Dummy QR / amount display */}
            <div style={{ background: 'rgba(4,5,40,0.7)', border: '1px solid rgba(123,110,246,0.2)',
              borderRadius: 20, padding: '24px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ width: 120, height: 120, margin: '0 auto 16px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 4 }}>
                {[...Array(5)].map((_, r) => (
                  <div key={r} style={{ display: 'flex', gap: 4 }}>
                    {[...Array(5)].map((_, c) => (
                      <div key={c} style={{ width: 16, height: 16, borderRadius: 2,
                        background: (r + c) % 2 === 0 ? 'rgba(123,110,246,0.6)' : 'rgba(123,110,246,0.15)' }} />
                    ))}
                  </div>
                ))}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 8 }}>Scan QR or tap below</p>
              <p style={{ color: '#00E5A0', fontWeight: 900, fontSize: 32 }}>₹{amount}</p>
            </div>

            {/* Order details */}
            <div style={{ background: 'rgba(123,110,246,0.06)', border: '1px solid rgba(123,110,246,0.15)',
              borderRadius: 14, padding: '12px 16px', marginBottom: 20,
              display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <div style={{ color: 'rgba(255,255,255,0.4)' }}>
                <p>Box</p>
                <p style={{ marginTop: 4 }}>Duration</p>
              </div>
              <div style={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>
                <p>{boxName}</p>
                <p style={{ marginTop: 4 }}>{duration}hr</p>
              </div>
            </div>

            {error && <div className="kiosk-error" style={{ marginBottom: 16 }}><AlertCircle size={16} />{error}</div>}

            <button className="kiosk-btn primary" onClick={handleConfirm}>
              Payment Done — Continue <ArrowRight size={20} />
            </button>
            <button className="kiosk-btn ghost" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : '← Cancel Booking'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KioskPayment;
