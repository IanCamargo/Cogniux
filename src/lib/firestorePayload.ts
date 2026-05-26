export function stripUndefined<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry !== undefined) {
      out[key] = stripUndefined(entry);
    }
  }
  return out as T;
}

export function getFirestoreErrorMessage(error: unknown, projectId?: string): string {
  if (error instanceof Error) {
    const code = "code" in error && typeof error.code === "string" ? error.code : null;
    if (code === "permission-denied" && projectId) {
      return (
        `permission-denied: sem permissão no Firestore. Publique as regras: ` +
        `npm run deploy:firestore-rules ou ` +
        `https://console.firebase.google.com/project/${projectId}/firestore/rules`
      );
    }
    return code ? `${code}: ${error.message}` : error.message;
  }
  return "Erro desconhecido ao salvar.";
}
