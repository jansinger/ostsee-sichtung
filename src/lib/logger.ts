// Browser-safe logger — uses Pino browser mode.
// For server-only code (src/lib/server/**, +server.ts) use $lib/logger.server instead.
export { createClientLogger as createLogger } from './logger/clientLogger';
