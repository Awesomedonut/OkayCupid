export const weights = [0, 1, 10, 50, 250];
export function compare(a, b, questions) {
  let earnedA = 0, totalA = 0, earnedB = 0, totalB = 0;
  let overlap = 0, meaningful = 0, privateOverlap = 0;
  const shared = [], conflicts = [], topics = {};
  for (const q of questions) {
    const x = a[q.id], y = b[q.id];
    if (!x || !y) continue;
    overlap++;
    const wx = x.noPreference || x.acceptable.length === 0 || x.acceptable.length === q.options.length ? 0 : x.importance;
    const wy = y.noPreference || y.acceptable.length === 0 || y.acceptable.length === q.options.length ? 0 : y.importance;
    const acceptsA = x.acceptable.includes(y.answer), acceptsB = y.acceptable.includes(x.answer);
    totalA += wx; totalB += wy;
    earnedA += acceptsA ? wx : 0; earnedB += acceptsB ? wy : 0;
    if (wx || wy) meaningful++;
    if (x.private || y.private) { privateOverlap++; continue; }
    const detail = { id: q.id, topic: q.topic, prompt: q.prompt, yours: q.options[x.answer], theirs: q.options[y.answer], strong: (!acceptsA && wx >= 50) || (!acceptsB && wy >= 50) };
    topics[q.topic] ??= { overlap: 0, aligned: 0 };
    topics[q.topic].overlap++;
    if ((!wx || acceptsA) && (!wy || acceptsB)) { shared.push(detail); topics[q.topic].aligned++; }
    else conflicts.push(detail);
  }
  const directionalA = totalA ? earnedA / totalA : null;
  const directionalB = totalB ? earnedB / totalB : null;
  const rawCompatibility = directionalA === null || directionalB === null ? null : Math.sqrt(directionalA * directionalB);
  const score = rawCompatibility === null ? null : Math.round(100 * Math.max(0, rawCompatibility - 1 / overlap));
  return { score, rawCompatibility, directionalA, directionalB, overlap, meaningful, privateOverlap, confidence: meaningful < 10 ? 'Early signal' : meaningful < 40 ? 'Taking shape' : 'More context', shared, conflicts, topics };
}
export function eligible(a, b) {
  return a.id !== b.id && a.desired.includes(b.gender) && b.desired.includes(a.gender);
}
