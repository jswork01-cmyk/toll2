
import { Client, Transaction, CompanyInfo, ProductItem, Employee } from '../types';
import { MOCK_CLIENTS, MOCK_TRANSACTIONS, DEFAULT_COMPANY_INFO, DEFAULT_SHEET_URL } from '../constants';

const STORAGE_KEYS = {
  CLIENTS: 'jeongsim_clients',
  TRANSACTIONS: 'jeongsim_transactions',
  COMPANY_INFO: 'jeongsim_company_info',
  PRODUCTS: 'jeongsim_products',
  EMPLOYEES: 'jeongsim_employees',
  ADMIN_SESSION: 'jeongsim_admin_session'
};

export const StorageService = {
  // Admin Session
  isAdmin: (): boolean => {
    return sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true';
  },

  setAdmin: (status: boolean) => {
    if (status) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    }
  },

  getClients: (): Client[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return data ? JSON.parse(data) : MOCK_CLIENTS;
  },

  saveClient: (client: Client) => {
    const clients = StorageService.getClients();
    const index = clients.findIndex(c => c.id === client.id);
    if (index >= 0) {
      clients[index] = client;
    } else {
      clients.push(client);
    }
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  },

  saveClients: (clients: Client[]) => {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  },

  deleteClient: (id: string) => {
    const clients = StorageService.getClients().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  },

  // Products
  getProducts: (): ProductItem[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },

  saveProducts: (products: ProductItem[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  // Employees
  getEmployees: (): Employee[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : [];
  },

  saveEmployees: (employees: Employee[]) => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  },

  // Transactions
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const transactions = data ? JSON.parse(data) : MOCK_TRANSACTIONS;
    // Sort by date desc
    return (transactions as Transaction[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  saveTransaction: (transaction: Transaction) => {
    const transactions = StorageService.getTransactions();
    const index = transactions.findIndex(t => t.id === transaction.id);
    if (index >= 0) {
      transactions[index] = transaction;
    } else {
      transactions.push(transaction);
    }
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  saveTransactions: (transactions: Transaction[]) => {
    // Sort desc by date
    const sorted = transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(sorted));
  },

  deleteTransaction: (id: string) => {
    const transactions = StorageService.getTransactions().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  // Company Info
  getCompanyInfo: (): CompanyInfo => {
    const data = localStorage.getItem(STORAGE_KEYS.COMPANY_INFO);
    let info = data ? JSON.parse(data) : DEFAULT_COMPANY_INFO;
    
    // Fallback: If localStorage has no URL but DEFAULT_SHEET_URL exists in constants, use it.
    if (!info.googleScriptUrl && DEFAULT_SHEET_URL) {
      info.googleScriptUrl = DEFAULT_SHEET_URL;
    }
    
    return info;
  },

  saveCompanyInfo: (info: CompanyInfo) => {
    localStorage.setItem(STORAGE_KEYS.COMPANY_INFO, JSON.stringify(info));
  },

  // Helper for dashboard
  getDashboardStats: () => {
    const transactions = StorageService.getTransactions();
    const totalSales = transactions.reduce((sum, t) => sum + (t.type === 'STATEMENT' ? t.totalAmount : 0), 0);
    
    // Group by month (last 6 months)
    const monthlySalesMap = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type !== 'STATEMENT') return;
      const month = t.date.substring(0, 7); // YYYY-MM
      monthlySalesMap.set(month, (monthlySalesMap.get(month) || 0) + t.totalAmount);
    });
    
    const monthlySales = Array.from(monthlySalesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-6);

    // Group by client
    const clientSalesMap = new Map<string, number>();
    transactions.forEach(t => {
      if (t.type !== 'STATEMENT') return;
      clientSalesMap.set(t.clientName, (clientSalesMap.get(t.clientName) || 0) + t.totalAmount);
    });

    const topClients = Array.from(clientSalesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
      
    const clientCount = clientSalesMap.size;

    return { totalSales, monthlySales, topClients, clientCount };
  }
};
