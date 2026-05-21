import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const DATA_DIR = 'C:\\Users\\priyam\\Documents\\antigravity\\blissful-mendeleev\\src\\data';
mkdirSync(DATA_DIR, { recursive: true });

function parseAmount(val) {
  if (val === null || val === undefined || val === '' || val === 'NA') return null;
  let s = val.toString().trim().replace(/,/g, '').toLowerCase();
  if (s === 'na' || s === '') return null;
  
  // Clean whitespace inside string like "7.5 L" -> "7.5l", "3Cr" -> "3cr"
  s = s.replace(/\s+/g, '');
  
  if (s.endsWith('k')) {
    return parseFloat(s) * 1000;
  }
  if (s.endsWith('l')) {
    return parseFloat(s) * 100000;
  }
  if (s.endsWith('cr') || s.endsWith('crs') || s.endsWith('crore') || s.includes('crore')) {
    const numericPart = s.replace(/crs?|crores?|/g, '');
    return parseFloat(numericPart) * 10000000;
  }
  
  const parsed = parseFloat(s);
  return isNaN(parsed) ? null : parsed;
}

function parsePercentage(val) {
  if (val === null || val === undefined || val === '') return 50;
  const num = parseFloat(val);
  if (isNaN(num)) return 50;
  if (num > 0 && num <= 1) return num * 100;
  return num;
}

function parseROI(val) {
  if (!val || val === 'NA' || val === '') return null;
  const clean = val.toString().replace(/%/g, '').replace(/\s+/g, '');
  const parts = clean.split('-');
  if (parts.length < 2) return null;
  let min = parseFloat(parts[0]);
  let max = parseFloat(parts[1]);
  if (isNaN(min) || isNaN(max)) return null;
  if (min > 50) min = min / 10;
  if (max > 50) max = max / 10;
  return { min, max };
}

function parseAgeRange(val) {
  if (!val || val === 'NA') return { min: 16, max: 35 };
  const parts = val.toString().split('-');
  if (parts.length < 2) return { min: 16, max: 35 };
  const min = parseInt(parts[0], 10);
  const max = parseInt(parts[1], 10);
  return { min: isNaN(min) ? 16 : min, max: isNaN(max) ? 35 : max };
}

