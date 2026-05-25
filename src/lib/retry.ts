export interface RetryOptions {
  maxAttempts?: number;
  backoffMs?: number;
  timeoutMs?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, backoffMs = 1000, timeoutMs = 30000 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Tempo limite excedido na chamada à IA.")), timeoutMs)
        ),
      ]);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, backoffMs * attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Falha após múltiplas tentativas.");
}
