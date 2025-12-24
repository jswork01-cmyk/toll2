import React, { useEffect, useState, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { DashboardStats, Transaction, Client, ProductItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Sparkles, TrendingUp, Users, DollarSign, RefreshCw, Search, Calendar, Package, X, Printer, ChevronDown, Layers, Edit, Save, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Analysis Edit State
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [tempAnalysis, setTempAnalysis] = useState("");

  // Master Data for Filters
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductItem[]>([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  
  // Dropdown UI State
  const [activeDropdown, setActiveDropdown] = useState<'CLIENT' | 'PRODUCT' | null>(null);

  useEffect(() => {
    loadData();
    
    // Auto-refresh when sync is done
    const handleSync = () => loadData();
    window.addEventListener('JEONGSIM_DATA_SYNCED', handleSync);
    
    // Close dropdowns when clicking outside
    const handleGlobalClick = () => setActiveDropdown(null);
    window.addEventListener('click', handleGlobalClick);
    
    return () => {
        window.removeEventListener('JEONGSIM_DATA_SYNCED', handleSync);
        window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const loadData = () => {
    const txs = StorageService.getTransactions();
    setAllTransactions(txs);
    // Load master data for filter suggestions (synced from Sheet)
    setAvailableClients(StorageService.getClients());
    setAvailableProducts(StorageService.getProducts());
  };

  // Filter Transactions & Calculate Stats
  const filteredData = useMemo(() => {
    let filtered = allTransactions.filter(t => t.type === 'STATEMENT'); // Only Sales

    if (startDate) filtered = filtered.filter(t => t.date >= startDate);
    if (endDate) filtered = filtered.filter(t => t.date <= endDate);
    if (floorFilter) filtered = filtered.filter(t => t.floor === floorFilter);
    if (clientFilter) filtered = filtered.filter(t => t.clientName.toLowerCase().includes(clientFilter.toLowerCase()));
    if (productFilter) {
      filtered = filtered.filter(t => 
        t.items.some(i => i.name.toLowerCase().includes(productFilter.toLowerCase()))
      );
    }
    return filtered;
  }, [allTransactions, startDate, endDate, clientFilter, productFilter, floorFilter]);

  useEffect(() => {
    calculateStats(filteredData);
  }, [filteredData]);

  const calculateStats = (transactions: Transaction[]) => {
    const totalSales = transactions.reduce((sum, t) => sum + t.totalAmount, 0);

    // Group by month
    const monthlySalesMap = new Map<string, number>();
    transactions.forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      monthlySalesMap.set(month, (monthlySalesMap.get(month) || 0) + t.totalAmount);
    });
    
    const monthlySales = Array.from(monthlySalesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Group by client
    const clientSalesMap = new Map<string, number>();
    transactions.forEach(t => {
      clientSalesMap.set(t.clientName, (clientSalesMap.get(t.clientName) || 0) + t.totalAmount);
    });

    const clientCount = clientSalesMap.size; // Total unique clients in this period

    const topClients = Array.from(clientSalesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    setStats({ totalSales, monthlySales, topClients, clientCount });
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    // Use filteredData for analysis to make it context-aware
    const clients = StorageService.getClients();
    const result = await GeminiService.analyzeBusiness(filteredData, clients);
    setAnalysis(result);
    setIsAnalyzing(false);
    setIsEditingAnalysis(false); // Reset edit mode on new run
  };

  const handleStartEditing = () => {
      setTempAnalysis(analysis);
      setIsEditingAnalysis(true);
  };

  const handleSaveAnalysis = () => {
      setAnalysis(tempAnalysis);
      setIsEditingAnalysis(false);
  };

  const handleCancelEditing = () => {
      setIsEditingAnalysis(false);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setClientFilter('');
    setProductFilter('');
    setFloorFilter('');
  };

  const handlePrint = () => {
      const content = document.querySelector('.dashboard-container');
      if (!content) return;

      const printWindow = window.open('', '_blank', 'width=1200,height=900');
      if (printWindow) {
          // React의 input value 속성 등을 명시적으로 HTML에 반영 (복사 시 값 유지)
          const inputs = content.querySelectorAll('input');
          inputs.forEach(input => {
              input.setAttribute('value', input.value);
          });
          
          // textarea 값도 반영
          const textareas = content.querySelectorAll('textarea');
          textareas.forEach(textarea => {
              textarea.innerHTML = textarea.value;
          });

          printWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                  <title>대쉬보드 인쇄</title>
                  <script src="https://cdn.tailwindcss.com"></script>
                  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
                  <style>
                      body { 
                          font-family: 'Noto Sans KR', sans-serif; 
                          -webkit-print-color-adjust: exact; 
                          print-color-adjust: exact;
                          background-color: white;
                          padding: 40px;
                      }
                      .no-print, button { display: none !important; }
                      .dashboard-container { width: 100%; }
                      
                      /* 인쇄 시 그래프나 카드가 페이지를 넘어가지 않도록 조정 */
                      .break-inside-avoid { break-inside: avoid; }
                      
                      /* 카드 외곽선 강화 */
                      .bg-white { border: 1px solid #cbd5e1 !important; box-shadow: none !important; }
                  </style>
              </head>
              <body class="text-slate-900">
                  <h1 class="text-3xl font-bold text-center mb-2 text-slate-800">정심작업장 경영 대쉬보드</h1>
                  <div class="text-right text-sm text-slate-500 mb-8 border-b pb-2">
                      출력일시: ${new Date().toLocaleString()}
                  </div>
                  
                  <div class="dashboard-content">
                      ${content.innerHTML}
                  </div>

                  <script>
                      // Tailwind 로딩 대기 후 인쇄
                      setTimeout(() => {
                          window.print();
                      }, 1000);
                  </script>
              </body>
              </html>
          `);
          printWindow.document.close();
      }
  };

  // Helper to render custom dropdown
  const renderFilterDropdown = (
    type: 'CLIENT' | 'PRODUCT', 
    value: string, 
    setValue: (val: string) => void,
    items: { id: string; name: string }[],
    placeholder: string
  ) => {
    // If current value matches an item exactly, show all items (to allow easy switching)
    // Otherwise, filter by input
    const isExactMatch = items.some(i => i.name === value);
    const filteredItems = (isExactMatch || value === '') 
        ? items 
        : items.filter(i => i.name.toLowerCase().includes(value.toLowerCase()));

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center">
                {type === 'CLIENT' ? <Users size={12} className="mr-1"/> : <Package size={12} className="mr-1"/>}
                {type === 'CLIENT' ? '업체명' : '품목명'}
            </label>
            <div className="relative">
                <input 
                    type="text"
                    className="w-full p-2 pr-8 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setActiveDropdown(type);
                    }}
                    onFocus={() => setActiveDropdown(type)}
                    onClick={() => setActiveDropdown(type)}
                />
                {value ? (
                    <button 
                        onClick={() => {
                            setValue('');
                            setActiveDropdown(type);
                            // Focus back to input
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={14} />
                    </button>
                ) : (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <ChevronDown size={14} />
                    </div>
                )}
                
                {activeDropdown === type && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item, idx) => (
                                <div 
                                    key={`${item.id}-${idx}`}
                                    className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer"
                                    onClick={() => {
                                        setValue(item.name);
                                        setActiveDropdown(null);
                                    }}
                                >
                                    {item.name}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-slate-400">검색 결과가 없습니다.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
  };

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="space-y-6 dashboard-container">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">대쉬보드</h2>
        <button 
            type="button"
            onClick={handlePrint} 
            className="flex items-center px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors no-print"
        >
            <Printer size={18} className="mr-2" /> 대쉬보드 인쇄
        </button>
      </div>

      {/* Search & Filter Bar - Hidden on Print */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 no-print">
        <div className="flex flex-col xl:flex-row gap-4 items-end">
            <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center"><Calendar size={12} className="mr-1"/>시작일</label>
                    <input 
                        type="date" 
                        className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center"><Calendar size={12} className="mr-1"/>종료일</label>
                    <input 
                        type="date" 
                        className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                
                {/* Floor Filter */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center"><Layers size={12} className="mr-1"/>층별</label>
                    <select
                        className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={floorFilter}
                        onChange={(e) => setFloorFilter(e.target.value)}
                    >
                        <option value="">전체</option>
                        <option value="1층">1층</option>
                        <option value="2층">2층</option>
                    </select>
                </div>
                
                {/* Client Filter Dropdown */}
                {renderFilterDropdown('CLIENT', clientFilter, setClientFilter, availableClients, "업체명 검색")}

                {/* Product Filter Dropdown */}
                {renderFilterDropdown('PRODUCT', productFilter, setProductFilter, availableProducts, "품목명 검색")}
            </div>
            <div>
                 <button 
                    onClick={resetFilters}
                    className="flex items-center justify-center px-4 py-2 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm w-full xl:w-auto transition-colors"
                >
                    <X size={16} className="mr-1" /> 필터 초기화
                </button>
            </div>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-800">
          <div className="flex items-center justify-between pb-4">
            <h3 className="text-sm font-medium text-slate-500">총 매출액 {startDate || endDate ? '(선택 기간)' : '(전체)'}</h3>
            <DollarSign className="text-blue-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalSales.toLocaleString()}원</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-800">
          <div className="flex items-center justify-between pb-4">
            <h3 className="text-sm font-medium text-slate-500">거래처 수</h3>
            <Users className="text-green-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.clientCount}개사</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-800">
          <div className="flex items-center justify-between pb-4">
            <h3 className="text-sm font-medium text-slate-500">건당 평균 매출</h3>
            <TrendingUp className="text-purple-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {filteredData.length > 0 
              ? Math.round(stats.totalSales / filteredData.length).toLocaleString() 
              : 0}원
            <span className="text-sm font-normal text-slate-500 ml-2">({filteredData.length}건)</span>
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-inside-avoid">
        {/* Monthly Sales Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 mb-4">기간별 매출 추이</h3>
          <div className="h-64 w-full min-w-0">
             {stats.monthlySales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(value) => `${value / 10000}만`} />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-slate-400">데이터가 없습니다.</div>
             )}
          </div>
        </div>

        {/* Top Clients Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 mb-4">거래처별 매출 비중 (Top 5)</h3>
          <div className="h-64 w-full min-w-0">
             {stats.topClients.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={stats.topClients}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    isAnimationActive={false}
                    >
                    {stats.topClients.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()}원`} />
                </PieChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-slate-400">데이터가 없습니다.</div>
             )}
          </div>
        </div>
      </div>

      {/* Gemini Analysis Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 print:bg-white print:border-slate-800 break-inside-avoid">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="text-indigo-600 print:text-black" />
            <h3 className="text-lg font-bold text-indigo-900 print:text-black">AI 경영 분석</h3>
          </div>
          <div className="flex space-x-2 no-print">
            {analysis && !isEditingAnalysis && (
                <button 
                    onClick={handleStartEditing}
                    className="flex items-center px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors text-sm"
                >
                    <Edit className="mr-2 h-4 w-4" /> 수정
                </button>
            )}
            <button 
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
            >
                {isAnalyzing ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isAnalyzing ? '현재 필터 데이터로 분석 실행' : '매출 데이터 분석 실행'}
            </button>
          </div>
        </div>
        
        {isEditingAnalysis ? (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-200">
                <textarea 
                    className="w-full h-96 p-4 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                    value={tempAnalysis}
                    onChange={(e) => setTempAnalysis(e.target.value)}
                    placeholder="분석 내용을 직접 작성하거나 수정하세요..."
                />
                <div className="flex justify-end space-x-2 mt-4">
                    <button 
                        onClick={handleCancelEditing}
                        className="flex items-center px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                    >
                        <X className="mr-2 h-4 w-4" /> 취소
                    </button>
                    <button 
                        onClick={handleSaveAnalysis}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm"
                    >
                        <Save className="mr-2 h-4 w-4" /> 저장
                    </button>
                </div>
                <div className="mt-2 text-xs text-orange-600 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    수정 모드에서는 마크다운 문법이 그대로 노출됩니다. 저장 후 렌더링된 결과를 확인하세요.
                </div>
            </div>
        ) : (
            analysis ? (
              <div className="prose prose-sm prose-indigo max-w-none bg-white p-6 rounded-lg shadow-sm border border-indigo-100 print:border-0 print:shadow-none print:p-0">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">
                AI 분석 버튼을 눌러 {startDate || endDate || clientFilter || productFilter || floorFilter ? '필터링된' : '전체'} 매출 데이터에 기반한 경영 인사이트를 확인하세요. (API 키 필요)
              </p>
            )
        )}
      </div>
      
      <div className="text-center text-xs text-slate-400 mt-12 hidden print:block">
        * 본 보고서는 정심작업장 매출관리 시스템에서 생성되었습니다. ({new Date().toLocaleDateString()})
      </div>
    </div>
  );
};

export default Dashboard;