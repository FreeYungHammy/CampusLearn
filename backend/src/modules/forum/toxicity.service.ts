import { pipeline, TextClassificationPipeline } from "@xenova/transformers";

class ToxicityService {
  private static instance: Promise<TextClassificationPipeline> | null = null;

  static getInstance(): Promise<TextClassificationPipeline> {
    if (this.instance === null) {
      this.instance = pipeline(
        "text-classification",
        "Xenova/toxic-bert",
      ) as Promise<TextClassificationPipeline>;
    }
    return this.instance;
  }

  static async checkToxicity(text: string): Promise<any> {
    const classifier = await this.getInstance();
    return classifier(text);
  }
}

export default ToxicityService;
