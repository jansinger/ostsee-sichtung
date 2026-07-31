import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	consumeByteBudget,
	resetByteBudgets,
	getByteBudgetEntryCountForTests,
	getByteBudgetCleanupTimerForTests
} from './byteBudget';

/**
 * Hinweis 1 (Projekt-Review): `sweep()` durchlief bisher bei JEDEM Aufruf von
 * `consumeByteBudget()` die komplette Map. Beim Upload-Pfad (20 Anfragen/h)
 * unkritisch, bei `GET /api/media/[...path]` (300 Anfragen/min) ein
 * unnötiger Voll-Scan auf dem heißen Pfad. `rateLimit.ts` löst dasselbe
 * Problem bereits mit einem periodischen Timer statt Scan-bei-jedem-Aufruf —
 * dieses Modul zieht nach.
 */

const MB = 1024 * 1024;
const BUDGET = { windowMs: 1000, maxBytes: 300 * MB };

describe('Byte-Budget Cleanup (Hinweis 1)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// resetByteBudgets() muss den Timer unter der Fake-Clock NEU anlegen,
		// sonst läuft der beim Modul-Import unter der echten Uhr gestartete
		// Timer weiter und `vi.advanceTimersByTime()` erreicht ihn nie.
		resetByteBudgets();
	});

	afterEach(() => {
		resetByteBudgets();
		vi.useRealTimers();
	});

	it('räumt ein abgelaufenes Konto NICHT synchron bei einem weiteren Aufruf ab', () => {
		consumeByteBudget('ip:1.2.3.4', 10 * MB, BUDGET);
		expect(getByteBudgetEntryCountForTests()).toBe(1);

		// Fenster ist abgelaufen, das Cleanup-Intervall aber noch nicht erreicht.
		vi.advanceTimersByTime(BUDGET.windowMs + 1);

		// Ein Aufruf für eine ANDERE Kennung darf das abgelaufene Konto der
		// ersten nicht synchron mit wegräumen — genau das wäre wieder der
		// volle Map-Scan auf dem heißen Pfad.
		consumeByteBudget('ip:5.6.7.8', 1 * MB, BUDGET);
		expect(getByteBudgetEntryCountForTests()).toBe(2);
	});

	it('räumt abgelaufene Konten periodisch im Hintergrund ab', () => {
		consumeByteBudget('ip:1.2.3.4', 10 * MB, BUDGET);
		expect(getByteBudgetEntryCountForTests()).toBe(1);

		// Weit genug vor, um sowohl das Fenster als auch mindestens einen
		// Lauf des Cleanup-Intervalls sicher zu erreichen.
		vi.advanceTimersByTime(60 * 60 * 1000);

		expect(getByteBudgetEntryCountForTests()).toBe(0);
	});

	it('lässt ein frisches Konto von einem Cleanup-Lauf unangetastet', () => {
		vi.advanceTimersByTime(60 * 60 * 1000);

		consumeByteBudget('ip:9.9.9.9', 5 * MB, BUDGET);
		vi.advanceTimersByTime(1);

		expect(getByteBudgetEntryCountForTests()).toBe(1);
	});

	it('unref()t den Cleanup-Timer, damit er den Node-Prozess nicht am Beenden hindert', () => {
		const timer = getByteBudgetCleanupTimerForTests();

		expect(timer).toBeDefined();
		expect(timer?.hasRef?.()).toBe(false);
	});
});
