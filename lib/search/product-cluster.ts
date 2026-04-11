import type { SerpResult } from './serp-multi-search';

export interface ProductCluster {
  label: string;
  thumbnail: string;
  results: SerpResult[];
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'in', 'of', 'to', 'by',
  'new', 'free', 'shipping', 'pack', 'count',
]);

function normalizeTitle(title: string): string {
  let t = title;
  const separators = [' - ', ' | ', ' — '];
  for (const sep of separators) {
    const idx = t.lastIndexOf(sep);
    if (idx !== -1) {
      t = t.slice(0, idx);
    }
  }
  t = t.toLowerCase();
  t = t.replace(/[^a-z0-9 ]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function tokenize(normalized: string): Set<string> {
  return new Set(
    normalized.split(' ').filter(tok => tok.length >= 2 && !STOPWORDS.has(tok))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  a.forEach(tok => {
    if (b.has(tok)) intersection++;
  });
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

function cleanLabel(normalized: string): string {
  const titled = normalized.replace(/\b\w/g, c => c.toUpperCase());
  if (titled.length <= 60) return titled;
  const cut = titled.lastIndexOf(' ', 60);
  return cut > 0 ? titled.slice(0, cut) : titled.slice(0, 60);
}

export function clusterProducts(results: SerpResult[]): ProductCluster[] {
  if (results.length === 0) return [];

  const normalized = results.map(r => normalizeTitle(r.title));
  const tokenSets = normalized.map(n => tokenize(n));

  type ClusterState = {
    indices: number[];
    tokens: Set<string>;
  };

  const clusters: ClusterState[] = results.map((_, i) => ({
    indices: [i],
    tokens: new Set(tokenSets[i]),
  }));

  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (jaccard(clusters[i].tokens, clusters[j].tokens) >= 0.55) {
          const combined: Set<string> = new Set(clusters[i].tokens);
          clusters[j].tokens.forEach(tok => combined.add(tok));
          clusters[i] = {
            indices: [...clusters[i].indices, ...clusters[j].indices],
            tokens: combined,
          };
          clusters.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }

  const productClusters: ProductCluster[] = clusters.map(cluster => {
    const clusterResults = cluster.indices.map(i => results[i]);
    const clusterNormalized = cluster.indices.map(i => normalized[i]);
    const clusterTokenSets = cluster.indices.map(i => tokenSets[i]);

    let bestLabelIdx = 0;
    let bestTokenCount = clusterTokenSets[0].size;
    for (let k = 1; k < clusterTokenSets.length; k++) {
      if (clusterTokenSets[k].size > bestTokenCount) {
        bestTokenCount = clusterTokenSets[k].size;
        bestLabelIdx = k;
      }
    }
    const label = cleanLabel(clusterNormalized[bestLabelIdx]);

    const nonPlaceholder = clusterResults.find(
      r => !r.thumbnail.startsWith('data:image/svg')
    );
    const thumbnail = nonPlaceholder
      ? nonPlaceholder.thumbnail
      : clusterResults[0].thumbnail;

    return { label, thumbnail, results: clusterResults };
  });

  productClusters.sort((a, b) => {
    if (b.results.length !== a.results.length) {
      return b.results.length - a.results.length;
    }
    const minPrice = (cluster: ProductCluster) => {
      const prices = cluster.results
        .map(r => r.price)
        .filter((p): p is number => p !== null);
      return prices.length > 0 ? Math.min(...prices) : Infinity;
    };
    return minPrice(a) - minPrice(b);
  });

  const top = productClusters.slice(0, 6);

  if (top.length < 2) return [];

  return top;
}
