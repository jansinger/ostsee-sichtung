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

	test('Admins können die Auswahl nicht leeren', async ({ page, context, baseURL }) => {
		await seedAdminSession(context, baseURL!, ['admin']);
		await page.goto('/map');
		await page.getByRole('button', { name: 'Filter', exact: true }).click();

		const freigegeben = page.getByLabel('Freigegeben');
		await freigegeben.click();
		await expect(freigegeben).toBeChecked();
	});
});
