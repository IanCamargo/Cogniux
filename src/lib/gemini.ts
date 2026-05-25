export function parseJsonResponse<T>(text: string): T {
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonStr = jsonMatch ? jsonMatch[0] : text;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error("Resposta da IA não contém JSON válido.");
  }
}
