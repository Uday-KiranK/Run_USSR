import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ClipboardList, Navigation } from 'lucide-react';
import api from '../api';
import CountdownTimer from '../components/CountdownTimer';
import './Confirmation.css';

const Confirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/orders/${orderId}`).then(res => setOrder(res.data.order));
  }, [orderId]);

  return (
    <div className="page-viewport">
      <div className="bg-glow success-glow" />
      <div className="page-container center-content">
        <motion.div className="payment-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.div
            className="success-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          >
            <CheckCircle size={36} color="#00E5A0" />
          </motion.div>

          <h1 className="page-title" style={{textAlign:'center', color:'#00E5A0', marginBottom:8}}>
            Locker Reserved!
          </h1>
          <p className="pin-desc">Your box is ready. Head to the terminal and enter your PIN.</p>

          {order && (
            <div className="confirmation-details">
              <div className="conf-row">
                <span>Order ID</span>
                <strong>{order.orderId}</strong>
              </div>
              <div className="conf-row">
                <span>Box</span>
                <strong>{order.boxName}</strong>
              </div>
              <div className="conf-row">
                <span>Status</span>
                <span className="status-badge">{order.status}</span>
              </div>
              <div className="conf-row">
                <span>Expires in</span>
                <CountdownTimer expiryTime={order.expiryTime} style={{ fontSize: 14 }} />
              </div>
            </div>
          )}

          <div className="conf-actions">
            <button className="main-btn purple" onClick={() => navigate('/pickup')}>
              <Navigation size={17} /> Go to Pickup
            </button>
            <button className="main-btn" onClick={() => navigate('/my-orders')}>
              <ClipboardList size={17} /> My Orders
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Confirmation;