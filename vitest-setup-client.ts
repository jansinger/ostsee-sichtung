/**
 * Vitest Client-Side Test Setup
 * Runs before each browser-based component test (.svelte.test.ts)
 *
 * Note: vitest-browser-svelte handles its own render cleanup.
 * This file only resets browser storage between tests.
 */

import { beforeEach } from 'vitest';

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
});
