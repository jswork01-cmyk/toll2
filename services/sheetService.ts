import { ProductItem, Client, Employee, CompanyInfo, Transaction, TransactionType } from '../types';

// Helper to convert Google Drive URL to direct image link
// Improved to handle various formats and use the thumbnail endpoint for reliability
const convertToDirectLink = (url: string): string => {
  if (!url) return '';
  try {
    const cleanUrl = url.trim();
    
    // If it's already a direct image link (ends with extension), return as is
    if (cleanUrl.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i)) {
        return cleanUrl;
    }

    // Check if it's a Google Drive link
    if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com')) {
      let id = '';
      
      // Strategy 1: Match /d/ID pattern (common in sharing links)
      // e.g. https://drive.google.com/file/d/123456.../view
      const matchD = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (matchD && matchD[1]) {
        id = matchD[1];
      }
      
      // Strategy 2: Match id=ID pattern (legacy or param based)
      // e.g. https://drive.google.com/open?id=123456...
      if (!id) {
          const matchId = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (matchId && matchId[1]) {
            id = matchId[1];
          }
      }

      if (id) {
        // Use the 'thumbnail' endpoint with a large size (w1000).
        // This is more reliable than 'uc?export=view' for embedded images 
        // because it avoids the "File is too large for virus scan" redirect page 
        // which breaks <img> tags.
        return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
      }
    }
    return cleanUrl;
  } catch (e) {
    return url;
  }
};

