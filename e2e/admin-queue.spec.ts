import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';
import { deleteSighting, seedSighting } from './helpers/seedSighting';

/**
 * admin-queue.spec.ts — Warteschlangen-Modus der Detailansicht: den Stapel am
 * Stück abarbeiten.
 *
 * Die Einzeltests (Komponenten- und Unit-Ebene) decken Zielbestimmung
 * (`sightingQueue.test.ts`), Auto-Advance (`queueAdvance.test.ts`) und
 * Tastatur (`adminTriageShortcuts.test.ts`) je für sich ab. Dieser Test prüft
 * die Strecke, die keiner davon allein sieht: dass ein echter Klick auf die
 * Leiste, eine echte Entscheidung über `SightingStatusControl` und ein echtes
 * Undo im Browser zusammenspielen.
 *
 * **Eigene Testzeilen statt echter Eingangs-Sichtungen.** Anders als
 * `admin-sighting-status.spec.ts` (das eine bestehende offene Zeile per
 * `reset` exakt zurückstellt) entscheidet dieser Test über den Stapel selbst.
 * Drei disponible Zeilen über `seedSighting` (`e2e/helpers/seedSighting.ts`,
 * Begründung wie in `admin-detail-actions.spec.ts`) stellen sicher, dass der
 * Eingang nie leer ist, und werden im `afterEach` wieder gelöscht — unabhängig
 * vom Status, in dem der Test sie zurücklässt.
 *
 * **Keine Assertions auf eine bestimmte Nachbar-ID.** `fullyParallel: true`
 * lässt mehrere Tests dieser Datei gleichzeitig laufen; ihre `beforeEach`
 * seeden dann verschachtelt, und die eigenen drei Zeilen liegen im
 * `(created, id)`-Stapel nicht zwingend unmittelbar hintereinander. Geprüft
 * wird deshalb nur, dass sich die URL nach einem Sprung ändert und `from=inbox`
 * trägt — nicht, welche konkrete Sichtung als Nächstes kommt. Wo eine Zeile
 * gezielt angefasst wird (Freigabe, Undo), steuert der Test sie direkt über
 * ihre eigene ID an, statt sich auf „die erste Karte" zu verlassen, die einem
 * parallel laufenden Test gehören könnte.
 */

function seedQueueSighting(referenceId: string): Promise<number> {
	return seedSighting({ referenceId, sightingDate: new Date('2024-06-01T08:30:00.000Z') });
}

