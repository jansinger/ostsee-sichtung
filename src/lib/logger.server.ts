// Server-only logger — uses Pino with LOG_LEVEL env var support.
// Import this from +server.ts files and src/lib/server/** modules.
// Browser-side components use $lib/logger instead.
export { createServerLogger as createLogger } from './logger/serverLogger';
