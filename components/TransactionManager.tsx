import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, TransactionItem, Client, CompanyInfo, ProductItem, Employee } from '../types';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { SheetService } from '../services/sheetService';
import { Plus, Printer, FileText, Trash2, Mail, Link as LinkIcon, RefreshCw, ChevronDown, Search, Calendar, X, Users, CloudUpload, CheckCircle, ArrowLeft, Package, User, Calculator, ClipboardList } from 'lucide-react';

interface TransactionManagerProps {
    mode: 'SALES' | 'QUOTATION';
}

// --- Utility Functions (Shared) ---

const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(Math.round(val));

const numberToKorean = (num: number): string => {
    if(!num) return '영';
    const integerNum = Math.floor(num); 
    const unitWords = ['', '만', '억', '조', '경'];
    const splitUnit = 10000;
    const splitCount = unitWords.length;
    const resultArray: string[] = [];
    let resultString = '';

    for (let i = 0; i < splitCount; i++) {
        let unitResult = (integerNum % Math.pow(splitUnit, i + 1)) / Math.pow(splitUnit, i);
        unitResult = Math.floor(unitResult);
        if (unitResult > 0) {
            resultArray[i] = unitResult.toString();
        }
    }

    for (let i = 0; i < resultArray.length; i++) {
        if (!resultArray[i]) continue;
        const partValue = parseInt(resultArray[i]);
        let partString = '';
        const digits = ['','일','이','삼','사','오','육','칠','팔','구'];
        const units = ['','십','백','천'];
        let temp = partValue;
        let unitIndex = 0;
        while (temp > 0) {
            const digit = temp % 10;
            if (digit > 0) {
                 const digitStr = digits[digit];
                 partString = digitStr + units[unitIndex] + partString;
            }
            temp = Math.floor(temp / 10);
            unitIndex++;
        }
        resultString = partString + unitWords[i] + resultString;
    }
    return resultString + ' 원정';
};

// --- Print Generation Logic (Standalone HTML for Transaction & Summary) ---

const getPrintBaseStyles = () => `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
    
    @page { size: A4; margin: 10mm; }
    
    body { 
        font-family: 'Noto Sans KR', sans-serif; 
        margin: 0; 
        padding: 0; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact;
        background-color: white;
        color: #000;
    }
    
    .container { width: 100%; max-width: 210mm; margin: 0 auto; }
    
    table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
    th, td { border: 1px solid #1f5a85; padding: 4px; word-break: break-all; }
    
    .border-blue { border-color: #1f5a85; }
    .bg-blue { background-color: #1f5a85; color: white; }
    .bg-gray { background-color: #f8fafc; }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    
    .title { 
        font-size: 32px; 
        font-weight: 700; 
        color: #1f5a85; 
        text-align: center; 
        text-decoration: underline; 
        text-decoration-style: double; 
        text-underline-offset: 8px; 
        letter-spacing: 0.3em; 
        margin-bottom: 30px; 
        margin-top: 20px;
    }
    
    .stamp-box { position: relative; height: 100%; display: flex; align-items: center; justify-content: center; }
    .stamp-img { position: absolute; top: 50%; right: 5px; transform: translateY(-50%); width: 40px; height: 40px; opacity: 0.8; mix-blend-mode: multiply; }
    .signature-img { max-height: 80px; max-width: 100%; object-fit: contain; }

    /* Layout Utilities */
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-start { align-items: flex-start; }
    .mb-4 { margin-bottom: 16px; }
    .mt-4 { margin-top: 16px; }
    .p-4 { padding: 16px; }
  </style>
`;

const printDocument = (htmlContent: string) => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>인쇄 미리보기</title>
                ${getPrintBaseStyles()}
            </head>
            <body>
                <div class="container">
                    ${htmlContent}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for images to load before printing
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
};

