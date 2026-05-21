import { lookupUniversity } from '../scoring/university-scorer.js';
import { getUniversities, getLenderInstitutions } from '../utils/data-loader.js';

export async function handleCheckUniversity(args: { university_name?: string; qs_rank?: number }) {
  if (args.qs_rank) {
    const universities = getUniversities();
    const match = universities.find(u => u.rank === args.qs_rank);
    if (match) {
      const covered = getCoveredByLenders(match.name);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            university_name: match.name,
            country: match.country,
            qs_rank: match.rank,
            grade: match.grade,
            points: match.points,
            covered_by_lenders: covered,
          }, null, 2),
        }],
      };
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: `No university found at QS rank ${args.qs_rank}` }) }],
    };
  }

  if (args.university_name) {
    const result = lookupUniversity(args.university_name);
    const covered = result.matched_name ? getCoveredByLenders(result.matched_name) : [];
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          university_name: result.matched_name ?? args.university_name,
          country: result.country,
          qs_rank: result.rank,
          grade: result.grade,
          points: result.points,
          matched: result.matched,
          covered_by_lenders: covered,
        }, null, 2),
      }],
    };
  }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Provide either university_name or qs_rank' }) }],
  };
}

function getCoveredByLenders(universityName: string): string[] {
  const lenderInsts = getLenderInstitutions();
  const normalizedName = universityName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const covered: string[] = [];

  for (const [lender, institutions] of Object.entries(lenderInsts)) {
    const found = (institutions as any[]).some(inst => {
      const norm = (inst.name as string).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      return norm.includes(normalizedName) || normalizedName.includes(norm);
    });
    if (found) covered.push(lender);
  }

  return covered;
}
