import { browser } from '$app/environment';
import { createClientLogger } from './logger/clientLogger';
import { createServerLogger } from './logger/serverLogger';

// Exportiere die passende createLogger-Funktion
export function createLogger(context: string = 'base') {
	return browser ? createClientLogger(context) : createServerLogger(context);
}
