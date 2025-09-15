import { HfInference } from "@huggingface/inference";

const API_KEY = process.env.HUGGINGFACE_API_KEY;

const hf = new HfInference(API_KEY);

export const HuggingFaceService = {
  async analyzeText(text: string): Promise<any> {
    if (!API_KEY) {
      console.warn("Hugging Face API key not found. Skipping analysis.");
      return null;
    }

    try {
      const response = await hf.textClassification({
        model: "roberta-hate-speech-dynabench-r4",
        inputs: text,
      });

      return response;
    } catch (error) {
      console.error("Error analyzing text with Hugging Face API:", error);
      return null;
    }
  },

  isToxic(huggingFaceData: any): boolean {
    if (!huggingFaceData) {
      return false;
    }

    // The model returns an array of classifications.
    // We need to check if any of them are 'toxic'.
    const toxicClassification = huggingFaceData.find(
      (classification: any) => classification.label === "toxic",
    );

    if (toxicClassification && toxicClassification.score > 0.7) {
      return true;
    }

    return false;
  },
};
