import { env } from "../../config/env";
import { HttpException } from "../../infra/http/HttpException";

const API_TOKEN = env.HUGGINGFACE_API_KEY;
const API_URL =
  "https://api-inference.huggingface.co/models/unitary/unbiased-toxic-roberta";

export const HuggingFaceService = {
  async analyzeText(text: string): Promise<any> {
    if (!API_TOKEN) {
      console.warn("Hugging Face API key not found. Skipping analysis.");
      return null;
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `Hugging Face API request failed with status ${response.status}: ${errorBody}`,
        );
        throw new HttpException(
          500,
          `Hugging Face API request failed with status ${response.status}`,
        );
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("Error in HuggingFaceService.analyzeText:", error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        500,
        "An unexpected error occurred while analyzing text.",
      );
    }
  },

  isToxic(huggingFaceData: any): boolean {
    if (!huggingFaceData || !huggingFaceData[0]) {
      return false;
    }

    console.log("Hugging Face Data:", JSON.stringify(huggingFaceData, null, 2));

    const classifications = huggingFaceData[0];

    const toxicClassification = classifications.find(
      (classification: any) => classification.label === "toxicity",
    );

    if (toxicClassification) {
      console.log("Toxicity score:", toxicClassification.score);
      if (toxicClassification.score > 0.05) {
        return true;
      }
    }

    return false;
  },
};
