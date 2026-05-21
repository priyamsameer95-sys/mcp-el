import { scoreProfile } from '../scoring/overall-scorer.js';
import { evaluateLenders } from '../knockout/knockout-engine.js';
import type { EvaluateProfileInput } from '../types.js';

export async function handleEvaluateProfile(args: EvaluateProfileInput) {
  const scoreResult = scoreProfile(args);
  const { eligible, ineligible } = evaluateLenders(args);

  const output = {
    approved: scoreResult.approved,
    overall_profile_score: scoreResult.overall_profile_score,
    score_breakdown: {
      university_score: scoreResult.university_score.score,
      academic_score: scoreResult.academic_score.score,
      coapplicant_score: scoreResult.coapplicant_score.score,
    },
    eligible_lenders: eligible,
    ineligible_lenders: ineligible,
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(output, null, 2),
      },
    ],
  };
}
