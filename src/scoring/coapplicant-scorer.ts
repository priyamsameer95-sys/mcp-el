import { getScoringRules } from '../utils/data-loader.js';
import { lookupPincode } from './pincode-lookup.js';
import type { BucketScore, ScoreBreakdownItem, EvaluateProfileInput } from '../types.js';

function lookupRange(value: number, ranges: { min: number; max: number; points: number }[]): number {
  for (const range of ranges) {
    if (value >= range.min && value <= range.max) return range.points;
  }
  return 0;
}

export function scoreCoapplicant(input: EvaluateProfileInput): BucketScore {
  const rules = getScoringRules();
  const breakdown: ScoreBreakdownItem[] = [];
  let totalWeightedScore = 0;

  // 1. Relation (weight: 0.25)
  const ptsRelation = rules.relation_to_points[input.coapplicant_relation] ?? 50;
  breakdown.push({
    attribute: 'coapplicant_relation',
    raw_value: input.coapplicant_relation,
    rule_applied: `${input.coapplicant_relation} → ${ptsRelation} points`,
    raw_points: ptsRelation,
    weight: rules.coapplicant_weights.relation,
    weighted_score: ptsRelation * rules.coapplicant_weights.relation,
  });
  totalWeightedScore += ptsRelation * rules.coapplicant_weights.relation;

  // 2. Employment type (weight: 0.25)
  const ptsEmpl = rules.employment_to_points[input.coapplicant_employment_type] ?? 60;
  breakdown.push({
    attribute: 'coapplicant_employment_type',
    raw_value: input.coapplicant_employment_type,
    rule_applied: `${input.coapplicant_employment_type} → ${ptsEmpl} points`,
    raw_points: ptsEmpl,
    weight: rules.coapplicant_weights.employment_type,
    weighted_score: ptsEmpl * rules.coapplicant_weights.employment_type,
  });
  totalWeightedScore += ptsEmpl * rules.coapplicant_weights.employment_type;

  // 3. Income (weight: 0.25)
  // Normalize: if self-employed, use ITR/12 as monthly
  let monthlyIncome = input.coapplicant_monthly_income ?? 0;
  if (input.coapplicant_employment_type !== 'Salaried' && input.coapplicant_annual_itr) {
    monthlyIncome = Math.round(input.coapplicant_annual_itr / 12);
  }
  const ptsIncome = lookupRange(monthlyIncome, rules.income_to_points);
  breakdown.push({
    attribute: 'coapplicant_income',
    raw_value: monthlyIncome,
    rule_applied: `₹${monthlyIncome.toLocaleString('en-IN')}/month → ${ptsIncome} points`,
    raw_points: ptsIncome,
    weight: rules.coapplicant_weights.income,
    weighted_score: ptsIncome * rules.coapplicant_weights.income,
  });
  totalWeightedScore += ptsIncome * rules.coapplicant_weights.income;

  // 4. Co-applicant pincode tier (weight: 0.25)
  const pinResult = lookupPincode(input.coapplicant_pincode);
  const ptsTier = rules.tier_to_points[String(pinResult.tier)] ?? 80;
  breakdown.push({
    attribute: 'coapplicant_pincode_tier',
    raw_value: `${input.coapplicant_pincode} (${pinResult.city}, Tier ${pinResult.tier})`,
    rule_applied: `Tier ${pinResult.tier} → ${ptsTier} points`,
    raw_points: ptsTier,
    weight: rules.coapplicant_weights.coapplicant_pincode_tier,
    weighted_score: ptsTier * rules.coapplicant_weights.coapplicant_pincode_tier,
  });
  totalWeightedScore += ptsTier * rules.coapplicant_weights.coapplicant_pincode_tier;

  return {
    score: Math.round(totalWeightedScore * 100) / 100,
    breakdown,
  };
}
