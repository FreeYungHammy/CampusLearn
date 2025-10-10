// backend/tests/__mocks__/toxicity.service.ts

// This is a manual mock to replace the real ToxicityService during tests.
// It prevents Jest from trying to parse the problematic @xenova/transformers library.

export default {
  checkToxicity: jest.fn().mockResolvedValue([{ label: 'toxic', score: 0.1 }]),
};
