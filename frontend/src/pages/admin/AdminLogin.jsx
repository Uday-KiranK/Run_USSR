import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, ArrowRight, Smartphone, AlertCircle } from 'lucide-react';
import api from '../../api';
import '../Login.css';

const AdminLogin = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/admin/login', { phone, password });
      localStorage.removeItem('userToken');
      localStorage.removeItem('phone');
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('role', 'ADMIN');
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
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
        transition={{ duration: 0.5 }}
      >
        <div className="card-top">
          <motion.div
            className="shield-wrapper"
            animate={{ boxShadow: ['0 0 20px rgba(123,110,246,0.3)', '0 0 40px rgba(123,110,246,0.6)', '0 0 20px rgba(123,110,246,0.3)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <ShieldCheck size={32} color="#7B6EF6" />
          </motion.div>
          <h1>ADMIN <span>PORTAL</span></h1>
          <p className="subtitle">CLOAKBE MANAGEMENT</p>
        </div>

        {error && (
          <motion.div className="error-bar" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AlertCircle size={14} /> {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>PHONE NUMBER</label>
            <div className="input-field">
              <Smartphone size={18} className="icon" />
              <input
                type="tel"
                placeholder="+91 00000 00000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="input-group">
            <label>PASSWORD</label>
            <div className="input-field">
              <Lock size={18} className="icon" />
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="main-btn purple" disabled={loading}>
            {loading ? <span className="spinner white" /> : <>Access Dashboard <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="card-footer">
          <ShieldCheck size={13} /> <span>ADMIN ACCESS ONLY</span>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;