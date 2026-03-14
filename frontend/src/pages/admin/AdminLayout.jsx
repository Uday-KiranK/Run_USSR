import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, MapPin, Monitor, ClipboardList, LogOut, ShieldCheck, Smartphone } from 'lucide-react';
import './Admin.css';

const NAV = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/sites',     icon: MapPin,           label: 'Sites' },
  { path: '/admin/terminals', icon: Monitor,          label: 'Terminals' },
  { path: '/admin/orders',    icon: ClipboardList,    label: 'Orders' },
];

const AdminLayout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => { localStorage.removeItem('adminToken'); localStorage.removeItem('role'); navigate('/admin'); };

  return (
    <div className="admin-viewport">
      <div className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo"><ShieldCheck size={20} color="#7B6EF6" /></div>
          <div>
            <p className="sidebar-title">CLOAKBE</p>
            <p className="sidebar-sub">ADMIN</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ path, icon: Icon, label }) => (
            <button
              key={path}
              className={`nav-item ${location.pathname === path ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button className="nav-item" onClick={() => navigate('/')}>
            <Smartphone size={18} /> <span>User App</span>
        </button>
        <button className="nav-item danger" onClick={logout}>
            <LogOut size={18} /> <span>Logout</span>
        </button>
      </div>

      <div className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-page-title">{title}</h1>
        </div>
        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;