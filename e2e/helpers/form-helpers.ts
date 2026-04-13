import { expect, type Page } from '@playwright/test';
import { FormPage } from '../pages/FormPage';

const today = new Date().toISOString().substring(0, 10);

/** Fill Step 1 with valid date and time */
export async function fillStep1(formPage: FormPage) {
	await formPage.fillDate(today);
	await formPage.fillTime('14:30');
}

/** Fill Step 2 with valid sighting details */
export async function fillStep2(formPage: FormPage) {
	await formPage.selectSpecies(0); // Schweinswal
	await formPage.fillTotalCount(2);
	await formPage.selectDistance(1);
	await formPage.selectSightingFrom(3); // Land
	await formPage.selectBoatDrive(1); // Motor
}

/** Fill Step 4 with valid contact data */
export async function fillStep4(formPage: FormPage) {
	await formPage.fillFirstName('Max');
	await formPage.fillLastName('Mustermann');
	await formPage.fillEmail('max@example.com');
	await formPage.checkPrivacyConsent();
}

/** Wait for the active step indicator to show a specific step name */
export async function expectCurrentStep(page: Page, pattern: RegExp) {
	await expect(page.locator('[aria-current="step"]')).toHaveAttribute('aria-label', pattern, {
		timeout: 5000
	});
}

/** Wait for the Next button to become enabled */
export async function waitForNextEnabled(page: Page) {
	await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
		timeout: 3000
	});
}

/** Today's date as YYYY-MM-DD string */
export { today };