export const SheetService = {
  // Test the connection to the script
  testConnection: async (scriptUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(`${scriptUrl}?action=test`);
      const data = await response.json();
      return data.status === 'success';
    } catch (e) {
      console.error("Connection test failed:", e);
      return false;
    }
  },

  fetchProducts: async (scriptUrl: string, sheetName: string = 'info'): Promise<ProductItem[]> => {
    if (!scriptUrl) return [];
    
    try {
      const response = await fetch(`${scriptUrl}?sheetName=${encodeURIComponent(sheetName)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const rows: any[][] = await response.json(); // Expecting 2D array [row][col]
      if (!Array.isArray(rows) || rows.length === 0) return [];

      // rows contains data rows (header is removed by script or we handle it? 
      // Strategy: Script should return data rows. If script returns all, we slice.
      // Current Unified Script in Settings returns data rows (slice(1)).
      
      return rows.map((cols, index) => {
        // info sheet: [Name, Spec, Unit, Price]
        return {
          id: `sheet-prod-${index}`,
          name: String(cols[0] || ''),
          spec: String(cols[1] || ''),
          unit: String(cols[2] || ''),
          unitPrice: Number(String(cols[3]).replace(/,/g, '')) || 0
        };
      }).filter(item => item.name);
    } catch (error) {
      console.error("Failed to fetch product sheet via script:", error);
      return [];
    }
  },

  fetchClients: async (scriptUrl: string, sheetName: string = 'company'): Promise<Client[]> => {
    if (!scriptUrl) return [];

    try {
      const response = await fetch(`${scriptUrl}?sheetName=${encodeURIComponent(sheetName)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const rows: any[][] = await response.json();
      if (!Array.isArray(rows)) return [];

      return rows.map((cols, index) => {
        // company sheet expected columns:
        // 0: Name, 1: RegNum, 2: Owner, 3: Address, 4: Contact, 5: Email, 6: Phone, 7: Note
        return {
          id: `sheet-client-${index}`,
          name: String(cols[0] || ''),
          registrationNumber: String(cols[1] || ''),
          ownerName: String(cols[2] || ''),
          address: String(cols[3] || ''),
          contactPerson: String(cols[4] || ''),
          email: String(cols[5] || ''),
          phone: String(cols[6] || ''),
          note: String(cols[7] || '')
        };
      }).filter(client => client.name);
    } catch (error) {
      console.error("Failed to fetch client sheet via script:", error);
      return [];
    }
  },

  fetchEmployees: async (scriptUrl: string, sheetName: string = 'employee'): Promise<Employee[]> => {
    if (!scriptUrl) return [];

    try {
      const response = await fetch(`${scriptUrl}?sheetName=${encodeURIComponent(sheetName)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const rows: any[][] = await response.json();
      if (!Array.isArray(rows)) return [];

      return rows.map((cols, index) => {
        // employee sheet expected columns:
        // 0: Name, 1: Position, 2: Email, 3: Phone, 4: SignatureImage (URL)
        return {
          id: `sheet-emp-${index}`,
          name: String(cols[0] || ''),
          position: String(cols[1] || ''),
          email: String(cols[2] || ''),
          phone: String(cols[3] || ''),
          signatureImage: convertToDirectLink(String(cols[4] || '')) 
        };
      }).filter(emp => emp.name);
    } catch (error) {
      console.error("Failed to fetch employee sheet via script:", error);
      return [];
    }
  },

  fetchCompanyInfo: async (scriptUrl: string, sheetName: string = 'office'): Promise<Partial<CompanyInfo> | null> => {
    if (!scriptUrl) return null;

    try {
      const response = await fetch(`${scriptUrl}?sheetName=${encodeURIComponent(sheetName)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const rows: any[][] = await response.json();
      
      // Expecting at least 1 row of data
      if (!Array.isArray(rows) || rows.length < 1) return null;
      
      const cols = rows[0]; // Take the first data row
      
      // office sheet expected columns:
      // 0: Name, 1: RegNum, 2: Owner, 3: Address, 4: Phone, 5: Email, 6: Fax, 7: BankInfo, 8: StampImage (I2)
      return {
        name: String(cols[0] || ''),
        registrationNumber: String(cols[1] || ''),
        ownerName: String(cols[2] || ''),
        address: String(cols[3] || ''),
        phone: String(cols[4] || ''),
        email: String(cols[5] || ''),
        fax: String(cols[6] || ''),
        bankInfo: String(cols[7] || ''),
        stampImage: convertToDirectLink(String(cols[8] || ''))
      };

    } catch (error) {
      console.error("Failed to fetch office sheet via script:", error);
      return null;
    }
  },

  fetchTransactions: async (scriptUrl: string, sheetName: string = 'data'): Promise<Transaction[]> => {
    if (!scriptUrl) return [];
    try {
      const response = await fetch(`${scriptUrl}?sheetName=${encodeURIComponent(sheetName)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const rows: any[][] = await response.json();
      if (!Array.isArray(rows) || rows.length === 0) return [];

      const transactionsMap = new Map<string, Transaction>();

      rows.forEach((row, idx) => {
        // Updated row structure based on new doPost logic:
        // 0:ID, 1:Date, 2:Type, 3:Floor, 4:Client, 5:ItemName, 6:Spec, 7:Unit, 8:Qty, 9:Price, 10:Supply, 11:Tax, 12:Total, 13:Memo, 14:Timestamp
        
        // Handle ID: Use column 0, or generate fallback if empty
        let id = String(row[0] || '').trim();
        const clientName = String(row[4] || '').trim();
        
        // Skip if absolutely no data
        if (!id && !clientName) return;

        if (!id) {
            id = `gen-id-${idx}`;
        }

        // Handle Date
        let rawDate = row[1];
        let dateStr = String(rawDate || '');
        
        if (dateStr.includes('T') && dateStr.endsWith('Z')) {
            try {
                const dateObj = new Date(dateStr);
                // Add 9 hours (KST offset) to UTC time to recover the intended date
                const kstOffset = 9 * 60 * 60 * 1000;
                const kstDate = new Date(dateObj.getTime() + kstOffset);
                
                const y = kstDate.getUTCFullYear();
                const m = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
                const d = String(kstDate.getUTCDate()).padStart(2, '0');
                dateStr = `${y}-${m}-${d}`;
            } catch (e) {
                dateStr = dateStr.split('T')[0];
            }
        } else if (dateStr.includes('T')) {
             dateStr = dateStr.split('T')[0];
        }

        // --- Floor (Column D) Normalization Logic (Moved UP) ---
        let floorRaw = String(row[3] || '').trim();
        let floor = floorRaw;
        
        // Normalize floor to handle "1F", "1 층", "1", etc.
        const floorClean = floorRaw.replace(/\s+/g, '').toUpperCase();
        if (floorClean === '1' || floorClean === '1F' || floorClean.includes('1층')) {
            floor = '1층';
        } else if (floorClean === '2' || floorClean === '2F' || floorClean.includes('2층')) {
            floor = '2층';
        }
        // --------------------------------------------

        // CRITICAL FIX: Prevent merging unrelated rows
        if (transactionsMap.has(id)) {
            const existing = transactionsMap.get(id);
            if (existing) {
                const isDifferentClient = existing.clientName !== clientName;
                const isDifferentDate = existing.date !== dateStr;
                // Split if explicit floor is provided and different from existing
                // If floor is empty, it's considered same transaction item
                const isDifferentFloor = (floor !== '') && (existing.floor !== '') && (floor !== existing.floor);

                if (isDifferentClient || isDifferentDate || isDifferentFloor) {
                    id = `${id}_split_${idx}`;
                }
            }
        }
        
        const memo = String(row[13] || '');

        if (!transactionsMap.has(id)) {
             transactionsMap.set(id, {
                id: id,
                date: dateStr,
                type: String(row[2]) === '견적서' ? TransactionType.QUOTATION : TransactionType.STATEMENT,
                clientId: '', 
                clientName: clientName,
                items: [],
                totalSupplyPrice: 0, 
                totalTax: 0,
                totalAmount: 0,
                isPaid: false, 
                memo: memo,
                floor: floor
             });
        } else {
             // If existing transaction has no floor but this row does (multi-item transaction), update it.
             // This ensures that if the user only entered the floor on the 2nd row of a group, we capture it.
             const existing = transactionsMap.get(id);
             if (existing && !existing.floor && floor) {
                 existing.floor = floor;
             }
        }

        const transaction = transactionsMap.get(id)!;
        
        // Add Item if name exists
        if (row[5]) { 
            transaction.items.push({
                productId: `sheet-item-${id}-${transaction.items.length}`,
                name: String(row[5]),
                spec: String(row[6] || ''),
                unit: String(row[7] || ''),
                quantity: Number(String(row[8]).replace(/,/g, '')) || 0,
                unitPrice: Number(String(row[9]).replace(/,/g, '')) || 0,
                supplyPrice: Number(String(row[10]).replace(/,/g, '')) || 0,
                tax: Number(String(row[11]).replace(/,/g, '')) || 0
            });
        }
      });

      // Recalculate totals based on items to ensure consistency
      return Array.from(transactionsMap.values()).map(t => {
          const supply = t.items.reduce((sum, i) => sum + i.supplyPrice, 0);
          const tax = t.items.reduce((sum, i) => sum + i.tax, 0);
          return {
              ...t,
              totalSupplyPrice: supply,
              totalTax: tax,
              totalAmount: supply + tax
          };
      });

    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      return [];
    }
  },

  saveTransaction: async (scriptUrl: string, transaction: Transaction): Promise<boolean> => {
    try {
      // Use no-cors mode to bypass CORS restriction on Google Apps Script for POST
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'text/plain', // Avoids CORS preflight
        },
        body: JSON.stringify(transaction),
      });
      return true;
    } catch (error) {
      console.error("Failed to save to sheet", error);
      return false;
    }
  }
};