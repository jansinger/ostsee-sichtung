import { describe, expect, it } from 'vitest';
import { matchesGlob } from 'node:path';
import { jobsFor, matchPattern, readFilterSteps, readJobGates, readWorkflow } from './ciJobGating';

/**
 * Wächter über die Job-Gates in `.github/workflows/ci.yml`.
 *
 * Der teure Teil von CI (E2E in drei Shards, Component Tests, seit diesem
 * Branch auch `Validate`) läuft nur, wenn passende Dateien geändert wurden.
 * Ein zu weit gefasster Filter macht daraus einen stillen Ausfall: grüner PR,
 * ungelaufene Prüfung. Die Tabellen unten sind die Gegenprobe.
 */
describe('CI-Job-Gating', () => {
	describe('Glob-Annahmen', () => {
		it.each([
			['src/lib/a.ts', 'src/**', true],
			['CLAUDE.md', '**/*.md', true],
			['docs/archive/x.php', 'docs/**', true],
			['.claude/rules/api.md', '.claude/**', true],
			['.github/workflows/ci.yml', '.claude/**', false],
			['vite.config.ts', '*.config.ts', true],
			['docs/a/b.md', '*.md', false],
			// Der Fall, der die Umstellung auf picomatch erzwungen hat, siehe
			// Kommentar in ciJobGating.ts.
			['.github/PULL_REQUEST_TEMPLATE.md', '**/*.md', true],
			['.github/PULL_REQUEST_TEMPLATE.md', '!**/*.md', false]
		])('%s ~ %s → %s', (file, pattern, expected) => {
			expect(matchPattern(pattern, file)).toBe(expected);
		});

		it('hält Extglob und Negation auseinander', () => {
			// `!(src)/a.ts` ist ein Extglob und heißt „a.ts in einem
			// Verzeichnis, das nicht src ist" — NICHT „alles außer
			// src/a.ts". Wer das `!` von Hand abschneidet und das Ergebnis
			// invertiert, bekommt Letzteres und rechnet damit etwas anderes
			// als CI. Deshalb geht das Muster unzerlegt an picomatch.
			expect(matchPattern('!(src)/a.ts', 'docs/a.ts')).toBe(true);
			expect(matchPattern('!(src)/a.ts', 'src/a.ts')).toBe(false);
			// Der Fall, der die beiden Lesarten trennt: Eine Datei, die die
			// Form gar nicht hat. Beim Zerlegen von Hand käme hier `true`
			// heraus, weil „passt nicht" zu „passt" invertiert wird.
			expect(matchPattern('!(src)/a.ts', 'README.md')).toBe(false);

			// Zum Vergleich die echte Negation, auf die sich der Workflow stützt.
			expect(matchPattern('!src/**', 'docs/a.md')).toBe(true);
			expect(matchPattern('!src/**', 'src/a.ts')).toBe(false);
		});

		it('weicht bei Punkt-Verzeichnissen von node:path.matchesGlob ab', () => {
			// Festgehalten, damit niemand die Abhängigkeit „vereinfacht":
			// matchesGlob kennt kein `{dot: true}` und liefert hier das
			// Gegenteil dessen, was CI tut.
			expect(matchesGlob('.github/PULL_REQUEST_TEMPLATE.md', '**/*.md')).toBe(false);
		});
	});

	describe('Nur Dokumentation geändert', () => {
		const docsOnly = [
			['CLAUDE.md'],
			['docs/WORKTREES.md', 'README.md'],
			['.claude/rules/api.md'],
			['.claude/settings.json'],
			['docs/archive/legacy-cakephp/Sichtung.php'],
			['.github/PULL_REQUEST_TEMPLATE.md']
		];

		it.each(docsOnly)('%s → kein Job läuft außer Commit Lint', (...files) => {
			const jobs = jobsFor(files);

			expect(jobs.validate).toBe(false);
			expect(jobs.e2e).toBe(false);
			expect(jobs['component-tests']).toBe(false);
			expect(jobs['migration-check']).toBe(false);
			// Die Commit-Konvention gilt auch für Docs-Commits — dieser Job hat
			// deshalb kein Gate und ist der Grund, warum commitlint aus
			// `Validate` heraus musste.
			expect(jobs['commit-lint']).toBe(true);
		});
	});

	describe('Code geändert', () => {
		it('eine einzige Nicht-Doku-Datei genügt für Validate', () => {
			expect(jobsFor(['README.md', 'src/lib/utils/date.ts']).validate).toBe(true);
		});

		it('auch Dateien, die kein Filter namentlich kennt', () => {
			// Der Sinn der Negativliste: Unbekanntes zählt als Code. Eine
			// Positivliste („src/**, scripts/**, …") müsste bei jeder neuen
			// Datei am Repo-Rand nachgezogen werden und würde beim Vergessen
			// still zu wenig prüfen.
			expect(jobsFor(['scripts/e2e-shards.sh']).validate).toBe(true);
			expect(jobsFor(['.husky/pre-push']).validate).toBe(true);
			expect(jobsFor(['Dockerfile']).validate).toBe(true);
		});

		it('E2E und Component Tests bei Änderungen unter src/', () => {
			const jobs = jobsFor(['src/routes/+page.svelte']);
			expect(jobs.e2e).toBe(true);
			expect(jobs['component-tests']).toBe(true);
		});

		it('E2E auch, wenn nur die Specs selbst sich ändern (#636, #641)', () => {
			expect(jobsFor(['e2e/design-tokens.spec.ts']).e2e).toBe(true);
		});

		it('Migration Check nur bei Schema oder Migrationen', () => {
			expect(jobsFor(['src/lib/server/db/schema.ts'])['migration-check']).toBe(true);
			expect(jobsFor(['drizzle/0042_foo.sql'])['migration-check']).toBe(true);
			expect(jobsFor(['src/lib/utils/date.ts'])['migration-check']).toBe(false);
		});
	});

	describe('Push auf main', () => {
		it('lässt Validate und E2E unabhängig von den Dateien laufen', () => {
			const jobs = jobsFor(['CLAUDE.md'], 'push');
			expect(jobs.validate).toBe(true);
			expect(jobs.e2e).toBe(true);
		});
	});

	describe('Aufbau des Workflows', () => {
		it('hat genau einen Filter-Schritt je Quantor', () => {
			const steps = readFilterSteps(readWorkflow());
			expect(steps.map((step) => [step.id, step.quantifier])).toEqual([
				['filter', 'some'],
				['code-filter', 'every']
			]);
		});

		it('gated Validate über needs-validate', () => {
			expect(readJobGates(readWorkflow()).validate).toEqual(['needs-validate']);
		});

		it('lässt Commit Lint ungegated', () => {
			expect(readJobGates(readWorkflow())['commit-lint']).toEqual([]);
		});
	});
});
