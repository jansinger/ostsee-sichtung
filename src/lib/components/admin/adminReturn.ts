/**
 * Herkunft eines Detailaufrufs im Admin-Bereich.
 *
 * Die Tabelle (`/admin/sichtungen`) verrät sich über ihre Filter-Parameter, die
 * beim Öffnen einer Sichtung mitreisen. Der Eingang (`/admin`) hat keine — er
 * braucht deshalb einen eigenen Marker, sonst landet jeder Rückweg zwangsläufig
 * in der Tabelle, und das Abarbeiten der Liste reißt bei jedem Blick ins Detail ab.
 *
 * Hier stehen nur die Werte, die **beide** Seiten kennen müssen: die
 * Eingangskarte, die den Link baut, und die Detailansicht, die ihn auswertet
 * (`src/routes/admin/[id]/tableReturnUrl.ts`). Der Rückweg selbst gehört dorthin
 * — er braucht die Parameterliste der Tabelle.
 */
export const HERKUNFT_PARAMETER = 'from';
export const HERKUNFT_EINGANG = 'inbox';

/** Anker der Eingangskarte — Gegenstück zur `id` am `<li>` in `/admin`. */
export function inboxAnchor(sightingId: number | string): string {
	return `sichtung-${sightingId}`;
}

/**
 * Detail-Link aus dem Eingang heraus, inklusive Herkunfts-Marker.
 *
 * `order` reist mit, weil es dem Eingang gehört und nicht der Tabelle: Ohne den
 * Parameter fällt die Liste auf dem Rückweg auf ihren Default `desc` zurück,
 * und der Anker träfe dieselbe Karte an ganz anderer Stelle.
 */
export function inboxDetailHref(sightingId: number | string, order?: 'asc' | 'desc'): string {
	const params = new URLSearchParams({ [HERKUNFT_PARAMETER]: HERKUNFT_EINGANG });
	if (order) params.set('order', order);
	return `/admin/${sightingId}?${params}`;
}
