import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, QrCode, Monitor, Activity, RotateCcw, PaintBucket } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import AdminLayout from './AdminLayout';
import api from '../../api';

const KIOSK_BASE = 'http://localhost:3000/kiosk';

const BOX_CONFIG = {
  SMALL:  { letter: 'S', color: '#22D3EE', bg: 'rgba(34,211,238,0.12)',  border: 'rgba(34,211,238,0.4)',  innerSize: 28, fontSize: 10 },
  MEDIUM: { letter: 'M', color: '#7B6EF6', bg: 'rgba(123,110,246,0.12)', border: 'rgba(123,110,246,0.4)', innerSize: 42, fontSize: 12 },
  LARGE:  { letter: 'L', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.4)',  innerSize: 56, fontSize: 15 },
};

const CELL_SIZE = 64; // outer cell size — same for all types, inner box varies

const AdminTerminals = () => {
  const navigate = useNavigate();
  const [terminals, setTerminals] = useState([]);
  const [sites, setSites] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [qrTerminal, setQrTerminal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
  identifiableName: '', description: '', siteId: '', physicalLocation: '',
  rows: 4, columns: 5,
  });
  const [rates, setRates] = useState({ SMALL: 20, MEDIUM: 30, LARGE: 50, EXTRA_LARGE: 80 });
  const [defaultType, setDefaultType] = useState('MEDIUM');
  const [boxTypes, setBoxTypes] = useState({});   // key: 'r-c' → 'SMALL'|'MEDIUM'|'LARGE'
  const [activePaint, setActivePaint] = useState('MEDIUM');
  const isDragging = useRef(false);

  const [editPricingTerminal, setEditPricingTerminal] = useState(null);
  const [editRates, setEditRates] = useState({ SMALL: 20, MEDIUM: 30, LARGE: 50, EXTRA_LARGE: 80 });
  const [editPricingLoading, setEditPricingLoading] = useState(false);
  const [editPricingError, setEditPricingError] = useState('');

  // Reset per-box overrides when grid dimensions change
  useEffect(() => { setBoxTypes({}); }, [form.rows, form.columns]);
  // When default type changes, reset overrides
  useEffect(() => { setBoxTypes({}); setActivePaint(defaultType); }, [defaultType]);

  const load = useCallback(() => Promise.all([
    api.get('/terminals').then(r => setTerminals(r.data.data || [])),
    api.get('/sites').then(r => setSites(r.data.data || [])),
  ]), []);

  useEffect(() => { load(); }, [load]);

  const paintBox = useCallback((r, c) => {
    setBoxTypes(prev => ({ ...prev, [`${r}-${c}`]: activePaint }));
  }, [activePaint]);

  const fillAll = () => {
    const next = {};
    for (let r = 0; r < form.rows; r++)
      for (let c = 0; c < form.columns; c++)
        next[`${r}-${c}`] = activePaint;
    setBoxTypes(next);
  };

  const resetGrid = () => setBoxTypes({});

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/terminals', {
        identifiableName: form.identifiableName,
        description: form.description,
        siteId: form.siteId,
        physicalLocation: form.physicalLocation,
      });

      // Build per-box overrides (only where different from defaultType)
      const boxes = [];
      for (let r = 0; r < form.rows; r++) {
        for (let c = 0; c < form.columns; c++) {
          const t = boxTypes[`${r}-${c}`];
          if (t && t !== defaultType) boxes.push({ row: r, col: c, type: t });
        }
      }

      // Create pricing config
const pricingRes = await api.post('/pricing', {
  rates,
  currency: 'INR',
  updatedBy: 'admin'
});

