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
	/** Rückweg zur entschiedenen Sichtung — Ziel des „Rückgängig"-Knopfs. */
	undoHref: string;
	toastMessage: string;
}

const VERDICT_WORT: Record<SightingVerdict, string> = {
	approve: 'freigegeben',
	reject: 'abgelehnt',
	reset: 'zurückgesetzt'
};

export function planAdvance(request: AdvanceRequest): AdvancePlan {
	const { sightingId, verdict, queue, queueFailed, order } = request;

	return {
		target: verdict === 'reset' ? { kind: 'stay' } : advanceTarget(queue, queueFailed, order),
		undoHref: queueHref({ id: sightingId, referenceId: '' }, order),
		toastMessage: `Sichtung #${sightingId} ${VERDICT_WORT[verdict]}`
	};
}
