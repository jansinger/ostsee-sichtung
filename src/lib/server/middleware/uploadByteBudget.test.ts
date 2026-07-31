import { beforeEach, describe, expect, it } from 'vitest';
import { consumeByteBudget, resetByteBudgets } from './uploadByteBudget';

const MB = 1024 * 1024;
const BUDGET = { windowMs: 60 * 60 * 1000, maxBytes: 300 * MB };

beforeEach(() => {
	resetByteBudgets();
});

describe('consumeByteBudget', () => {
	it('lässt den ersten Upload durch und bucht ihn ab', () => {
		const result = consumeByteBudget('ip:1.2.3.4', 100 * MB, BUDGET);

		expect(result.allowed).toBe(true);
		expect(result.usedBytes).toBe(100 * MB);
		expect(result.remainingBytes).toBe(200 * MB);
	});

	it('summiert über mehrere Uploads derselben Kennung', () => {
		consumeByteBudget('ip:1.2.3.4', 100 * MB, BUDGET);
		const result = consumeByteBudget('ip:1.2.3.4', 100 * MB, BUDGET);

		expect(result.allowed).toBe(true);
		expect(result.usedBytes).toBe(200 * MB);
	});

	it('lehnt ab, sobald das Budget überschritten würde', () => {
		consumeByteBudget('ip:1.2.3.4', 250 * MB, BUDGET);
		const result = consumeByteBudget('ip:1.2.3.4', 100 * MB, BUDGET);

		expect(result.allowed).toBe(false);
		expect(result.remainingBytes).toBe(50 * MB);
	});

	it('bucht eine abgelehnte Anfrage NICHT ab', () => {
		consumeByteBudget('ip:1.2.3.4', 250 * MB, BUDGET);
		consumeByteBudget('ip:1.2.3.4', 100 * MB, BUDGET);
		// Eine kleinere Datei muss danach noch passen — sonst sperrt ein
		// einzelner zu großer Versuch die Kennung für den Rest der Stunde aus.
		const result = consumeByteBudget('ip:1.2.3.4', 40 * MB, BUDGET);

		expect(result.allowed).toBe(true);
		expect(result.usedBytes).toBe(290 * MB);
	});

	it('führt getrennte Konten je Kennung', () => {
		consumeByteBudget('ip:1.2.3.4', 250 * MB, BUDGET);
		const result = consumeByteBudget('ip:5.6.7.8', 250 * MB, BUDGET);

		expect(result.allowed).toBe(true);
		expect(result.usedBytes).toBe(250 * MB);
	});

	it('lässt eine einzelne Datei durch, die genau das Budget ausschöpft', () => {
		const result = consumeByteBudget('ip:1.2.3.4', 300 * MB, BUDGET);

		expect(result.allowed).toBe(true);
		expect(result.remainingBytes).toBe(0);
	});
});
