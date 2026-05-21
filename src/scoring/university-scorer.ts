import { getUniversities, getScoringRules } from '../utils/data-loader.js';
import { fuzzySearch } from '../utils/fuzzy-search.js';
import type { BucketScore, UniversityRecord } from '../types.js';

export interface UniversityLookupResult {
  matched: boolean;
  matched_name: string | null;
  rank: number | null;
  grade: string;
  points: number;
  country: string | null;
}

export function getUniversityGrade(rankNum: number | undefined | null): { grade: string; points: number } {
  if (rankNum === undefined || rankNum === null || isNaN(rankNum)) return { grade: 'D', points: 40 };
  if (rankNum <= 15) return { grade: 'A', points: 100 };
  if (rankNum <= 50) return { grade: 'B', points: 80 };
  if (rankNum <= 200) return { grade: 'C', points: 60 };
  return { grade: 'D', points: 40 };
}

export function lookupUniversity(universityName: string): UniversityLookupResult {
  const universities = getUniversities();
  const matches = fuzzySearch(universityName, universities, (u) => u.name, 1, 0.4);

  if (matches.length > 0 && matches[0].score >= 0.4) {
    const uni = matches[0].item;
    
    // Parse rank
    let r = uni.rank;
    if (r === undefined && uni.qs_rank !== undefined) {
      r = parseInt(uni.qs_rank, 10);
    }
    
    let grade = uni.grade;
    let points = uni.points;
    
    if (!grade || points === undefined) {
      const grading = getUniversityGrade(r);
      grade = grading.grade;
      points = grading.points;
    }

    return {
      matched: true,
      matched_name: uni.name,
      rank: r || null,
      grade: grade,
      points: points,
      country: uni.country || null,
    };
  }

  // Unlisted university
  return {
    matched: false,
    matched_name: null,
    rank: null,
    grade: 'D',
    points: 40,
    country: null,
  };
}

export function scoreUniversity(universityName: string): BucketScore {
  const lookup = lookupUniversity(universityName);
  return {
    score: lookup.points,
    breakdown: [
      {
        attribute: 'university_name',
        raw_value: universityName,
        rule_applied: lookup.matched
          ? `Matched "${lookup.matched_name}" (QS Rank ${lookup.rank}) → Grade ${lookup.grade}`
          : 'University not found in QS rankings → Grade D (unlisted)',
        raw_points: lookup.points,
        weight: 1.0,
        weighted_score: lookup.points,
      },
    ],
  };
}
