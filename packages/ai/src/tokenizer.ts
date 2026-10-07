/**
 * Fast local estimation of token count (~4 characters per token for English text & code)
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}
