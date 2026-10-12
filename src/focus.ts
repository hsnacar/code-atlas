import { FileAnalysis } from './types.js';

export interface FocusMatch {
  file: FileAnalysis;
  score: number;
  matchedTerms: string[];
  reasons: string[];
}

export function filterByFocus(files: FileAnalysis[], query: string, topN: number = 7): FocusMatch[] {
  if (!query || query.trim() === '') {
    return [];
  }

  const terms = query
    .toLowerCase()
    .split(/[\s,._\-+/]+/)
    .filter(t => t.length > 1);

  if (terms.length === 0) return [];

  const matches: FocusMatch[] = [];

  for (const file of files) {
    let score = 0;
    const matchedTerms = new Set<string>();
    const reasons: string[] = [];

    const lowerPath = file.path.toLowerCase();

    // Check path / file name
    for (const term of terms) {
      if (lowerPath.includes(term)) {
        score += 15;
        matchedTerms.add(term);
        reasons.push(`Path contains "${term}"`);
      }
    }

    // Check symbols and signatures
    for (const sym of file.symbols) {
      const lowerSym = (sym.name + ' ' + sym.signature).toLowerCase();
      for (const term of terms) {
        if (lowerSym.includes(term)) {
          score += 10;
          matchedTerms.add(term);
          reasons.push(`Symbol \`${sym.name}\` matches "${term}"`);
        }
      }
    }

    // Boost services & api layers for general feature requests
    if (file.layer === 'service' && score > 0) score += 5;
    if (file.layer === 'api' && score > 0) score += 4;
    if (file.layer === 'test' && score > 0) score -= 3; // Deprioritize tests unless explicitly searched

    if (score > 0) {
      matches.push({
        file,
        score,
        matchedTerms: Array.from(matchedTerms),
        reasons: Array.from(new Set(reasons)).slice(0, 3)
      });
    }
  }

  // Sort by highest relevance score
  return matches.sort((a, b) => b.score - a.score).slice(0, topN);
}
