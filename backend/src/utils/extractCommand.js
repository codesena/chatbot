export const extractJSONCommand = (rawText) => {
  const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
  console.log("jsonMatch", jsonMatch);

  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
};
