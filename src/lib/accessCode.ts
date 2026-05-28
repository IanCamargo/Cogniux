export function normalizeAccessCode(raw: string): string {
  const code = raw.trim().toUpperCase();
  if (!code) {
    throw new Error("Código de acesso não pode ser vazio.");
  }
  return code;
}
