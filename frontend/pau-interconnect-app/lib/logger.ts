type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = process.env.NODE_ENV !== "production";

function shouldLog(level: LogLevel): boolean {
  if (level === "error" || level === "warn") return true;
  return isDev;
}

function withPrefix(scope: string, message: string): string {
  return `[${scope}] ${message}`;
}

export const logger = {
  debug(scope: string, message: string, meta?: unknown): void {
    if (!shouldLog("debug")) return;
    if (meta !== undefined) {
      console.debug(withPrefix(scope, message), meta);
      return;
    }
    console.debug(withPrefix(scope, message));
  },

  info(scope: string, message: string, meta?: unknown): void {
    if (!shouldLog("info")) return;
    if (meta !== undefined) {
      console.info(withPrefix(scope, message), meta);
      return;
    }
    console.info(withPrefix(scope, message));
  },

  warn(scope: string, message: string, meta?: unknown): void {
    if (!shouldLog("warn")) return;
    if (meta !== undefined) {
      console.warn(withPrefix(scope, message), meta);
      return;
    }
    console.warn(withPrefix(scope, message));
  },

  error(scope: string, message: string, meta?: unknown): void {
    if (!shouldLog("error")) return;
    if (meta !== undefined) {
      console.error(withPrefix(scope, message), meta);
      return;
    }
    console.error(withPrefix(scope, message));
  },
};
