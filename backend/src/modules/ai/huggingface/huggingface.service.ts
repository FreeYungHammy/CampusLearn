import { env } from "../../../config/env";
import { HttpException } from "../../../infra/http/HttpException";

const API_TOKEN = env.HUGGINGFACE_API_KEY;
const API_URL =
  "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";

export class HuggingFaceService {
  static async analyzeText(text: string): Promise<any> {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: [
              "toxic",
              "severe_toxic",
              "obscene",
              "threat",
              "insult",
              "identity_hate",
            ],
          },
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
  }
}
