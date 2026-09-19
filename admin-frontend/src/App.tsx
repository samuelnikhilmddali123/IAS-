import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { AddFoodModal } from './components/AddFoodModal';
import { TestWhatsAppModal } from './components/TestWhatsAppModal';
import { QrInspectModal } from './components/QrInspectModal';

import { DashboardPage } from './pages/DashboardPage';
import { FoodMenuPage } from './pages/FoodMenuPage';
import { LiveOrdersPage } from './pages/LiveOrdersPage';
import { WhatsAppQrPage } from './pages/WhatsAppQrPage';
import { RegisteredOfficersPage } from './pages/RegisteredOfficersPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AdminProvider>
        <TopBar />
        <div className="app-body">
          <Sidebar />
          <main className="content-area">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/foodmenu" element={<FoodMenuPage />} />
              <Route path="/liveorders" element={<LiveOrdersPage />} />
              <Route path="/whatsapp-qr" element={<WhatsAppQrPage />} />
              <Route path="/registered-officers" element={<RegisteredOfficersPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
        <AddFoodModal />
        <TestWhatsAppModal />
        <QrInspectModal />
        <Toast />
      </AdminProvider>
    </BrowserRouter>
  );
};
export default App;
