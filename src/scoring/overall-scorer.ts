import { getScoringRules } from '../utils/data-loader.js';
import { scoreUniversity } from './university-scorer.js';
import { scoreAcademic } from './academic-scorer.js';
import { scoreCoapplicant } from './coapplicant-scorer.js';
import type { EvaluateProfileInput, OverallScoreResult } from '../types.js';

export function scoreProfile(input: EvaluateProfileInput): OverallScoreResult {
  const rules = getScoringRules();

  const universityResult = scoreUniversity(input.university_name);
  const academicResult = scoreAcademic(input);
  const coapplicantResult = scoreCoapplicant(input);

  const overall =
    universityResult.score * rules.overall_weights.university +
    academicResult.score * rules.overall_weights.academic +
    coapplicantResult.score * rules.overall_weights.coapplicant;

  const approved =
    universityResult.score >= rules.pass_threshold &&
    academicResult.score >= rules.pass_threshold &&
    coapplicantResult.score >= rules.pass_threshold;

  return {
    approved,
    overall_profile_score: Math.round(overall * 100) / 100,
    university_score: universityResult,
    academic_score: academicResult,
    coapplicant_score: coapplicantResult,
  };
}
