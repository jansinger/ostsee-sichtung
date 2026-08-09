/**
 * @fileoverview Was nach einer Entscheidung im Warteschlangen-Modus passiert.
 *
 * DOM-frei und ohne Netzwerkaufruf, damit der Ablauf ohne gerenderte Seite
 * prüfbar ist.
 *
 * **Zurücksetzen springt nicht weiter.** `reset` bringt eine Sichtung in den
 * Stapel zurück, statt sie zu verlassen — wegzuspringen hieße, die gerade
 * wiederhergestellte Meldung sofort aus dem Blick zu nehmen.
 */
import { advanceTarget, queueHref, type AdvanceTarget, type SightingQueue } from './sightingQueue';
import type { SightingVerdict } from './sightingVerdict';

export interface AdvanceRequest {
	sightingId: number;
	verdict: SightingVerdict;
	queue: SightingQueue | null;
	queueFailed: boolean;
	order: 'asc' | 'desc';
}

export interface AdvancePlan {
	target: AdvanceTarget;
	/**
	 * Rückweg zur entschiedenen Sichtung — Ziel des „Rückgängig"-Knopfs.
	 * `null`, wenn kein Advance stattfand (`target.kind === 'stay'`) — das
	 * betrifft zwei Fälle: außerhalb des Warteschlangen-Modus
	 * (`queue === null && !queueFailed`, die Detailansicht aus der Tabelle
	 * geöffnet) und innerhalb des Warteschlangen-Modus bei `reset` oder
	 * fehlgeschlagener Queue-Abfrage. `queueHref` stempelt über
	 * `inboxDetailHref` bedingungslos `?from=inbox` — das schriebe im ersten
	 * Fall die Herkunft der Tabellenansicht auf den Eingang um, obwohl gar kein
	 * Advance stattfindet. Im zweiten Fall wäre der Href zwar korrekt, aber
	 * nutzlos: Man steht bereits auf der entschiedenen Sichtung, ein `goto`
	 * darauf lädt nur neu und wirft die Scroll-Position weg.
	 */
	undoHref: string | null;
	toastMessage: string;
}

const VERDICT_WORT: Record<SightingVerdict, string> = {
	approve: 'freigegeben',
	reject: 'abgelehnt',
	reset: 'zurückgesetzt'
};

export function planAdvance(request: AdvanceRequest): AdvancePlan {
	const { sightingId, verdict, queue, queueFailed, order } = request;
	const target =
		verdict === 'reset' ? { kind: 'stay' as const } : advanceTarget(queue, queueFailed, order);

	return {
		target,
		undoHref: target.kind !== 'stay' ? queueHref({ id: sightingId, referenceId: '' }, order) : null,
		toastMessage: `Sichtung #${sightingId} ${VERDICT_WORT[verdict]}`
	};
}
