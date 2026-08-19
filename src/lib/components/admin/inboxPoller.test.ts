/**
 * Poller für den Hinweis „Neue Meldungen im Eingang" auf `/admin`.
 *
 * Alle Abhängigkeiten sind hineingereicht (HTTP, Sichtbarkeit), damit dieser
 * Test weder Netz noch DOM braucht — und damit die 401-Behandlung im geprüften
 * Modul liegt und nicht in einem ungeprüften Wrapper.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createInboxPoller,
	type InboxPollerOptions,
	type SichtbarkeitsQuelle,
	type StatusAntwort
} from './inboxPoller';

const INTERVALL = 60_000;

/** Ein `document`-Ersatz, dessen Sichtbarkeit der Test steuert. */
function fakeDokument(): SichtbarkeitsQuelle & {
	setzeVerborgen: (wert: boolean) => void;
	loeseWechselAus: () => void;
	hoererAnzahl: () => number;
} {
	const hoerer = new Set<() => void>();
	let verborgen = false;
	return {
		get hidden() {
			return verborgen;
		},
		addEventListener: (_typ, handler) => void hoerer.add(handler),
		removeEventListener: (_typ, handler) => void hoerer.delete(handler),
		setzeVerborgen: (wert) => void (verborgen = wert),
		loeseWechselAus: () => hoerer.forEach((handler) => handler()),
		hoererAnzahl: () => hoerer.size
	};
}

/** Eine Antwort, wie `fetch` sie liefert — auf das reduziert, was der Poller liest. */
const antwort = (status: number, body: unknown = {}) => ({
	status,
	json: () => Promise.resolve(body)
});

