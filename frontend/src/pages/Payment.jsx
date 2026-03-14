import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Shield, ArrowRight, Package, Clock } from 'lucide-react';
import api from '../api';
import './Payment.css';

const Payment = () => {
  const { orderId, boxName, duration, amount } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/orders/pay/${orderId}`);
      navigate(`/set-pin/${orderId}/${boxName}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-viewport">
      <div className="bg-glow" />
      <div className="page-container center-content">
        <motion.div className="payment-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <p className="page-eyebrow" style={{ textAlign: 'center', marginBottom: 8 }}>STEP 2 OF 3</p>
          <h1 className="page-title" style={{ textAlign: 'center', marginBottom: 32 }}>Payment</h1>

          <div className="order-summary">
            <div className="summary-row">
              <div className="summary-icon"><Package size={18} color="#7B6EF6" /></div>
              <div>
                <p className="summary-label">SELECTED BOX</p>
                <p className="summary-value">{boxName}</p>
              </div>
            </div>
            <div className="summary-row">
              <div className="summary-icon"><Clock size={18} color="#7B6EF6" /></div>
              <div>
                <p className="summary-label">DURATION</p>
                <p className="summary-value">{duration} hour{duration > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="summary-row">
              <div className="summary-icon"><CreditCard size={18} color="#7B6EF6" /></div>
              <div>
                <p className="summary-label">ORDER ID</p>
                <p className="summary-value" style={{ fontSize: 13 }}>{orderId}</p>
              </div>
            </div>
            <div className="summary-divider" />
            <div className="price-row">
              <span>Locker Rental ({duration}hr)</span>
              <span className="price">₹{amount}</span>
            </div>
          </div>

          <div className="payment-demo-banner">
            <Shield size={14} />
            <span>Demo Mode — No real payment will be charged</span>
          </div>

          {error && <div className="error-bar">{error}</div>}

          <button className="main-btn purple" onClick={handlePay} disabled={loading}>
            {loading ? <span className="spinner white" /> : <>Pay ₹{amount} & Continue <ArrowRight size={18} /></>}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Payment;