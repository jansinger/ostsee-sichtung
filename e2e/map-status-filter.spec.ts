import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';

/**
 * Der Statusfilter ist die einzige Stelle, an der die öffentliche Karte
 * nicht freigegebene Meldungen zeigt. Geprüft wird deshalb beides: dass die
 * Bedienung für Admins funktioniert UND dass die API sie für alle anderen
 * verweigert — Letzteres unabhängig von der Oberfläche, denn die
 * Sicherheitsgrenze liegt im Endpunkt, nicht im Markup.
 */
test.describe('Statusfilter der Sichtungskarte', () => {
	test('ist ohne Anmeldung nicht sichtbar', async ({ page }) => {
		await page.goto('/map');
		// exact: true — sonst matcht `getByRole` case-insensitiv per Substring
		// auch den "Filter schließen"-Button im geöffneten Panel.
		await page.getByRole('button', { name: 'Filter', exact: true }).click();
		await expect(page.getByText('Bearbeitungsstand')).toHaveCount(0);
	});

	test('die API verweigert den Statusparameter ohne Anmeldung', async ({ request }) => {
		const response = await request.get('/api/map/sightings?status=open');
		expect(response.status()).toBe(403);

		const years = await request.get('/api/map/sightings/years?status=open');
		expect(years.status()).toBe(403);
	});

	test('die öffentliche Antwort bleibt unverändert erreichbar', async ({ request }) => {
		const response = await request.get('/api/map/sightings?year=2026');
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body.type).toBe('FeatureCollection');
	});

	test('Admins können Status wählen, die URL merkt sich die Auswahl', async ({
		page,
		context,
		baseURL
	}) => {
		await seedAdminSession(context, baseURL!, ['admin']);
		await page.goto('/map');
		await page.getByRole('button', { name: 'Filter', exact: true }).click();

		const offen = page.getByLabel('Offen');
		await expect(offen).toBeVisible();

		const request = page.waitForRequest(
			(req) => req.url().includes('/api/map/sightings?') && req.url().includes('status=')
		);
		await offen.click();
		await request;

		await expect.poll(() => new URL(page.url()).searchParams.get('st')).toBe('open,approved');
	});

	/**
	 * Die Gegenrichtung zum Test darüber: Der Test oben belegt, dass die Auswahl
	 * IN die URL geschrieben wird — dass sie beim Laden auch wieder ankommt, hat
	 * bis hierher nichts geprüft. Genau dort stand der Fehler: Der Aufbau-Block
	 * lief als `$effect`, wies `statuses` zu und las es im selben synchronen
	 * Durchlauf über `loadAvailableYears()` wieder, machte sich also selbst
	 * ungültig —
	 * `effect_update_depth_exceeded`, die Jahres-Abfrage lief endlos, und das
	 * Lade-Overlay verschwand nie. Getroffen hat es damit jeden geteilten Link
	 * eines Admins, also genau den Zweck, für den #872 die URL überhaupt füllt.
	 *
	 * Geprüft wird die Wirkung (Karte wird fertig, Auswahl steht) und zusätzlich,
	 * dass die Jahres-Abfrage nicht wiederholt läuft: Ohne die zweite Zusicherung
	 * wäre der Test auch dann grün, wenn die Schleife nur langsamer würde.
	 */
	test('ein geteilter Link mit Statusauswahl lädt die Karte', async ({
		page,
		context,
		baseURL
	}) => {
		await seedAdminSession(context, baseURL!, ['admin']);

		let yearRequests = 0;
		page.on('request', (req) => {
			if (req.url().includes('/api/map/sightings/years')) yearRequests++;
		});

		await page.goto('/map?st=open');

		await expect(page.getByTestId('map-loading-content')).toHaveCount(0, { timeout: 60_000 });

		await page.getByRole('button', { name: 'Filter', exact: true }).click();
		// getByRole statt getByLabel: Bei aktiver Nicht-Standard-Auswahl steht
		// zusätzlich der Zurücksetzen-Chip „Bearbeitungsstand: Offen" auf der
		// Karte, und getByLabel trifft beide.
		await expect(page.getByRole('checkbox', { name: 'Offen', exact: true })).toBeChecked();
		await expect(
			page.getByRole('checkbox', { name: 'Freigegeben', exact: true })
		).not.toBeChecked();

		expect(yearRequests).toBeLessThan(5);
	});

	/**
	 * Der Statuswechsel ist ein Nachladen, kein Neuaufbau: `setStatuses()` tauscht
	 * den Bestand im laufenden Controller aus. Der Aufbau-Block las `statuses`
	 * jedoch synchron (über `loadAvailableYears()`) und führte es als `$effect`
	 * damit als Abhängigkeit — jeder Haken im Filterpanel ließ ihn erneut laufen,
	 * die Aufräumfunktion verwarf die Karteninstanz und es entstand eine neue.
	 * Zoom und Ausschnitt sprangen dabei zurück, während `setStatuses()` daneben
	 * genau dieses Nachladen bereits inkrementell erledigte. Behoben, indem der
	 * Block auf `onMount` steht statt auf `$effect`.
	 *
	 * Geprüft wird über die Identität des DOM-Knotens statt über Zoomwerte: Ein
	 * Neuaufbau ersetzt das von OpenLayers erzeugte `.ol-viewport`, ein
	 * Nachladen lässt es stehen. Eine Zoom-Assertion wäre indirekt und würde
	 * auch bei einer bloßen View-Rücksetzung anschlagen.
	 */
	test('ein Statuswechsel lädt nach, statt die Karte neu aufzubauen', async ({
		page,
		context,
		baseURL
	}) => {
		test.setTimeout(180_000);
		await seedAdminSession(context, baseURL!, ['admin']);
		await page.goto('/map');
		await page.getByTestId('map-loading-content').waitFor({ state: 'detached', timeout: 120_000 });

		const viewport = page.locator('.ol-viewport').first();
		await viewport.waitFor();
		await viewport.evaluate((el) => el.setAttribute('data-vor-statuswechsel', '1'));
		await expect(page.locator('.ol-viewport[data-vor-statuswechsel]')).toHaveCount(1);

		await page.getByRole('button', { name: 'Filter', exact: true }).click();
		const request = page.waitForRequest(
			(req) => req.url().includes('/api/map/sightings?') && req.url().includes('status=')
		);
		await page.getByRole('checkbox', { name: 'Offen', exact: true }).click();
		await request;

		// Derselbe Knoten wie vorher — die Karteninstanz hat den Wechsel überlebt.
		await expect(page.locator('.ol-viewport[data-vor-statuswechsel]')).toHaveCount(1);
	});

	test('Admins können die Auswahl nicht leeren', async ({ page, context, baseURL }) => {
		await seedAdminSession(context, baseURL!, ['admin']);
		await page.goto('/map');
		await page.getByRole('button', { name: 'Filter', exact: true }).click();

		const freigegeben = page.getByLabel('Freigegeben');
		await freigegeben.click();
		await expect(freigegeben).toBeChecked();
	});
});
