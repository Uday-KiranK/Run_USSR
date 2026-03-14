import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Box } from 'lucide-react';
import './Kiosk.css';

const KioskSuccess = () => {
  const { terminalId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const boxName = params.get('box');
  const orderId = params.get('order');
  const mode = params.get('mode');

  useEffect(() => {
    const t = setTimeout(() => {
      sessionStorage.clear();
      navigate(`/kiosk/${terminalId}`);
    }, 8000);
    return () => clearTimeout(t);
  }, [navigate, terminalId]);

  return (
    <div className="kiosk-viewport">
      <div className="kiosk-glow" style={{ background: 'radial-gradient(circle, rgba(0,229,160,0.15) 0%, transparent 70%)' }} />
      <motion.div className="kiosk-card" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.div
          className="kiosk-icon"
          style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', boxShadow: '0 0 40px rgba(0,229,160,0.2)' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <CheckCircle size={40} color="#00E5A0" />
        </motion.div>

        <p className="kiosk-eyebrow" style={{ color: '#00E5A0' }}>
          {mode === 'book' ? 'LOCKER RESERVED' : 'BOX OPENED'}
        </p>
        <h1 className="kiosk-title" style={{ color: '#00E5A0', fontSize: 34 }}>
          {mode === 'book' ? 'All Set!' : 'Enjoy!'}
        </h1>
        <p className="kiosk-sub">
          {mode === 'book'
            ? <>Box <strong style={{ color: 'white' }}>{boxName}</strong> is reserved.<br />Your PIN is set — go to the locker now!</>
            : <>Box <strong style={{ color: 'white' }}>{boxName}</strong> is now open.<br />Please collect your items.</>
          }
        </p>

        <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: 16, padding: '16px 20px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Order ID</span>
          <span style={{ color: 'white', fontWeight: 700 }}>{orderId}</span>
        </div>

        <button className="kiosk-btn primary" onClick={() => { sessionStorage.clear(); navigate(`/kiosk/${terminalId}`); }}>
          <Box size={18} /> Done — Return to Home
        </button>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 20 }}>
          Auto-returning to home in 8 seconds...
        </p>
      </motion.div>
    </div>
  );
};

export default KioskSuccess;