import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';

/**
 * admin-sighting-status.spec.ts — Statuswechsel end-to-end über Tabelle und
 * Detailansicht.
 *
 * Task 9 (Abschluss der Status-Vereinheitlichung): Tabelle, Detailansicht und
 * Eingang zeigen denselben abgeleiteten Status (`sightingStatus.ts`) und rufen
 * für jede Änderung denselben Endpunkt (`PATCH /api/sightings/[id]/verify`,
 * `.claude/rules/api.md`). Dieser Test belegt, dass eine in der Tabelle
 * gesetzte Freigabe in der Detailansicht ankommt — nicht nur, dass beide
 * Seiten für sich rendern.
 *
 * **Warum das hier sicher ist, obwohl die Datenbank geteilt ist**
 * (`docs/WORKTREES.md`, Vorbehalt aus `admin-inbox.spec.ts`): Die Zeile kommt
 * bewusst aus `?verified=open` — also `approvedAt`/`rejectedAt` beide `null`.
 * Der letzte Schritt setzt per `reset`-Verdict exakt dorthin zurück (beide
 * wieder `null`), nicht auf einen geschätzten Zwischenstand. Anders als beim
 * Freigabe/Ablehnungs-Flow in `admin-inbox.spec.ts` — dort ist der
 * Ausgangszustand einer bereits bearbeiteten Zeile unbekannt — ist der
 * Ausgangszustand hier exakt der, den `reset` wiederherstellt.
 *
 * **`networkidle` vor dem ersten Klick ist Pflicht.** Vor der Hydration ist
 * das Status-Control ein sichtbarer, anklickbarer Knopf ohne `onchange` — der
 * Klick liefe ins Leere. Dasselbe Signal wie in `admin-inbox.spec.ts`.
 *
 * **Klick über `element.click()`, nicht über Playwrights Locator-`click()`.**
 * Das Radio ist `sr-only` (SightingStatusControl.svelte) — ein 1×1px-Element,
 * dessen sichtbarer Träger das umschließende `<label>` ist. Weder ein Klick
 * auf das Radio selbst (`force: true` eingeschlossen) noch einer auf das
 * Label lösten hier verlässlich das native Label→Control-Forwarding aus;
 * `element.click()` auf dem Radio über `.evaluate()` tut es zuverlässig, weil
 * er den Browser-internen Click-Default (Radio auswählen, `change` feuern)
 * direkt auslöst, unabhängig von Sichtbarkeit und Scroll-Position.
 */
test('Statuswechsel in der Tabelle ist in der Detailansicht sichtbar', async ({
	page,
	context,
	baseURL
}) => {
	if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

	await seedAdminSession(context, baseURL);
	await page.goto('/admin/sichtungen?verified=open');
	await page.waitForLoadState('networkidle');

	const ersteZeile = page.locator('tbody tr[data-sighting-id]').first();
	const id = await ersteZeile.getAttribute('data-sighting-id');
	// Ohne diese Prüfung navigiert der Test bei leerer Tabelle nach `/admin/null`
	// und scheitert dort mit einer Meldung über eine unbekannte Sichtung — statt
	// mit der Ursache, dass `?verified=open` keine Zeile geliefert hat.
	if (!id) throw new Error('keine offene Sichtung in der Tabelle — Seed prüfen');

	try {
		const freigebenRadio = ersteZeile.getByRole('radio', { name: 'Freigegeben' });
		await freigebenRadio.evaluate((el: HTMLInputElement) => el.click());
		// Auf den Toast eingegrenzt: Ohne die Eingrenzung würde derselbe Text auch
		// von einer Statusanzeige in der Zeile erfüllt, und der Test bestätigte die
		// Rückmeldung des Endpunkts nicht mehr.
		await expect(page.locator('.toast').getByText('Status: Freigegeben')).toBeVisible();

		await page.goto(`/admin/${id}`);
		await expect(page.getByRole('radio', { name: 'Freigegeben' })).toBeChecked();
	} finally {
		// Aufräumen im `finally`: Die Datenbank ist zwischen Worktrees geteilt
		// (docs/WORKTREES.md). Stand der Reset am Ende des Testkörpers, blieb die
		// Zeile nach jedem gescheiterten Assert freigegeben — und die im Docblock
		// zugesagte Wiederholbarkeit galt ausgerechnet im Fehlerfall nicht.
		await page.goto(`/admin/${id}`);
		await page.waitForLoadState('networkidle');
		const offenRadio = page.getByRole('radio', { name: 'Offen' });
		await offenRadio.evaluate((el: HTMLInputElement) => el.click());
		await expect(offenRadio).toBeChecked();
	}
});
