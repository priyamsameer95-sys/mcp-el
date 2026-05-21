import { getScoringRules } from '../utils/data-loader.js';
import { lookupPincode } from './pincode-lookup.js';
import type { BucketScore, ScoreBreakdownItem, EvaluateProfileInput } from '../types.js';

function lookupRange(value: number, ranges: { min: number; max: number; points: number }[]): number {
  for (const range of ranges) {
    if (value >= range.min && value <= range.max) return range.points;
  }
  return 0;
}

export function scoreAcademic(input: EvaluateProfileInput): BucketScore {
  const rules = getScoringRules();
  const breakdown: ScoreBreakdownItem[] = [];
  let totalWeightedScore = 0;

  // 1. 10th marks (weight: 0.20)
  const pts10 = lookupRange(input.marks_10th, rules.marks_to_points);
  breakdown.push({
    attribute: 'marks_10th',
    raw_value: input.marks_10th,
    rule_applied: `${input.marks_10th}% → ${pts10} points`,
    raw_points: pts10,
    weight: rules.academic_weights.marks_10th,
    weighted_score: pts10 * rules.academic_weights.marks_10th,
  });
  totalWeightedScore += pts10 * rules.academic_weights.marks_10th;

  // 2. 12th marks (weight: 0.20)
  const pts12 = lookupRange(input.marks_12th, rules.marks_to_points);
  breakdown.push({
    attribute: 'marks_12th',
    raw_value: input.marks_12th,
    rule_applied: `${input.marks_12th}% → ${pts12} points`,
    raw_points: pts12,
    weight: rules.academic_weights.marks_12th,
    weighted_score: pts12 * rules.academic_weights.marks_12th,
  });
  totalWeightedScore += pts12 * rules.academic_weights.marks_12th;

  // 3. Graduation marks (weight: 0.20)
  const ptsGrad = lookupRange(input.marks_graduation, rules.marks_to_points);
  breakdown.push({
    attribute: 'marks_graduation',
    raw_value: input.marks_graduation,
    rule_applied: `${input.marks_graduation}% → ${ptsGrad} points`,
    raw_points: ptsGrad,
    weight: rules.academic_weights.marks_graduation,
    weighted_score: ptsGrad * rules.academic_weights.marks_graduation,
  });
  totalWeightedScore += ptsGrad * rules.academic_weights.marks_graduation;

  // 4. Highest qualification (weight: 0.20)
  const ptsQual = rules.qualification_to_points[input.highest_qualification] ?? 60;
  breakdown.push({
    attribute: 'highest_qualification',
    raw_value: input.highest_qualification,
    rule_applied: `${input.highest_qualification} → ${ptsQual} points`,
    raw_points: ptsQual,
    weight: rules.academic_weights.highest_qualification,
    weighted_score: ptsQual * rules.academic_weights.highest_qualification,
  });
  totalWeightedScore += ptsQual * rules.academic_weights.highest_qualification;

  // 5. Student pincode tier (weight: 0.10)
  const pinResult = lookupPincode(input.student_pincode);
  const ptsTier = rules.tier_to_points[String(pinResult.tier)] ?? 80;
  breakdown.push({
    attribute: 'student_pincode_tier',
    raw_value: `${input.student_pincode} (${pinResult.city}, Tier ${pinResult.tier})`,
    rule_applied: `Tier ${pinResult.tier} → ${ptsTier} points`,
    raw_points: ptsTier,
    weight: rules.academic_weights.student_pincode_tier,
    weighted_score: ptsTier * rules.academic_weights.student_pincode_tier,
  });
  totalWeightedScore += ptsTier * rules.academic_weights.student_pincode_tier;

  // 6. Academic exam GRE/GMAT (weight: 0.07)
  let ptsExamAcad = 0;
  let examAcadRule = 'No academic exam provided → 0 points';
  if (input.exam_academic && input.exam_academic_score != null) {
    const examRanges = rules.exam_to_points[input.exam_academic];
    if (examRanges) {
      ptsExamAcad = lookupRange(input.exam_academic_score, examRanges);
      examAcadRule = `${input.exam_academic} ${input.exam_academic_score} → ${ptsExamAcad} points`;
    }
  }
  breakdown.push({
    attribute: 'exam_academic',
    raw_value: input.exam_academic ? `${input.exam_academic}: ${input.exam_academic_score}` : null,
    rule_applied: examAcadRule,
    raw_points: ptsExamAcad,
    weight: rules.academic_weights.exam_academic,
    weighted_score: ptsExamAcad * rules.academic_weights.exam_academic,
  });
  totalWeightedScore += ptsExamAcad * rules.academic_weights.exam_academic;

  // 7. Language exam IELTS/TOEFL (weight: 0.03)
  let ptsExamLang = 0;
  let examLangRule = 'No language exam provided → 0 points';
  if (input.exam_language && input.exam_language_score != null) {
    const langRanges = rules.exam_to_points[input.exam_language];
    if (langRanges) {
      ptsExamLang = lookupRange(input.exam_language_score, langRanges);
      examLangRule = `${input.exam_language} ${input.exam_language_score} → ${ptsExamLang} points`;
    }
  }
  breakdown.push({
    attribute: 'exam_language',
    raw_value: input.exam_language ? `${input.exam_language}: ${input.exam_language_score}` : null,
    rule_applied: examLangRule,
    raw_points: ptsExamLang,
    weight: rules.academic_weights.exam_language,
    weighted_score: ptsExamLang * rules.academic_weights.exam_language,
  });
  totalWeightedScore += ptsExamLang * rules.academic_weights.exam_language;

  return {
    score: Math.round(totalWeightedScore * 100) / 100,
    breakdown,
  };
}
