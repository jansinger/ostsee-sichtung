import type { ResolvedConfig } from 'vite';
import { describe, expect, it } from 'vitest';
import { stableDepHash } from './vite-stable-dep-hash';

/**
 * Baut ein minimales ResolvedConfig-Stub mit den beiden Feldern, die Vite in
 * den Dep-Optimizer-Hash einrechnet.
 */
function configWith(external: unknown, noExternal: unknown = [], envName = 'ssr'): ResolvedConfig {
	return {
		environments: {
			[envName]: { resolve: { external, noExternal } }
		}
	} as unknown as ResolvedConfig;
}

/** Ruft den configResolved-Hook des Plugins auf. */
function applyPlugin(config: ResolvedConfig): void {
	const hook = stableDepHash().configResolved;
	if (typeof hook !== 'function') throw new Error('configResolved ist kein Hook');
	hook.call({} as never, config);
}

/** Liest ein Environment aus — `noUncheckedIndexedAccess` erzwingt die Prüfung. */
function resolveOf(config: ResolvedConfig, envName = 'ssr') {
	const environment = config.environments[envName];
	if (!environment) throw new Error(`Environment "${envName}" fehlt im Stub`);
	return environment.resolve;
}

describe('stableDepHash', () => {
	it('läuft als post-Plugin, damit spätere configResolved-Hooks nicht mehr umsortieren', () => {
		expect(stableDepHash().enforce).toBe('post');
	});

	it('sortiert resolve.external, damit der Config-Hash stabil bleibt', () => {
		const config = configWith(['local-pkg', '@antfu/install-pkg', 'cookie']);

		applyPlugin(config);

		expect(resolveOf(config).external).toEqual(['@antfu/install-pkg', 'cookie', 'local-pkg']);
	});

	it('sortiert resolve.noExternal', () => {
		const config = configWith([], ['unplugin-icons', 'esm-env', 'svelte']);

		applyPlugin(config);

		expect(resolveOf(config).noExternal).toEqual(['esm-env', 'svelte', 'unplugin-icons']);
	});

	it('erzeugt aus unterschiedlichen Reihenfolgen dasselbe Ergebnis', () => {
		// Das ist die eigentliche Eigenschaft: SvelteKit/Vite füllen resolve.external
		// über parallele Auflösung, die Reihenfolge schwankt zwischen Starts.
		const a = configWith(['local-pkg', '@antfu/install-pkg', 'unplugin']);
		const b = configWith(['unplugin', 'local-pkg', '@antfu/install-pkg']);

		applyPlugin(a);
		applyPlugin(b);

		expect(resolveOf(a).external).toEqual(resolveOf(b).external);
	});

	it('erfasst alle Environments, nicht nur ssr', () => {
		const config = configWith(['b', 'a'], ['d', 'c'], 'client');

		applyPlugin(config);

		expect(resolveOf(config, 'client').external).toEqual(['a', 'b']);
		expect(resolveOf(config, 'client').noExternal).toEqual(['c', 'd']);
	});

	it('lässt nicht-Array-Werte unangetastet', () => {
		// resolve.noExternal darf laut Vite-Typen auch true sein.
		const config = configWith(true, true);

		expect(() => applyPlugin(config)).not.toThrow();
		expect(resolveOf(config).external).toBe(true);
		expect(resolveOf(config).noExternal).toBe(true);
	});

	it('sortiert RegExp-Einträge deterministisch mit', () => {
		const a = configWith([], [/^svelte\//, 'esm-env']);
		const b = configWith([], ['esm-env', /^svelte\//]);

		applyPlugin(a);
		applyPlugin(b);

		expect(String(resolveOf(a).noExternal)).toBe(String(resolveOf(b).noExternal));
	});
});
