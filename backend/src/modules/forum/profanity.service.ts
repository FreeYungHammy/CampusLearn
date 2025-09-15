import { Profanity, ProfanityOptions } from "@2toad/profanity";

const options = new ProfanityOptions();
options.wholeWord = false;

const profanity = new Profanity(options);

export const ProfanityService = {
  isProfane(text: string): boolean {
    return profanity.exists(text);
  },

  censor(text: string): string {
    return profanity.censor(text);
  },
};
