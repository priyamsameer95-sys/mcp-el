import { getScoringRules } from '../utils/data-loader.js';

export async function handleGetScoringRules(args: { category?: string }) {
  const rules = getScoringRules();
  const category = args.category ?? 'all';

  let output: any;

  switch (category) {
    case 'university':
      output = {
        university_grade_bands: rules.university_grade_bands,
        weight_in_overall: rules.overall_weights.university,
      };
      break;
    case 'academic':
      output = {
        marks_to_points: rules.marks_to_points,
        qualification_to_points: rules.qualification_to_points,
        exam_to_points: rules.exam_to_points,
        tier_to_points: rules.tier_to_points,
        weights: rules.academic_weights,
        weight_in_overall: rules.overall_weights.academic,
      };
      break;
    case 'coapplicant':
      output = {
        relation_to_points: rules.relation_to_points,
        employment_to_points: rules.employment_to_points,
        income_to_points: rules.income_to_points,
        tier_to_points: rules.tier_to_points,
        weights: rules.coapplicant_weights,
        weight_in_overall: rules.overall_weights.coapplicant,
      };
      break;
    default:
      output = {
        ...rules,
        pass_threshold_note: 'Each of the three buckets (university, academic, co-applicant) must score >= 60 for the profile to be approved',
      };
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(output, null, 2),
    }],
  };
}
