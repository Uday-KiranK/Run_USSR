import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Monitor, ClipboardList, Box } from 'lucide-react';
import AdminLayout from './AdminLayout';
import api from '../../api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ sites: 0, terminals: 0, orders: 0, available: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/sites'),
      api.get('/terminals'),
      api.get('/orders/terminals'),
    ]).then(([sites, terminals, termData]) => {
      const available = termData.data.terminals.reduce((acc, t) => acc + t.availableCount, 0);
      setStats({
        sites: sites.data.total || 0,
        terminals: terminals.data.total || 0,
        available,
        });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const STATS = [
    { label: 'TOTAL SITES', value: stats.sites, cls: 'accent', icon: MapPin },
    { label: 'TERMINALS', value: stats.terminals, cls: 'accent', icon: Monitor },
    { label: 'BOXES AVAILABLE', value: stats.available, cls: 'success', icon: Box },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="stats-grid">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <p className="stat-label">{s.label}</p>
            <p className={`stat-value ${s.cls}`}>{loading ? '...' : s.value}</p>
          </motion.div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;