test.describe('Admin-Warteschlange', () => {
	/* Älteste zuerst angelegt, damit bei `order=desc` (Default) C vor B vor A
	   erscheint. Die Ordnung ist `(created, id)` — `created` allein genügt nicht
	   und ist hier besonders heikel: Die drei Zeilen entstehen im selben
	   `beforeEach` und können denselben Zeitstempel tragen. Dass die Reihenfolge
	   trotzdem feststeht, leistet der Tiebreaker auf `id` (Begründung in
	   `openQueueOrder.ts`, mechanisch bewacht von `openQueueOrderScan.test.ts`). */
	let idA: number;
	let idB: number;
	let idC: number;

	test.beforeEach(async ({ context, baseURL }) => {
		await seedAdminSession(context, baseURL!);
		idA = await seedQueueSighting('e2e-queue-a');
		idB = await seedQueueSighting('e2e-queue-b');
		idC = await seedQueueSighting('e2e-queue-c');
	});

	test.afterEach(async () => {
		for (const id of [idA, idB, idC]) {
			if (id) await deleteSighting(id);
		}
	});

	test('blättert von der Detailansicht zur nächsten offenen Meldung', async ({ page }) => {
		await page.goto('/admin?order=desc');
		await page.waitForLoadState('networkidle');

		await page.getByRole('link', { name: 'Details' }).first().click();
		await expect(page).toHaveURL(/\/admin\/\d+\?.*from=inbox/);
		await page.waitForLoadState('networkidle');

		const leiste = page.getByRole('navigation', { name: 'Offene Sichtungen' });
		await expect(leiste).toBeVisible();
		await expect(page.getByTestId('queue-counter')).toContainText('offen');

		const ersteUrl = page.url();
		const naechste = leiste.getByRole('link', { name: /Nächste/ });
		/* Am Stapelende gibt es keinen Knopf, sondern reinen Text — bei ~650
		   offenen Meldungen im geteilten Bestand plus drei frisch gesäten
		   praktisch ausgeschlossen, aber ein `test.skip` statt eines
		   irreführenden Fehlschlags ist hier billiger als die Annahme. */
		test.skip((await naechste.count()) === 0, 'Stapelende erreicht — kein „Nächste"-Link');

		await naechste.click();
		await expect(page).toHaveURL(/\/admin\/\d+\?.*from=inbox/);
		await expect(page).not.toHaveURL(ersteUrl);
	});

	test('springt nach einer Freigabe zur nächsten und nimmt sie zurück', async ({ page }) => {
		await page.goto(`/admin/${idC}?from=inbox&order=desc`);
		await page.waitForLoadState('networkidle');
		const vorherigeUrl = page.url();

		/* Klick über `element.click()`, nicht über Playwrights Locator-`click()`:
		   Das Radio ist `sr-only` (`SightingStatusControl.svelte`) — dieselbe
		   Begründung und derselbe Kunstgriff wie in `admin-sighting-status.spec.ts`. */
		await page
			.getByRole('radio', { name: 'Freigegeben' })
			.evaluate((el: HTMLInputElement) => el.click());

		/* Auto-Advance zum Nachbarn (Regelfall am geteilten Bestand) oder zurück
		   in den Eingang, falls C zufällig das Stapelende trifft (`AdvanceTarget`,
		   `sightingQueue.ts`) — in beiden Fällen ändert sich die URL. */
		await expect(page).not.toHaveURL(vorherigeUrl);

		const toast = page.getByText(new RegExp(`Sichtung #${idC} freigegeben`));
		await expect(toast).toBeVisible();

		await page.getByRole('button', { name: 'Rückgängig' }).click();
		await expect(page).toHaveURL(vorherigeUrl);
		await page.waitForLoadState('networkidle');

		/* Die Freigabe ist tatsächlich zurückgenommen — geprüft über die
		   laufende SPA-Session, ohne Reload. Die eigentliche Ursache des
		   Merge-Blockers (Befund 1) sitzt in `AdminSightingView.svelte`: Der
		   dort per `{@const}` berechnete `status` kompiliert zu einem
		   `$derived`, das seine Konsumenten nur bei einer Wertänderung
		   benachrichtigt — beim Sprung zwischen zwei offenen Sichtungen bleibt
		   der Wert `'open'` → `'open'`, `bind:group` allein löst das nicht.
		   `SightingStatusControl.svelte` synchronisiert seinen lokalen
		   `selected`-Spiegel deshalb über `sightingId` (ändert sich bei jedem
		   Sprung garantiert, siehe Docblock dort) statt über `status` selbst;
		   das Radio zeigt den richtigen Zustand deshalb sofort, auch wenn der
		   berechnete Wahrheitswert für „Offen" zwischen den Sichtungen der
		   Warteschlange unverändert `true` bleibt. */
		await expect(page.getByRole('radio', { name: 'Offen' })).toBeChecked();
	});

	/* Aus der Tabelle heraus gibt es bewusst keine Warteschlange (Task 5/6): Dort
	   sind Filter, Sortierung und Paginierung im Spiel, und die Queue wäre ein
	   anderes Feature (`.claude/rules/admin.md`). Direkter Aufruf statt eines
	   Klicks aus der Tabelle — dasselbe Muster wie die Gegenprobe in
	   `admin-inbox.spec.ts` ("führt aus der Tabelle heraus weiterhin in die
	   Tabelle zurück"). */
	test('zeigt aus der Tabelle heraus keine Warteschlange', async ({ page }) => {
		await page.goto(`/admin/${idA}?verified=open`);
		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('navigation', { name: 'Offene Sichtungen' })).toHaveCount(0);
	});

	/* Der schwerste Fehler dieses Features: Ein Undo aus der Tabelle heraus darf
	   den Status zurücksetzen, aber NICHT navigieren. `planAdvance` liefert dafür
	   `undoHref: null`, sobald kein Arbeitsmodus vorliegt (`queueAdvance.ts`) —
	   sonst schriebe der Undo-Href über `inboxDetailHref` unbedingt `?from=inbox`
	   auf eine aus der Tabelle geöffnete Sichtung und der Rückweg landete danach
	   im Eingang statt in der gefilterten Tabelle, mit allen verlorenen Filtern. */
	test('Undo aus der Tabelle setzt den Status zurück, ohne zu navigieren', async ({ page }) => {
		await page.goto(`/admin/${idA}?verified=open`);
		await page.waitForLoadState('networkidle');
		const vorherigeUrl = page.url();

		await page
			.getByRole('radio', { name: 'Freigegeben' })
			.evaluate((el: HTMLInputElement) => el.click());

		// Kein Arbeitsmodus: Der Toast nennt den Status, nicht die Meldung.
		const toast = page.getByText('Status: Freigegeben');
		await expect(toast).toBeVisible();
		await expect(page).toHaveURL(vorherigeUrl);

		await page.getByRole('button', { name: 'Rückgängig' }).click();
		await page.waitForLoadState('networkidle');

		// Kein Sprung — dieselbe Seite, derselbe Datensatz.
		await expect(page).toHaveURL(vorherigeUrl);
		await expect(page.getByRole('radio', { name: 'Offen' })).toBeChecked();
	});
});
