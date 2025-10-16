// Manual mock for toxicity.service.ts
// This prevents Jest from trying to parse the problematic @xenova/transformers library

const ToxicityService = {
  getInstance: jest.fn().mockResolvedValue({
    classify: jest.fn().mockResolvedValue([{ label: 'toxic', score: 0.1 }])
  }),
  checkToxicity: jest.fn().mockResolvedValue([{ label: 'toxic', score: 0.1 }]),
};

export default ToxicityService;

