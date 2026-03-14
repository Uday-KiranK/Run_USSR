import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Smartphone, Package, Clock, Shield, CheckCircle, ArrowRight, Lock } from 'lucide-react';
import api from '../api';
import './Payment.css';

const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

const Payment = () => {
  const { orderId, boxName, duration, amount } = useParams();
  const navigate = useNavigate();

  const [method, setMethod] = useState('card');
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (method === 'card') {
      if (cardNum.replace(/\s/g, '').length < 16) return 'Enter a valid 16-digit card number';
      if (expiry.length < 5) return 'Enter a valid expiry (MM/YY)';
      if (cvv.length < 3) return 'Enter a valid CVV';
    } else {
      if (!upiId.includes('@')) return 'Enter a valid UPI ID (e.g. name@upi)';
    }
    return null;
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/orders/cancel/${orderId}`);
    } catch (_) {
      // Even if cancel fails, navigate away — order will expire on its own
    }
    navigate('/terminals');
  };

  const handlePay = async () => {
    const err = validate();
    if (err) return setError(err);
    setError('');
    setProcessing(true);

    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 2000));

    try {
      await api.post(`/orders/pay/${orderId}`);
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => navigate(`/set-pin/${orderId}/${boxName}`), 1200);
    } catch (e) {
      setProcessing(false);
      setError(e.response?.data?.message || 'Payment failed. Try again.');
    }
  };

  return (
    <div className="page-viewport">
      <div className="bg-glow" />
      <div className="page-container center-content">
        <motion.div className="payment-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '20px 0' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,229,160,0.12)',
                    border: '2px solid rgba(0,229,160,0.4)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={36} color="#00E5A0" />
                </motion.div>
                <p style={{ color: '#00E5A0', fontWeight: 800, fontSize: 20 }}>Payment Confirmed!</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>Setting up your PIN…</p>
              </motion.div>
            ) : processing ? (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '40px 0' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 56, height: 56, borderRadius: '50%',
                    border: '3px solid rgba(123,110,246,0.15)', borderTop: '3px solid #7B6EF6',
                    margin: '0 auto 24px' }} />
                <p style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Processing Payment…</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 8 }}>Please wait, do not close this page</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="page-eyebrow" style={{ textAlign: 'center', marginBottom: 8 }}>STEP 2 OF 3</p>
                <h1 className="page-title" style={{ textAlign: 'center', marginBottom: 24 }}>Payment</h1>

                {/* Order summary */}
                <div className="order-summary" style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="summary-icon"><Package size={16} color="#7B6EF6" /></div>
                      <div>
                        <p className="summary-label">BOX · DURATION</p>
                        <p className="summary-value">{boxName} · {duration}hr</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="summary-label">TOTAL</p>
                      <p style={{ color: '#00E5A0', fontSize: 22, fontWeight: 800 }}>₹{amount}</p>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', borderTop: '1px solid rgba(123,110,246,0.1)', paddingTop: 10 }}>
                    Order ID: {orderId}
                  </div>
                </div>

                {/* Method tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(4,5,40,0.6)', borderRadius: 14, padding: 4 }}>
                  {[['card', <CreditCard size={15} />, 'Card'], ['upi', <Smartphone size={15} />, 'UPI']].map(([m, icon, label]) => (
                    <button key={m} onClick={() => { setMethod(m); setError(''); }}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: method === m ? '#7B6EF6' : 'transparent',
                        color: method === m ? 'white' : 'rgba(255,255,255,0.35)',
                        fontSize: 13, fontWeight: 700, fontFamily: 'Plus Jakarta Sans', transition: 'all 0.2s',
                      }}>
                      {icon}{label}
                    </button>
                  ))}
                </div>

                {method === 'card' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>CARD NUMBER</label>
                      <input value={cardNum} onChange={e => setCardNum(formatCard(e.target.value))}
                        placeholder="1234 5678 9012 3456" maxLength={19}
                        style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>EXPIRY</label>
                        <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                          placeholder="MM/YY" maxLength={5} style={inputStyle} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>CVV</label>
                        <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          placeholder="123" maxLength={3} type="password" style={inputStyle} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>UPI ID</label>
                    <input value={upiId} onChange={e => setUpiId(e.target.value)}
                      placeholder="yourname@upi" style={inputStyle} />
                  </div>
                )}

                <div className="payment-demo-banner" style={{ marginBottom: 16 }}>
                  <Shield size={13} />
                  <span>Demo Mode — No real payment will be charged</span>
                </div>

                {error && <div className="error-bar" style={{ marginBottom: 16 }}>{error}</div>}

                <button className="main-btn purple" onClick={handlePay}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Lock size={16} /> Pay ₹{amount} & Continue <ArrowRight size={16} />
                </button>

                <button onClick={handleCancel} disabled={cancelling}
                  style={{
                    width: '100%', marginTop: 12, padding: '14px',
                    background: 'none', border: '1px solid rgba(255,77,109,0.25)',
                    borderRadius: 16, color: cancelling ? 'rgba(255,77,109,0.35)' : 'rgba(255,77,109,0.7)',
                    fontSize: 14, fontWeight: 600, cursor: cancelling ? 'not-allowed' : 'pointer',
                    fontFamily: 'Plus Jakarta Sans', transition: 'all 0.2s',
                  }}>
                  {cancelling ? 'Cancelling…' : 'Cancel Booking'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  background: 'rgba(4,5,40,0.7)', border: '1px solid rgba(123,110,246,0.2)',
  color: 'white', fontSize: 14, fontFamily: 'Plus Jakarta Sans',
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 10, fontWeight: 700, letterSpacing: 2,
  color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6,
};

export default Payment;
