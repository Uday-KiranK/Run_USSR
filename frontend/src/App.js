import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Terminals from './pages/Terminals';
import Layout from './pages/Layout';
import Payment from './pages/Payment';
import SetPin from './pages/SetPin';
import Confirmation from './pages/Confirmation';
import Pickup from './pages/Pickup';
import MyOrders from './pages/MyOrders';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/terminals" element={<Terminals />} />
        <Route path="/layout/:terminalId" element={<Layout />} />
        <Route path="/payment/:orderId/:boxName" element={<Payment />} />
        <Route path="/set-pin/:orderId/:boxName" element={<SetPin />} />
        <Route path="/confirmation/:orderId" element={<Confirmation />} />
        <Route path="/pickup" element={<Pickup />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;