import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Terminals from './pages/Terminals';
import Layout from './pages/Layout';
import Payment from './pages/Payment';
import SetPin from './pages/SetPin';
import Confirmation from './pages/Confirmation';
import Pickup from './pages/Pickup';
import MyOrders from './pages/MyOrders';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSites from './pages/admin/AdminSites';
import AdminTerminals from './pages/admin/AdminTerminals';
import AdminOrders from './pages/admin/AdminOrders';
import AdminTerminalMonitor from './pages/admin/AdminTerminalMonitor';
import KioskHome from './pages/kiosk/KioskHome';
import KioskBook from './pages/kiosk/KioskBook';
import KioskOTP from './pages/kiosk/KioskOTP';
import KioskLayout from './pages/kiosk/KioskLayout';
import KioskPayment from './pages/kiosk/KioskPayment';
import KioskPin from './pages/kiosk/KioskPin';
import KioskPickup from './pages/kiosk/KioskPickup';
import KioskSuccess from './pages/kiosk/KioskSuccess';

const isLoggedIn = () => !!localStorage.getItem('userToken');

const isAdmin = () => {
  const token = localStorage.getItem('adminToken');
  const role = localStorage.getItem('role');
  return token && role === 'ADMIN';
};

const PrivateRoute = ({ children }) => isLoggedIn() ? children : <Navigate to="/" />;
const AdminRoute = ({ children }) => isAdmin() ? children : <Navigate to="/admin" />;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* User routes */}
        <Route path="/" element={<Login />} />
        <Route path="/terminals" element={<PrivateRoute><Terminals /></PrivateRoute>} />
        <Route path="/layout/:terminalId" element={<PrivateRoute><Layout /></PrivateRoute>} />
        <Route path="/payment/:orderId/:boxName/:duration/:amount" element={<PrivateRoute><Payment /></PrivateRoute>} />
        <Route path="/set-pin/:orderId/:boxName" element={<PrivateRoute><SetPin /></PrivateRoute>} />
        <Route path="/confirmation/:orderId" element={<PrivateRoute><Confirmation /></PrivateRoute>} />
        <Route path="/pickup" element={<PrivateRoute><Pickup /></PrivateRoute>} />
        <Route path="/my-orders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/sites" element={<AdminRoute><AdminSites /></AdminRoute>} />
        <Route path="/admin/terminals" element={<AdminRoute><AdminTerminals /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/terminal/:terminalId/monitor" element={<AdminRoute><AdminTerminalMonitor /></AdminRoute>} />

        {/* Kiosk routes */}
        <Route path="/kiosk/:terminalId" element={<KioskHome />} />
        <Route path="/kiosk/:terminalId/book" element={<KioskBook />} />
        <Route path="/kiosk/:terminalId/otp" element={<KioskOTP />} />
        <Route path="/kiosk/:terminalId/layout" element={<KioskLayout />} />
        <Route path="/kiosk/:terminalId/payment/:orderId/:boxName/:duration/:amount" element={<KioskPayment />} />
        <Route path="/kiosk/:terminalId/pin/:orderId/:boxName/:duration/:amount" element={<KioskPin />} />
        <Route path="/kiosk/:terminalId/pickup" element={<KioskPickup />} />
        <Route path="/kiosk/:terminalId/success" element={<KioskSuccess />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;