describe('createInboxPoller', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	/* Erst zusammenführen, dann zurückgeben: Gäbe der Helfer die Vorgaben
	   zurück statt der tatsächlich benutzten Optionen, prüfte ein Test, der
	   `fetchStatus` überschreibt, hinterher gegen das ungenutzte Vorgabe-Mock. */
	function bauen(overrides: Partial<InboxPollerOptions> = {}) {
		const dokument = fakeDokument();
		const optionen: InboxPollerOptions = {
			baseline: 10,
			fetchStatus: vi.fn().mockResolvedValue(antwort(200, { maxOpenId: 10 })),
			onNeueMeldungen: vi.fn(),
			onSessionEnde: vi.fn(),
			intervalMs: INTERVALL,
			dokument,
			...overrides
		};
		return {
			poller: createInboxPoller(optionen),
			fetchStatus: optionen.fetchStatus as ReturnType<typeof vi.fn>,
			onNeueMeldungen: optionen.onNeueMeldungen as ReturnType<typeof vi.fn>,
			onSessionEnde: optionen.onSessionEnde as ReturnType<typeof vi.fn>,
			dokument: (optionen.dokument ?? dokument) as ReturnType<typeof fakeDokument>
		};
	}

	it('fragt beim Start noch nicht, sondern erst nach dem Intervall', async () => {
		const { poller, fetchStatus } = bauen();

		poller.start();
		expect(fetchStatus).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(INTERVALL);
		expect(fetchStatus).toHaveBeenCalledTimes(1);
	});

	it('meldet nichts, solange die höchste offene ID unverändert ist', async () => {
		const { poller, onNeueMeldungen } = bauen();

		poller.start();
		await vi.advanceTimersByTimeAsync(INTERVALL * 3);

		expect(onNeueMeldungen).not.toHaveBeenCalled();
	});

	it('meldet eine höhere ID genau einmal und hört danach auf zu fragen', async () => {
		const { poller, fetchStatus, onNeueMeldungen } = bauen({
			fetchStatus: vi.fn().mockResolvedValue(antwort(200, { maxOpenId: 11 }))
		});

		poller.start();
		await vi.advanceTimersByTimeAsync(INTERVALL);
		expect(onNeueMeldungen).toHaveBeenCalledTimes(1);

		// Der Hinweis steht; weitere Anfragen könnten daran nichts verbessern.
		await vi.advanceTimersByTimeAsync(INTERVALL * 5);
		expect(fetchStatus).toHaveBeenCalledTimes(1);
		expect(onNeueMeldungen).toHaveBeenCalledTimes(1);
	});

	it('beendet die Sitzung bei 401 und fragt danach nicht weiter', async () => {
		const { poller, fetchStatus, onSessionEnde, onNeueMeldungen } = bauen({
			fetchStatus: vi.fn().mockResolvedValue(antwort(401, { error: 'unauthorized' }))
		});

		poller.start();
		await vi.advanceTimersByTimeAsync(INTERVALL);

		expect(onSessionEnde).toHaveBeenCalledTimes(1);
		expect(onNeueMeldungen).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(INTERVALL * 3);
		expect(fetchStatus).toHaveBeenCalledTimes(1);
	});

	it('übergeht einen Serverfehler und fragt beim nächsten Takt weiter', async () => {
		const { poller, onNeueMeldungen, onSessionEnde } = bauen({
			fetchStatus: vi
				.fn()
				.mockResolvedValueOnce(antwort(500))
				.mockResolvedValue(antwort(200, { maxOpenId: 11 }))
		});

		poller.start();
		await vi.advanceTimersByTimeAsync(INTERVALL);
		expect(onNeueMeldungen).not.toHaveBeenCalled();
		expect(onSessionEnde).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(INTERVALL);
		expect(onNeueMeldungen).toHaveBeenCalledTimes(1);
	});

	it('übergeht einen Netzwerkfehler, ohne die Sitzung zu beenden', async () => {
		const { poller, fetchStatus, onSessionEnde } = bauen({
			fetchStatus: vi
				.fn()
				.mockRejectedValueOnce(new Error('offline'))
				.mockResolvedValue(antwort(200, { maxOpenId: 10 }))
		});

		poller.start();
		await vi.advanceTimersByTimeAsync(INTERVALL * 2);

		expect(onSessionEnde).not.toHaveBeenCalled();
		expect(fetchStatus).toHaveBeenCalledTimes(2);
	});

	it('fragt nicht, solange der Tab im Hintergrund liegt', async () => {
		const { poller, fetchStatus, dokument } = bauen();
		dokument.setzeVerborgen(true);

		poller.start();
		await vi.advanceTimersByTimeAsync(INTERVALL * 3);

		expect(fetchStatus).not.toHaveBeenCalled();
	});

	it('fragt sofort, sobald der Tab wieder sichtbar wird', async () => {
		const { poller, fetchStatus, dokument } = bauen();
		dokument.setzeVerborgen(true);
		poller.start();
		await vi.advanceTimersByTimeAsync(INTERVALL * 2);
		expect(fetchStatus).not.toHaveBeenCalled();

		dokument.setzeVerborgen(false);
		dokument.loeseWechselAus();
		await vi.advanceTimersByTimeAsync(0);

		expect(fetchStatus).toHaveBeenCalledTimes(1);
	});

	it('meldet den Sichtbarkeits-Hörer bei stop() wieder ab', () => {
		const { poller, dokument } = bauen();

		poller.start();
		expect(dokument.hoererAnzahl()).toBe(1);

		poller.stop();
		expect(dokument.hoererAnzahl()).toBe(0);
	});

	it('reagiert nach stop() auf keinen Tab-Wechsel mehr', async () => {
		const { poller, fetchStatus, dokument } = bauen();

		poller.start();
		poller.stop();
		dokument.loeseWechselAus();
		await vi.advanceTimersByTimeAsync(INTERVALL * 2);

		expect(fetchStatus).not.toHaveBeenCalled();
	});

	it('löst onSessionEnde nicht aus, wenn eine 401-Antwort erst nach stop() eintrifft', async () => {
		let aufloesen: ((wert: StatusAntwort) => void) | undefined;
		const { poller, onSessionEnde } = bauen({
			fetchStatus: vi.fn(
				() =>
					new Promise<StatusAntwort>((resolve) => {
						aufloesen = resolve;
					})
			)
		});

		poller.start();
		await vi.advanceTimersByTimeAsync(INTERVALL);

		poller.stop();
		aufloesen?.(antwort(401, { error: 'unauthorized' }));
		await vi.advanceTimersByTimeAsync(0);

		expect(onSessionEnde).not.toHaveBeenCalled();
	});

	it('löst onNeueMeldungen nicht aus, wenn eine höhere ID erst nach stop() eintrifft', async () => {
		let aufloesen: ((wert: StatusAntwort) => void) | undefined;
		const { poller, onNeueMeldungen } = bauen({
			fetchStatus: vi.fn(
				() =>
					new Promise<StatusAntwort>((resolve) => {
						aufloesen = resolve;
					})
			)
		});

		poller.start();
		await vi.advanceTimersByTimeAsync(INTERVALL);

		poller.stop();
		aufloesen?.(antwort(200, { maxOpenId: 11 }));
		await vi.advanceTimersByTimeAsync(0);

		expect(onNeueMeldungen).not.toHaveBeenCalled();
	});
});
