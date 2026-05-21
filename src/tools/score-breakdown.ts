import { scoreProfile } from '../scoring/overall-scorer.js';
import { checkKnockouts } from '../knockout/knockout-engine.js';
import { getLenders } from '../utils/data-loader.js';
import type { EvaluateProfileInput } from '../types.js';

export async function handleScoreBreakdown(args: EvaluateProfileInput) {
  const scoreResult = scoreProfile(args);
  const lenders = getLenders();

  // Build per-lender knockout trace
  const lenderTrace = lenders.map(lender => ({
    lender_name: lender.name,
    lender_type: lender.type,
    knockout_reason: checkKnockouts(args, lender),
    eligible: checkKnockouts(args, lender) === null,
  }));

  const output = {
    overall_profile_score: scoreResult.overall_profile_score,
    approved: scoreResult.approved,
    pass_threshold: 60,
    buckets: {
      university: {
        score: scoreResult.university_score.score,
        passes_threshold: scoreResult.university_score.score >= 60,
        weight_in_overall: 0.10,
        contribution_to_overall: scoreResult.university_score.score * 0.10,
        breakdown: scoreResult.university_score.breakdown,
      },
      academic: {
        score: scoreResult.academic_score.score,
        passes_threshold: scoreResult.academic_score.score >= 60,
        weight_in_overall: 0.70,
        contribution_to_overall: scoreResult.academic_score.score * 0.70,
        breakdown: scoreResult.academic_score.breakdown,
      },
      coapplicant: {
        score: scoreResult.coapplicant_score.score,
        passes_threshold: scoreResult.coapplicant_score.score >= 60,
        weight_in_overall: 0.20,
        contribution_to_overall: scoreResult.coapplicant_score.score * 0.20,
        breakdown: scoreResult.coapplicant_score.breakdown,
      },
    },
    lender_knockout_trace: lenderTrace,
  };

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(output, null, 2),
    }],
  };
}
