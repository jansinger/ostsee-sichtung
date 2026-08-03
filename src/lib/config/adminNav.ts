/**
 * Die drei Bereiche der Verwaltung — an genau einer Stelle.
 *
 * Sie erscheinen zweimal: als Gruppe „Verwaltung" in der TopBar
 * (`PublicNavbar.svelte`, der Einstieg von außen) und als Unternavigation
 * innerhalb des Bereichs (`routes/admin/+layout.svelte`, zum Wechseln mit
 * einem Klick). Beide Listen von Hand zu pflegen hieße, dass eine neue
 * Sektion an einer der beiden Stellen fehlt — und zwar unbemerkt, weil beide
 * Ansichten für sich vollständig aussehen.
 */
export interface AdminBereich {
	href: string;
	label: string;
}

export const ADMIN_BEREICHE: readonly AdminBereich[] = [
	{ href: '/admin', label: 'Sichtungen' },
	{ href: '/admin/statistics', label: 'Statistiken' },
	{ href: '/admin/settings', label: 'Einstellungen' }
] as const;

/**
 * Welcher Bereich zu einem Pfad gehört.
 *
 * „Sichtungen" per Ausschluss statt über `pfad === '/admin'`: Detail-,
 * Bearbeiten- und Referenzseiten (`/admin/123`, `/admin/ref/…`) sind Teil
 * derselben Aufgabe. Ohne den Ausschluss verlöre die Markierung beim Öffnen
 * einer Sichtung ohne erkennbaren Grund ihren aktiven Eintrag.
 *
 * Die Kehrseite ist bewusst in Kauf genommen: Eine künftige Sektion unter
 * `/admin/` fällt hier automatisch unter „Sichtungen", bis sie in
 * `ADMIN_BEREICHE` steht. Deshalb liegt die Zuordnung hier neben der Liste
 * und nicht in einer der beiden Komponenten — wer die Liste erweitert, sieht
 * die Regel.
 */
export function aktiverAdminBereich(pfad: string): string | null {
	if (!istAdminPfad(pfad)) return null;

	const treffer = ADMIN_BEREICHE.find(
		(bereich) => bereich.href !== '/admin' && pfad.startsWith(bereich.href)
	);
	if (treffer) return treffer.href;

	/* /admin/docs ist keiner der drei Bereiche — dort ist kein Eintrag aktiv. */
	return pfad.startsWith('/admin/docs') ? null : '/admin';
}

/**
 * Gehört der Pfad zum Verwaltungsbereich?
 *
 * Der Schrägstrich in `'/admin/'` ist nicht kosmetisch: `startsWith('/admin')`
 * allein würde auch `/administration` einschließen.
 */
export function istAdminPfad(pfad: string): boolean {
	return pfad === '/admin' || pfad.startsWith('/admin/');
}
