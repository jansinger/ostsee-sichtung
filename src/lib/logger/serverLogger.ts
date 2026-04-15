import { env } from '$env/dynamic/private';
import pino from 'pino';
export const createServerLogger = (context: string) => {
	return pino({
		level: (env.LOG_LEVEL ?? 'info') as pino.Level,
		base: { pid: process.pid, context }
	});
};
