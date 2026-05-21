import { getUniversities } from '../utils/data-loader.js';
import { fuzzySearch } from '../utils/fuzzy-search.js';
import { getUniversityGrade } from '../scoring/university-scorer.js';

export async function handleSearchUniversities(args: { query: string; country?: string; limit?: number }) {
  let universities = getUniversities();

  if (args.country) {
    const countryLower = args.country.toLowerCase();
    universities = universities.filter(u => u.country && u.country.toLowerCase().includes(countryLower));
  }

  const limit = args.limit ?? 10;
  const matches = fuzzySearch(args.query, universities, (u) => u.name, limit, 0.3);

  const output = matches.map(m => {
    let r = m.item.rank;
    if (r === undefined && m.item.qs_rank !== undefined) {
      r = parseInt(m.item.qs_rank, 10);
    }
    
    let grade = m.item.grade;
    let points = m.item.points;
    if (!grade || points === undefined) {
      const grading = getUniversityGrade(r);
      grade = grading.grade;
      points = grading.points;
    }

    return {
      university_name: m.item.name,
      country: m.item.country,
      city: m.item.city,
      qs_rank: r || null,
      grade: grade,
      points: points,
      match_score: Math.round(m.score * 100) / 100,
    };
  });

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(output, null, 2),
    }],
  };
}
