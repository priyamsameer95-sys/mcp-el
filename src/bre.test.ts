import { test } from 'node:test';
import assert from 'node:assert';
import { scoreProfile } from './scoring/overall-scorer.js';
import { evaluateLenders } from './knockout/knockout-engine.js';
import type { EvaluateProfileInput } from './types.js';

test('EduLoans BRE - Golden Profile evaluation', () => {
  const profile: EvaluateProfileInput = {
    student_name: 'Aarav Sharma',
    date_of_birth: '2000-05-15',
    student_pincode: '110001',
    marks_10th: 92,
    marks_12th: 95,
    marks_graduation: 85,
    highest_qualification: 'Bachelors',
    exam_academic: 'GRE',
    exam_academic_score: 325,
    exam_language: 'IELTS',
    exam_language_score: 8,
    university_name: 'Massachusetts Institute of Technology (MIT)',
    country: 'United States',
    course_level: 'PG',
    coapplicant_relation: 'Father',
    coapplicant_employment_type: 'Salaried',
    coapplicant_monthly_income: 200000,
    coapplicant_annual_itr: null,
    coapplicant_age: 52,
    coapplicant_pincode: '110001',
    coapplicant_cibil: 800,
    student_cibil: 750,
    loan_amount_requested: 5000000,
    collateral_type: 'FD',
    collateral_value: 6000000
  };

  const scoreResult = scoreProfile(profile);
  assert.strictEqual(scoreResult.approved, true);
  assert.ok(scoreResult.overall_profile_score > 60);

  const { eligible, ineligible } = evaluateLenders(profile);
  assert.ok(eligible.length > 0);
});

test('EduLoans BRE - 10th Marks Knockout', () => {
  const profile: EvaluateProfileInput = {
    student_name: 'Rahul Kumar',
    date_of_birth: '2001-08-20',
    student_pincode: '400001',
    marks_10th: 45, // Below min 50%
    marks_12th: 88,
    marks_graduation: 78,
    highest_qualification: 'Bachelors',
    exam_academic: 'GRE',
    exam_academic_score: 310,
    exam_language: 'TOEFL',
    exam_language_score: 105,
    university_name: 'Harvard University',
    country: 'United States',
    course_level: 'PG',
    coapplicant_relation: 'Mother',
    coapplicant_employment_type: 'Salaried',
    coapplicant_monthly_income: 150000,
    coapplicant_annual_itr: null,
    coapplicant_age: 48,
    coapplicant_pincode: '400001',
    coapplicant_cibil: 780,
    student_cibil: 0,
    loan_amount_requested: 4000000,
    collateral_type: 'None',
    collateral_value: null
  };

  const { eligible, ineligible } = evaluateLenders(profile);
  assert.strictEqual(eligible.length, 0);
  assert.strictEqual(ineligible.length, 12);
  assert.ok(ineligible[0].knockout_reasons.some((r: string) => r.includes('Class 10th marks')));
});

test('EduLoans BRE - Blocked Region (J&K)', () => {
  const profile: EvaluateProfileInput = {
    student_name: 'Zameer Ahmed',
    date_of_birth: '1999-12-05',
    student_pincode: '190001', // Srinagar (J&K)
    marks_10th: 78,
    marks_12th: 82,
    marks_graduation: 75,
    highest_qualification: 'Bachelors',
    exam_academic: null,
    exam_academic_score: null,
    exam_language: 'IELTS',
    exam_language_score: 7,
    university_name: 'University of Toronto',
    country: 'Canada',
    course_level: 'PG',
    coapplicant_relation: 'Father',
    coapplicant_employment_type: 'Salaried',
    coapplicant_monthly_income: 120000,
    coapplicant_annual_itr: null,
    coapplicant_age: 55,
    coapplicant_pincode: '190001',
    coapplicant_cibil: 750,
    student_cibil: 0,
    loan_amount_requested: 3000000,
    collateral_type: 'None',
    collateral_value: null
  };

  const { eligible, ineligible } = evaluateLenders(profile);
  assert.strictEqual(eligible.length, 0);
  assert.strictEqual(ineligible.length, 12);
  assert.ok(ineligible[0].knockout_reasons.some((r: string) => r.includes('blocked region') || r.includes('not serviceable')));
});
