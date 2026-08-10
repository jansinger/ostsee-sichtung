import { describe, expect, it } from 'vitest';
import vitestConfig from '../vitest.config';
import { flattenScript, projectsCoveredBy, readScripts, vitestProjectsIn } from './testGate';

/**
 * Wächter über das Gate vor dem Commit.
 *
 * `test:quick` ist in `CLAUDE.md` und `.claude/rules/testing.md` als das Kommando
 * benannt, das vor jedem Commit durchlaufen muss. Deckt es nicht jedes Projekt aus
 * `vitest.config.ts` ab, meldet es Erfolg für Tests, die es nie ausgeführt hat —
 * genau der stille Ausfall, der am 2026-08-10 sieben Komponenten-Tests als "grün"
 * durchgehen ließ. Ein neues Vitest-Projekt bricht diesen Test, statt still
 * unbeobachtet zu bleiben.
 */
const GATE_SCRIPT = 'test:quick';

function configuredProjectNames(): string[] {
	const projects = vitestConfig.test?.projects ?? [];
	return projects.map((project, index) => {
		const name = typeof project === 'object' && project?.test?.name;
		if (typeof name !== 'string') {
			throw new Error(`Vitest-Projekt #${index} hat keinen Namen — Wächter kann nicht prüfen`);
		}
		return name;
	});
}

describe('Test-Gate', () => {
	it('kennt mehr als ein Vitest-Projekt (sonst prüft der Wächter nichts)', () => {
		expect(configuredProjectNames().length).toBeGreaterThan(1);
		expect(configuredProjectNames()).toContain('client');
	});

	it(`${GATE_SCRIPT} fährt jedes konfigurierte Vitest-Projekt`, () => {
		const covered = projectsCoveredBy(GATE_SCRIPT);
		if (covered === 'all') return;

		// Fehlermeldung nennt die Lücke beim Namen — "expected [server] to equal
		// [server, client]" allein sagt nicht, was zu tun ist.
		const missing = configuredProjectNames().filter((name) => !covered.includes(name));
		expect(
			missing,
			`${GATE_SCRIPT} lässt die Vitest-Projekte ${missing.join(', ')} aus. ` +
				`Entweder ins Skript aufnehmen oder die Dokumentation auf ein anderes Gate umstellen.`
		).toEqual([]);
	});

	it('npm test zeigt auf dasselbe Gate', () => {
		// `npm test` ist der Reflex; zeigte es auf etwas Engeres, hätte die
		// Dokumentation wieder zwei Wahrheiten.
		expect(flattenScript('test')).toEqual(flattenScript(GATE_SCRIPT));
	});

	describe('Auflösung der npm-Skripte', () => {
		const scripts = {
			a: 'npm run b && echo zwei',
			b: 'echo eins',
			zyklisch: 'npm run zyklisch'
		};

		it('löst verschachtelte npm-run-Aufrufe auf', () => {
			expect(flattenScript('a', scripts)).toEqual(['echo eins', 'echo zwei']);
		});

		it('bricht bei einem Zyklus ab statt endlos zu laufen', () => {
			expect(() => flattenScript('zyklisch', scripts)).toThrow(/Zyklus/);
		});

		it('meldet ein fehlendes Skript', () => {
			expect(() => flattenScript('gibtsnicht', scripts)).toThrow(/Kein npm-Skript/);
		});

		it('nimmt jedes echte Skript aus package.json auseinander', () => {
			// Kein zufälliger Treffer: Sobald ein Skript eine Form bekommt, die
			// `flattenScript` nicht kennt (Klammern, `;`, `||`), fällt es hier auf.
			for (const name of Object.keys(readScripts())) {
				expect(() => flattenScript(name)).not.toThrow();
			}
		});
	});

	describe('Projekt-Erkennung', () => {
		it.each([
			['vitest run --project server', ['server']],
			['vitest run --project=client', ['client']],
			['vitest run --project server --project client', ['server', 'client']],
			['vitest run', 'all'],
			['vitest run --coverage --project server', ['server']],
			['eslint . --config eslint.config.js', null],
			// `vitest` ohne `run` ist der Watch-Modus — der ist kein Gate.
			['vitest --project server', null]
		])('%s → %j', (command, expected) => {
			expect(vitestProjectsIn(command)).toEqual(expected);
		});
	});
});
