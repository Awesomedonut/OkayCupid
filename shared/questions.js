import { historicalQuestions, laterChoices } from './historical.js';
export const questions = [
  { id: 162, prompt: 'Have you ever traveled around another country alone?', topic: 'Lifestyle', options: ['Yes', 'No'], provenance: { ...laterChoices, sourceQuestionId: '113' } },
  ...historicalQuestions
];
export const topics = ['Values', 'Relationships', 'Lifestyle', 'Philosophy', 'Community', 'Communication', 'Interests', 'Future'].filter(topic => questions.some(q => q.topic === topic));
export const retiredQuestionIds = [...Array.from({ length: 160 }, (_, i) => i + 1), 161, 163];
export const activeQuestionIds = new Set(questions.map(q => q.id));
