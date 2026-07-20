import * as xlsx from 'xlsx';
import type { Employee } from '../types';

export const parseEmployeeExcel = async (file: File): Promise<Employee[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("File is empty");

        const workbook = xlsx.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse as a 2D array of rows
        const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length === 0) {
          resolve([]);
          return;
        }

        let nameColIndex = 0;
        let emailColIndex = 1;
        let startIndex = 0;

        // Check if the first row is a header row
        const firstRow = rows[0];
        const hasHeaders = firstRow.some(cell => {
          const val = String(cell).toLowerCase();
          return val.includes('name') || val.includes('email') || val.includes('role') || val.includes('id');
        });

        if (hasHeaders) {
          // Identify columns from header
          const nameIdx = firstRow.findIndex(cell => String(cell).toLowerCase().includes('name'));
          const emailIdx = firstRow.findIndex(cell => String(cell).toLowerCase().includes('email'));
          
          if (nameIdx !== -1) nameColIndex = nameIdx;
          if (emailIdx !== -1) emailColIndex = emailIdx;
          
          startIndex = 1; // skip header row
        } else {
          // No headers: auto-detect name and email columns
          // Email column is usually the one containing '@'
          const emailIdx = firstRow.findIndex(cell => String(cell).includes('@'));
          if (emailIdx !== -1) {
            emailColIndex = emailIdx;
            nameColIndex = emailIdx === 0 ? 1 : 0;
          }
          startIndex = 0; // process from first row
        }

        const employees: Employee[] = [];
        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const nameVal = row[nameColIndex] ? String(row[nameColIndex]).trim() : '';
          const emailVal = row[emailColIndex] ? String(row[emailColIndex]).trim() : '';

          if (nameVal && nameVal !== 'Unknown') {
            employees.push({
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
              name: nameVal,
              email: emailVal || undefined
            });
          }
        }

        resolve(employees);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);

    reader.readAsBinaryString(file);
  });
};
