
export interface Client {
  id: string;
  name: string;
  registrationNumber: string; // 사업자등록번호
  ownerName: string; // 대표자명
  address: string;
  contactPerson: string;
  email: string;
  phone: string;
  note?: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string; // 직급
  email: string;
  phone: string;
  signatureImage?: string; // 서명 이미지 URL (Google Sheet E열)
}

export interface ProductItem {
  id: string;
  name: string; // 품목
  spec: string; // 규격
  unit: string; // 단위
  unitPrice: number; // 단가
}

export interface TransactionItem {
  productId: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  supplyPrice: number; // 공급가액
  tax: number; // 세액
}

export enum TransactionType {
  QUOTATION = 'QUOTATION', // 견적서
  STATEMENT = 'STATEMENT', // 거래명세서
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  clientId: string;
  clientName: string;
  contactPerson?: string; // 담당자
  floor?: string; // 1층, 2층 구분
  items: TransactionItem[];
  totalSupplyPrice: number;
  totalTax: number;
  totalAmount: number;
  isPaid: boolean;
  memo?: string;
}

export interface CompanyInfo {
  name: string;
  registrationNumber: string;
  ownerName: string; // 대표자명
  address: string;
  phone: string;
  fax?: string; // Fax number
  email: string;
  bankInfo?: string; // Bank Account Info
  stampImage?: string; // URL or Base64
  productSheetUrl?: string; // (Legacy) Google Sheet Full URL
  productSheetName?: string; // Sheet Name for products (default: info)
  companySheetName?: string; // Sheet Name for companies (default: company)
  employeeSheetName?: string; // Sheet Name for employees (default: employee)
  officeSheetName?: string; // Sheet Name for own office info (default: office)
  googleScriptUrl?: string; // Unified Web App URL for reading & writing
}

export interface DashboardStats {
  totalSales: number;
  monthlySales: { name: string; value: number }[];
  topClients: { name: string; value: number }[];
  clientCount: number;
}
