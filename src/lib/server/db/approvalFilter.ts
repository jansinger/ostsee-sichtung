/**
 * @fileoverview Freigabestatus (`freigegeben_am`) als expliziter Abfragefilter
 *
 * Die öffentliche Karte (`/sichtungen/showreports.json`) zeigt ausschließlich
 * freigegebene Sichtungen. Die öffentlichen Statistiken zählten dagegen lange
 * jede eingegangene Meldung mit — Karte und Zahlentext widersprachen sich
 * dadurch sichtbar (Stand 2026-07-27: 19.262 freigegeben vs. 19.877 gesamt).
 *
 * Damit beide Seiten nicht erneut auseinanderlaufen, wird das Prädikat hier
 * **einmal** definiert und von allen öffentlichen Abfragen importiert. Ein
 * Aufrufer, der den Freigabestatus ignoriert, fällt beim Review auf, weil er
 * diesen Import nicht hat.
 *
 * Vorgabe des Deutschen Meeresmuseums (2026-07-27):
 * 1. Im öffentlichen Bereich zählen nur freigegebene Sichtungen.
 * 2. Nicht freigegebene dürfen in der Admin-Statistik vorkommen, aber niemals
 *    mit freigegebenen zu **einer** Zahl vermischt werden.
 * 3. Eine Statistikzahl ohne erkennbaren Freigabebezug soll es nicht geben.
 */

import { sightings } from '$lib/server/db/schema';
import { isNotNull, isNull, type SQL } from 'drizzle-orm';

/**
 * Freigabestatus einer Auswertung.
 *
 * `'both'` liefert bewusst **getrennte** Werte je Status und niemals eine
 * vermischte Summe — siehe Vorgabe 2 oben.
 */
export type SightingScope = 'approved' | 'pending' | 'both';

/** Ein einzelner, eindeutig zuordenbarer Freigabestatus. */
export type ResolvedSightingScope = Exclude<SightingScope, 'both'>;

/**
 * Nur freigegebene Sichtungen — die Grundmenge des öffentlichen Bereichs.
 *
 * Auch `/sichtungen/showreports.json` (Legacy-Karte) filtert hierüber, damit
 * Karte und Statistik dieselbe Menge zählen. Dieser Endpunkt ist an den
 * Legacy-Vertrag gebunden: Änderungen an diesem Prädikat ändern seine Response.
 * `statisticsApprovalScope.test.ts` pinnt es deshalb gegen den Ausdruck, der
 * dort ursprünglich wörtlich stand.
 */
export const approvedOnly = (): SQL => isNotNull(sightings.approvedAt);

/** Nur noch nicht freigegebene Sichtungen (Admin-Sicht). */
export const pendingOnly = (): SQL => isNull(sightings.approvedAt);

/** Liefert den Filter zum jeweiligen Status. */
export const approvalFilter = (scope: ResolvedSightingScope): SQL =>
	scope === 'approved' ? approvedOnly() : pendingOnly();