function parseList(val) {
  if (!val || val === 'NA' || val === 'None') return [];
  // Standardize delimiters
  const clean = val.toString().replace(/and/g, ',').replace(/\//g, ',');
  return clean.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

// ----------------------------------------------------------------------------
// 1. EXTRACT LENDERS DATA
// ----------------------------------------------------------------------------
console.log('Extracting lenders data from Supply_Lender_BRE.xlsx...');
const lenderWorkbook = XLSX.readFile('C:\\Users\\priyam\\Downloads\\Supply_Lender_BRE.xlsx');
const lenderSheet = lenderWorkbook.Sheets['Sheet1'];
const lenderRows = XLSX.utils.sheet_to_json(lenderSheet, { header: 1, defval: '' });

// Lender columns map
const lenderColumns = [
  { index: 1, name: 'PNB Bank', type: 'PSU' },
  { index: 2, name: 'SBI (Delhi Code)', type: 'PSU' },
  { index: 3, name: 'Bank Of India', type: 'PSU' },
  { index: 4, name: 'Canara Bank', type: 'PSU' },
  { index: 5, name: 'BOB', type: 'PSU' },
  { index: 6, name: 'Axis Bank', type: 'Private' },
  { index: 7, name: 'ICICI Bank', type: 'Private' },
  { index: 8, name: 'IDFC Bank', type: 'Private' },
  { index: 9, name: 'Credila', type: 'NBFC' },
  { index: 10, name: 'Avanse', type: 'NBFC' },
  { index: 11, name: 'Auxilo', type: 'NBFC' },
  { index: 12, name: 'Gyandhan', type: 'NBFC' }
];

const lendersJSON = [];

// Helper to look up a row value by row header
function getValueByLabel(label, colIdx) {
  const row = lenderRows.find(r => r[0] && r[0].toString().toLowerCase().includes(label.toLowerCase()));
  if (!row) return '';
  return row[colIdx];
}

// Specifically grab rows where sublabels are nested
function getValueBySectionAndLabel(section, label, colIdx) {
  let inSection = false;
  for (let i = 0; i < lenderRows.length; i++) {
    const row = lenderRows[i];
    const col0 = row[0] ? row[0].toString().toLowerCase() : '';
    if (col0.includes(section.toLowerCase())) {
      inSection = true;
      continue;
    }
    if (inSection && col0.includes(label.toLowerCase())) {
      return row[colIdx];
    }
    // If we hit another main capitalized section, stop (optional)
    if (inSection && row[0] && row[0].toString() === row[0].toString().toUpperCase() && col0.length > 5 && !col0.includes(label.toLowerCase())) {
      // Wait, let's keep it simple and just scan
    }
  }
  return '';
}

for (const col of lenderColumns) {
  const colIdx = col.index;
  
  const payoutVal = getValueByLabel('Payout of every tranche', colIdx);
  const payoutStr = typeof payoutVal === 'number' ? `${(payoutVal * 100).toFixed(2)}%` : payoutVal.toString();

  // Marks min
  const marks10th = parsePercentage(getValueBySectionAndLabel('Marks of Students', 'Class X', colIdx));
  const marks12th = parsePercentage(getValueBySectionAndLabel('Marks of Students', 'Class XII', colIdx));
  const marksGrad = parsePercentage(getValueBySectionAndLabel('Marks of Students', 'Grad', colIdx));

  // Security Accepted & Loan To Value
  const fdLtv = parseFloat(getValueBySectionAndLabel('Security Accepted', 'FD', colIdx)) || 1.0;
  const resLtv = parseFloat(getValueBySectionAndLabel('Security Accepted', 'Residential', colIdx)) || 0.8;
  const commLtv = parseFloat(getValueBySectionAndLabel('Security Accepted', 'Commercial', colIdx)) || 0.6;

  // Min/Max loan amounts
  const minSecured = parseAmount(getValueBySectionAndLabel('Minimum Loan Amount', 'Secured', colIdx));
  const minUnsecured = parseAmount(getValueBySectionAndLabel('Minimum Loan Amount', 'Unsecured', colIdx));
  const maxSecured = parseAmount(getValueBySectionAndLabel('Maximum Loan Amount', 'Secured', colIdx));
  const maxUnsecured = parseAmount(getValueBySectionAndLabel('Maximum Loan Amount', 'Unsecured', colIdx));

  // Age ranges
  const studentAgeRange = parseAgeRange(getValueByLabel('Student Age', colIdx));
  const coapMaxAge = parseInt(getValueByLabel('Co-applicant (Max Age', colIdx)) || 60;

  // Income thresholds
  const minSalary = parseAmount(getValueByLabel('Minimum Salary', colIdx)) || 15000;
  const minItr = parseAmount(getValueByLabel('Minimum ITR', colIdx)) || 300000;
  const cibilMin = parseCIBIL(getValueByLabel('CIBIL Score', colIdx));

  // Allowed co-applicants
  const coApplicantsVal = getValueByLabel('Co-Applicant', colIdx);
  const coApplicantAllowed = parseList(coApplicantsVal);

  // ROI Range
  const roiSecured = parseROI(getValueBySectionAndLabel('ROI Range', 'Secured Loan', colIdx));
  const roiUnsecured = parseROI(getValueBySectionAndLabel('ROI Range', 'Unsecured Loan', colIdx));

  // Blocked lists
  const blockedCountriesRaw = getValueByLabel('Countries Not covered', colIdx);
  const blockedCountries = parseList(blockedCountriesRaw);

  const blockedCitiesRaw = getValueByLabel('Ciites not covered', colIdx);
  const regionsBlocked = parseList(blockedCitiesRaw);

  // If Avanse, ensure Kerala is explicitly added to blocked regions
  if (col.name === 'Avanse' && !regionsBlocked.some(r => r.toLowerCase().includes('kerala'))) {
    regionsBlocked.push('Kerala');
  }

  lendersJSON.push({
    name: col.name,
    type: col.type,
    code: getValueByLabel('Code', colIdx).toString().trim(),
    payout: payoutStr,
    courses: getValueByLabel('Courses covered', colIdx).toString().trim(),
    roi: {
      secured: roiSecured,
      unsecured: roiUnsecured
    },
    pf: getValueByLabel('PF', colIdx).toString().trim(),
    tenure_years: 15, // standard
    moratorium: getValueByLabel('Moratorium', colIdx).toString().trim(),
    co_applicant_allowed: coApplicantAllowed,
    student_age: studentAgeRange,
    marks_min: {
      '10th': marks10th,
      '12th': marks12th,
      graduation: marksGrad
    },
    co_applicant_max_age: coapMaxAge,
    min_salary: minSalary,
    min_itr: minItr,
    cibil_min: cibilMin,
    dpd_allowed: false,
    loan_amount: {
      secured: minSecured ? { min: minSecured, max: maxSecured || 100000000 } : null,
      unsecured: minUnsecured ? { min: minUnsecured, max: maxUnsecured || 100000000 } : null
    },
    ltv: {
      fd: fdLtv,
      residential: resLtv,
      commercial: commLtv
    },
    countries_covered: getValueByLabel('Countries covered', colIdx).toString().trim(),
    countries_blocked: blockedCountries,
    regions_blocked: regionsBlocked,
    institution_list_type: getValueByLabel('List of colleges', colIdx).toString().trim()
  });
}

function parseCIBIL(val) {
  if (val === null || val === undefined || val === '') return 680;
  const num = parseInt(val.toString().trim(), 10);
  return isNaN(num) ? 680 : num;
}

writeFileSync(join(DATA_DIR, 'lenders.json'), JSON.stringify(lendersJSON, null, 2));
console.log('lenders.json written successfully.');

// ----------------------------------------------------------------------------
// 2. EXTRACT UNIVERSITIES DATA
// ----------------------------------------------------------------------------
console.log('Extracting universities data from University_Level_data.xlsx...');
const uniWorkbook = XLSX.readFile('C:\\Users\\priyam\\Downloads\\University_Level_data.xlsx');
const uniSheet = uniWorkbook.Sheets['Recovered_Sheet1'];
const uniRows = XLSX.utils.sheet_to_json(uniSheet);

const universitiesJSON = uniRows.map(row => {
  const rankStr = row['Global Rank'] ? row['Global Rank'].toString().replace('=', '').trim() : '9999';
  const rank = parseInt(rankStr, 10) || 9999;
  
  const score = parseFloat(row['Score']) || 0;
  const name = row['University_Name'] ? row['University_Name'].toString().trim() : '';
  
  const countryRaw = row['Country'] ? row['Country'].toString().trim() : '';
  const commaIdx = countryRaw.indexOf(',');
  let city = '';
  let country = countryRaw;
  
  if (commaIdx !== -1) {
    city = countryRaw.substring(0, commaIdx).trim();
    country = countryRaw.substring(commaIdx + 1).trim().replace(/\s+/g, ' ');
  }
  
  let grade = 'D';
  let points = 40;
  
  if (rank >= 1 && rank <= 15) {
    grade = 'A';
    points = 100;
  } else if (rank >= 16 && rank <= 50) {
    grade = 'B';
    points = 80;
  } else if (rank >= 51 && rank <= 200) {
    grade = 'C';
    points = 60;
  }
  
  return {
    rank,
    score,
    name,
    country,
    city,
    grade,
    points
  };
}).filter(u => u.name.length > 0);

writeFileSync(join(DATA_DIR, 'universities.json'), JSON.stringify(universitiesJSON, null, 2));
console.log(`universities.json written successfully (${universitiesJSON.length} universities).`);

// ----------------------------------------------------------------------------
// 3. EXTRACT LENDER INSTITUTIONS
// ----------------------------------------------------------------------------
console.log('Extracting lender-institutions data from Lender_Institution_Master.xlsx...');
const instWorkbook = XLSX.readFile('C:\\Users\\priyam\\Downloads\\Lender_Institution_Master.xlsx');
const instSheet = instWorkbook.Sheets['Master_All'];
const instRows = XLSX.utils.sheet_to_json(instSheet, { range: 2 });

const lenderInstitutionsJSON = {
  'Avanse': [],
  'Axis Bank': [],
  'PNB': [],
  'ICICI Bank': [],
  'SIB': []
};

for (const row of instRows) {
  const lenderRaw = row['Lender'] ? row['Lender'].toString().trim() : '';
  const country = row['Country'] ? row['Country'].toString().trim() : '';
  const name = row['Institution Name'] ? row['Institution Name'].toString().trim() : '';
  const type = row['Institution Type'] ? row['Institution Type'].toString().trim() : '';
  const tier = row['Product Tier'] ? row['Product Tier'].toString().trim() : '';
  const programType = row['Program Type'] ? row['Program Type'].toString().trim() : '';

  if (!name) continue;

  // Map to target lender key
  let targetLender = null;
  const lLower = lenderRaw.toLowerCase();
  if (lLower.includes('avanse')) targetLender = 'Avanse';
  else if (lLower.includes('axis')) targetLender = 'Axis Bank';
  else if (lLower.includes('pnb')) targetLender = 'PNB';
  else if (lLower.includes('icici')) targetLender = 'ICICI Bank';
  else if (lLower.includes('sib')) targetLender = 'SIB';

  if (targetLender) {
    lenderInstitutionsJSON[targetLender].push({
      name,
      country,
      type,
      tier,
      program_type: programType
    });
  }
}

writeFileSync(join(DATA_DIR, 'lender-institutions.json'), JSON.stringify(lenderInstitutionsJSON, null, 2));
console.log('lender-institutions.json written successfully.');

// ----------------------------------------------------------------------------
// 4. WRITE STATIC FILES
// ----------------------------------------------------------------------------
console.log('Writing static configuration JSON files...');

// A. scoring-rules.json
const scoringRules = {
  marks_to_points: [
    { min: 90, max: 100, points: 100 },
    { min: 80, max: 89.99, points: 90 },
    { min: 70, max: 79.99, points: 80 },
    { min: 60, max: 69.99, points: 70 },
    { min: 50, max: 59.99, points: 60 },
    { min: 0, max: 49.99, points: 0 }
  ],
  qualification_to_points: {
    PhD: 100, CA: 100, CMA: 100, CS: 100, CFA: 100, Dr: 100,
    Masters: 90, MBA: 90, Bachelors: 80, Diploma: 60
  },
  exam_to_points: {
    GRE: [
      { min: 320, max: 340, points: 10 },
      { min: 300, max: 319, points: 7 },
      { min: 280, max: 299, points: 5 },
      { min: 0, max: 279, points: 0 }
    ],
    GMAT: [
      { min: 700, max: 800, points: 10 },
      { min: 650, max: 699, points: 7 },
      { min: 600, max: 649, points: 5 },
      { min: 0, max: 599, points: 0 }
    ],
    IELTS: [
      { min: 7.5, max: 9, points: 10 },
      { min: 7, max: 7.49, points: 7 },
      { min: 6.5, max: 6.99, points: 5 },
      { min: 0, max: 6.49, points: 0 }
    ],
    TOEFL: [
      { min: 100, max: 120, points: 10 },
      { min: 90, max: 99, points: 7 },
      { min: 80, max: 89, points: 5 },
      { min: 0, max: 79, points: 0 }
    ]
  },
  tier_to_points: { "1": 100, "2": 90, "3": 80 },
  university_grade_bands: [
    { rank_min: 1, rank_max: 15, grade: "A", points: 100 },
    { rank_min: 16, rank_max: 50, grade: "B", points: 80 },
    { rank_min: 51, rank_max: 200, grade: "C", points: 60 },
    { rank_min: 201, rank_max: 999999, grade: "D", points: 40 }
  ],
  relation_to_points: {
    Father: 100, Mother: 100, Spouse: 90, Brother: 70, Sister: 70, Others: 50
  },
  employment_to_points: {
    Salaried: 100, "Self Employed": 80, "Agricultural Income": 60
  },
  income_to_points: [
    { min: 100000, max: 999999999, points: 100 },
    { min: 75000, max: 99999, points: 90 },
    { min: 50000, max: 74999, points: 80 },
    { min: 30000, max: 49999, points: 60 },
    { min: 15000, max: 29999, points: 40 },
    { min: 0, max: 14999, points: 0 }
  ],
  academic_weights: {
    marks_10th: 0.20,
    marks_12th: 0.20,
    marks_graduation: 0.20,
    highest_qualification: 0.20,
    student_pincode_tier: 0.10,
    exam_academic: 0.07,
    exam_language: 0.03
  },
  coapplicant_weights: {
    relation: 0.25,
    employment_type: 0.25,
    income: 0.25,
    coapplicant_pincode_tier: 0.25
  },
  overall_weights: {
    university: 0.10,
    academic: 0.70,
    coapplicant: 0.20
  },
  pass_threshold: 60
};
writeFileSync(join(DATA_DIR, 'scoring-rules.json'), JSON.stringify(scoringRules, null, 2));

// B. countries.json
const countries = {
  offered: ["USA", "UK", "Canada", "Australia", "Singapore", "Japan", "Hong Kong", "New Zealand", "Austria", "Belgium", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Ireland", "Italy", "Netherlands", "Norway", "Poland", "Portugal", "Spain", "Sweden", "Switzerland"],
  blocked: ["Russia", "China", "Georgia", "Uzbekistan", "Kazakhstan", "Ukraine"],
  partially_covered: {
    China: { covered_by: ["Credila"], note: "Only Credila covers China" },
    Georgia: { covered_by: ["Credila"], note: "Only Credila covers Georgia" },
    Uzbekistan: { covered_by: ["Credila"], note: "Only Credila covers Uzbekistan" }
  }
};
writeFileSync(join(DATA_DIR, 'countries.json'), JSON.stringify(countries, null, 2));

// C. courses.json
const courses = {
  course_levels: ["UG", "PG"],
  course_types: [
    { code: "STEM", name: "Science, Technology, Engineering, Mathematics", examples: ["Computer Science", "Mechanical Engineering", "Data Science", "Physics", "Biotechnology"] },
    { code: "MBA", name: "Business Administration", examples: ["MBA", "Executive MBA", "Business Analytics"] },
    { code: "Medicine", name: "Medical Sciences", examples: ["MBBS", "MD", "Dentistry", "Pharmacy", "Nursing"] },
    { code: "Management", name: "Management & Business", examples: ["Finance", "Marketing", "HR", "Operations"] },
    { code: "Humanities", name: "Humanities & Social Sciences", examples: ["Psychology", "Economics", "Political Science", "Sociology"] },
    { code: "Law", name: "Legal Studies", examples: ["LLM", "JD", "International Law"] },
    { code: "Arts", name: "Arts & Design", examples: ["Fine Arts", "Architecture", "Film", "Music"] }
  ]
};
writeFileSync(join(DATA_DIR, 'courses.json'), JSON.stringify(courses, null, 2));

// D. pincodes.json
const pincodes = {
  tier_1_prefixes: {
    "110": { city: "New Delhi", state: "Delhi" },
    "400": { city: "Mumbai", state: "Maharashtra" },
    "500": { city: "Hyderabad", state: "Telangana" },
    "560": { city: "Bangalore", state: "Karnataka" },
    "600": { city: "Chennai", state: "Tamil Nadu" },
    "700": { city: "Kolkata", state: "West Bengal" },
    "380": { city: "Ahmedabad", state: "Gujarat" },
    "411": { city: "Pune", state: "Maharashtra" }
  },
  tier_2_prefixes: {
    "302": { city: "Jaipur", state: "Rajasthan" },
    "226": { city: "Lucknow", state: "Uttar Pradesh" },
    "440": { city: "Nagpur", state: "Maharashtra" },
    "462": { city: "Bhopal", state: "Madhya Pradesh" },
    "800": { city: "Patna", state: "Bihar" },
    "208": { city: "Kanpur", state: "Uttar Pradesh" },
    "160": { city: "Chandigarh", state: "Chandigarh" },
    "682": { city: "Kochi", state: "Kerala" },
    "452": { city: "Indore", state: "Madhya Pradesh" },
    "641": { city: "Coimbatore", state: "Tamil Nadu" },
    "360": { city: "Rajkot", state: "Gujarat" },
    "395": { city: "Surat", state: "Gujarat" },
    "530": { city: "Visakhapatnam", state: "Andhra Pradesh" },
    "751": { city: "Bhubaneswar", state: "Odisha" },
    "122": { city: "Gurugram", state: "Haryana" },
    "201": { city: "Noida", state: "Uttar Pradesh" }
  },
  blocked_regions: {
    jk_prefixes: ["180", "181", "182", "184", "185", "190", "191", "192", "193", "194"],
    ne_prefixes: ["781", "782", "783", "784", "785", "786", "787", "788", "790", "791", "792", "793", "794", "795", "796", "797", "798", "799"],
    kerala_prefixes: ["670", "671", "672", "673", "674", "675", "676", "677", "678", "679", "680", "681", "682", "683", "684", "685", "686", "687", "688", "689", "690", "691", "692", "693", "694", "695", "696"]
  }
};
writeFileSync(join(DATA_DIR, 'pincodes.json'), JSON.stringify(pincodes, null, 2));

console.log('All static configuration JSON files written successfully.');
console.log('DATA EXTRACTION & GENERATION COMPLETE!');
