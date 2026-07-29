/**
 * Hält Vites Dep-Optimizer-Cache über Dev-Starts hinweg gültig.
 *
 * Vite bildet den Cache-Key (`configHash` in den `_metadata.json` unter
 * `node_modules/.vite/deps` bzw. `deps_ssr`)
 * unter anderem über `resolve.external` und `resolve.noExternal`. SvelteKit,
 * vite-plugin-svelte und unplugin-icons füllen diese Listen über parallele
 * Auflösung — die Reihenfolge schwankt daher zwischen zwei identischen Starts.
 * Vite sieht einen anderen Hash, meldet
 * „Re-optimizing dependencies because vite config has changed" und bündelt die
 * Dependencies bei *jedem* `npm run dev` neu.
 *
 * Beide Listen werden als Any-Match ausgewertet (`createIsConfiguredAsExternal`),
 * die Reihenfolge ist also bedeutungslos — Sortieren ändert das Verhalten nicht,
 * macht den Hash aber deterministisch.
 *
 * Gemessen (siehe PR-Beschreibung): `ready` 1.6–2.7 s → ~0.6 s, keine
 * Re-Optimierung mehr ab dem zweiten Start.
 */
import type { Plugin } from 'vite';

export function stableDepHash(): Plugin {
	return {
		name: 'ostsee:stable-dep-hash',
		/**
		 * `configResolved` ist der letzte Hook vor der Initialisierung des
		 * Dep-Optimizers. `enforce: 'post'` sorgt dafür, dass die Sortierung nach
		 * den `configResolved`-Hooks aller anderen Plugins läuft — sonst könnte ein
		 * Plugin danach noch anhängen und die Reihenfolge erneut kippen.
		 *
		 * Gemessen ist das aktuell nicht nötig (die Listen stehen schon vor dem
		 * ersten `configResolved` fest, kein Plugin mutiert sie danach). Es macht
		 * die Garantie aber strukturell statt zufällig und kostet nichts.
		 */
		enforce: 'post',
		configResolved(config) {
			for (const environment of Object.values(config.environments)) {
				const { resolve } = environment;
				if (Array.isArray(resolve.external)) resolve.external.sort();
				if (Array.isArray(resolve.noExternal)) resolve.noExternal.sort();
			}
		}
	};
}
