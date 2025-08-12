import { getContext, setContext } from 'svelte';
import type { FormContext } from './types';

/**
 * Svelte context key for the form system
 */
export const key = Symbol('form-context');

export function getFormContext(): FormContext {
	return getContext<FormContext>(key);
}

export function setFormContext(context: FormContext): void {
	setContext(key, context);
}
