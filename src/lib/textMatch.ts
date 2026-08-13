export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function fuzzyNameMatch(userInput: string, correctName: string): boolean {
  const u = normalize(userInput);
  const c = normalize(correctName);
  if (!u) return false;
  if (u === c) return true;
  if (c.includes(u) && u.length >= 3) return true;
  if (u.includes(c) && c.length >= 3) return true;
  const maxAllowedDistance = c.length > 8 ? 3 : c.length > 4 ? 2 : 1;
  return levenshtein(u, c) <= maxAllowedDistance;
}

export function tokenOverlap(correctText: string, userText: string): number {
  const correctTokens = normalize(correctText)
    .split(" ")
    .filter((t) => t.length >= 3);
  if (correctTokens.length === 0) return 1;
  const userNorm = normalize(userText);
  const hits = correctTokens.filter((t) => userNorm.includes(t)).length;
  return hits / correctTokens.length;
}
