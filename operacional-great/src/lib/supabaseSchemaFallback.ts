export function isMissingColumnError(error: unknown, column: string) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';

  const lowerMessage = message.toLowerCase();
  const lowerColumn = column.toLowerCase();

  return (
    lowerMessage.includes(lowerColumn) &&
    (lowerMessage.includes('does not exist') ||
      lowerMessage.includes('could not find') ||
      lowerMessage.includes('schema cache') ||
      lowerMessage.includes('column'))
  );
}

export function omitKeys<T extends Record<string, unknown>, K extends keyof T>(record: T, keys: K[]) {
  const clone = { ...record } as Record<string, unknown>;
  for (const key of keys) {
    delete clone[key as string];
  }
  return clone as Omit<T, K>;
}

export async function runWithSchemaFallback<T>(
  attempts: Array<() => Promise<T>>,
  shouldRetry: (error: unknown) => boolean,
) {
  let lastError: unknown = null;

  for (let index = 0; index < attempts.length; index += 1) {
    try {
      return await attempts[index]();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || index === attempts.length - 1) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Não foi possível concluir a operação.');
}
