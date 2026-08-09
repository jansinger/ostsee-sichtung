import { describe, expect, it } from 'vitest';
import type { SpamCheckResult } from '$lib/types/spam';
import { HIGH_RISK_THRESHOLD } from '$lib/types/spam';
import {
	SPAM_RISK_PRESENTATION,
	SPAM_SUSPICIOUS_THRESHOLD,
	getSpamRisk,
	getSpamRiskFromResult
} from './spamScorePresentation';

describe('getSpamRisk', () => {
	it('unterscheidet „nie bewertet" von „bewertet, unauffällig"', () => {
		// Der eigentliche Grund für dieses Modul: In der Eingangskarte war NULL
		// bis 2026-08 ein `badge-ghost` mit „Spam: –" und damit optisch dasselbe
		// wie Score 0 — „geprüft, sauber". `docs/SPAM_DETECTION.md` sagt das
		// Gegenteil: NULL heißt Altbestand/Legacy-Eingang, nie geprüft.
		expect(getSpamRisk(null)).toBe('unrated');
		expect(getSpamRisk(0)).toBe('clean');
		expect(getSpamRisk(null)).not.toBe(getSpamRisk(0));
	});

	it('behandelt undefined wie null', () => {
		expect(getSpamRisk(undefined)).toBe('unrated');
	});

	it.each([
		[0, 'clean'],
		[1, 'clean'],
		[2, 'suspicious'],
		[4, 'suspicious'],
		[5, 'high'],
		[10, 'high']
	] as const)('Score %i → %s', (score, erwartet) => {
		expect(getSpamRisk(score)).toBe(erwartet);
	});

	it('hängt an den Schwellen und nicht an kopierten Zahlen', () => {
		expect(getSpamRisk(SPAM_SUSPICIOUS_THRESHOLD - 1)).toBe('clean');
		expect(getSpamRisk(SPAM_SUSPICIOUS_THRESHOLD)).toBe('suspicious');
		expect(getSpamRisk(HIGH_RISK_THRESHOLD - 1)).toBe('suspicious');
		expect(getSpamRisk(HIGH_RISK_THRESHOLD)).toBe('high');
	});
});

describe('getSpamRiskFromResult', () => {
	function ergebnis(overrides: Partial<SpamCheckResult>): SpamCheckResult {
		return { score: 0, isHighRisk: false, indicators: [], ...overrides };
	}

	it('folgt dem Server-Urteil `isHighRisk`, nicht dem nachgerechneten Score', () => {
		// Für eine geglückte Prüfung sagen beide dasselbe (`score >= 5`) — die
		// Client-Schwelle wäre also meist folgenlos. Verlassen darf man sich
		// darauf trotzdem nicht: `isHighRisk` ist das Urteil des Servers.
		expect(getSpamRiskFromResult(ergebnis({ score: 5, isHighRisk: true }))).toBe('high');
		expect(getSpamRiskFromResult(ergebnis({ score: 3, isHighRisk: false }))).toBe('suspicious');
		expect(getSpamRiskFromResult(ergebnis({ score: 0, isHighRisk: false }))).toBe('clean');
	});

	it('eine fehlgeschlagene Prüfung ist nicht bewertet — trotz `isHighRisk: true`', () => {
		// Der Fail-Safe-Zweig in `spamDetector.ts` liefert Score 0 UND
		// `isHighRisk: true`. Beides wörtlich zu nehmen ergäbe „Hochrisiko ohne
		// einen einzigen Indikator". Es ist derselbe Fall wie NULL in der
		// Datenbank: geprüft wurde nichts.
		const fehlgeschlagen = ergebnis({
			score: 0,
			isHighRisk: true,
			indicators: ['Spam-Prüfung fehlgeschlagen'],
			failed: true
		});
		expect(getSpamRiskFromResult(fehlgeschlagen)).toBe('unrated');
	});
});

describe('SPAM_RISK_PRESENTATION', () => {
	it('gibt „nie bewertet" bewusst kein Badge', () => {
		expect(SPAM_RISK_PRESENTATION.unrated.badgeClass).toBeNull();
	});

	it('trägt die Bedeutung nicht allein über die Farbe (WCAG 1.4.1)', () => {
		const bewertet = ['clean', 'suspicious', 'high'] as const;
		const icons = bewertet.map((risk) => SPAM_RISK_PRESENTATION[risk].icon);
		expect(icons.every((icon) => typeof icon === 'string' && icon.length > 0)).toBe(true);
		expect(new Set(icons).size).toBe(bewertet.length);
	});

	it('verwendet Flächenfarben ohne `-strong`-Suffix', () => {
		for (const risk of ['clean', 'suspicious', 'high'] as const) {
			expect(SPAM_RISK_PRESENTATION[risk].badgeClass).toMatch(/^badge-(?!.*-strong)/);
		}
	});

	it('benennt jeden Zustand eindeutig', () => {
		const labels = Object.values(SPAM_RISK_PRESENTATION).map((p) => p.label);
		expect(new Set(labels).size).toBe(labels.length);
	});
});
