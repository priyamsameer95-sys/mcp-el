// Enums
export type Qualification = 'PhD' | 'CA' | 'CMA' | 'CS' | 'CFA' | 'Dr' | 'Masters' | 'MBA' | 'Bachelors' | 'Diploma';
export type ExamAcademic = 'GRE' | 'GMAT';
export type ExamLanguage = 'TOEFL' | 'IELTS';
export type CourseLevel = 'UG' | 'PG';
export type CoApplicantRelation = 'Father' | 'Mother' | 'Brother' | 'Sister' | 'Spouse' | 'Others';
export type EmploymentType = 'Salaried' | 'Self Employed' | 'Agricultural Income';
export type CollateralType = 'None' | 'FD' | 'Residential' | 'Commercial';
export type LenderType = 'PSU' | 'Private' | 'NBFC';
export type LoanType = 'Secured' | 'Unsecured';
export type EligibilityStatus = 'Eligible' | 'Not Eligible';

// Input for evaluate_profile
export interface EvaluateProfileInput {
  student_name: string;
  date_of_birth: string; // YYYY-MM-DD
  student_pincode: string;
  marks_10th: number; // 0-100
  marks_12th: number; // 0-100
  marks_graduation: number; // 0-100
  highest_qualification: Qualification;
  exam_academic: ExamAcademic | null;
  exam_academic_score: number | null;
  exam_language: ExamLanguage | null;
  exam_language_score: number | null;
  university_name: string;
  country: string;
  course_level: CourseLevel;
  coapplicant_relation: CoApplicantRelation;
  coapplicant_employment_type: EmploymentType;
  coapplicant_monthly_income: number | null;
  coapplicant_annual_itr: number | null;
  coapplicant_age: number;
  coapplicant_pincode: string;
  coapplicant_cibil: number;
  student_cibil: number;
  loan_amount_requested: number;
  collateral_type: CollateralType | null;
  collateral_value: number | null;
}

// Score breakdown output
export interface ScoreBreakdownItem {
  attribute: string;
  raw_value: string | number | null;
  rule_applied: string;
  raw_points: number;
  weight: number;
  weighted_score: number;
}

export interface BucketScore {
  score: number;
  breakdown: ScoreBreakdownItem[];
}

export interface OverallScoreResult {
  approved: boolean;
  overall_profile_score: number;
  university_score: BucketScore;
  academic_score: BucketScore;
  coapplicant_score: BucketScore;
}

// Eligible lender output
export interface EligibleLender {
  lender_name: string;
  lender_type: LenderType;
  eligibility: 'Eligible';
  knockout_reason: null;
  loan_type: LoanType;
  eligible_loan_range: { min: number; max: number };
  indicative_rate_range: { min: number; max: number };
  processing_fee: string;
  moratorium: string;
  ltv_ratio: number | null;
}

export interface IneligibleLender {
  lender_name: string;
  lender_type: LenderType;
  knockout_reason: string;
}

export interface EvaluateProfileOutput {
  approved: boolean;
  overall_profile_score: number;
  score_breakdown: {
    university_score: number;
    academic_score: number;
    coapplicant_score: number;
  };
  eligible_lenders: EligibleLender[];
  ineligible_lenders: IneligibleLender[];
}

// Lender config (loaded from lenders.json)
export interface LenderConfig {
  name: string;
  type: LenderType;
  code: string;
  payout: string;
  courses: string;
  roi: {
    secured: { min: number; max: number } | null;
    unsecured: { min: number; max: number } | null;
  };
  pf: string;
  tenure_years: number;
  moratorium: string;
  co_applicant_allowed: string[];
  student_age: { min: number; max: number };
  marks_min: { '10th': number; '12th': number; graduation: number };
  co_applicant_max_age: number;
  min_salary: number;
  min_itr: number;
  cibil_min: number;
  dpd_allowed: boolean;
  loan_amount: {
    secured: { min: number; max: number } | null;
    unsecured: { min: number; max: number } | null;
  };
  ltv: { fd: number; residential: number; commercial: number };
  countries_covered: string;
  countries_blocked: string[];
  regions_blocked: string[];
  institution_list_type: string;
}

// University record
export interface UniversityRecord {
  rank?: number;
  qs_rank?: string;
  score?: number;
  name: string;
  country?: string;
  city?: string;
  grade?: string;
  points?: number;
}

// Pincode lookup result
export interface PincodeLookup {
  pincode: string;
  city: string;
  state: string;
  tier: number;
  points: number;
  is_blocked: boolean;
  blocked_region: string | null;
}

// Scoring rules loaded from JSON
export interface RangeToPts {
  min: number;
  max: number;
  points: number;
}

export interface ScoringRules {
  marks_to_points: RangeToPts[];
  qualification_to_points: Record<string, number>;
  exam_to_points: Record<string, RangeToPts[]>;
  tier_to_points: Record<string, number>;
  university_grade_bands: { rank_min: number; rank_max: number; grade: string; points: number }[];
  relation_to_points: Record<string, number>;
  employment_to_points: Record<string, number>;
  income_to_points: RangeToPts[];
  academic_weights: Record<string, number>;
  coapplicant_weights: Record<string, number>;
  overall_weights: { university: number; academic: number; coapplicant: number };
  pass_threshold: number;
}
