export function normalizeDraft(value) {
  const acceptable = [...(value?.acceptable || [])].sort((a, b) => a - b);
  return {
    answer: value?.answer ?? -1,
    acceptable,
    importance: value?.importance ?? 10,
    private: value?.private || false,
    noPreference: value?.noPreference || false,
    explanation: value?.explanation || "",
  };
}
