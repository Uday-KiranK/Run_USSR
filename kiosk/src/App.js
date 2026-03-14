import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import KioskHome from './pages/KioskHome';
import KioskBook from './pages/KioskBook';
import KioskPickup from './pages/KioskPickup';
import KioskOTP from './pages/KioskOTP';
import KioskLayout from './pages/KioskLayout';
import KioskPin from './pages/KioskPin';
import KioskSuccess from './pages/KioskSuccess';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/kiosk/:terminalId" element={<KioskHome />} />
        <Route path="/kiosk/:terminalId/book" element={<KioskBook />} />
        <Route path="/kiosk/:terminalId/otp" element={<KioskOTP />} />
        <Route path="/kiosk/:terminalId/layout" element={<KioskLayout />} />
        <Route path="/kiosk/:terminalId/pin/:orderId/:boxName/:duration/:amount" element={<KioskPin />} />
        <Route path="/kiosk/:terminalId/pickup" element={<KioskPickup />} />
        <Route path="/kiosk/:terminalId/success" element={<KioskSuccess />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;