// 1. Transaction Print (Quotation / Statement) - HTML String
const generateTransactionPrintHTML = (
    transaction: Partial<Transaction>, 
    items: Partial<TransactionItem>[], 
    companyInfo: CompanyInfo, 
    clients: Client[]
) => {
    const isQuotation = transaction.type === TransactionType.QUOTATION;
    const title = isQuotation ? '견 적 서' : '거 래 명 세 서';
    const totalAmount = (transaction.totalSupplyPrice || 0) + (transaction.totalTax || 0);
    
    // Fill up to 15 rows
    const filledItems = [...items];
    while(filledItems.length < 15) filledItems.push({});
    const displayItems = filledItems.slice(0, 15);

    const dateParts = transaction.date ? transaction.date.split('-') : ['','',''];
    const month = dateParts[1] || '';
    const day = dateParts[2] || '';

    return `
        <div style="border: 2px solid #1f5a85; padding: 2px;">
        <div style="border: 1px solid #1f5a85; padding: 20px; min-height: 900px;">
            <div class="title">${title}</div>
            
            <div class="flex justify-between" style="gap: 20px; margin-bottom: 20px;">
                <!-- Left Info (Recipient) - Adjusted width to 40% -->
                <div style="width: 40%;">
                    <div style="margin-bottom: 10px; font-size: 18px;">
                        <span class="font-bold" style="border-bottom: 1px solid black; padding-right: 10px;">${transaction.clientName || ''}</span>
                        <span>귀하</span>
                    </div>
                    <div style="margin-bottom: 15px; font-size: 14px;">
                        아래와 같이 ${isQuotation ? '견적' : '계산'}합니다.
                    </div>
                    <div style="border-top: 2px solid black; border-bottom: 2px solid black; padding: 10px 0; display: flex; align-items: center;">
                        <span class="font-bold text-center" style="width: 80px;">합계금액</span>
                        <span class="text-right font-bold" style="flex: 1; font-size: 18px; padding-right: 10px;">
                            일금 ${numberToKorean(totalAmount)} (${formatCurrency(totalAmount)})
                        </span>
                    </div>
                </div>

                <!-- Right Info (Supplier) - Adjusted width to 60% -->
                <div style="width: 60%;">
                    <table class="border-blue">
                        <tr>
                            <td rowspan="5" class="bg-gray font-bold text-center" style="width: 30px;">공<br>급<br>자</td>
                            <td class="bg-gray text-center" style="width: 70px;">등록번호</td>
                            <td colspan="3" class="font-bold text-center" style="font-size: 16px; letter-spacing: 2px;">${companyInfo.registrationNumber}</td>
                        </tr>
                        <tr>
                            <td class="bg-gray text-center">상 호</td>
                            <td style="font-weight: bold; white-space: nowrap;">${companyInfo.name}</td>
                            <td class="bg-gray text-center" style="width: 50px;">성 명</td>
                            <td class="stamp-box" style="font-weight: bold; white-space: nowrap;">
                                ${companyInfo.ownerName}
                                ${companyInfo.stampImage ? `<img src="${companyInfo.stampImage}" class="stamp-img" />` : '<span style="font-size:10px; color:#ccc; position:absolute; right:5px;">(인)</span>'}
                            </td>
                        </tr>
                        <tr>
                            <td class="bg-gray text-center">주 소</td>
                            <td colspan="3" style="font-size: 11px;">${companyInfo.address}</td>
                        </tr>
                        <tr>
                            <td class="bg-gray text-center">업 태</td>
                            <td>제조업, 도소매</td>
                            <td class="bg-gray text-center">종 목</td>
                            <td>임가공</td>
                        </tr>
                        <tr>
                            <td class="bg-gray text-center">전 화</td>
                            <td colspan="3" style="font-size: 11px;">${companyInfo.phone} ${companyInfo.fax ? `/ FAX: ${companyInfo.fax}` : ''}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Items Table -->
            <table class="border-blue" style="margin-bottom: 20px;">
                <thead>
                    <tr class="bg-blue text-center">
                        <th style="width: 40px;">월</th>
                        <th style="width: 40px;">일</th>
                        <th>품 목</th>
                        <th style="width: 60px;">규격</th>
                        <th style="width: 40px;">단위</th>
                        <th style="width: 60px;">수량</th>
                        <th style="width: 90px;">단가</th>
                        <th style="width: 100px;">공급가액</th>
                        <th style="width: 80px;">세액</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayItems.map(item => `
                    <tr class="text-center" style="height: 30px;">
                        <td class="bg-gray">${item.name ? month : ''}</td>
                        <td class="bg-gray">${item.name ? day : ''}</td>
                        <td class="text-left" style="padding-left: 5px;">${item.name || ''}</td>
                        <td>${item.spec || ''}</td>
                        <td>${item.unit || ''}</td>
                        <td class="text-right" style="padding-right: 4px;">${item.quantity ? item.quantity.toLocaleString() : ''}</td>
                        <td class="text-right" style="padding-right: 4px;">${item.unitPrice ? formatCurrency(item.unitPrice) : ''}</td>
                        <td class="text-right" style="padding-right: 4px;">${item.supplyPrice ? formatCurrency(item.supplyPrice) : ''}</td>
                        <td class="text-right" style="padding-right: 4px;">${item.tax ? formatCurrency(item.tax) : ''}</td>
                    </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="bg-blue font-bold" style="height: 30px;">
                        <td colspan="5" class="text-center">합 계</td>
                        <td class="text-right" style="padding-right: 4px;">${items.reduce((a,c) => a + (c.quantity||0), 0).toLocaleString()}</td>
                        <td></td>
                        <td class="text-right" style="padding-right: 4px;">${formatCurrency(transaction.totalSupplyPrice || 0)}</td>
                        <td class="text-right" style="padding-right: 4px;">${formatCurrency(transaction.totalTax || 0)}</td>
                    </tr>
                </tfoot>
            </table>

            ${companyInfo.bankInfo ? `
            <div class="text-right font-bold" style="font-size: 12px; margin-top: 10px;">
                계좌번호: ${companyInfo.bankInfo}
            </div>
            ` : ''}

        </div>
        </div>
    `;
};

// 2. Summary Print (Delivery Note) - HTML String
const generateSummaryPrintHTML = (
    startDate: string,
    endDate: string,
    clientName: string,
    companyInfo: CompanyInfo,
    aggregatedItems: Partial<TransactionItem>[]
) => {
    const totalAmount = aggregatedItems.reduce((sum, item) => sum + (item.supplyPrice||0) + (item.tax||0), 0);
    const totalSupply = aggregatedItems.reduce((sum, item) => sum + (item.supplyPrice||0), 0);
    const totalTax = aggregatedItems.reduce((sum, item) => sum + (item.tax||0), 0);
    const totalQty = aggregatedItems.reduce((sum, item) => sum + (item.quantity||0), 0);

    // Fill up to 15 rows
    const filledItems = [...aggregatedItems];
    while(filledItems.length < 15) filledItems.push({});
    const displayItems = filledItems.slice(0, 15);

    return `
        <div style="border: 2px solid #1f5a85; padding: 2px;">
        <div style="padding: 20px; min-height: 900px;">
            <div style="background-color: #1f5a85; color: white; text-align: center; padding: 10px; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 36px; letter-spacing: 0.5em; font-weight: 700;">납 품 서</h1>
            </div>

             <div class="flex justify-between" style="gap: 20px; margin-bottom: 20px;">
                <!-- Left Info (Recipient) - Adjusted width to 40% -->
                <div style="width: 40%; padding-top: 10px;">
                    <div style="margin-bottom: 30px; font-size: 16px;">
                        ${startDate || '____-__-__'} ~ ${endDate || '____-__-__'}
                    </div>
                    <div style="font-size: 20px; margin-bottom: 30px;">
                        <span class="font-bold" style="border-bottom: 1px solid black; min-width: 150px; display: inline-block;">${clientName || '(거래처 미지정)'}</span>
                        <span> 귀하</span>
                    </div>
                    <div>아래와 같이 납품합니다.</div>
                </div>

                <!-- Right Info (Supplier) - Adjusted width to 60% -->
                <div style="width: 60%;">
                    <table style="border: 1px solid black; text-align: center;">
                        <tr style="height: 30px;">
                            <td rowspan="5" class="bg-gray font-bold" style="width: 30px; border: 1px solid black;">공<br>급<br>자</td>
                            <td class="bg-gray" style="width: 80px; border: 1px solid black;">사업자번호</td>
                            <td colspan="3" class="font-bold" style="font-size: 16px; border: 1px solid black;">${companyInfo.registrationNumber}</td>
                        </tr>
                        <tr style="height: 40px;">
                            <td class="bg-gray" style="border: 1px solid black;">상 호</td>
                            <td class="font-bold" style="border: 1px solid black; white-space: nowrap;">${companyInfo.name}</td>
                            <td class="bg-gray" style="width: 50px; border: 1px solid black;">대표자</td>
                            <td style="border: 1px solid black; white-space: nowrap;" class="stamp-box">
                                ${companyInfo.ownerName}
                                ${companyInfo.stampImage ? `<img src="${companyInfo.stampImage}" class="stamp-img" />` : ''}
                            </td>
                        </tr>
                        <tr style="height: 30px;">
                            <td class="bg-gray" style="border: 1px solid black;">소 재 지</td>
                            <td colspan="3" style="font-size: 11px; text-align: left; padding-left: 5px; border: 1px solid black;">${companyInfo.address}</td>
                        </tr>
                        <tr style="height: 30px;">
                            <td class="bg-gray" style="border: 1px solid black;">업 태</td>
                            <td style="border: 1px solid black;">제조업, 도소매</td>
                            <td class="bg-gray" style="border: 1px solid black;">종 목</td>
                            <td style="border: 1px solid black;">임가공</td>
                        </tr>
                        <tr style="height: 30px;">
                            <td class="bg-gray" style="border: 1px solid black;">전화번호</td>
                            <td style="font-size: 11px; border: 1px solid black;">${companyInfo.phone}</td>
                            <td class="bg-gray" style="border: 1px solid black;">팩스</td>
                            <td style="font-size: 11px; border: 1px solid black;">${companyInfo.fax || ''}</td>
                        </tr>
                    </table>
                </div>
             </div>

             <div style="background-color: #1f5a85; color: white; display: flex; align-items: center; padding: 10px; margin-bottom: 20px;">
                <div style="width: 120px; text-align: center; border-right: 1px solid rgba(255,255,255,0.3);">
                    <div class="font-bold">합계금액</div>
                    <div style="font-size: 10px;">(VAT포함)</div>
                </div>
                <div style="flex: 1; text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 2px;">
                    ${numberToKorean(totalAmount)} 원정
                </div>
                <div style="width: 180px; text-align: right; font-size: 20px; font-weight: bold;">
                    ₩${totalAmount.toLocaleString()}
                </div>
             </div>

             <div style="font-weight: bold; margin-bottom: 5px;">납품내용</div>
             <table style="border-top: 2px solid black; border-bottom: 1px solid black; border-left: none; border-right: none;">
                <thead>
                    <tr class="bg-gray font-bold text-center" style="height: 30px; border-bottom: 1px solid black;">
                        <th style="width: 40px; border: 1px solid #ccc;">No.</th>
                        <th style="border: 1px solid #ccc;">품 명</th>
                        <th style="width: 80px; border: 1px solid #ccc;">규 격</th>
                        <th style="width: 60px; border: 1px solid #ccc;">수 량</th>
                        <th style="width: 90px; border: 1px solid #ccc;">단 가</th>
                        <th style="width: 100px; border: 1px solid #ccc;">공급가액</th>
                        <th style="width: 80px; border: 1px solid #ccc;">세 액</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayItems.map((item, i) => `
                    <tr class="text-center" style="height: 30px; border-bottom: 1px dashed #ccc;">
                        <td class="bg-gray" style="border: 1px solid #ccc;">${i + 1}</td>
                        <td class="text-left" style="padding-left: 5px; border: 1px solid #ccc;">${item.name || ''}</td>
                        <td style="border: 1px solid #ccc;">${item.spec || item.unit || ''}</td>
                        <td class="text-right" style="padding-right: 4px; border: 1px solid #ccc;">${item.quantity ? item.quantity.toLocaleString() : ''}</td>
                        <td class="text-right" style="padding-right: 4px; border: 1px solid #ccc;">${item.unitPrice ? item.unitPrice.toLocaleString() : ''}</td>
                        <td class="text-right" style="padding-right: 4px; border: 1px solid #ccc;">${item.supplyPrice ? item.supplyPrice.toLocaleString() : ''}</td>
                        <td class="text-right" style="padding-right: 4px; border: 1px solid #ccc;">${item.tax ? item.tax.toLocaleString() : ''}</td>
                    </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="bg-gray font-bold" style="height: 40px; border-top: 1px solid black;">
                        <td colspan="3" class="text-center" style="border: 1px solid #ccc;">합 계</td>
                        <td class="text-right" style="padding-right: 4px; border: 1px solid #ccc;">${totalQty.toLocaleString()}</td>
                        <td style="border: 1px solid #ccc;"></td>
                        <td class="text-right" style="padding-right: 4px; border: 1px solid #ccc;">${totalSupply.toLocaleString()}</td>
                        <td class="text-right" style="padding-right: 4px; border: 1px solid #ccc;">${totalTax.toLocaleString()}</td>
                    </tr>
                </tfoot>
             </table>

             <div style="margin-top: 20px; border-top: 2px solid black; padding-top: 5px;">
                <div style="display: flex; border-bottom: 1px dotted #ccc; padding: 5px 0;">
                    <div style="width: 100px; background-color: #f8fafc; font-weight: bold; text-align: center; padding: 5px;">계좌정보</div>
                    <div style="padding-left: 10px; display: flex; align-items: center;">1) 입금계좌 : ${companyInfo.bankInfo || ''}</div>
                </div>
                <div style="display: flex; padding: 5px 0;">
                    <div style="width: 100px; background-color: #f8fafc; font-weight: bold; text-align: center; padding: 5px;">특기사항</div>
                    <div style="padding-left: 10px;"></div>
                </div>
             </div>

        </div>
        </div>
    `;
};

// 3. Report Print - HTML String (Restored)
const generateReportPrintHTML = (
    startDate: string,
    endDate: string,
    reportItems: any[],
    employees: Employee[],
    approvers: { staff: string, manager: string, director: string }
) => {
    const staffEmp = employees.find(e => e.id === approvers.staff);
    const managerEmp = employees.find(e => e.id === approvers.manager);
    const directorEmp = employees.find(e => e.id === approvers.director);

    const getSignature = (emp?: Employee) => {
        if (emp?.signatureImage) {
            return `<img src="${emp.signatureImage}" class="signature-img" />`;
        }
        if (emp?.name) {
             return `<span style="font-size: 14px; font-weight: bold;">${emp.name}</span>`;
        }
        return '<span style="color: #ccc; font-size: 10px;">(서명없음)</span>';
    };

    return `
        <div>
            <div style="text-align: center; margin-bottom: 40px; position: relative;">
                <h1 style="font-size: 28px; font-weight: bold; letter-spacing: 2px;">정심작업장 매출보고서</h1>
                
                <div style="position: absolute; top: -10px; right: 0; width: 200px; border: 1px solid black; background: white; display: flex;">
                    <div style="width: 30px; border-right: 1px solid black; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; text-align: center;">
                        결<br>재
                    </div>
                    
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <div style="display: flex; border-bottom: 1px solid black; height: 24px;">
                            <div style="flex: 1; border-right: 1px solid black; display: flex; align-items: center; justify-content: center; font-size: 11px;">담당</div>
                            <div style="flex: 1; border-right: 1px solid black; display: flex; align-items: center; justify-content: center; font-size: 11px;">국장</div>
                            <div style="flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px;">원장</div>
                        </div>
                        <div style="flex: 1; display: flex; height: 100px;">
                            <div style="flex: 1; border-right: 1px solid black; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                ${getSignature(staffEmp)}
                            </div>
                            <div style="flex: 1; border-right: 1px solid black; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                ${getSignature(managerEmp)}
                            </div>
                            <div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                ${getSignature(directorEmp)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 10px; margin-top: 60px; font-size: 14px; font-weight: bold;">
                □ 매출기간 : ${startDate || '----.--.--'} ~ ${endDate || '----.--.--'}
            </div>

            <table class="border-blue">
                <thead>
                    <tr class="bg-blue text-center text-white" style="height: 30px;">
                        <th style="border-color: rgba(255,255,255,0.3);">거래일자</th>
                        <th style="border-color: rgba(255,255,255,0.3);">종별</th>
                        <th style="border-color: rgba(255,255,255,0.3);">거래처</th>
                        <th style="border-color: rgba(255,255,255,0.3);">제품명</th>
                        <th style="border-color: rgba(255,255,255,0.3);">규격</th>
                        <th style="border-color: rgba(255,255,255,0.3);">단가</th>
                        <th style="border-color: rgba(255,255,255,0.3);">수량</th>
                        <th style="border-color: rgba(255,255,255,0.3);">공급가액</th>
                        <th style="border-color: rgba(255,255,255,0.3);">세액</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportItems.map(item => `
                    <tr class="text-center" style="height: 30px;">
                        <td>${item.date}</td>
                        <td>${item.type}</td>
                        <td class="text-left" style="padding-left: 5px;">${item.clientName}</td>
                        <td class="text-left" style="padding-left: 5px;">${item.name}</td>
                        <td>${item.spec}</td>
                        <td class="text-right" style="padding-right: 5px;">${formatCurrency(item.unitPrice)}</td>
                        <td class="text-right" style="padding-right: 5px;">${item.quantity.toLocaleString()}</td>
                        <td class="text-right" style="padding-right: 5px;">${formatCurrency(item.supplyPrice)}</td>
                        <td class="text-right" style="padding-right: 5px;">${formatCurrency(item.tax)}</td>
                    </tr>
                    `).join('')}
                    
                    ${reportItems.length === 0 ? '<tr><td colspan="9" style="padding: 20px; text-align: center; color: #999;">데이터가 없습니다.</td></tr>' : ''}
                </tbody>
                <tfoot>
                     <tr class="bg-gray font-bold" style="height: 30px;">
                        <td colspan="6" class="text-center">합 계</td>
                        <td class="text-right" style="padding-right: 5px;">${reportItems.reduce((acc: any, curr: any) => acc + curr.quantity, 0).toLocaleString()}</td>
                        <td class="text-right" style="padding-right: 5px;">${formatCurrency(reportItems.reduce((acc: any, curr: any) => acc + curr.supplyPrice, 0))}</td>
                        <td class="text-right" style="padding-right: 5px;">${formatCurrency(reportItems.reduce((acc: any, curr: any) => acc + curr.tax, 0))}</td>
                     </tr>
                </tfoot>
            </table>
        </div>
    `;
};

// --- Main Component ---

const TransactionManager: React.FC<TransactionManagerProps> = ({ mode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState<'LIST' | 'FORM' | 'PRINT' | 'SUMMARY_PRINT' | 'REPORT_PRINT'>('LIST');
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(StorageService.getCompanyInfo());
  
  // Product Master Data
  const [sheetProducts, setSheetProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClientFromSheet, setIsClientFromSheet] = useState(false);
  
  // Form State
  const [currentTransaction, setCurrentTransaction] = useState<Partial<Transaction>>({});
  const [formItems, setFormItems] = useState<Partial<TransactionItem>[]>([{}]);
  
  // Report Approval State
  const [approvers, setApprovers] = useState<{ staff: string, manager: string, director: string }>({
      staff: '', manager: '', director: ''
  });

  // Dropdown State
  const [activeDropdownRow, setActiveDropdownRow] = useState<number | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  
  // AI Email
  const [emailDraft, setEmailDraft] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');

  // Search & Filter State
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
      // Reset view and filters when mode changes
      setView('LIST');
      setClientSearchTerm('');
      setProductSearchTerm('');
      setFloorFilter('');
      setStartDate('');
      setEndDate('');
      loadData(false);
  }, [mode]);

  useEffect(() => {
    loadData(false);

    // Auto-refresh when sync is done
    const handleSync = () => loadData(false);
    window.addEventListener('JEONGSIM_DATA_SYNCED', handleSync);
    
    // Close dropdowns when clicking outside
    const handleGlobalClick = () => {
        setIsSearchDropdownOpen(false);
        setIsEmployeeDropdownOpen(false);
        setActiveDropdownRow(null);
    };
    window.addEventListener('click', handleGlobalClick);
    
    return () => {
        window.removeEventListener('JEONGSIM_DATA_SYNCED', handleSync);
        window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const loadData = async (forceFetch = false) => {
    const info = StorageService.getCompanyInfo();
    setCompanyInfo(info);
    
    // Transactions are always local
    setTransactions(StorageService.getTransactions());
    
    // For external data, rely on Storage first
    setClients(StorageService.getClients());
    setSheetProducts(StorageService.getProducts());
    setEmployees(StorageService.getEmployees());
    setIsClientFromSheet(!!info.googleScriptUrl);

    if (forceFetch && info.googleScriptUrl) {
       setIsLoading(true);
       try {
        const [fetchedClients, fetchedProducts, fetchedEmployees] = await Promise.all([
            SheetService.fetchClients(info.googleScriptUrl, info.companySheetName || 'company'),
            SheetService.fetchProducts(info.googleScriptUrl, info.productSheetName || 'info'),
            SheetService.fetchEmployees(info.googleScriptUrl, info.employeeSheetName || 'employee')
        ]);
        
        if (fetchedClients.length > 0) {
            setClients(fetchedClients);
            StorageService.saveClients(fetchedClients);
        }
        if (fetchedProducts.length > 0) {
            setSheetProducts(fetchedProducts);
            StorageService.saveProducts(fetchedProducts);
        }
        if (fetchedEmployees.length > 0) {
            setEmployees(fetchedEmployees);
            StorageService.saveEmployees(fetchedEmployees);
        }
       } catch (error) {
         console.error("Failed to fetch data manually:", error);
       }
       setIsLoading(false);
    }
  };

  const handleNewTransaction = () => {
    const type = mode === 'SALES' ? TransactionType.STATEMENT : TransactionType.QUOTATION;
    
    // Use local time for default date
    const offset = new Date().getTimezoneOffset() * 60000;
    const localDate = new Date(Date.now() - offset).toISOString().split('T')[0];

    setCurrentTransaction({
      id: Date.now().toString(),
      date: localDate,
      type: type,
      clientId: '',
      clientName: '', // Init clientName explicitly
      contactPerson: '',
      floor: '', // Init floor
      items: [],
      isPaid: false,
      memo: ''
    });
    setFormItems([{ productId: Date.now().toString(), quantity: 1, unitPrice: 0, tax: 0, supplyPrice: 0, name: '', spec: '', unit: '' }]);
    setView('FORM');
  };

  const calculateItem = (item: Partial<TransactionItem>) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const supply = qty * price;
    const tax = Math.floor(supply * 0.1);
    return { ...item, supplyPrice: supply, tax: tax };
  };

  const handleItemChange = (index: number, field: keyof TransactionItem, value: any) => {
    const newItems = [...formItems];
    let updatedItem: Partial<TransactionItem> = { ...newItems[index], [field]: value as any };

    if (field === 'supplyPrice') {
        const newSupply = Number(value) || 0;
        updatedItem.supplyPrice = newSupply as number;
        updatedItem.tax = Math.floor(newSupply * 0.1);
    } else if (field === 'tax') {
        updatedItem.tax = Number(value) || 0;
    } else if (field === 'quantity' || field === 'unitPrice') {
        newItems[index] = updatedItem; 
        updatedItem = calculateItem(updatedItem); 
    }

    newItems[index] = updatedItem;
    setFormItems(newItems);
  };

  const selectProduct = (index: number, product: ProductItem) => {
    const newItems = [...formItems];
    newItems[index] = {
        ...newItems[index],
        name: product.name,
        spec: product.spec,
        unit: product.unit,
        unitPrice: product.unitPrice
    };
    newItems[index] = calculateItem(newItems[index]);
    setFormItems(newItems);
    setActiveDropdownRow(null);
  };

  const addItemRow = () => {
    setFormItems([...formItems, { productId: Date.now().toString(), quantity: 1, unitPrice: 0, tax: 0, supplyPrice: 0, name: '', spec: '', unit: '' }]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) return; // Keep at least one row
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!currentTransaction.clientName) return alert('거래처명을 입력해주세요.');
    
    const items = formItems.filter(i => i.name).map(i => {
        const qty = Number(i.quantity) || 0;
        const price = Number(i.unitPrice) || 0;
        const supply = Number(i.supplyPrice) || 0;
        const tax = Number(i.tax) || 0;

        return {
            productId: i.productId || Date.now().toString(),
            name: i.name || '',
            spec: i.spec || '',
            unit: i.unit || '',
            quantity: qty,
            unitPrice: price,
            supplyPrice: supply,
            tax: tax
        } as TransactionItem;
    });
    
    if (items.length === 0) return alert('품목을 하나 이상 입력해주세요.');

    setIsSaving(true);
    try {
        const totalSupplyPrice = items.reduce((sum, i) => sum + i.supplyPrice, 0);
        const totalTax = items.reduce((sum, i) => sum + i.tax, 0);
    
        const transaction: Transaction = {
          ...currentTransaction as Transaction,
          items,
          totalSupplyPrice,
          totalTax,
          totalAmount: Math.floor(totalSupplyPrice + totalTax) // Ensure total is integer
        };
    
        // 1. Local Save
        StorageService.saveTransaction(transaction);

        // 2. Google Sheet Save (if configured)
        const info = StorageService.getCompanyInfo();
        let sheetSuccess = true;
        if (info.googleScriptUrl) {
            sheetSuccess = await SheetService.saveTransaction(info.googleScriptUrl, transaction);
        }
        
        // Navigation Logic
        if (transaction.type === TransactionType.QUOTATION) {
            setCurrentTransaction(transaction);
            setFormItems(transaction.items);
            if (info.googleScriptUrl && !sheetSuccess) {
                alert('저장은 되었으나 구글 시트 전송에 실패했습니다.');
            }
            setView('PRINT');
        } else {
            if (info.googleScriptUrl) {
                if (sheetSuccess) {
                    alert('매출 등록이 완료되었습니다.');
                } else {
                    alert('로컬 저장은 완료되었으나, 구글 시트(data) 전송에 실패했습니다.');
                }
            } else {
                alert('매출 등록이 완료되었습니다.');
            }
            loadData(false);
            setView('LIST');
        }

    } catch (e: any) {
        console.error(e);
        alert('저장 중 오류가 발생했습니다.');
    } finally {
        setIsSaving(false);
    }
  };

  const handlePrint = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
    setFormItems(transaction.items);
    setView('PRINT');
  };

  const handleSummaryPrint = () => {
    setView('SUMMARY_PRINT');
  };

  const handleReportPrint = () => {
      // Set default approvers if available
      const staff = employees.find(e => e.position.includes('담당') || e.position.includes('팀장'))?.id || '';
      const manager = employees.find(e => e.position.includes('국장'))?.id || '';
      const director = employees.find(e => e.position.includes('원장') || e.position.includes('대표'))?.id || '';
      
      setApprovers({ staff, manager, director });
      setView('REPORT_PRINT');
  };
  
  const generateAiEmail = async (transaction: Transaction) => {
    const client = clients.find(c => c.id === transaction.clientId);
    setTargetEmail(client?.email || '');
    setShowEmailModal(true);
    setEmailDraft("AI가 이메일 초안을 작성 중입니다...");
    const draft = await GeminiService.generateEmailDraft(
      transaction.clientName, 
      transaction.type === TransactionType.QUOTATION ? '견적서' : '거래명세서'
    );
    setEmailDraft(draft);
  };

  const handleSendEmailFromPrint = async () => {
    if (view === 'PRINT') {
      if (currentTransaction && currentTransaction.clientName) {
        await generateAiEmail(currentTransaction as Transaction);
      }
    } else if (view === 'SUMMARY_PRINT') {
      if (!clientSearchTerm) {
        alert('거래처를 선택(검색)한 후에 이메일 초안을 생성해주세요.');
        return;
      }
      const targetClient = clients.find(c => c.name === clientSearchTerm) 
        || clients.find(c => c.name.includes(clientSearchTerm));
      
      setTargetEmail(targetClient?.email || '');
      setShowEmailModal(true);
      setEmailDraft("AI가 이메일 초안을 작성 중입니다...");
      
      const period = startDate || endDate ? `(${startDate} ~ ${endDate})` : '';
      const draft = await GeminiService.generateEmailDraft(
        clientSearchTerm, 
        `거래 집계표 ${period}`
      );
      setEmailDraft(draft);
    }
  };

  // Filter based on Mode and Search/Date inputs
  const filteredTransactions = transactions.filter(t => {
    if (mode === 'SALES' && t.type === TransactionType.QUOTATION) return false;
    if (mode === 'QUOTATION' && t.type === TransactionType.STATEMENT) return false;

    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    
    if (floorFilter && t.floor !== floorFilter) return false;

    if (clientSearchTerm && !t.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase())) {
        return false;
    }

    if (productSearchTerm) {
        const hasProduct = t.items.some(item => item.name.toLowerCase().includes(productSearchTerm.toLowerCase()));
        if (!hasProduct) return false;
    }
    
    return true;
  }).sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
  });

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setClientSearchTerm('');
    setProductSearchTerm('');
    setFloorFilter('');
  };

  const isExactSearchMatch = clients.some(c => c.name === clientSearchTerm);
  const filteredSearchClients = (isExactSearchMatch || clientSearchTerm === '')
    ? clients
    : clients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()));
  
  // --- Data Aggregation Logic (Reused for React View & HTML Print) ---

  const getAggregatedItems = () => {
    const map = new Map<string, TransactionItem>();
    filteredTransactions.forEach(t => {
      t.items.forEach(item => {
        const key = item.name;
        if (map.has(key)) {
          const existing = map.get(key)!;
          map.set(key, {
            ...existing,
            quantity: existing.quantity + item.quantity,
            supplyPrice: existing.supplyPrice + item.supplyPrice,
            tax: existing.tax + item.tax,
          });
        } else {
          map.set(key, { ...item });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  };
  
  const getFlattenedReportItems = () => {
      const flatItems: Array<{
          date: string;
          type: string;
          clientName: string;
          name: string;
          spec: string;
          unitPrice: number;
          quantity: number;
          supplyPrice: number;
          tax: number;
      }> = [];

      const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sortedTransactions.forEach(t => {
          t.items.forEach(i => {
              flatItems.push({
                  date: t.date,
                  type: t.type === TransactionType.STATEMENT ? '매출' : '견적',
                  clientName: t.clientName,
                  name: i.name,
                  spec: i.spec,
                  unitPrice: i.unitPrice,
                  quantity: i.quantity,
                  supplyPrice: i.supplyPrice,
                  tax: i.tax
              });
          });
      });
      return flatItems;
  };

  // --- Trigger Print Function ---
  const triggerPrint = (e: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    let htmlContent = '';

    if (view === 'PRINT') {
        htmlContent = generateTransactionPrintHTML(currentTransaction, formItems, companyInfo, clients);
    } else if (view === 'SUMMARY_PRINT') {
        const aggregatedItems = getAggregatedItems();
        htmlContent = generateSummaryPrintHTML(startDate, endDate, clientSearchTerm, companyInfo, aggregatedItems);
    } else if (view === 'REPORT_PRINT') {
        const reportItems = getFlattenedReportItems();
        // Generate the popup HTML for Report
        htmlContent = generateReportPrintHTML(startDate, endDate, reportItems, employees, approvers);
    }

    if (htmlContent) {
        printDocument(htmlContent);
    }
  };

  // --- Render Views ---

  if (view === 'FORM') {
    return (
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-bold">{mode === 'SALES' ? '매출 등록' : '견적서 작성'}</h2>
           <button onClick={() => setView('LIST')} className="text-slate-500 hover:text-slate-800">
               <X size={24} />
           </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">날짜</label>
            <input 
              type="date" 
              className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              value={currentTransaction.date || ''}
              onChange={e => setCurrentTransaction({...currentTransaction, date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">거래처</label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
                <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="거래처 검색 또는 입력"
                    value={currentTransaction.clientName || ''}
                    onChange={(e) => {
                        setCurrentTransaction({...currentTransaction, clientName: e.target.value, clientId: ''});
                        setClientSearchTerm(e.target.value);
                        setIsSearchDropdownOpen(true);
                    }}
                    onFocus={() => setIsSearchDropdownOpen(true)}
                />
                {isSearchDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredSearchClients.length > 0 ? (
                            filteredSearchClients.map((client) => (
                                <div 
                                    key={client.id}
                                    className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer flex justify-between"
                                    onClick={() => {
                                        setCurrentTransaction({
                                            ...currentTransaction, 
                                            clientName: client.name,
                                            clientId: client.id,
                                            contactPerson: client.contactPerson
                                        });
                                        setClientSearchTerm(client.name);
                                        setIsSearchDropdownOpen(false);
                                    }}
                                >
                                    <span>{client.name}</span>
                                    <span className="text-slate-400 text-xs">{client.contactPerson}</span>
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-slate-400">등록된 거래처가 없습니다. 직접 입력하세요.</div>
                        )}
                    </div>
                )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">층별 (Google Sheet D열)</label>
             <select
                className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                value={currentTransaction.floor || ''}
                onChange={e => setCurrentTransaction({...currentTransaction, floor: e.target.value})}
             >
                <option value="">선택 안함 (공란)</option>
                <option value="1층">1층</option>
                <option value="2층">2층</option>
             </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">비고</label>
            <input 
              type="text" 
              className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              value={currentTransaction.memo || ''}
              onChange={e => setCurrentTransaction({...currentTransaction, memo: e.target.value})}
            />
          </div>
        </div>
        
        <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">품목 내역</h3>
            <div className="overflow-visible">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b">
                            <th className="p-2 text-left w-[20%]">품명</th>
                            <th className="p-2 text-left w-[15%]">규격</th>
                            <th className="p-2 text-left w-[10%]">단위</th>
                            <th className="p-2 text-right w-[10%]">수량</th>
                            <th className="p-2 text-right w-[15%]">단가</th>
                            <th className="p-2 text-right w-[15%]">공급가액</th>
                            <th className="p-2 text-right w-[10%]">세액</th>
                            <th className="p-2 w-[5%]"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {formItems.map((item, idx) => {
                            // Filter logic: If current input matches a product EXACTLY, show ALL products to allow switching.
                            // Otherwise, filter by the input.
                            const searchTerm = (item.name || '').trim();
                            const isExactMatch = sheetProducts.some(p => p.name === searchTerm);
                            const relevantProducts = (searchTerm && !isExactMatch)
                                ? sheetProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                : sheetProducts;

                            return (
                                <tr key={idx} className="border-b">
                                    <td className="p-2 relative" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="text" 
                                            className="w-full border border-slate-300 rounded p-1 bg-yellow-50 focus:bg-white transition-colors"
                                            value={item.name || ''}
                                            onChange={e => handleItemChange(idx, 'name', e.target.value)}
                                            onFocus={(e) => {
                                                setActiveDropdownRow(idx);
                                                e.target.select();
                                            }}
                                            onClick={() => setActiveDropdownRow(idx)}
                                            placeholder="품명 검색"
                                        />
                                        {activeDropdownRow === idx && (
                                            <div className="absolute z-50 left-0 min-w-[350px] mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                {relevantProducts.map(prod => (
                                                    <div 
                                                        key={prod.id} 
                                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                        onMouseDown={() => selectProduct(idx, prod)}
                                                    >
                                                        <div className="font-medium">{prod.name}</div>
                                                        <div className="text-xs text-slate-500 flex space-x-2">
                                                            <span>규격: {prod.spec}</span>
                                                            <span>단위: {prod.unit}</span>
                                                            <span>단가: {prod.unitPrice.toLocaleString()}원</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {sheetProducts.length === 0 && <div className="p-2 text-xs text-slate-400">품목 데이터 없음</div>}
                                                {sheetProducts.length > 0 && relevantProducts.length === 0 && (
                                                    <div className="p-2 text-xs text-slate-400">일치하는 품목 없음</div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2"><input type="text" className="w-full border border-slate-300 rounded p-1" value={item.spec || ''} onChange={e => handleItemChange(idx, 'spec', e.target.value)} /></td>
                                    <td className="p-2"><input type="text" className="w-full border border-slate-300 rounded p-1" value={item.unit || ''} onChange={e => handleItemChange(idx, 'unit', e.target.value)} /></td>
                                    <td className="p-2"><input type="number" className="w-full border border-slate-300 rounded p-1 text-right bg-yellow-50 focus:bg-white transition-colors" value={item.quantity || 0} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} /></td>
                                    <td className="p-2"><input type="number" className="w-full border border-slate-300 rounded p-1 text-right" value={item.unitPrice || 0} onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)} /></td>
                                    <td className="p-2"><input type="number" className="w-full border border-slate-300 rounded p-1 text-right" value={item.supplyPrice || 0} onChange={e => handleItemChange(idx, 'supplyPrice', e.target.value)} /></td>
                                    <td className="p-2"><input type="number" className="w-full border border-slate-300 rounded p-1 text-right" value={item.tax || 0} onChange={e => handleItemChange(idx, 'tax', e.target.value)} /></td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => removeItemRow(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <button onClick={addItemRow} className="mt-2 text-blue-600 text-sm flex items-center hover:text-blue-800"><Plus size={16} className="mr-1"/> 품목 추가</button>
            </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
            <button onClick={() => setView('LIST')} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">취소</button>
            <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50 shadow-md"
            >
                {isSaving ? <RefreshCw className="animate-spin mr-2"/> : <CheckCircle className="mr-2"/>}
                {isSaving ? '저장 중...' : '저장하기'}
            </button>
        </div>
      </div>
    );
  }

  if (view === 'PRINT') {
      const isQuotation = currentTransaction.type === TransactionType.QUOTATION;
      const title = isQuotation ? '견 적 서' : '거 래 명 세 서';
      const totalAmount = currentTransaction.totalSupplyPrice! + currentTransaction.totalTax!;
      
      return (
        <div className="max-w-[210mm] mx-auto bg-white p-8 min-h-screen">
            <div className="flex justify-between items-start mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <button onClick={() => setView('LIST')} className="text-slate-600 hover:text-slate-900 flex items-center">
                    <ArrowLeft size={16} className="mr-1"/> 목록으로 돌아가기
                </button>
                <div className="flex space-x-2">
                    <button 
                        onClick={handleSendEmailFromPrint}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700 transition-colors shadow-sm"
                    >
                        <Mail size={18} className="mr-2" /> 이메일 초안
                    </button>
                    <button 
                        onClick={triggerPrint}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Printer size={18} className="mr-2" /> 인쇄하기
                    </button>
                </div>
            </div>

            <div className="border-2 border-[#1f5a85] p-1">
                <div className="border border-[#1f5a85] p-4 min-h-[1000px]">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold tracking-[0.5em] text-[#1f5a85] decoration-double underline underline-offset-4">{title}</h1>
                    </div>
                    
                    <div className="flex justify-between items-start mb-6 gap-4">
                        <div className="w-[40%]">
                            <div className="flex items-center mb-2">
                                <span className="text-lg font-bold border-b border-black mr-2">{currentTransaction.clientName}</span>
                                <span className="text-lg">귀하</span>
                            </div>
                            <div className="mb-4 text-sm">
                                아래와 같이 {isQuotation ? '견적' : '계산'}합니다.
                            </div>
                            <div className="border-t-2 border-b-2 border-black py-2 my-2 flex">
                                <span className="w-24 font-bold text-center">합계금액</span>
                                <span className="flex-1 text-right font-bold text-lg pr-4">
                                    일금 {numberToKorean(totalAmount)} ({formatCurrency(totalAmount)})
                                </span>
                            </div>
                        </div>
                        <div className="w-[60%] border border-[#1f5a85]">
                             <table className="w-full text-sm">
                                 <tbody>
                                     <tr>
                                         <td rowSpan={5} className="w-8 text-center bg-slate-50 font-bold border-r border-b border-[#1f5a85] py-2">공<br/>급<br/>자</td>
                                         <td className="border-r border-b border-[#1f5a85] px-2 py-1 bg-slate-50 w-20 text-center">등록번호</td>
                                         <td colSpan={3} className="border-b border-[#1f5a85] px-2 py-1 font-bold text-lg text-center tracking-widest">{companyInfo.registrationNumber}</td>
                                     </tr>
                                     <tr>
                                         <td className="border-r border-b border-[#1f5a85] px-2 py-1 bg-slate-50 text-center">상 호</td>
                                         <td style={{fontWeight: 'bold', whiteSpace: 'nowrap'}} className="border-r border-b border-[#1f5a85] px-2 py-1">{companyInfo.name}</td>
                                         <td className="border-r border-b border-[#1f5a85] px-2 py-1 bg-slate-50 w-16 text-center">성 명</td>
                                         <td className="border-b border-[#1f5a85] px-2 py-1 relative">
                                             {companyInfo.ownerName}
                                             {companyInfo.stampImage && (
                                                <img 
                                                  src={companyInfo.stampImage} 
                                                  alt="직인" 
                                                  referrerPolicy="no-referrer"
                                                  className="absolute top-1/2 right-2 transform -translate-y-1/2 w-12 h-12 opacity-80 mix-blend-multiply" 
                                                  onError={(e) => {
                                                      (e.target as HTMLImageElement).style.display = 'none';
                                                  }}
                                                />
                                             )}
                                             <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-slate-400 select-none">(인)</span>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td className="border-r border-b border-[#1f5a85] px-2 py-1 bg-slate-50 text-center">주 소</td>
                                         <td colSpan={3} className="border-b border-[#1f5a85] px-2 py-1 text-xs">{companyInfo.address}</td>
                                     </tr>
                                     <tr>
                                         <td className="border-r border-b border-[#1f5a85] px-2 py-1 bg-slate-50 text-center">업 태</td>
                                         <td className="border-r border-b border-[#1f5a85] px-2 py-1">제조업, 도소매</td>
                                         <td className="border-r border-b border-[#1f5a85] px-2 py-1 bg-slate-50 text-center">종 목</td>
                                         <td className="border-b border-[#1f5a85] px-2 py-1">임가공</td>
                                     </tr>
                                     <tr>
                                         <td className="border-r border-[#1f5a85] px-2 py-1 bg-slate-50 text-center">전 화</td>
                                         <td colSpan={3} className="px-2 py-1 text-xs">{companyInfo.phone} {companyInfo.fax && `/ FAX: ${companyInfo.fax}`}</td>
                                     </tr>
                                 </tbody>
                             </table>
                        </div>
                    </div>

                    <table className="w-full border-collapse border border-[#1f5a85] text-sm mb-4">
                        <thead>
                            <tr className="bg-[#1f5a85] text-white h-8 text-center">
                                <th className="border-r border-white/30 w-10">월</th>
                                <th className="border-r border-white/30 w-10">일</th>
                                <th className="border-r border-white/30">품 목</th>
                                <th className="border-r border-white/30 w-16">규격</th>
                                <th className="border-r border-white/30 w-12">단위</th>
                                <th className="border-r border-white/30 w-16">수량</th>
                                <th className="border-r border-white/30 w-24">단가</th>
                                <th className="border-r border-white/30 w-28">공급가액</th>
                                <th className="w-24">세액</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 15 }).map((_, i) => {
                                const item = formItems[i];
                                const dateParts = currentTransaction.date?.split('-');
                                const month = dateParts ? dateParts[1] : '';
                                const day = dateParts ? dateParts[2] : '';
                                
                                return (
                                    <tr key={i} className="h-8 border-b border-[#1f5a85] text-center">
                                        <td className="border-r border-[#1f5a85] bg-slate-50">{item ? month : ''}</td>
                                        <td className="border-r border-[#1f5a85] bg-slate-50">{item ? day : ''}</td>
                                        <td className="border-r border-[#1f5a85] text-left px-2">{item?.name || ''}</td>
                                        <td className="border-r border-[#1f5a85]">{item?.spec || ''}</td>
                                        <td className="border-r border-[#1f5a85]">{item?.unit || ''}</td>
                                        <td className="border-r border-[#1f5a85] text-right px-1">{item?.quantity?.toLocaleString() || ''}</td>
                                        <td className="border-r border-[#1f5a85] text-right px-1">{item?.unitPrice ? formatCurrency(item.unitPrice) : ''}</td>
                                        <td className="border-r border-[#1f5a85] text-right px-1">{item?.supplyPrice ? formatCurrency(item.supplyPrice) : ''}</td>
                                        <td className="text-right px-1">{item?.tax ? formatCurrency(item.tax) : ''}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-[#1f5a85] text-white h-8 font-bold">
                                <td colSpan={5} className="text-center border-r border-white/30">합 계</td>
                                <td className="text-right px-1 border-r border-white/30">{currentTransaction.items?.reduce((a,c) => a + c.quantity, 0).toLocaleString()}</td>
                                <td className="border-r border-white/30"></td>
                                <td className="text-right px-1 border-r border-white/30">{formatCurrency(currentTransaction.totalSupplyPrice || 0)}</td>
                                <td className="text-right px-1">{formatCurrency(currentTransaction.totalTax || 0)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {companyInfo.bankInfo && (
                        <div className="mt-4 text-sm text-right font-medium">
                            계좌번호: {companyInfo.bankInfo}
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  }

  if (view === 'SUMMARY_PRINT') {
    const aggregatedItems = getAggregatedItems();
    const totalAmount = aggregatedItems.reduce((sum, item) => sum + item.supplyPrice + item.tax, 0);
    const totalSupply = aggregatedItems.reduce((sum, item) => sum + item.supplyPrice, 0);
    const totalTax = aggregatedItems.reduce((sum, item) => sum + item.tax, 0);
    const totalQty = aggregatedItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="max-w-[210mm] mx-auto bg-white p-8 min-h-screen">
            <div className="flex justify-between items-start mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <button onClick={() => setView('LIST')} className="text-slate-600 hover:text-slate-900 flex items-center">
                    <ArrowLeft size={16} className="mr-1"/> 목록으로 돌아가기
                </button>
                <div className="flex space-x-2">
                     <button 
                        onClick={handleSendEmailFromPrint}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700 transition-colors shadow-sm"
                    >
                        <Mail size={18} className="mr-2" /> 이메일 초안
                    </button>
                    <button 
                        onClick={triggerPrint}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Printer size={18} className="mr-2" /> 인쇄하기
                    </button>
                </div>
            </div>

            <div className="border-2 border-[#1f5a85] p-1">
                <div className="p-4 min-h-[1000px]">
                    
                    <div className="bg-[#1f5a85] text-white text-center py-2 mb-8">
                        <h1 className="text-4xl font-bold tracking-[0.5em]">납 품 서</h1>
                    </div>

                    <div className="flex justify-between items-start mb-4">
                        <div className="w-[40%] pt-2">
                             <div className="mb-8 text-lg">
                                {startDate || '____-__-__'} ~ {endDate || '____-__-__'}
                             </div>
                             <div className="text-xl">
                                <span className="font-bold border-b border-black inline-block min-w-[150px]">{clientSearchTerm || '(거래처 미지정)'}</span>
                                <span> 귀하</span>
                             </div>
                             <div className="mt-8">
                                아래와 같이 납품합니다.
                             </div>
                        </div>

                        <div className="w-[60%]">
                            <table className="w-full border-collapse border border-black text-sm text-center">
                                <tbody>
                                    <tr className="h-8">
                                        <td rowSpan={5} className="w-8 bg-slate-100 border-r border-black font-bold">공<br/>급<br/>자</td>
                                        <td className="border-b border-r border-black bg-slate-100 w-20">사업자번호</td>
                                        <td colSpan={3} className="border-b border-black font-bold text-lg">{companyInfo.registrationNumber}</td>
                                    </tr>
                                    <tr className="h-10">
                                        <td className="border-b border-r border-black bg-slate-100">상 호</td>
                                        <td className="border-b border-r border-black font-bold text-base" style={{ whiteSpace: 'nowrap' }}>{companyInfo.name}</td>
                                        <td className="border-b border-r border-black bg-slate-100 w-12">대표자</td>
                                        <td className="border-b border-black relative" style={{ whiteSpace: 'nowrap' }}>
                                            {companyInfo.ownerName}
                                            {companyInfo.stampImage && (
                                                <img 
                                                    src={companyInfo.stampImage} 
                                                    alt="직인" 
                                                    referrerPolicy="no-referrer"
                                                    className="absolute top-1/2 right-2 transform -translate-y-1/2 w-10 h-10 opacity-80 mix-blend-multiply" 
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                    <tr className="h-8">
                                        <td className="border-b border-r border-black bg-slate-100">소 재 지</td>
                                        <td colSpan={3} className="border-b border-black text-xs px-1 text-left">{companyInfo.address}</td>
                                    </tr>
                                    <tr className="h-8">
                                        <td className="border-b border-r border-black bg-slate-100">업 태</td>
                                        <td className="border-b border-r border-black">제조업, 도소매</td>
                                        <td className="border-b border-r border-black bg-slate-100">종 목</td>
                                        <td className="border-b border-black">임가공</td>
                                    </tr>
                                    <tr className="h-8">
                                        <td className="border-r border-black bg-slate-100">전화번호</td>
                                        <td className="border-r border-black text-xs">{companyInfo.phone}</td>
                                        <td className="border-r border-black bg-slate-100">팩스</td>
                                        <td className="text-xs">{companyInfo.fax}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-[#1f5a85] text-white flex items-center p-2 mb-4 h-12">
                        <div className="w-32 text-center font-bold border-r border-white/30">합계금액<br/><span className="text-xs font-normal">(VAT포함)</span></div>
                        <div className="flex-1 text-center text-xl font-bold tracking-widest">
                             {numberToKorean(totalAmount)} 원정
                        </div>
                        <div className="w-48 text-right font-bold text-xl pr-4">
                            ₩{totalAmount.toLocaleString()}
                        </div>
                    </div>

                     <div className="mb-4">
                        <div className="font-bold mb-1 ml-1">납품내용</div>
                        <table className="w-full border-collapse border-t-2 border-b border-black text-sm">
                            <thead>
                                <tr className="bg-slate-100 h-8 border-b border-black text-center font-bold">
                                    <th className="w-10 border-r border-slate-300">No.</th>
                                    <th className="border-r border-slate-300">품 명</th>
                                    <th className="w-20 border-r border-slate-300">규 격</th>
                                    <th className="w-20 border-r border-slate-300">수 량</th>
                                    <th className="w-20 border-r border-slate-300">단 가</th>
                                    <th className="w-28 border-r border-slate-300">공급가액</th>
                                    <th className="w-24">세 액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 15 }).map((_, i) => {
                                    const item = aggregatedItems[i];
                                    return (
                                        <tr key={i} className="h-8 border-b border-slate-200 border-dashed text-center">
                                            <td className="border-r border-slate-300 bg-slate-50">{i + 1}</td>
                                            <td className="border-r border-slate-300 text-left px-2">{item?.name || ''}</td>
                                            <td className="border-r border-slate-300">{item?.spec || item?.unit || ''}</td>
                                            <td className="border-r border-slate-300 text-right px-1">{item?.quantity ? item.quantity.toLocaleString() : ''}</td>
                                            <td className="border-r border-slate-300 text-right px-1">{item?.unitPrice ? item.unitPrice.toLocaleString() : ''}</td>
                                            <td className="border-r border-slate-300 text-right px-1">{item?.supplyPrice ? item.supplyPrice.toLocaleString() : ''}</td>
                                            <td className="text-right px-1">{item?.tax ? item.tax.toLocaleString() : ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="h-10 border-t border-black font-bold bg-slate-50">
                                    <td colSpan={3} className="text-center border-r border-slate-300">합 계</td>
                                    <td className="text-right px-1 border-r border-slate-300">{totalQty.toLocaleString()}</td>
                                    <td className="border-r border-slate-300"></td>
                                    <td className="text-right px-1 border-r border-slate-300">{totalSupply.toLocaleString()}</td>
                                    <td className="text-right px-1">{totalTax.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                     </div>

                    <div className="border-t-2 border-black mt-2 pt-1">
                        <div className="flex border-b border-dotted border-slate-400 py-2">
                             <div className="w-24 text-center font-bold bg-slate-100 py-1">계좌정보</div>
                             <div className="flex-1 pl-4 py-1 flex items-center">
                                1) 입금계좌 : {companyInfo.bankInfo}
                             </div>
                        </div>
                        <div className="flex py-2">
                             <div className="w-24 text-center font-bold bg-slate-100 py-1">특기사항</div>
                             <div className="flex-1 pl-4 py-1">
                                
                             </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
  }

  if (view === 'REPORT_PRINT') {
      const reportItems = getFlattenedReportItems();
      const staffEmp = employees.find(e => e.id === approvers.staff);
      const managerEmp = employees.find(e => e.id === approvers.manager);
      const directorEmp = employees.find(e => e.id === approvers.director);

      const renderSignature = (emp?: Employee) => {
         if (emp?.signatureImage) {
             return <img src={emp.signatureImage} alt="서명" className="max-h-[80px] max-w-full object-contain" />;
         }
         return <span className="text-slate-300 text-[10px]">(서명없음)</span>;
      };

      return (
        <div className="max-w-[210mm] mx-auto bg-white p-8 min-h-screen print:max-w-none print:w-full print:p-0">
            <div className="flex justify-between items-start mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 print:hidden">
                <div className="flex flex-col space-y-2">
                    <button onClick={() => setView('LIST')} className="text-slate-600 hover:text-slate-900 flex items-center mb-2">
                        <ArrowLeft size={16} className="mr-1"/> 목록으로 돌아가기
                    </button>
                    
                    <div className="flex space-x-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">담당</label>
                            <select 
                                className="text-sm border rounded p-1" 
                                value={approvers.staff} 
                                onChange={e => setApprovers({...approvers, staff: e.target.value})}
                            >
                                <option value="">선택 안함</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">국장</label>
                            <select 
                                className="text-sm border rounded p-1" 
                                value={approvers.manager} 
                                onChange={e => setApprovers({...approvers, manager: e.target.value})}
                            >
                                <option value="">선택 안함</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">원장</label>
                            <select 
                                className="text-sm border rounded p-1" 
                                value={approvers.director} 
                                onChange={e => setApprovers({...approvers, director: e.target.value})}
                            >
                                <option value="">선택 안함</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-2">
                    <button 
                        onClick={triggerPrint}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Printer size={18} className="mr-2" /> 인쇄하기
                    </button>
                </div>
            </div>

            <div>
                <div className="text-center mb-8 relative">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-wider mt-4">정심작업장 매출보고서</h1>
                    
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', border: '1px solid black', background: 'white', display: 'flex' }}>
                        <div style={{ width: '30px', borderRight: '1px solid black', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
                            결<br/>재
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', borderBottom: '1px solid black', height: '24px' }}>
                                <div style={{ flex: 1, borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>담당</div>
                                <div style={{ flex: 1, borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>국장</div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>원장</div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', height: '100px' }}>
                                <div style={{ flex: 1, borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {renderSignature(staffEmp)}
                                </div>
                                <div style={{ flex: 1, borderRight: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {renderSignature(managerEmp)}
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {renderSignature(directorEmp)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-end mb-2 mt-24">
                    <div className="flex items-center text-sm font-bold">
                        <span className="mr-4">□ 매출기간</span>
                        <span className="mr-4">{startDate || '----.--.--'}</span>
                        <span className="mr-4">~</span>
                        <span>{endDate || '----.--.--'}</span>
                    </div>
                </div>

                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed'}}>
                    <thead>
                        <tr style={{backgroundColor: '#1f5a85', color: 'white', height: '30px', textAlign: 'center'}}>
                            <th style={{border: '1px solid #1f5a85', borderColor: 'rgba(255,255,255,0.3)'}}>거래일자</th>
                            <th style={{border: '1px solid #1f5a85', borderColor: 'rgba(255,255,255,0.3)'}}>종별</th>
                            <th style={{border: '1px solid #1f5a85', borderColor: 'rgba(255,255,255,0.3)'}}>거래처</th>
                            <th style={{border: '1px solid #1f5a85', borderColor: 'rgba(255,255,255,0.3)'}}>제품명</th>
                            <th style={{border: '1px solid #1f5a85', borderColor: 'rgba(255,255,255,0.3)'}}>규격</th>
                            <th style={{border: '1px solid #1f5a85', borderColor: 'rgba(255,255,255,0.3)'}}>단가</th>
                            <th style={{border: '1px solid #1f5a85', borderColor: 'rgba(255,255,255,0.3)'}}>수량</th>
                            <th style={{border: '1px solid #1f5a85', borderColor: 'rgba(255,255,255,0.3)'}}>공급가액</th>
                            <th style={{border: '1px solid #1f5a85', borderColor: 'rgba(255,255,255,0.3)'}}>세액</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportItems.length === 0 ? (
                            <tr><td colSpan={9} style={{padding: '20px', textAlign: 'center', color: '#999', border: '1px solid #1f5a85'}}>데이터가 없습니다.</td></tr>
                        ) : (
                            reportItems.map((item, idx) => (
                                <tr key={idx} style={{height: '30px', textAlign: 'center'}}>
                                    <td style={{border: '1px solid #1f5a85', padding: '4px'}}>{item.date}</td>
                                    <td style={{border: '1px solid #1f5a85', padding: '4px'}}>{item.type}</td>
                                    <td style={{border: '1px solid #1f5a85', padding: '4px', textAlign: 'left', paddingLeft: '5px'}}>{item.clientName}</td>
                                    <td style={{border: '1px solid #1f5a85', padding: '4px', textAlign: 'left', paddingLeft: '5px'}}>{item.name}</td>
                                    <td style={{border: '1px solid #1f5a85', padding: '4px'}}>{item.spec}</td>
                                    <td style={{border: '1px solid #1f5a85', padding: '4px', textAlign: 'right', paddingRight: '5px'}}>{formatCurrency(item.unitPrice)}</td>
                                    <td style={{border: '1px solid #1f5a85', padding: '4px', textAlign: 'right', paddingRight: '5px'}}>{item.quantity.toLocaleString()}</td>
                                    <td style={{border: '1px solid #1f5a85', padding: '4px', textAlign: 'right', paddingRight: '5px'}}>{formatCurrency(item.supplyPrice)}</td>
                                    <td style={{border: '1px solid #1f5a85', padding: '4px', textAlign: 'right', paddingRight: '5px'}}>{formatCurrency(item.tax)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot>
                         <tr style={{backgroundColor: '#f8fafc', fontWeight: 'bold', height: '30px'}}>
                            <td colSpan={6} style={{textAlign: 'center', border: '1px solid #1f5a85', padding: '4px'}}>합 계</td>
                            <td style={{textAlign: 'right', paddingRight: '5px', border: '1px solid #1f5a85', padding: '4px'}}>{reportItems.reduce((acc: any, curr: any) => acc + curr.quantity, 0).toLocaleString()}</td>
                            <td style={{textAlign: 'right', paddingRight: '5px', border: '1px solid #1f5a85', padding: '4px'}}>{formatCurrency(reportItems.reduce((acc: any, curr: any) => acc + curr.supplyPrice, 0))}</td>
                            <td style={{textAlign: 'right', paddingRight: '5px', border: '1px solid #1f5a85', padding: '4px'}}>{formatCurrency(reportItems.reduce((acc: any, curr: any) => acc + curr.tax, 0))}</td>
                         </tr>
                    </tfoot>
                </table>
            </div>
        </div>
      );
  }

  // Default List View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">
            {mode === 'SALES' ? '매출 관리' : '견적 관리'}
        </h2>
        <div className="flex space-x-2">
            {mode === 'SALES' && (
                <>
                    <button onClick={handleNewTransaction} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all transform hover:-translate-y-0.5">
                        <Plus size={18} className="mr-2" /> 매출 등록
                    </button>
                    <button 
                        onClick={handleSummaryPrint}
                        className="flex items-center px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 shadow-sm transition-all transform hover:-translate-y-0.5"
                    >
                        <Printer size={18} className="mr-2" /> 납품서 인쇄
                    </button>
                    <button 
                        onClick={handleReportPrint}
                        className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 shadow-sm transition-all transform hover:-translate-y-0.5"
                    >
                        <ClipboardList size={18} className="mr-2" /> 매출보고서
                    </button>
                </>
            )}
            {mode === 'QUOTATION' && (
                <button onClick={handleNewTransaction} className="flex items-center px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 shadow-sm transition-all transform hover:-translate-y-0.5">
                    <FileText size={18} className="mr-2" /> 견적서 작성
                </button>
            )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col xl:flex-row gap-4 items-end">
            <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center">층별 구분</label>
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
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center"><User size={12} className="mr-1"/>거래처명</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="거래처 검색"
                            className="w-full p-2 pr-8 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={clientSearchTerm}
                            onChange={(e) => {
                                setClientSearchTerm(e.target.value);
                                setIsSearchDropdownOpen(true);
                            }}
                            onFocus={() => setIsSearchDropdownOpen(true)}
                            onClick={() => setIsSearchDropdownOpen(true)}
                        />
                        {clientSearchTerm ? (
                            <button 
                                onClick={() => {
                                    setClientSearchTerm('');
                                    setIsSearchDropdownOpen(true);
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
                        
                        {isSearchDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredSearchClients.length > 0 ? (
                                    filteredSearchClients.map((client) => (
                                        <div 
                                            key={client.id}
                                            className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                                            onClick={() => {
                                                setClientSearchTerm(client.name);
                                                setIsSearchDropdownOpen(false);
                                            }}
                                        >
                                            <span>{String(client.name)}</span>
                                            {isClientFromSheet && (
                                                <span className="text-xs text-slate-400 ml-2">{String(client.contactPerson || '')}</span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-3 py-2 text-sm text-slate-400">검색 결과가 없습니다.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div>
                     <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center"><Package size={12} className="mr-1"/>품명</label>
                     <div className="relative">
                        <input 
                            type="text" 
                            placeholder="품명 검색"
                            className="w-full p-2 pr-8 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                        />
                        {productSearchTerm && (
                            <button 
                                onClick={() => setProductSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                     </div>
                </div>
            </div>
            <div>
                 <button 
                    onClick={resetFilters}
                    className="flex items-center justify-center px-4 py-2 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm w-full xl:w-auto"
                >
                    <X size={16} className="mr-1" /> 초기화
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                    <th className="p-3 w-[100px]">날짜</th>
                    <th className="p-3 w-[80px]">구분</th>
                    <th className="p-3 w-[80px]">층별</th>
                    <th className="p-3 min-w-[200px]">거래처</th>
                    <th className="p-3 w-[150px] text-right">총액 (VAT포함)</th>
                    <th className="p-3 text-center w-[120px]">관리</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">
                        {transactions.length === 0 ? '등록된 데이터가 없습니다.' : '검색 결과가 없습니다.'}
                    </td></tr>
                ) : filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-600 whitespace-nowrap">{t.date}</td>
                        <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${t.type === TransactionType.QUOTATION ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                {t.type === TransactionType.QUOTATION ? '견적서' : '매출'}
                            </span>
                        </td>
                        <td className="p-3 text-slate-600">{t.floor || '-'}</td>
                        <td className="p-3 font-medium text-slate-900">
                            <div className="truncate max-w-[250px] font-bold" title={String(t.clientName)}>{t.clientName}</div>
                            {t.items.length > 0 && <span className="text-xs text-slate-400 block mt-1 truncate max-w-[300px]" title={t.items.map(i => String(i.name || '')).join(', ')}>{t.items.map(i => String(i.name || '')).join(', ')}</span>}
                        </td>
                        <td className="p-3 font-bold text-slate-700 whitespace-nowrap text-right">{formatCurrency(t.totalAmount)}원</td>
                        <td className="p-3 flex justify-center space-x-2">
                            <button onClick={() => handlePrint(t)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="인쇄">
                                <Printer size={18} />
                            </button>
                            <button onClick={() => generateAiEmail(t)} className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded" title="이메일 초안">
                                <Mail size={18} />
                            </button>
                            <button onClick={() => {
                                if(confirm('삭제하시겠습니까?')) {
                                    StorageService.deleteTransaction(t.id);
                                    loadData(false);
                                }
                            }} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded" title="삭제">
                                <Trash2 size={18} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
            {filteredTransactions.length > 0 && (
                <tfoot className="bg-slate-50 font-bold text-slate-700">
                    <tr>
                        <td colSpan={4} className="p-3 text-right">
                           <div className="flex items-center justify-end space-x-2">
                             <span>검색 합계 ({filteredTransactions.length}건):</span>
                           </div>
                        </td>
                        <td className="p-3 text-right text-blue-600 font-bold">
                            {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.totalAmount, 0))}원
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            )}
        </table>
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-fadeIn">
                <h3 className="text-xl font-bold mb-4">AI 이메일 초안</h3>
                <div className="mb-2 text-sm text-slate-600 flex items-center">
                   <Mail size={14} className="mr-2" />
                   받는 사람: <input 
                      type="text" 
                      className="ml-2 border-b border-slate-300 focus:border-blue-500 outline-none w-64"
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(e.target.value)}
                      placeholder="이메일을 입력하세요"
                   />
                </div>
                <textarea 
                    className="w-full h-64 border rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-purple-500 outline-none"
                    value={emailDraft}
                    readOnly
                ></textarea>
                <div className="flex justify-end space-x-2">
                    <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">닫기</button>
                    {targetEmail && (
                        <a 
                           href={`mailto:${targetEmail}?subject=${encodeURIComponent("정심작업장 관련 서류 송부")}&body=${encodeURIComponent(emailDraft)}`}
                           className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700"
                        >
                           <Mail size={16} className="mr-2" /> 메일 앱 열기
                        </a>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;