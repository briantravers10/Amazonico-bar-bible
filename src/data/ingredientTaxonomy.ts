// Lightweight keyword-based classifier used only to build plausible (not ridiculous)
// multiple-choice distractors. Never used to alter the source-of-truth recipe data.

export type IngredientBucket =
  | "spirit"
  | "juice"
  | "sweetener"
  | "bitters"
  | "mixer"
  | "liqueur"
  | "garnish-item"
  | "other";

const SPIRIT_KEYWORDS = [
  "vodka", "gin", "rum", "tequila", "whisk", "bourbon", "rye", "mezcal", "cognac",
  "brandy", "cachaca", "pisco", "hennessy", "tanqueray", "ketel", "casamigos",
  "bulleit", "flor de", "leblon", "monkey shoulder", "don julio", "zacapa",
  "jameson", "jw black", "black label", "talisker", "seedlip", "hendrick", "neft",
];
const JUICE_KEYWORDS = ["juice", "puree", "chicha morada"];
const SWEETENER_KEYWORDS = ["syrup", "cordial", "nectar", "honey", "sugar", "agave", "grenadine"];
const BITTERS_KEYWORDS = ["bitter"];
const MIXER_KEYWORDS = ["soda", "water", "tonic", "ginger beer", "ginger ale", "champagne", "cola", "prosecco", "sparkling", "veuve", "dom perignon"];
const LIQUEUR_KEYWORDS = [
  "cointreau", "chambord", "kahlua", "amaretto", "disaronno", "carpano", "campari",
  "aperol", "cherry heering", "maraschino", "chartreuse", "benedictine", "fernet",
  "drambuie", "amaro", "vermouth", "lillet", "absinthe", "cream", "liqueur", "liquor",
];

function matches(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function classifyIngredient(name: string): IngredientBucket {
  if (matches(name, SWEETENER_KEYWORDS)) return "sweetener";
  if (matches(name, JUICE_KEYWORDS)) return "juice";
  if (matches(name, BITTERS_KEYWORDS)) return "bitters";
  if (matches(name, MIXER_KEYWORDS)) return "mixer";
  if (matches(name, LIQUEUR_KEYWORDS)) return "liqueur";
  if (matches(name, SPIRIT_KEYWORDS)) return "spirit";
  return "other";
}
