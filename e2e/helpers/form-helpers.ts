import { expect, type Page } from '@playwright/test';
import { FormPage } from '../pages/FormPage';

const today = new Date().toISOString().substring(0, 10);

/**
 * Fill Step 1 with valid date, time and a waterway description.
 *
 * `hasPosition` defaults to `false` and there are no more phantom GPS
 * defaults, so `waterway` is required (schema: `waterway.when('hasPosition',
 * { is: (v) => v !== true, then: required })`). Filling it here is the
 * simplest, most stable way to make Step 1 valid — no need to touch the
 * map/coordinate fields.
 */
export async function fillStep1(formPage: FormPage) {
	await formPage.fillDate(today);
	await formPage.fillTime('14:30');
	await formPage.fillWaterway('Kieler Bucht');
}

/**
 * Fill Step 2 with valid sighting details.
 *
 * `boatDrive` is only rendered/required when `sightingFrom` is Segelschiff
 * (1) or Motorboot (2) — see `isBoatSightingFrom` in
 * `src/lib/report/components/sections/boatDriveReset.ts`. With
 * `sightingFrom` = Land (3) the field is hidden, so selecting it here would
 * time out; it must not be touched for this combination.
 */
export async function fillStep2(formPage: FormPage) {
	await formPage.selectSpecies(0); // Schweinswal
	await formPage.fillTotalCount(2);
	await formPage.selectDistance(1);
	await formPage.selectSightingFrom(3); // Land — boatDrive stays hidden
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
	await expect(page.locator('[aria-current="step"]:visible')).toHaveAttribute('aria-label', pattern, {
		timeout: 5000
	});
}

/**
 * Wait for the "Weiter"/"Nächster Schritt" button to be ready for interaction.
 *
 * NOTE: The button is now only ever disabled while a submission is in
 * flight (`$isSubmitting`) — it is no longer a proxy for step validity.
 * Validation errors surface only AFTER a click (see StepNavigation.svelte),
 * and an invalid step simply does not advance `currentStep`. This helper
 * therefore just guards against racing an in-flight submission; it does
 * NOT prove the step's fields are valid. Callers that need proof of a
 * successful navigation must assert the resulting step via
 * `expectCurrentStep()` after `clickNext()`.
 */
export async function waitForNextEnabled(page: Page) {
	await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
		timeout: 3000
	});
}

/** Today's date as YYYY-MM-DD string */
export { today };
