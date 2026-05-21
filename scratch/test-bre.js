import { scoreProfile } from '../dist/scoring/overall-scorer.js';
import { evaluateLenders } from '../dist/knockout/knockout-engine.js';

const testCases = [
  {
    name: "Case 1: Golden Profile (MIT, strong academics, salaried parent, collateral)",
    input: {
      student_name: "Aarav Sharma",
      date_of_birth: "2000-05-15",
      student_pincode: "110001",
      marks_10th: 92,
      marks_12th: 95,
      marks_graduation: 85,
      highest_qualification: "Bachelors",
      exam_academic: "GRE",
      exam_academic_score: 325,
      exam_language: "IELTS",
      exam_language_score: 8,
      university_name: "Massachusetts Institute of Technology (MIT)",
      country: "United States",
      course_level: "PG",
      coapplicant_relation: "Father",
      coapplicant_employment_type: "Salaried",
      coapplicant_monthly_income: 200000,
      coapplicant_annual_itr: null,
      coapplicant_age: 52,
      coapplicant_pincode: "110001",
      coapplicant_cibil: 800,
      student_cibil: 750,
      loan_amount_requested: 5000000,
      collateral_type: "FD",
      collateral_value: 6000000
    }
  },
  {
    name: "Case 2: Academic Knockout (Harvard, but student has Class 10th marks = 45%)",
    input: {
      student_name: "Rahul Kumar",
      date_of_birth: "2001-08-20",
      student_pincode: "400001",
      marks_10th: 45, // Below min 50%
      marks_12th: 88,
      marks_graduation: 78,
      highest_qualification: "Bachelors",
      exam_academic: "GRE",
      exam_academic_score: 310,
      exam_language: "TOEFL",
      exam_language_score: 105,
      university_name: "Harvard University",
      country: "United States",
      course_level: "PG",
      coapplicant_relation: "Mother",
      coapplicant_employment_type: "Salaried",
      coapplicant_monthly_income: 150000,
      coapplicant_annual_itr: null,
      coapplicant_age: 48,
      coapplicant_pincode: "400001",
      coapplicant_cibil: 780,
      student_cibil: 0,
      loan_amount_requested: 4000000,
      collateral_type: "None",
      collateral_value: null
    }
  },
  {
    name: "Case 3: Blocked Region Knockout (J&K pincode 190001)",
    input: {
      student_name: "Zameer Ahmed",
      date_of_birth: "1999-12-05",
      student_pincode: "190001", // Srinagar (J&K)
      marks_10th: 78,
      marks_12th: 82,
      marks_graduation: 75,
      highest_qualification: "Bachelors",
      exam_academic: null,
      exam_academic_score: null,
      exam_language: "IELTS",
      exam_language_score: 7,
      university_name: "University of Toronto",
      country: "Canada",
      course_level: "PG",
      coapplicant_relation: "Father",
      coapplicant_employment_type: "Salaried",
      coapplicant_monthly_income: 120000,
      coapplicant_annual_itr: null,
      coapplicant_age: 55,
      coapplicant_pincode: "190001",
      coapplicant_cibil: 750,
      student_cibil: 0,
      loan_amount_requested: 3000000,
      collateral_type: "None",
      collateral_value: null
    }
  },
  {
    name: "Case 4: Kerala Blockage (Avanse only blocked, others eligible)",
    input: {
      student_name: "Anjali Menon",
      date_of_birth: "2002-04-10",
      student_pincode: "682001", // Kochi (Kerala)
      marks_10th: 85,
      marks_12th: 88,
      marks_graduation: 80,
      highest_qualification: "Bachelors",
      exam_academic: "GMAT",
      exam_academic_score: 680,
      exam_language: "IELTS",
      exam_language_score: 7.5,
      university_name: "National University of Singapore (NUS)",
      country: "Singapore",
      course_level: "PG",
      coapplicant_relation: "Mother",
      coapplicant_employment_type: "Salaried",
      coapplicant_monthly_income: 180000,
      coapplicant_annual_itr: null,
      coapplicant_age: 50,
      coapplicant_pincode: "682001",
      coapplicant_cibil: 760,
      student_cibil: 0,
      loan_amount_requested: 3500000,
      collateral_type: "None",
      collateral_value: null
    }
  },
  {
    name: "Case 5: Unsecured Loan with No-Unsecured Lender (e.g. BOB, Canara, BOI, PNB should reject)",
    input: {
      student_name: "Vihaan Shah",
      date_of_birth: "2000-09-18",
      student_pincode: "380001",
      marks_10th: 75,
      marks_12th: 78,
      marks_graduation: 72,
      highest_qualification: "Bachelors",
      exam_academic: null,
      exam_academic_score: null,
      exam_language: "TOEFL",
      exam_language_score: 95,
      university_name: "University of Leeds",
      country: "United Kingdom",
      course_level: "PG",
      coapplicant_relation: "Father",
      coapplicant_employment_type: "Self Employed",
      coapplicant_monthly_income: null,
      coapplicant_annual_itr: 600000,
      coapplicant_age: 54,
      coapplicant_pincode: "380001",
      coapplicant_cibil: 720,
      student_cibil: 0,
      loan_amount_requested: 2500000,
      collateral_type: "None", // Unsecured
      collateral_value: null
    }
  }
];

console.log("==========================================");
console.log("EduLoans BRE Integration Tests Running...");
console.log("==========================================\n");

for (const tc of testCases) {
  console.log(`--- ${tc.name} ---`);
  
  // 1. Evaluate Profile Score
  const scoreResult = scoreProfile(tc.input);
  console.log(`Profile Scoring:`);
  console.log(`  - Overall Score: ${scoreResult.overall_profile_score}`);
  console.log(`  - Approved (All Buckets >= 60): ${scoreResult.approved ? "✅ YES" : "❌ NO"}`);
  console.log(`  - Bucket Scores: University: ${scoreResult.university_score.score}, Academic: ${scoreResult.academic_score.score}, Co-applicant: ${scoreResult.coapplicant_score.score}`);

  // 2. Evaluate Lenders
  const { eligible, ineligible } = evaluateLenders(tc.input);
  
  console.log(`\nLender Matching results:`);
  console.log(`  Eligible Lenders: ${eligible.length}`);
  eligible.forEach(l => {
    console.log(`    ✅ ${l.lender_name} (${l.lender_type}) - ${l.loan_type} loan`);
    console.log(`       - Rate range: ${l.indicative_rate_range.min}%-${l.indicative_rate_range.max}%`);
    console.log(`       - Amount range: ₹${l.eligible_loan_range.min.toLocaleString('en-IN')} - ₹${l.eligible_loan_range.max.toLocaleString('en-IN')}`);
    console.log(`       - PF: ${l.processing_fee}`);
  });

  console.log(`  Ineligible Lenders: ${ineligible.length}`);
  ineligible.forEach(l => {
    console.log(`    ❌ ${l.lender_name} (${l.lender_type})`);
    console.log(`       - Knockout Reason: ${l.knockout_reason}`);
  });

  console.log("\n------------------------------------------------------------\n");
}
