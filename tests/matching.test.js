import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, eligible } from '../shared/matching.js';
import { questions, topics } from '../shared/questions.js';
import { demo } from '../server/demo.js';
const qs = questions.slice(0, 2);
const answer = (own, acceptable, importance, extra = {}) => ({ answer: own, acceptable, importance, private: false, noPreference: false, ...extra });
test('directional satisfaction uses each member’s distinct accepted answers and weights', () => {
  const a = { 1: answer(0, [1], 250), 2: answer(0, [0], 50) };
  const b = { 1: answer(1, [0], 1), 2: answer(1, [1], 10) };
  const result = compare(a, b, qs);
  assert.equal(result.directionalA, 250 / 300);
  assert.equal(result.directionalB, 1 / 11);
  assert.equal(result.rawCompatibility, Math.sqrt((250 / 300) * (1 / 11)));
  assert.equal(result.score, 0);
  assert.equal(result.conflicts[0].strong, true);
});
test('no overlap and zero weight in either direction remain unknown', () => {
  assert.equal(compare({}, {}, qs).score, null);
  assert.equal(compare({ 1: answer(0, [0], 1) }, { 2: answer(0, [0], 1) }, qs).score, null);
  const r = compare({ 1: answer(0, [0], 0) }, { 1: answer(0, [0], 250) }, qs);
  assert.equal(r.score, null);
  assert.equal(r.overlap, 1);
  assert.equal(r.directionalA, null);
});
test('irrelevance and explicit no preference add no denominator weight', () => {
  const a = { 1: answer(0, [1], 250, { noPreference: true }), 2: answer(0, [0], 10) };
  const b = { 1: answer(0, [0], 50), 2: answer(0, [0], 10) };
  assert.equal(compare(a, b, qs).score, 50);
  a[1].noPreference = false;
  a[1].importance = 0;
  assert.equal(compare(a, b, qs).score, 50);
});
test('a completely unmet direction produces a genuine zero', () => {
  assert.equal(compare({ 1: answer(0, [0], 10) }, { 1: answer(1, [0], 10) }, qs).score, 0);
});
test('private questions influence the score but never expose question-specific details', () => {
  const a = { 1: answer(0, [0], 250, { private: true }), 2: answer(0, [0], 10) };
  const b = { 1: answer(1, [0], 250), 2: answer(0, [0], 10) };
  const r = compare(a, b, qs);
  assert.equal(r.score, 0);
  assert.equal(r.privateOverlap, 1);
  assert.equal(r.conflicts.length, 0);
  assert.deepEqual(r.shared.map(x => x.id), [2]);
  assert.equal(r.topics.Values.overlap, 1);
  b[2].private = true;
  assert.equal(compare(a, b, qs).shared.length, 0);
});
test('eligibility requires both gender preferences and excludes self', () => {
  const a = { id: 1, gender: 'Woman', desired: ['Nonbinary'] };
  const b = { id: 2, gender: 'Nonbinary', desired: ['Man'] };
  assert.equal(eligible(a, b), false);
  b.desired.push('Woman');
  assert.equal(eligible(a, b), true);
  assert.equal(eligible(a, a), false);
});
test('catalog has 160 app-written prompts and 81 sourced prompts and demo has eight adult candidates', () => {
  assert.equal(questions.filter(q => !q.provenance).length, 160);
  assert.equal(questions.filter(q => q.provenance).length, 81);
  assert.equal(new Set(questions.map(q => q.prompt)).size, 241);
  assert.equal(new Set(questions.map(q => q.id)).size, 241);
  assert.equal(topics.length, 8);
  assert.ok(questions.filter(q => !q.provenance).every(q => q.options.length === 4 && new Set(q.options).size === 4));
  assert.equal(demo.length, 9);
  assert.ok(demo.every(p => p.age >= 18 && p.fictional));
});

test('historical published score subtracts 1/N from perfect raw compatibility', () => {
  for (const [n, expected] of [[1, 0], [2, 50], [50, 98], [100, 99]]) {
    const catalog = questions.slice(0, n);
    const answers = Object.fromEntries(catalog.map(q => [q.id, answer(0, [0], 10)]));
    const result = compare(answers, answers, catalog);
    assert.equal(result.overlap, n);
    assert.equal(result.rawCompatibility, 1);
    assert.equal(result.score, expected);
  }
});
test('archived asymmetric example yields raw 94.4% and published 44%', () => {
  const a = { 1: answer(2, [1, 2], 50), 2: answer(1, [1], 1) };
  const b = { 1: answer(1, [1], 1), 2: answer(0, [1], 10) };
  const result = compare(a, b, qs);
  assert.equal(result.directionalA, 50 / 51);
  assert.equal(result.directionalB, 10 / 11);
  assert.equal(result.rawCompatibility, Math.sqrt((50 / 51) * (10 / 11)));
  assert.equal(result.score, 44);
});
test('all and none acceptable ignore directional weight but preserve reverse satisfaction', () => {
  for (const acceptable of [[], [0, 1, 2, 3]]) {
    const a = { 1: answer(1, acceptable, 250), 2: answer(0, [0], 10) };
    const b = { 1: answer(0, [0], 50), 2: answer(0, [0], 10) };
    const result = compare(a, b, qs);
    assert.equal(result.directionalA, 1);
    assert.equal(result.directionalB, 10 / 60);
    assert.equal(result.conflicts[0].strong, true);
    const only = compare(a, b, qs.slice(0, 1));
    assert.equal(only.directionalA, null);
    assert.equal(only.directionalB, 0);
    assert.equal(only.score, null);
    assert.equal(only.rawCompatibility, null);
  }
});
test('historical N counts all common answers, including mutually irrelevant ones', () => {
  const a = { 1: answer(0, [0], 10), 2: answer(0, [], 250) };
  const result = compare(a, a, qs);
  assert.equal(result.meaningful, 1);
  assert.equal(result.overlap, 2);
  assert.equal(result.score, 50);
});
