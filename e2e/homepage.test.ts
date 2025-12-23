import { expect, test } from '@playwright/test';

test.describe('Homepage', () => {
	test('should load the homepage with main form', async ({ page }) => {
		await page.goto('/');

		// Wait for page to be fully loaded
		await expect(page).toHaveTitle(/Ostsee-Tiere/);

		// Main form should be visible
		const mainForm = page.locator('form').first();
		await expect(mainForm).toBeVisible();

		// Form should have interactive elements
		await expect(
			page.getByRole('button').or(page.getByRole('textbox')).or(page.getByRole('combobox')).first()
		).toBeVisible();
	});

	test('should have proper meta tags', async ({ page }) => {
		await page.goto('/');

		// Check title
		await expect(page).toHaveTitle(/Ostsee-Tiere/);

		// Check meta description exists and has relevant content about marine animals
		const metaDescription = page.locator('meta[name="description"]').first();
		await expect(metaDescription).toHaveAttribute('content', /Meerestier.*Ostsee|Ostsee.*Meerestier/i);
	});

	test('should render page content properly', async ({ page }) => {
		await page.goto('/');

		// Body should be visible
		await expect(page.locator('body')).toBeVisible();

		// Should have interactive elements (form is functional)
		const interactiveElements = page.getByRole('button').or(page.getByRole('textbox'));
		await expect(interactiveElements.first()).toBeVisible();

		// Form container should be visible
		await expect(page.locator('form').first()).toBeVisible();
	});
});

test.describe('Form Navigation', () => {
	test('should show form step indicators', async ({ page }) => {
		await page.goto('/');

		// All step buttons should be accessible via aria-label
		const positionButton = page.getByRole('button', { name: /Position & Zeit/i });
		await expect(positionButton).toBeVisible();

		// Current step should have aria-current="step" attribute
		const currentStepButton = page.locator('button[aria-current="step"]');
		await expect(currentStepButton).toBeVisible();
	});

	test('should have working form elements', async ({ page }) => {
		await page.goto('/');

		// Wait for form to be visible
		await expect(page.locator('form').first()).toBeVisible();

		// Form should contain input fields (textbox, combobox, or other inputs)
		const formInputs = page
			.getByRole('textbox')
			.or(page.getByRole('combobox'))
			.or(page.getByRole('spinbutton'));
		await expect(formInputs.first()).toBeVisible();
	});

	test('should have clickable step buttons', async ({ page }) => {
		await page.goto('/');

		// Wait for form to be fully loaded
		await expect(page.locator('form').first()).toBeVisible();

		// Get step buttons by their aria-labels (semantic approach)
		const stepButtons = [
			page.getByRole('button', { name: /Position & Zeit/i }),
			page.getByRole('button', { name: /Sichtungsdetails/i }),
			page.getByRole('button', { name: /Beobachtungen/i }),
			page.getByRole('button', { name: /Kontaktdaten/i })
		];

		// Each step button should be visible and clickable
		for (const button of stepButtons) {
			await expect(button).toBeVisible();
			await expect(button).toBeEnabled();
		}

		// Step buttons should have proper accessibility attributes with meaningful labels
		const firstStepButton = stepButtons[0];
		await expect(firstStepButton).toHaveAttribute('aria-label', /Position & Zeit/i);
	});
});
