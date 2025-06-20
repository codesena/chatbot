export const extractJSONCommand = (rawText) => {
  const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
};
