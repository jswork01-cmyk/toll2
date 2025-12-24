import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { StorageService } from '../services/storageService';
import { SheetService } from '../services/sheetService';
import { Plus, Edit, Trash2, Search, Phone, Mail, MapPin, Users, Link as LinkIcon, RefreshCcw, Lock } from 'lucide-react';

const ClientManager: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sheet integration state
  const [isLinked, setIsLinked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sheetName, setSheetName] = useState('company');

  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({});

  useEffect(() => {
    checkSheetSettings();
    loadClients(false); // Initial load from storage

    // Auto-refresh when sync is done
    const handleSync = () => {
        checkSheetSettings();
        loadClients(false); // Reload from storage after sync
    };
    window.addEventListener('JEONGSIM_DATA_SYNCED', handleSync);
    
    return () => window.removeEventListener('JEONGSIM_DATA_SYNCED', handleSync);
  }, []);

  const checkSheetSettings = () => {
    const info = StorageService.getCompanyInfo();
    if (info.googleScriptUrl) {
      setIsLinked(true);
      setSheetName(info.companySheetName || 'company');
    }
  };

  const loadClients = async (forceFetch = false) => {
    const info = StorageService.getCompanyInfo();
    
    // Only fetch from network if forced (Manual Refresh)
    // Otherwise rely on StorageService which is updated by Layout in background
    if (forceFetch && info.googleScriptUrl) {
      setIsLoading(true);
      try {
        const sheetClients = await SheetService.fetchClients(info.googleScriptUrl, info.companySheetName || 'company');
        if (sheetClients.length > 0) {
          setClients(sheetClients);
          StorageService.saveClients(sheetClients);
        }
      } catch (e) {
        console.error("Failed to manual fetch clients", e);
      }
      setIsLoading(false);
    } else {
      // Instant load from storage
      setClients(StorageService.getClients());
    }
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({
        id: Date.now().toString(),
        name: '',
        registrationNumber: '',
        ownerName: '',
        address: '',
        contactPerson: '',
        email: '',
        phone: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return alert('업체명을 입력해주세요.');
    StorageService.saveClient(formData as Client);
    setIsModalOpen(false);
    if (!isLinked) loadClients(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      StorageService.deleteClient(id);
      if (!isLinked) loadClients(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.includes(searchTerm) || 
    c.contactPerson.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          업체 관리
          {isLinked && (
            <span className="ml-3 text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center font-normal">
              <LinkIcon size={12} className="mr-1"/> 시트 연동중 ({sheetName})
            </span>
          )}
        </h2>
        
        <div className="flex space-x-2">
          {isLinked ? (
            <button 
              onClick={() => loadClients(true)}
              className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <RefreshCcw size={18} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          ) : (
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} className="mr-2" />
              업체 등록
            </button>
          )}
        </div>
      </div>

      {isLinked && (
        <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center">
          <Lock size={16} className="mr-2" />
          구글 시트 연동 모드에서는 데이터 수정/삭제가 시트에서 이루어져야 합니다. 시트 수정 후 '새로고침'을 눌러주세요.
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="업체명, 담당자명 검색"
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Client List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
           <div className="col-span-3 text-center py-10 text-slate-400">
             등록된 업체가 없습니다.
           </div>
        ) : (
          filteredClients.map(client => (
            <div key={client.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{client.name}</h3>
                  <p className="text-sm text-slate-500">{client.ownerName} | {client.registrationNumber}</p>
                </div>
                {!isLinked && (
                  <div className="flex space-x-2">
                    <button onClick={() => handleOpenModal(client)} className="p-1 text-slate-400 hover:text-blue-600">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="p-1 text-slate-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center">
                  <Users size={16} className="mr-2 text-slate-400" />
                  <span>{client.contactPerson}</span>
                </div>
                <div className="flex items-center">
                  <Phone size={16} className="mr-2 text-slate-400" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center">
                  <Mail size={16} className="mr-2 text-slate-400" />
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center">
                  <MapPin size={16} className="mr-2 text-slate-400" />
                  <span className="truncate">{client.address}</span>
                </div>
                {client.note && (
                   <div className="pt-2 mt-2 border-t border-slate-100 text-xs text-slate-500">
                      {client.note}
                   </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6">{editingClient ? '업체 정보 수정' : '새 업체 등록'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">업체명</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">대표자명</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.ownerName || ''}
                    onChange={e => setFormData({...formData, ownerName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">사업자번호</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.registrationNumber || ''}
                    onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">주소</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.address || ''}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">담당자</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.contactPerson || ''}
                    onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">연락처</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                <input 
                  type="email" 
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.email || ''}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                취소
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;