await api.post(`/terminals/${res.data.data._id}/layout`, {
  rows: form.rows,
  cols: form.columns,
  defaultType,
  boxes,
  skipPayment: true,
  pricingId: pricingRes.data.data._id
});

      setShowModal(false);
      setForm({ identifiableName: '', description: '', siteId: '', physicalLocation: '', rows: 4, columns: 5 });
      setBoxTypes({});
      setDefaultType('MEDIUM');
      setRates({ SMALL: 20, MEDIUM: 30, LARGE: 50, EXTRA_LARGE: 80 });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create terminal');
    } finally { setLoading(false); }
  };

  const getStatusBadge = (status) => {
    const map = { ACTIVE: 'success', SETUP_IN_PROGRESS: 'warning', DECOMMISSIONED: 'danger' };
    return <span className={`badge ${map[status] || 'muted'}`}>{status}</span>;
  };

  const getBoxType = (r, c) => boxTypes[`${r}-${c}`] || defaultType;

  const totalBoxes = form.rows * form.columns;
  const typeCounts = { SMALL: 0, MEDIUM: 0, LARGE: 0 };
  for (let r = 0; r < form.rows; r++)
    for (let c = 0; c < form.columns; c++)
      typeCounts[getBoxType(r, c)]++;

  return (
    <AdminLayout title="Terminals">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="admin-btn primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Terminal
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>NAME</th><th>LOCATION</th><th>STATUS</th><th>PRICING</th><th>MONITOR</th><th>QR CODE</th></tr>
          </thead>
          <tbody>
            {terminals.map(t => (
              <tr key={t._id}>
                <td style={{ color: 'white', fontWeight: 600 }}>{t.identifiableName}</td>
                <td>{t.physicalLocation}</td>
                <td>{getStatusBadge(t.status)}</td>
                <td>
  <button className="admin-btn secondary" style={{ padding: '6px 12px', fontSize: 11 }}
    onClick={async () => {
      try {
        const res = await api.get(`/orders/terminals/${t._id}/pricing`);
        setEditRates(res.data.rates);
        setEditPricingTerminal(t);
      } catch {
        setEditPricingTerminal(t);
      }
    }}>
    ₹ Edit
  </button>
</td>
<td>
  <button className="admin-btn secondary" style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
    onClick={() => navigate(`/admin/terminal/${t._id}/monitor`)}>
    <Activity size={12} /> Monitor
  </button>
</td>
                <td>
                  <button className="admin-btn secondary" style={{ padding: '6px 12px', fontSize: 11 }}
                    onClick={() => setQrTerminal(t)}>
                    <QrCode size={13} /> View QR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add Terminal Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ alignItems: 'flex-start', paddingTop: 32, paddingBottom: 32 }}>
            <motion.div className="modal-card" initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
              style={{ maxWidth: 700 }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <h2 className="modal-title" style={{ margin: 0 }}>Add Terminal</h2>
                <button className="admin-btn secondary" style={{ padding: '8px' }} onClick={() => setShowModal(false)}><X size={16} /></button>
              </div>

              {/* ── Terminal Info ── */}
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>TERMINAL DETAILS</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>TERMINAL NAME</label>
                  <input className="form-input" placeholder="Terminal A – Ground Floor"
                    value={form.identifiableName} onChange={e => setForm({ ...form, identifiableName: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>SITE</label>
                  <select className="form-input" value={form.siteId} onChange={e => setForm({ ...form, siteId: e.target.value })}>
                    <option value="">Select a site</option>
                    {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>PHYSICAL LOCATION</label>
                  <input className="form-input" placeholder="Ground Floor, Near Entrance"
                    value={form.physicalLocation} onChange={e => setForm({ ...form, physicalLocation: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>DESCRIPTION</label>
                  <input className="form-input" placeholder="Optional description"
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              {/* ── Pricing Config ── */}
<div style={{ height: 1, background: 'rgba(123,110,246,0.12)', margin: '28px 0' }} />
<p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>PRICING (₹ per hour)</p>
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
  {[
    { key: 'SMALL', label: 'Small', color: '#22D3EE' },
    { key: 'MEDIUM', label: 'Medium', color: '#7B6EF6' },
    { key: 'LARGE', label: 'Large', color: '#F59E0B' },
    { key: 'EXTRA_LARGE', label: 'Extra Large', color: '#F97316' },
  ].map(({ key, label, color }) => (
    <div className="form-group" key={key} style={{ marginBottom: 0 }}>
      <label style={{ color }}>{label.toUpperCase()}</label>
      <input
        className="form-input"
        type="number"
        min={1}
        placeholder="₹/hr"
        value={rates[key]}
        onChange={e => setRates({ ...rates, [key]: Number(e.target.value) })}
      />
    </div>
  ))}
</div>
<p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>
  Price × hours = total charged to user
</p>
              {/* ── Layout Config ── */}
              <div style={{ height: 1, background: 'rgba(123,110,246,0.12)', margin: '28px 0' }} />
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>LAYOUT DESIGN</p>

              {/* Grid size + default type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>ROWS</label>
                  <input className="form-input" type="number" min={1} max={8} value={form.rows}
                    onChange={e => setForm({ ...form, rows: Math.max(1, Math.min(8, Number(e.target.value))) })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>COLUMNS</label>
                  <input className="form-input" type="number" min={1} max={12} value={form.columns}
                    onChange={e => setForm({ ...form, columns: Math.max(1, Math.min(12, Number(e.target.value))) })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>DEFAULT TYPE</label>
                  <select className="form-input" value={defaultType} onChange={e => setDefaultType(e.target.value)}>
                    <option value="SMALL">Small (S)</option>
                    <option value="MEDIUM">Medium (M)</option>
                    <option value="LARGE">Large (L)</option>
                  </select>
                </div>
              </div>

              {/* Paint toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>PAINT:</span>
                {Object.entries(BOX_CONFIG).map(([type, cfg]) => (
                  <button key={type} onClick={() => setActivePaint(type)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
                      fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: 800,
                      border: activePaint === type ? `2px solid ${cfg.color}` : '2px solid rgba(255,255,255,0.08)',
                      background: activePaint === type ? cfg.bg : 'rgba(255,255,255,0.03)',
                      color: activePaint === type ? cfg.color : 'rgba(255,255,255,0.4)',
                      transition: 'all 0.15s',
                    }}>
                    {/* Preview inner box */}
                    <div style={{
                      width: type === 'SMALL' ? 10 : type === 'MEDIUM' ? 14 : 18,
                      height: type === 'SMALL' ? 10 : type === 'MEDIUM' ? 14 : 18,
                      background: cfg.bg, border: `1.5px solid ${cfg.color}`,
                      borderRadius: 3,
                    }} />
                    {cfg.letter} — {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <button onClick={fillAll} title="Fill all boxes with selected type"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Plus Jakarta Sans' }}>
                  <PaintBucket size={13} /> Fill All
                </button>
                <button onClick={resetGrid} title="Reset all to default type"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Plus Jakarta Sans' }}>
                  <RotateCcw size={13} /> Reset
                </button>
              </div>

              {/* Hint */}
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>
                Click or drag across boxes to paint their type. Click a box to cycle S → M → L.
              </p>

              {/* Grid */}
              <div
                style={{ background: 'rgba(4,5,40,0.7)', borderRadius: 16, padding: 20, overflowX: 'auto', userSelect: 'none' }}
                onMouseLeave={() => { isDragging.current = false; }}
                onMouseUp={() => { isDragging.current = false; }}
              >
                {/* Column labels */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, paddingLeft: 28 }}>
                  {Array.from({ length: form.columns }).map((_, c) => (
                    <div key={c} style={{ width: CELL_SIZE, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>
                      {c + 1}
                    </div>
                  ))}
                </div>

                {Array.from({ length: form.rows }).map((_, r) => (
                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {/* Row label */}
                    <div style={{ width: 22, textAlign: 'center', fontSize: 11, color: 'rgba(123,110,246,0.6)', fontWeight: 800, flexShrink: 0 }}>
                      {String.fromCharCode(65 + r)}
                    </div>

                    {Array.from({ length: form.columns }).map((_, c) => {
                      const type = getBoxType(r, c);
                      const cfg = BOX_CONFIG[type];
                      return (
                        <div key={c}
                          style={{
                            width: CELL_SIZE, height: CELL_SIZE,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed rgba(255,255,255,0.07)',
                            borderRadius: 10, cursor: 'crosshair', flexShrink: 0,
                          }}
                          onMouseDown={() => { isDragging.current = true; paintBox(r, c); }}
                          onMouseEnter={() => { if (isDragging.current) paintBox(r, c); }}
                        >
                          {/* Inner box — size reflects type */}
                          <div style={{
                            width: cfg.innerSize, height: cfg.innerSize,
                            background: cfg.bg,
                            border: `2px solid ${cfg.border}`,
                            borderRadius: type === 'LARGE' ? 10 : type === 'MEDIUM' ? 8 : 6,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: cfg.color,
                            fontSize: cfg.fontSize,
                            fontWeight: 900,
                            transition: 'all 0.12s',
                            boxShadow: `0 0 ${type === 'LARGE' ? 10 : type === 'MEDIUM' ? 6 : 3}px ${cfg.bg}`,
                          }}>
                            {cfg.letter}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{totalBoxes} boxes total</span>
                {Object.entries(typeCounts).map(([type, count]) => count > 0 && (
                  <span key={type} style={{ fontSize: 11, color: BOX_CONFIG[type].color, fontWeight: 700 }}>
                    {BOX_CONFIG[type].letter}: {count}
                  </span>
                ))}
              </div>

              {error && <div className="error-bar" style={{ marginTop: 16 }}>{error}</div>}

              <div className="modal-actions">
                <button className="admin-btn primary" onClick={handleSubmit} disabled={loading || !form.identifiableName || !form.siteId}>
                  {loading ? 'Creating...' : <><Monitor size={15} /> Create Terminal</>}
                </button>
                <button className="admin-btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Pricing Modal ── */}
<AnimatePresence>
  {editPricingTerminal && (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal-card" style={{ maxWidth: 460 }} initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Edit Pricing</h2>
          <button className="admin-btn secondary" style={{ padding: '8px' }} onClick={() => setEditPricingTerminal(null)}><X size={16} /></button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>
          Terminal: <strong style={{ color: 'white' }}>{editPricingTerminal.identifiableName}</strong>
        </p>

        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>
          RATES (₹ PER HOUR)
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
          {[
            { key: 'SMALL', label: 'Small', color: '#22D3EE' },
            { key: 'MEDIUM', label: 'Medium', color: '#7B6EF6' },
            { key: 'LARGE', label: 'Large', color: '#F59E0B' },
            { key: 'EXTRA_LARGE', label: 'Extra Large', color: '#F97316' },
          ].map(({ key, label, color }) => (
            <div className="form-group" key={key} style={{ marginBottom: 0 }}>
              <label style={{ color }}>{label.toUpperCase()} (₹/hr)</label>
              <input className="form-input" type="number" min={1}
                value={editRates[key]}
                onChange={e => setEditRates({ ...editRates, [key]: Number(e.target.value) })} />
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>
          Changes apply to all new bookings at this terminal
        </p>

        {editPricingError && <div className="error-bar">{editPricingError}</div>}

        <div className="modal-actions">
          <button className="admin-btn primary" disabled={editPricingLoading}
            onClick={async () => {
              setEditPricingLoading(true); setEditPricingError('');
              try {
                // Create new pricing and update terminal meta
                const pricingRes = await api.post('/pricing', {
                  rates: editRates, currency: 'INR', updatedBy: 'admin'
                });
                // Update terminal metadata with new pricingId via layout update
                await api.put(`/terminals/${editPricingTerminal._id}/layout`, {
                  pricingId: pricingRes.data.data._id
                });
                setEditPricingTerminal(null);
              } catch (err) {
                setEditPricingError(err.response?.data?.message || 'Failed to update pricing');
              } finally { setEditPricingLoading(false); }
            }}>
            {editPricingLoading ? 'Saving...' : 'Save Pricing'}
          </button>
          <button className="admin-btn secondary" onClick={() => setEditPricingTerminal(null)}>Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* ── QR Code Modal ── */}
      <AnimatePresence>
        {qrTerminal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-card" style={{ textAlign: 'center', maxWidth: 380 }} initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="admin-btn secondary" style={{ padding: '8px' }} onClick={() => setQrTerminal(null)}><X size={16} /></button>
              </div>
              <p style={{ color: '#7B6EF6', fontSize: 10, fontWeight: 800, letterSpacing: 3, marginBottom: 8 }}>KIOSK QR CODE</p>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>{qrTerminal.identifiableName}</h2>
              <div style={{ background: 'white', padding: 20, borderRadius: 16, display: 'inline-block', marginBottom: 20 }}>
                <QRCodeSVG value={`${KIOSK_BASE}/${qrTerminal._id}`} size={200} />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>Scan to open kiosk for this terminal</p>
              <p style={{ color: '#7B6EF6', fontSize: 11, wordBreak: 'break-all' }}>{KIOSK_BASE}/{qrTerminal._id}</p>
              <div className="modal-actions" style={{ justifyContent: 'center', marginTop: 24 }}>
                <button className="admin-btn primary" onClick={() => window.print()}>Print QR Code</button>
                <button className="admin-btn secondary" onClick={() => setQrTerminal(null)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminTerminals;
