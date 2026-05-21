import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

function readWorkbook(filePath, label, maxRowsPerSheet = 999999) {
  console.log(`\n${'#'.repeat(80)}`);
  console.log(`# FILE: ${label}`);
  console.log(`# PATH: ${filePath}`);
  console.log(`${'#'.repeat(80)}`);
  
  try {
    const workbook = XLSX.readFile(filePath);
    console.log(`Sheets: ${JSON.stringify(workbook.SheetNames)}`);
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const ref = sheet['!ref'] || 'A1';
      const range = XLSX.utils.decode_range(ref);
      const rowCount = range.e.r - range.s.r + 1;
      const colCount = range.e.c - range.s.c + 1;
      
      console.log(`\n--- SHEET: "${sheetName}" | Rows: ${rowCount} | Cols: ${colCount} | Ref: ${ref} ---`);
      
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const printRows = Math.min(rawData.length, maxRowsPerSheet);
      
      for (let i = 0; i < printRows; i++) {
        const row = rawData[i];
        if (row.every(cell => cell === '' || cell === null || cell === undefined)) continue;
        console.log(`  R${i + 1}: ${JSON.stringify(row)}`);
      }
      if (rawData.length > maxRowsPerSheet) {
        console.log(`  ... (${rawData.length - maxRowsPerSheet} more rows truncated)`);
      }
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
}

// 1. Supply_Lender_BRE - FULL (critical for lender knockout rules)
readWorkbook('C:\\Users\\priyam\\Downloads\\Supply_Lender_BRE.xlsx', 'Supply_Lender_BRE');

// 2. Lender_Institution_Master - structure + samples
readWorkbook('C:\\Users\\priyam\\Downloads\\Lender_Institution_Master.xlsx', 'Lender_Institution_Master', 15);

// 3. EduLoans_BRE_DocChecker_Master - FULL (likely has BRE rules)
readWorkbook('C:\\Users\\priyam\\Downloads\\EduLoans_BRE_DocChecker_Master.xlsx', 'EduLoans_BRE_DocChecker_Master');

// 4. University_Level_data
readWorkbook('C:\\Users\\priyam\\Downloads\\University_Level_data.xlsx', 'University_Level_data', 20);

// 5. University list
readWorkbook('C:\\Users\\priyam\\Downloads\\University list.xlsx', 'University list', 20);

// 6. Eduloans- test.xlsx
readWorkbook('C:\\Users\\priyam\\Downloads\\Eduloans- test.xlsx', 'Eduloans-test', 30);

// 7. eduloans_flow_light.xlsx
readWorkbook('C:\\Users\\priyam\\Downloads\\eduloans_flow_light.xlsx', 'eduloans_flow_light');

// 8. sib university permium.xlsx
readWorkbook('C:\\Users\\priyam\\Downloads\\sib university permium.xlsx', 'sib_university_premium', 20);

// 9. eduloans_resp.xlsx
readWorkbook('C:\\Users\\priyam\\Downloads\\eduloans_resp.xlsx', 'eduloans_resp', 20);
