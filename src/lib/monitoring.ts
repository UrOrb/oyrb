type MonitoringContext = Record<string, string | number | boolean | null | undefined>;

function serializeError(error: unknown): { name?: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }
  return { message: typeof error === "string" ? error : JSON.stringify(error) };
}

export function reportError(scope: string, error: unknown, context: MonitoringContext = {}): void {
  console.error(JSON.stringify({
    level: "error",
    scope,
    error: serializeError(error),
    context,
    timestamp: new Date().toISOString(),
  }));
}

export function reportWarning(scope: string, message: string, context: MonitoringContext = {}): void {
  console.warn(JSON.stringify({
    level: "warn",
    scope,
    message,
    context,
    timestamp: new Date().toISOString(),
  }));
}
