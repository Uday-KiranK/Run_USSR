import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, MapPin } from 'lucide-react';
import AdminLayout from './AdminLayout';
import api from '../../api';

const AdminSites = () => {
  const [sites, setSites] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', address: '', state: '', pincode: '', latitude: '', longitude: '' });

  const load = () => api.get('/sites').then(r => setSites(r.data.data || []));

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/sites', { ...form, pincode: Number(form.pincode), latitude: Number(form.latitude), longitude: Number(form.longitude) });
      setShowModal(false);
      setForm({ name: '', address: '', state: '', pincode: '', latitude: '', longitude: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create site');
    } finally { setLoading(false); }
  };

  return (
    <AdminLayout title="Sites">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="admin-btn primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Site
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>NAME</th><th>ADDRESS</th><th>STATE</th><th>PINCODE</th><th>COORDINATES</th>
            </tr>
          </thead>
          <tbody>
            {sites.map(s => (
              <tr key={s._id}>
                <td style={{ color: 'white', fontWeight: 600 }}>{s.name}</td>
                <td>{s.address}</td>
                <td>{s.state}</td>
                <td>{s.pincode}</td>
                <td style={{ fontSize: 11 }}>{s.latitude}, {s.longitude}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <h2 className="modal-title" style={{ margin: 0 }}>Add New Site</h2>
                <button className="admin-btn secondary" style={{ padding: '8px' }} onClick={() => setShowModal(false)}><X size={16} /></button>
              </div>

              {[
                { key: 'name', label: 'SITE NAME', placeholder: 'Phoenix Mall' },
                { key: 'address', label: 'ADDRESS', placeholder: 'Whitefield, Bangalore' },
                { key: 'state', label: 'STATE', placeholder: 'Karnataka' },
                { key: 'pincode', label: 'PINCODE', placeholder: '560001' },
                { key: 'latitude', label: 'LATITUDE', placeholder: '12.9716' },
                { key: 'longitude', label: 'LONGITUDE', placeholder: '77.5946' },
              ].map(f => (
                <div className="form-group" key={f.key}>
                  <label>{f.label}</label>
                  <input className="form-input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}

              {error && <div className="error-bar">{error}</div>}

              <div className="modal-actions">
                <button className="admin-btn primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Creating...' : <><MapPin size={15} /> Create Site</>}
                </button>
                <button className="admin-btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminSites;