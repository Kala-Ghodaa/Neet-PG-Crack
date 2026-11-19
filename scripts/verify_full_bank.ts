// scripts/verify_full_bank.ts
import { validateQuestionBankImportPayload } from '../src/services/examEngine';
import { ALL_BUILTIN_MOCK_QUESTIONS, MOCK_PREFERRED_CODES, getQuestionsForMock } from '../src/data/mockPaperQuestionBank';

console.log('Verifying 3,800 Question Bank against official Schema v1.0 and Psychometric Validator...');

console.log(`Total questions in bank: ${ALL_BUILTIN_MOCK_QUESTIONS.length}`);
if (ALL_BUILTIN_MOCK_QUESTIONS.length !== 3800) {
  throw new Error(`Expected 3,800 questions, got ${ALL_BUILTIN_MOCK_QUESTIONS.length}`);
}

const validation = validateQuestionBankImportPayload(ALL_BUILTIN_MOCK_QUESTIONS);
console.log(`Validator report:
- Valid: ${validation.valid}
- Valid Count: ${validation.validCount} / ${validation.totalSubmitted}
- Duplicate IDs in payload: ${validation.duplicateIdsInPayload.length}
- Probable content duplicates: ${validation.probableContentDuplicates.length}
- Errors: ${validation.errors.length}`);

if (!validation.valid || validation.errors.length > 0) {
  console.error('First 5 validation errors:', validation.errors.slice(0, 5));
  process.exit(1);
}

// Check Intra-Mock Uniqueness for all 20 Mocks
console.log('\nAuditing Intra-Mock Repetition for all 20 Scheduled Mocks:');
const mockKeys = Object.keys(MOCK_PREFERRED_CODES);
console.log(`Total configured benchmark mocks: ${mockKeys.length}`);

for (const mockId of mockKeys) {
  const mockQuestions = getQuestionsForMock(mockId);
  const expectedCount = mockId.startsWith('neet') ? 180 : 200;
  if (mockQuestions.length !== expectedCount) {
    throw new Error(`Mock ${mockId} expected ${expectedCount} Qs, got ${mockQuestions.length}`);
  }

  const idSet = new Set<string>();
  const textSet = new Set<string>();
  for (const q of mockQuestions) {
    if (idSet.has(q.questionId)) {
      throw new Error(`Intra-mock duplicate ID in ${mockId}: ${q.questionId}`);
    }
    idSet.add(q.questionId);

    const normText = q.question.text.trim().toLowerCase();
    if (textSet.has(normText)) {
      throw new Error(`Intra-mock duplicate question text in ${mockId}: "${q.question.text}"`);
    }
    textSet.add(normText);
  }
}
console.log('✓ Intra-mock uniqueness: 0% duplicate questions inside any of the 20 mocks.');

// Check Inter-Mock Overlap across all pairs (i, j)
console.log('\nAuditing Inter-Mock Overlap across all distinct pairs (i, j):');
let totalPairsChecked = 0;
let totalOverlapCount = 0;

for (let i = 0; i < mockKeys.length; i++) {
  const mockA = mockKeys[i];
  const qA = new Set(MOCK_PREFERRED_CODES[mockA]);
  for (let j = i + 1; j < mockKeys.length; j++) {
    const mockB = mockKeys[j];
    const qB = new Set(MOCK_PREFERRED_CODES[mockB]);
    const overlap = [...qA].filter((id) => qB.has(id));
    if (overlap.length > 0) {
      console.error(`Overlap detected between ${mockA} and ${mockB}: ${overlap.length} shared Qs`);
      totalOverlapCount += overlap.length;
    }
    totalPairsChecked++;
  }
}

console.log(`Total mock pairs evaluated: ${totalPairsChecked}`);
console.log(`Total question collisions across all pairs: ${totalOverlapCount}`);
if (totalOverlapCount !== 0) {
  throw new Error(`Inter-mock overlap detected! Total collisions: ${totalOverlapCount}`);
}
console.log('✓ Inter-mock uniqueness: 0% question overlap between any two scheduled mocks.');

console.log('\nALL 3,800 QUESTIONS VERIFIED 100% UNIQUE AND COMPLIANT!');
