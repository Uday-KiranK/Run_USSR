import { useEffect, useState } from 'react';

const getRemaining = (expiryTime) => {
  const diff = new Date(expiryTime) - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s, diff };
};

const CountdownTimer = ({ expiryTime, style = {} }) => {
  const [remaining, setRemaining] = useState(() => getRemaining(expiryTime));

  useEffect(() => {
    setRemaining(getRemaining(expiryTime));
    const id = setInterval(() => {
      const r = getRemaining(expiryTime);
      setRemaining(r);
      if (!r) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiryTime]);

  if (!remaining) {
    return <span style={{ color: '#FF4D6D', fontWeight: 700, fontSize: 12, ...style }}>Expired</span>;
  }

  const isUrgent = remaining.diff < 10 * 60 * 1000; // < 10 min
  const color = isUrgent ? '#FF4D6D' : remaining.diff < 30 * 60 * 1000 ? '#FFA500' : '#00E5A0';

  const parts = remaining.h > 0
    ? `${remaining.h}h ${String(remaining.m).padStart(2, '0')}m ${String(remaining.s).padStart(2, '0')}s`
    : `${remaining.m}m ${String(remaining.s).padStart(2, '0')}s`;

  return (
    <span style={{ color, fontWeight: 700, fontSize: 12, fontVariantNumeric: 'tabular-nums', ...style }}>
      ⏱ {parts}
    </span>
  );
};

export default CountdownTimer;
