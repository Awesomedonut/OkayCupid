import { questions } from '../shared/questions.js';
export const genders = ['Woman', 'Man', 'Nonbinary'];
const seeds = [
['Alex', 31, 'Nonbinary', 'Portland', 'A curious home cook, slow walker, and collector of library holds. Looking for kindness with a little mischief.', 'Cooking · Libraries · Long walks'],
['Maya', 29, 'Woman', 'Portland', 'Urban gardener with more seedlings than windowsills. I love thoughtful questions, shared meals, and showing up for my people.', 'Gardens · Community · Ceramics'],
['Elliot', 34, 'Man', 'Seattle', 'I restore old furniture and make very new mistakes at pottery. A good Sunday has a long walk and a meal with friends.', 'Making things · Trails · Sunday dinners'],
['Rowan', 32, 'Nonbinary', 'Portland', 'Museum educator, amateur bread baker. Equally happy talking about big ideas or noticing very small birds.', 'Art · Baking · Birdwatching'],
['Sofia', 36, 'Woman', 'San Francisco', 'A practical optimist. I organize neighborhood dinners and always pack a book. Hoping to build a warm, lively home.', 'Books · Food · Neighbors'],
['Theo', 28, 'Man', 'Portland', 'Music teacher, enthusiastic cyclist, occasionally good dancer. I like direct communication and unplanned afternoons.', 'Music · Cycling · Dancing'],
['June', 40, 'Woman', 'Seattle', 'Quiet mornings, ambitious hikes, and an ever-changing reading pile. A parent with a full life and space for a thoughtful connection.', 'Hiking · Reading · Family'],
['Sam', 33, 'Nonbinary', 'Austin', 'Community theater person with a sensible spreadsheet habit. I believe care is something we practice, not just something we feel.', 'Theater · Games · Volunteering'],
['Idris', 38, 'Man', 'Portland', 'Engineer by day, soup experimenter by evening. Rooted here, close to family, curious about almost everything.', 'Cooking · Science · Family']
];
export const demo = seeds.map(([name, age, gender, city, bio, interests], n) => {
  const answers = {};
  for (const q of questions) {
    if (n && (q.id + n) % (n + 4) === 0) continue;
    const baseline = (q.id * 7 + Math.floor(q.id / 5)) % 4;
    const answer = n === 0 || (q.id * (n + 3)) % 11 > n ? baseline : (baseline + (n % 3) + 1) % 4;
    answers[q.id] = { answer, acceptable: [answer, (answer + 1) % 4], importance: [1, 10, 50, 250][q.id % 4], private: q.id % 17 === 0, noPreference: q.id % 19 === 0 };
  }
  return { id: `demo-${n}`, name, age, gender, desired: [...genders], city, bio, interests, answers, fictional: true };
});
