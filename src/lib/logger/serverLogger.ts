import { env } from '$env/dynamic/private';
import pino from 'pino';

const VALID_PINO_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;

function resolveLogLevel(value: string | undefined): pino.Level {
	if (value && (VALID_PINO_LEVELS as readonly string[]).includes(value)) {
		return value as pino.Level;
	}
	return 'info';
}

export const createServerLogger = (context: string) => {
	return pino({
		level: resolveLogLevel(env.LOG_LEVEL),
		base: { pid: process.pid, context }
	});
};
