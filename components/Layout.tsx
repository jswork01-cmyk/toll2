
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, Menu, X, Receipt, RefreshCw, CheckCircle, AlertTriangle, Globe, Calculator, Lock } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { SheetService } from '../services/sheetService';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'DONE' | 'ERROR'>('IDLE');
  const [isLinked, setIsLinked] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/', label: '대쉬보드', icon: <LayoutDashboard size={20} /> },
    { to: '/sales', label: '매출관리', icon: <Receipt size={20} /> },
    { to: '/quotations', label: '견적관리', icon: <Calculator size={20} /> },
    { to: '/clients', label: '업체관리', icon: <Users size={20} /> },
    { to: '/settings', label: '설정', icon: <Settings size={20} />, adminOnly: true },
  ];

  const checkConnection = () => {
    const info = StorageService.getCompanyInfo();
    setIsLinked(!!info.googleScriptUrl);
  };

  const triggerSync = async () => {
      const info = StorageService.getCompanyInfo();
      checkConnection();
      
      if (info.googleScriptUrl) {
        setSyncStatus('SYNCING');
        try {
          const [clients, products, employees, officeInfo, salesData, estimateData] = await Promise.all([
            SheetService.fetchClients(info.googleScriptUrl, info.companySheetName || 'company'),
            SheetService.fetchProducts(info.googleScriptUrl, info.productSheetName || 'info'),
            SheetService.fetchEmployees(info.googleScriptUrl, info.employeeSheetName || 'employee'),
            SheetService.fetchCompanyInfo(info.googleScriptUrl, info.officeSheetName || 'office'),
            SheetService.fetchTransactions(info.googleScriptUrl, 'data'),
            SheetService.fetchTransactions(info.googleScriptUrl, 'estimate')
          ]);

          if (clients.length > 0) StorageService.saveClients(clients);
          if (products.length > 0) StorageService.saveProducts(products);
          if (employees.length > 0) StorageService.saveEmployees(employees);

          if (officeInfo) {
             const updatedInfo = { ...info, ...officeInfo };
             updatedInfo.googleScriptUrl = info.googleScriptUrl;
             updatedInfo.productSheetName = info.productSheetName;
             updatedInfo.companySheetName = info.companySheetName;
             updatedInfo.employeeSheetName = info.employeeSheetName;
             updatedInfo.officeSheetName = info.officeSheetName;
             StorageService.saveCompanyInfo(updatedInfo);
          }
          
          const transactions = [...salesData, ...estimateData];

          if (transactions.length > 0) {
              const currentClients = clients.length > 0 ? clients : StorageService.getClients();
              const linkedTransactions = transactions.map(t => {
                  if (t.clientId) return t;
                  const matchedClient = currentClients.find(c => c.name === t.clientName);
                  return matchedClient ? { ...t, clientId: matchedClient.id, contactPerson: matchedClient.contactPerson || t.contactPerson } : t;
              });
              StorageService.saveTransactions(linkedTransactions);
          }

          setSyncStatus('DONE');
          window.dispatchEvent(new CustomEvent('JEONGSIM_DATA_SYNCED'));
          setTimeout(() => setSyncStatus('IDLE'), 3000);
        } catch (e) {
          console.error("Auto-sync failed", e);
          setSyncStatus('ERROR');
          setTimeout(() => setSyncStatus('IDLE'), 5000);
        }
      }
  };

  useEffect(() => {
    triggerSync();
  }, []);

  useEffect(() => {
    const handleGlobalSync = () => triggerSync();
    window.addEventListener('JEONGSIM_FORCE_SYNC', handleGlobalSync);
    window.addEventListener('JEONGSIM_DATA_SYNCED', checkConnection);
    return () => {
        window.removeEventListener('JEONGSIM_FORCE_SYNC', handleGlobalSync);
        window.removeEventListener('JEONGSIM_DATA_SYNCED', checkConnection);
    };
  }, []);

  return (
    <div className="layout-container flex h-screen bg-slate-100 overflow-hidden">
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-start mb-5">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">정심작업장</h1>
                <p className="text-sm text-blue-300 font-medium mt-1">임가공매출관리</p>
            </div>
            <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white"
            >
                <X size={24} />
            </button>
          </div>

          <div className={`
              inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 w-full justify-center
              ${isLinked 
                  ? 'bg-green-800 text-green-100 border border-green-700 shadow-[0_0_10px_rgba(22,101,52,0.3)]' 
                  : 'bg-slate-700 text-slate-400 border border-slate-600'}
          `}>
              <Globe size={12} className={`mr-1.5 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
              {syncStatus === 'SYNCING' 
                ? 'Syncing...' 
                : (isLinked ? 'Live Data On' : 'Live Data Off')}
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
              `}
              onClick={() => setIsSidebarOpen(false)}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {(item as any).adminOnly && <Lock size={12} className="text-slate-500" />}
            </NavLink>
          ))}
        </nav>
        
        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800">
          {syncStatus === 'ERROR' && (
             <div className="flex items-center text-xs text-red-400 mb-2">
                <AlertTriangle size={12} className="mr-2" /> 동기화 실패
             </div>
          )}
          {syncStatus === 'DONE' && (
             <div className="flex items-center text-xs text-green-400 mb-2">
                <CheckCircle size={12} className="mr-2" /> 최신 상태
             </div>
          )}
          <p className="text-xs text-slate-500">
            System Ver 1.6.0<br/>
            Powered by Gemini
          </p>
        </div>
      </aside>

      <div className="layout-container flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 lg:hidden">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-slate-600 hover:text-slate-900"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
