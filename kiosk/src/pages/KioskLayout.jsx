import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, AlertCircle, Clock, MapPin } from 'lucide-react';
import api from '../api';
import './Kiosk.css';

const STATUS_COLORS = {
  EMPTY_CLOSED: 'available',
  BOOKED: 'booked',
  OCCUPIED_OPEN: 'occupied',
  OCCUPIED_CLOSED: 'occupied',
  DISABLED: 'disabled',
};

const SLOT_OPTIONS = [1, 2, 3, 6, 12];

const KioskLayout = () => {
  const { terminalId } = useParams();
  const [boxes, setBoxes] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [terminalName, setTerminalName] = useState('');
  const [terminalLocation, setTerminalLocation] = useState('');
  const [selected, setSelected] = useState(null);
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get(`/orders/terminals/${terminalId}/layout`),
      api.get(`/orders/terminals/${terminalId}/pricing`)
    ]).then(([layoutRes, pricingRes]) => {
      setBoxes(layoutRes.data.boxes);
      setPricing(pricingRes.data.rates);
      setTerminalName(layoutRes.data.terminalName || '');
      setTerminalLocation(layoutRes.data.terminalLocation || '');
    }).catch(() => navigate(`/kiosk/${terminalId}`))
      .finally(() => setLoading(false));
  }, [terminalId, navigate]);

  const rows = [...new Set(boxes.map(b => b.row))].sort();

  const getPrice = () => {
    if (!selected || !pricing) return 0;
    return (pricing[selected.type] || 30) * duration;
  };

  const handleBook = async () => {
    if (!selected) return;
    setBooking(true); setError('');
    try {
      const res = await api.post('/orders/book', {
        boxId: selected._id,
        durationHours: duration,
        source: 'KIOSK'
      });
      navigate(`/kiosk/${terminalId}/payment/${res.data.orderId}/${selected.identifiableName}/${duration}/${res.data.amountDue}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally { setBooking(false); }
  };

  return (
    <div className="kiosk-viewport" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="kiosk-glow" />
      <div style={{ width: '100%', maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
          <p className="kiosk-eyebrow" style={{ textAlign: 'center' }}>STEP 3 OF 4</p>
          <h1 className="kiosk-title" style={{ textAlign: 'center', fontSize: 30 }}>Choose Your Box</h1>
          {(terminalName || terminalLocation) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              <MapPin size={14} color="#7B6EF6" />
              <span>{terminalName}{terminalName && terminalLocation ? ' · ' : ''}{terminalLocation}</span>
            </div>
          )}
        </motion.div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          {[['#00E5A0','Available'],['orange','Booked'],['#FF4D6D','In Use']].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 60 }}>Loading boxes...</div>
        ) : (
          <motion.div
            style={{ background: 'rgba(8,10,60,0.6)', border: '1px solid rgba(123,110,246,0.15)', borderRadius: 28, padding: 28, marginBottom: 20 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            {rows.map(row => (
              <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <span style={{ width: 28, color: 'rgba(123,110,246,0.7)', fontSize: 14, fontWeight: 800, textAlign: 'center' }}>
                  {String.fromCharCode(65 + row)}
                </span>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {boxes.filter(b => b.row === row).sort((a,b) => a.col - b.col).map(box => {
                    const status = STATUS_COLORS[box.boxStatus] || 'disabled';
                    const isAvail = status === 'available';
                    const isSel = selected?._id === box._id;
                    const colors = {
                      available: { bg: 'rgba(0,229,160,0.08)', border: 'rgba(0,229,160,0.3)', color: '#00E5A0' },
                      booked: { bg: 'rgba(255,165,0,0.06)', border: 'rgba(255,165,0,0.3)', color: 'rgba(255,165,0,0.5)' },
                      occupied: { bg: 'rgba(255,77,109,0.06)', border: 'rgba(255,77,109,0.2)', color: 'rgba(255,77,109,0.4)' },
                      disabled: { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.15)' },
                    };
                    const c = isSel ? { bg: 'rgba(123,110,246,0.25)', border: '#7B6EF6', color: 'white' } : colors[status];
                    return (
                      <motion.button key={box._id}
                        onClick={() => isAvail && setSelected(isSel ? null : box)}
                        whileHover={isAvail ? { scale: 1.1 } : {}}
                        whileTap={isAvail ? { scale: 0.95 } : {}}
                        style={{
                          width: 62, height: 62, borderRadius: 14,
                          background: c.bg, border: `1.5px solid ${c.border}`, color: c.color,
                          fontSize: 13, fontWeight: 700, cursor: isAvail ? 'pointer' : 'not-allowed',
                          fontFamily: 'Plus Jakarta Sans',
                          boxShadow: isSel ? '0 0 20px rgba(123,110,246,0.4)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        {isSel ? <Lock size={14} /> : box.identifiableName.split('-')[1]}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Time slot selector — shows after box selected */}
        {selected && pricing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(8,10,60,0.6)', border: '1px solid rgba(123,110,246,0.2)', borderRadius: 22, padding: '20px 24px', marginBottom: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              <Clock size={16} color="#7B6EF6" />
              <span>How long do you need it?</span>
              <span style={{ marginLeft: 'auto', color: '#7B6EF6', fontSize: 12, fontWeight: 700 }}>
                ₹{pricing[selected.type] || 30}/hr for {selected.type?.toLowerCase()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {SLOT_OPTIONS.map(h => (
                <button key={h} onClick={() => setDuration(h)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '12px 18px', minWidth: 68,
                    background: duration === h ? 'rgba(123,110,246,0.15)' : 'rgba(4,5,40,0.6)',
                    border: `1.5px solid ${duration === h ? '#7B6EF6' : 'rgba(123,110,246,0.15)'}`,
                    borderRadius: 14, cursor: 'pointer',
                    boxShadow: duration === h ? '0 0 16px rgba(123,110,246,0.2)' : 'none',
                    fontFamily: 'Plus Jakarta Sans', transition: 'all 0.2s',
                  }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 4 }}>{h}h</span>
                  <span style={{ fontSize: 11, color: duration === h ? '#7B6EF6' : 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                    ₹{(pricing[selected.type] || 30) * h}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {error && <div className="kiosk-error" style={{ marginBottom: 16 }}><AlertCircle size={16} />{error}</div>}

        <div style={{ background: 'rgba(8,10,60,0.6)', border: '1px solid rgba(123,110,246,0.15)', borderRadius: 22, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <p style={{ color: selected ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            {selected
              ? <>Box <strong>{selected.identifiableName}</strong> · {duration}hr · <strong style={{ color: '#00E5A0' }}>₹{getPrice()}</strong></>
              : 'Tap an available box'}
          </p>
          <button className="kiosk-btn primary" style={{ width: 'auto', padding: '14px 28px', margin: 0 }}
            onClick={handleBook} disabled={!selected || booking}>
            {booking ? <span className="kiosk-spinner" /> : <>Pay & Continue <ArrowRight size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KioskLayout;