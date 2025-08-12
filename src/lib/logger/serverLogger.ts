import pino from 'pino';
export const createServerLogger = (context: string) => {
	return pino({
		level: 'debug',
		base: { pid: process.pid, context }
	});
};
