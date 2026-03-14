import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Unlock, ShieldCheck } from 'lucide-react';
import './Kiosk.css';

const KioskHome = () => {
  const { terminalId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="kiosk-viewport">
      <div className="kiosk-glow" />
      <motion.div
        className="kiosk-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="kiosk-icon"
          animate={{ boxShadow: ['0 0 20px rgba(123,110,246,0.3)', '0 0 50px rgba(123,110,246,0.6)', '0 0 20px rgba(123,110,246,0.3)'] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Box size={36} color="#7B6EF6" />
        </motion.div>

        <p className="kiosk-eyebrow">SMART LOCKER TERMINAL</p>
        <h1 className="kiosk-title">CLOAKBE</h1>
        <p className="kiosk-sub">Store your belongings securely.<br />Choose an option to get started.</p>

        <button className="kiosk-btn primary" onClick={() => navigate(`/kiosk/${terminalId}/book`)}>
          <Box size={20} /> Book a Locker
        </button>

        <div className="kiosk-divider">OR</div>

        <button className="kiosk-btn white" onClick={() => navigate(`/kiosk/${terminalId}/pickup`)}>
          <Unlock size={20} /> Already Booked? Pick Up
        </button>

        <div className="kiosk-footer">
          <ShieldCheck size={13} /> END-TO-END ENCRYPTED
        </div>
      </motion.div>
    </div>
  );
};

export default KioskHome;
