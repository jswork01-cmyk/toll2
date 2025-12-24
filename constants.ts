import { CompanyInfo } from './types';

// [중요] 여기에 배포된 구글 스크립트 웹앱 URL을 입력하면, 브라우저 캐시가 지워져도 항상 이 주소로 연결됩니다.
// 예: "https://script.google.com/macros/s/AKfycbx.../exec"
export const DEFAULT_SHEET_URL = "https://script.google.com/macros/s/AKfycbz_z2OfwL-KzehY4XwTvGYaWVJjVOjCieP7jZA8Z9aIiSZLdExZS8kFY2Xvds1EhDJ8Mg/exec"; 

// 구글 드라이브 직인 이미지
const GOOGLE_DRIVE_STAMP = "https://drive.google.com/uc?export=view&id=1A-PKoQ2NbX8aaO6V35P-KdlFIHadPm6t";

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "정심작업장",
  registrationNumber: "313-82-67320",
  ownerName: "권오건",
  address: "충남 보령시 주교면 보령북로 404",
  phone: "041-931-1711",
  email: "jswork@jeongsim.or.kr",
  productSheetUrl: DEFAULT_SHEET_URL,
  productSheetName: "info",
  companySheetName: "company",
  employeeSheetName: "employee",
  officeSheetName: "office",
  stampImage: GOOGLE_DRIVE_STAMP, // 구글 드라이브 이미지 적용
  googleScriptUrl: DEFAULT_SHEET_URL // 기본 URL 적용
};

export const MOCK_CLIENTS = [
  {
    id: 'c1',
    name: '(주)한국정밀',
    registrationNumber: '101-81-12345',
    ownerName: '김철수',
    address: '서울시 강남구 테헤란로 123',
    contactPerson: '박대리',
    email: 'contact@hankook.com',
    phone: '010-1111-2222'
  },
  {
    id: 'c2',
    name: '성수디자인',
    registrationNumber: '202-82-67890',
    ownerName: '이영희',
    address: '서울시 성동구 아차산로 55',
    contactPerson: '최과장',
    email: 'design@seongsu.com',
    phone: '010-3333-4444'
  }
];

export const MOCK_TRANSACTIONS = [
  {
    id: 't1',
    date: '2023-10-15',
    type: 'STATEMENT',
    clientId: 'c1',
    clientName: '(주)한국정밀',
    items: [
      { productId: 'p1', name: '부품 조립 A', spec: 'EA', unit: '개', quantity: 1000, unitPrice: 150, supplyPrice: 150000, tax: 15000 }
    ],
    totalSupplyPrice: 150000,
    totalTax: 15000,
    totalAmount: 165000,
    isPaid: true
  },
  {
    id: 't2',
    date: '2023-10-20',
    type: 'STATEMENT',
    clientId: 'c2',
    clientName: '성수디자인',
    items: [
      { productId: 'p2', name: '패키지 포장', spec: 'BOX', unit: '박스', quantity: 50, unitPrice: 5000, supplyPrice: 250000, tax: 25000 }
    ],
    totalSupplyPrice: 250000,
    totalTax: 25000,
    totalAmount: 275000,
    isPaid: true
  },
  {
    id: 't3',
    date: '2023-11-05',
    type: 'STATEMENT',
    clientId: 'c1',
    clientName: '(주)한국정밀',
    items: [
      { productId: 'p1', name: '부품 조립 A', spec: 'EA', unit: '개', quantity: 2000, unitPrice: 150, supplyPrice: 300000, tax: 30000 }
    ],
    totalSupplyPrice: 300000,
    totalTax: 30000,
    totalAmount: 330000,
    isPaid: false
  }
];