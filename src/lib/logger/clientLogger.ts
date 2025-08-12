import pino from 'pino';

export const createClientLogger = (context: string) => {
	return pino({
		level: 'debug',
		base: { context },
		browser: { asObject: true }
	});
};
