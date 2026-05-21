import Fuse from 'fuse.js';

export interface FuzzyMatch<T> {
  item: T;
  score: number;
  matchedOn: string;
}

export function fuzzySearch<T>(
  query: string,
  items: T[],
  getKey: (item: T) => string,
  limit: number = 10,
  threshold: number = 0.3
): FuzzyMatch<T>[] {
  const fuse = new Fuse(items, {
    keys: [{ name: 'key', getFn: getKey }],
    includeScore: true,
    threshold: threshold,
  });

  const results = fuse.search(query, { limit });

  return results.map(result => ({
    item: result.item,
    // Fuse score is 0 for exact match, 1 for mismatch. Inverting it to match our old API (1 = perfect, 0 = bad)
    score: 1 - (result.score ?? 0),
    matchedOn: getKey(result.item)
  }));
}
