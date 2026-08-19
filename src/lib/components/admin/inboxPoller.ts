/**
 * @fileoverview Poller hinter dem Hinweis „Neue Meldungen im Eingang" auf `/admin`.
 *
 * Die Beschriftung sagt bewusst „im Eingang" und nicht „eingegangen": Der
 * Vergleich unten erkennt jede Vergrößerung der offenen Menge, nicht nur neu
 * erstellte Meldungen. Nimmt ein zweiter Bearbeiter eine Freigabe per `reset`
 * zurück, kehrt ihre Sichtung in die offene Menge zurück und kann dabei eine
 * höhere `id` als die Baseline tragen — der Hinweis erscheint dann zu Recht
 * (es gibt neue offene Arbeit), obwohl nichts „eingegangen" ist. „im Eingang"
 * beschreibt beide Fälle richtig, „eingegangen" nur den ersten.
 *
 * Warum Abfragen statt einer stehenden Verbindung: Die gemessene Meldefrequenz
 * liegt im Spitzenmonat bei rund 0,9 Meldungen pro Stunde. Eine SSE- oder
 * WebSocket-Verbindung bräuchte dafür einen Broadcast in beiden Schreibwegen
 * (`/api/sightings`, `/rest_sichtungen`), Keep-Alive gegen Proxy-Timeouts,
 * Reconnect-Logik und ein definiertes Verhalten beim Container-Neustart.
 *
 * Das Modul hält bewusst **keinen** nach außen sichtbaren Zustand und keine
 * Runes: Es meldet per Callback, die Seite hält ihr `$state`. Damit stellt sich
 * die Frage nach globalem `$state` in einem Modul (SSR-Datenleck, siehe
 * `.claude/rules/architecture.md`) gar nicht erst.
 *
 * Stillschweigende Annahme: Sichtungs-IDs steigen monoton — der Vergleich unten
 * ist ausschließlich `maxOpenId > baseline`. Das Projekt hat dazu eine
 * dokumentierte Altlast (`db-transfer-nach-prod-2026-07-31`): Beim Prod-Transfer
 * fehlte `sichtungen_seq` im `pg_dump` und kollidierte bei 1840. Fiele die
 * Sequenz je wieder zurück, bliebe der Hinweis still aus — nicht falsch, nur
 * verspätet —, bis sie ihren alten Höchststand erneut überholt.
 */

/** Der Teil von `document`, den der Poller liest — im Test ein Doppelgänger. */
export type SichtbarkeitsQuelle = {
	readonly hidden: boolean;
	addEventListener(typ: 'visibilitychange', handler: () => void): void;
	removeEventListener(typ: 'visibilitychange', handler: () => void): void;
};

/** Eine `fetch`-Antwort, reduziert auf das, was der Poller liest. */
export type StatusAntwort = { status: number; json: () => Promise<unknown> };

export type InboxPollerOptions = {
	/** Höchste offene Sichtungs-ID zum Ladezeitpunkt der Seite. */
	baseline: number;
	fetchStatus: () => Promise<StatusAntwort>;
	onNeueMeldungen: () => void;
	onSessionEnde: () => void;
	intervalMs?: number;
	dokument?: SichtbarkeitsQuelle | null;
};

export type InboxPoller = { start: () => void; stop: () => void };

/** 60 s — großzügig bemessen gegenüber knapp einer Meldung pro Stunde. */
export const INBOX_POLL_INTERVAL_MS = 60_000;

export function createInboxPoller(options: InboxPollerOptions): InboxPoller {
	const intervalMs = options.intervalMs ?? INBOX_POLL_INTERVAL_MS;
	const dokument =
		options.dokument ??
		(typeof document === 'undefined' ? null : (document as SichtbarkeitsQuelle));

	let timer: ReturnType<typeof setInterval> | null = null;
	let aktiv = false;

	function stop(): void {
		if (!aktiv) return;
		aktiv = false;
		if (timer !== null) {
			clearInterval(timer);
			timer = null;
		}
		dokument?.removeEventListener('visibilitychange', beiSichtbarkeitswechsel);
	}

	async function pruefe(): Promise<void> {
		if (!aktiv || dokument?.hidden) return;

		let antwort: StatusAntwort;
		try {
			antwort = await options.fetchStatus();
		} catch {
			// Netzaussetzer sind kein Grund, den Melder abzuschalten.
			return;
		}

		// stop() kann während der Abfrage aufgerufen worden sein — dann darf die
		// inzwischen eingetroffene Antwort keinen Callback mehr auslösen.
		if (!aktiv) return;

		if (antwort.status === 401) {
			stop();
			options.onSessionEnde();
			return;
		}
		if (antwort.status !== 200) return;

		let maxOpenId: number;
		try {
			const koerper = (await antwort.json()) as { maxOpenId?: unknown };
			maxOpenId = Number(koerper?.maxOpenId ?? 0);
		} catch {
			return;
		}

		// Derselbe Grund wie oben: stop() kann während des Parsens dazwischengekommen sein.
		if (!aktiv) return;

		if (!Number.isFinite(maxOpenId) || maxOpenId <= options.baseline) return;

		// Der Hinweis steht; weitere Abfragen könnten daran nichts verbessern.
		// Ein tagelang offener Tab fragt danach gar nicht mehr.
		stop();
		options.onNeueMeldungen();
	}

	function beiSichtbarkeitswechsel(): void {
		if (!dokument?.hidden) void pruefe();
	}

	function start(): void {
		if (aktiv) return;
		aktiv = true;
		timer = setInterval(() => void pruefe(), intervalMs);
		dokument?.addEventListener('visibilitychange', beiSichtbarkeitswechsel);
	}

	return { start, stop };
}
