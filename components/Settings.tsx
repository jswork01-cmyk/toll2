import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { SheetService } from '../services/sheetService';
import { CompanyInfo, Employee } from '../types';
import { Save, AlertCircle, Table, Users, UserCheck, Building, RefreshCw, FileInput, ChevronDown, ChevronUp, Copy, Check, Link as LinkIcon, Zap, CheckCircle, Trash2, ShieldLock, Lock, Unlock } from 'lucide-react';

const Settings: React.FC = () => {
  const [info, setInfo] = useState<CompanyInfo>(StorageService.getCompanyInfo());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<'SUCCESS' | 'FAIL' | null>(null);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Admin Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(StorageService.isAdmin());
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdminAuthenticated) {
        const handleSync = () => {
          setInfo(StorageService.getCompanyInfo());
          setEmployees(StorageService.getEmployees());
        };
        window.addEventListener('JEONGSIM_DATA_SYNCED', handleSync);
        setEmployees(StorageService.getEmployees());
        if (info.googleScriptUrl) {
            handleTestConnection(true);
        }
        return () => window.removeEventListener('JEONGSIM_DATA_SYNCED', handleSync);
    }
  }, [isAdminAuthenticated]);

  const handleAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // PIN 번호를 요청하신 1711로 설정함
    if (pin === '1711') {
      StorageService.setAdmin(true);
      setIsAdminAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setPin('');
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  const handleLogout = () => {
      StorageService.setAdmin(false);
      setIsAdminAuthenticated(false);
      setPin('');
  };

  const handleSave = () => {
    if (!info.productSheetName) info.productSheetName = 'info';
    if (!info.companySheetName) info.companySheetName = 'company';
    if (!info.employeeSheetName) info.employeeSheetName = 'employee';
    if (!info.officeSheetName) info.officeSheetName = 'office';
    
    StorageService.saveCompanyInfo(info);
    setInfo({...info});
    alert('설정이 저장되었습니다.');
    window.dispatchEvent(new CustomEvent('JEONGSIM_DATA_SYNCED'));
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setInfo(prev => ({ ...prev, stampImage: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  }

  const handleTestConnection = async (silent = false) => {
     if (!info.googleScriptUrl) return;
     setIsTestLoading(true);
     if (!silent) setTestResult(null);
     
     try {
         const success = await SheetService.testConnection(info.googleScriptUrl);
         if (success) {
             setTestResult('SUCCESS');
             let updatedInfo = { ...info };
             try {
                const officeData = await SheetService.fetchCompanyInfo(info.googleScriptUrl, info.officeSheetName || 'office');
                if (officeData) {
                    updatedInfo = {
                         ...updatedInfo,
                         ...officeData,
                         googleScriptUrl: info.googleScriptUrl,
                         productSheetName: info.productSheetName,
                         companySheetName: info.companySheetName,
                         employeeSheetName: info.employeeSheetName,
                         officeSheetName: info.officeSheetName,
                         stampImage: officeData.stampImage || info.stampImage
                    };
                }
             } catch (fetchError) { console.error(fetchError); }
             setInfo(updatedInfo);
             StorageService.saveCompanyInfo(updatedInfo);
             window.dispatchEvent(new CustomEvent('JEONGSIM_FORCE_SYNC'));
         } else {
             setTestResult('FAIL');
         }
     } catch (e) {
         setTestResult('FAIL');
     } finally {
         setIsTestLoading(false);
     }
  };
  
  const copyScriptCode = () => {
      const code = `/**
 * 정심작업장 통합 연동 스크립트 (V1.6.0)
 * 1. 구글 시트 상단 메뉴: [확장 프로그램] > [Apps Script] 클릭
 * 2. 기존 코드를 모두 지우고 이 코드를 붙여넣으세요.
 * 3. [배포] > [새 배포] > [웹 앱] 선택
 * 4. 액세스 권한: [모든 사용자] 로 설정 후 배포
 */

function doGet(e) {
  var sheetName = e.parameter.sheetName || 'data';
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (action === 'test') {
    return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (!sheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
  
  // 첫 번째 행(헤더) 제외하고 데이터 반환
  return ContentService.createTextOutput(JSON.stringify(data.slice(1))).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 전송된 데이터 타입에 따라 다른 시트 선택
  var sheet = ss.getSheetByName('data'); 
  if (data.type === 'QUOTATION') {
    sheet = ss.getSheetByName('estimate');
  }
  
  if (!sheet) return ContentService.createTextOutput("Error: Sheet not found");

  // 품목별로 한 줄씩 추가
  data.items.forEach(function(item) {
    sheet.appendRow([
      data.id,
      data.date,
      data.type === 'QUOTATION' ? '견적서' : '거래명세서',
      data.floor || '',
      data.clientName,
      item.name,
      item.spec,
      item.unit,
      item.quantity,
      item.unitPrice,
      item.supplyPrice,
      item.tax,
      item.supplyPrice + item.tax,
      data.memo || '',
      new Date()
    ]);
  });
  
  return ContentService.createTextOutput("Success");
}`;
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-6">
            <Lock className="text-slate-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">관리자 인증</h2>
          <p className="text-slate-500 mb-8 text-sm">시스템 설정을 변경하려면 PIN 번호를 입력하세요.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <input 
                type="password"
                maxLength={4}
                className={`w-full text-center text-3xl tracking-[1em] font-bold border-2 rounded-xl p-4 outline-none transition-all ${authError ? 'border-red-500 animate-shake' : 'border-slate-200 focus:border-blue-500'}`}
                placeholder="****"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                autoFocus
              />
              {authError && <p className="text-red-500 text-xs mt-2">비밀번호가 일치하지 않습니다.</p>}
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg"
            >
              인증하기
            </button>
          </form>
          <p className="mt-6 text-xs text-slate-400">관리자용 PIN 번호를 입력해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">환경 설정</h2>
        <button 
            onClick={handleLogout}
            className="text-xs flex items-center px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
            <Unlock size={14} className="mr-1.5" /> 관리자 로그아웃
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
           <h3 className="text-lg font-bold text-slate-800 flex items-center">
               <Zap className="text-yellow-500 mr-2" size={20} />
               구글 스크립트 연동
           </h3>
        </div>
        
        <div className="mb-6">
            <div className="flex justify-between items-center cursor-pointer bg-slate-50 p-4 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                onClick={() => setShowScriptGuide(!showScriptGuide)}>
                <div className="flex items-center">
                    <AlertCircle size={18} className="mr-3 text-blue-600" />
                    <div>
                        <div className="text-sm font-bold text-slate-800">연동 가이드 및 스크립트 코드 보기</div>
                        <div className="text-xs text-slate-500">구글 시트 확장 프로그램에서 Apps Script를 설정해주세요.</div>
                    </div>
                </div>
                {showScriptGuide ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
            </div>
            
            {showScriptGuide && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4 animate-fadeIn">
                    <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2">
                        <li>구글 시트 메뉴에서 <b>[확장 프로그램] > [Apps Script]</b>를 클릭합니다.</li>
                        <li>아래 버튼을 눌러 코드를 복사한 뒤, 스크립트 편집기에 붙여넣으세요.</li>
                        <li>상단 <b>[배포] > [새 배포]</b>를 선택합니다.</li>
                        <li>유형은 <b>[웹 앱]</b>, 액세스 권한은 <b>[모든 사용자]</b>로 설정하여 배포합니다.</li>
                        <li>생성된 <b>웹 앱 URL</b>을 복사하여 아래 입력창에 넣으세요.</li>
                    </ol>
                    <button 
                        onClick={copyScriptCode}
                        className="w-full py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium flex items-center justify-center hover:bg-slate-100 transition-colors shadow-sm"
                    >
                        {copied ? <Check size={16} className="text-green-600 mr-2"/> : <Copy size={16} className="text-slate-500 mr-2"/>}
                        {copied ? '코드가 복사되었습니다!' : 'Apps Script 코드 복사하기'}
                    </button>
                </div>
            )}
        </div>

        <div className="space-y-4">
           <div className="flex space-x-2">
               <input 
                 type="text" 
                 placeholder="https://script.google.com/macros/s/..."
                 className="flex-1 border border-slate-300 rounded-lg p-3 text-sm font-mono text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                 value={info.googleScriptUrl || ''}
                 onChange={e => setInfo({...info, googleScriptUrl: e.target.value})}
               />
               <button onClick={() => handleTestConnection(false)} disabled={isTestLoading}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center whitespace-nowrap transition-colors">
                  {isTestLoading ? <RefreshCw className="animate-spin mr-2" size={16}/> : <LinkIcon className="mr-2" size={16}/>}
                  연동 테스트
               </button>
           </div>
           
           {testResult && (
                <div className={`p-3 rounded-lg text-sm flex items-center animate-fadeIn ${testResult === 'SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {testResult === 'SUCCESS' ? <CheckCircle size={16} className="mr-2"/> : <AlertCircle size={16} className="mr-2"/>}
                    {testResult === 'SUCCESS' ? '연동 성공! 자사 정보 및 시트 데이터를 최신화했습니다.' : '연동 실패. 웹 앱 URL을 다시 확인해주세요.'}
                </div>
           )}

           <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">품목 정보 시트명</label>
                <input type="text" className="w-full border p-2 rounded-lg text-sm" value={info.productSheetName} onChange={e => setInfo({...info, productSheetName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">거래처 정보 시트명</label>
                <input type="text" className="w-full border p-2 rounded-lg text-sm" value={info.companySheetName} onChange={e => setInfo({...info, companySheetName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">직원 정보 시트명</label>
                <input type="text" className="w-full border p-2 rounded-lg text-sm" value={info.employeeSheetName} onChange={e => setInfo({...info, employeeSheetName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">자사 정보 시트명</label>
                <input type="text" className="w-full border p-2 rounded-lg text-sm" value={info.officeSheetName} onChange={e => setInfo({...info, officeSheetName: e.target.value})} />
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 flex items-center"><UserCheck size={20} className="text-purple-600 mr-2" />직원 및 서명 확인</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr><th className="p-2">이름</th><th className="p-2">직급</th><th className="p-2 text-center">미리보기</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {employees.length > 0 ? employees.map((emp, idx) => (
                        <tr key={idx}><td className="p-2 font-medium">{emp.name}</td><td className="p-2 text-slate-500">{emp.position}</td><td className="p-2 text-center">
                            <div className="w-16 h-10 border rounded bg-slate-50 flex items-center justify-center overflow-hidden mx-auto">
                                {emp.signatureImage ? <img src={emp.signatureImage} alt="서명" className="max-w-full max-h-full object-contain" /> : <span className="text-[10px] text-slate-300">없음</span>}
                            </div>
                        </td></tr>
                    )) : <tr><td colSpan={3} className="p-4 text-center text-slate-400">연동된 직원 데이터가 없습니다.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 flex items-center"><Building size={20} className="text-blue-600 mr-2" />자사 정보</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">상호명</label>
            <input type="text" className="w-full border p-2 rounded-lg" value={info.name} onChange={e => setInfo({...info, name: e.target.value})} placeholder="상호명" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">대표자명</label>
              <input type="text" className="w-full border p-2 rounded-lg" value={info.ownerName} onChange={e => setInfo({...info, ownerName: e.target.value})} placeholder="대표자명" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">사업자번호</label>
              <input type="text" className="w-full border p-2 rounded-lg" value={info.registrationNumber} onChange={e => setInfo({...info, registrationNumber: e.target.value})} placeholder="사업자번호" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">주소</label>
            <input type="text" className="w-full border p-2 rounded-lg" value={info.address} onChange={e => setInfo({...info, address: e.target.value})} placeholder="주소" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">연락처</label>
              <input type="text" className="w-full border p-2 rounded-lg" value={info.phone} onChange={e => setInfo({...info, phone: e.target.value})} placeholder="전화번호" />
            </div>
             <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">계좌정보</label>
              <input type="text" className="w-full border p-2 rounded-lg" value={info.bankInfo} onChange={e => setInfo({...info, bankInfo: e.target.value})} placeholder="은행명 계좌번호 예금주" />
            </div>
          </div>
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium mb-2">기관 직인</label>
            <div className="flex items-center space-x-4">
                <div className="w-20 h-20 border rounded bg-slate-50 flex items-center justify-center overflow-hidden">
                    {info.stampImage ? <img src={info.stampImage} className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-slate-300">없음</span>}
                </div>
                <div className="flex flex-col space-y-2">
                    <button onClick={triggerFileInput} className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50 transition-colors">이미지 선택</button>
                    {info.stampImage && (
                        <button 
                            onClick={() => setInfo({...info, stampImage: ''})}
                            className="px-3 py-1.5 text-xs text-red-500 hover:text-red-700"
                        >
                            이미지 삭제
                        </button>
                    )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="w-full py-4 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold text-lg shadow-lg flex justify-center items-center transition-all transform active:scale-[0.98]">
          <Save size={20} className="mr-2" /> 모든 설정 저장하기
      </button>
    </div>
  );
};

export default Settings;