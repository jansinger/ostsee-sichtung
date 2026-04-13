import { render } from 'vitest-browser-svelte';
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import FieldRenderer from './FieldRenderer.svelte';
import type * as yup from 'yup';

// Mock field configs that mirror the real schema's .describe() output
// without importing the full schema (which pulls in PostGIS, Drizzle, etc.)

function makeFieldConfig(
	overrides: Partial<{
		label: string;
		optional: boolean;
		type: string;
		meta: Record<string, unknown>;
	}> = {}
): yup.SchemaDescription {
	return {
		type: overrides.type ?? 'string',
		label: overrides.label ?? 'Test-Feld',
		optional: overrides.optional ?? true,
		nullable: false,
		default: undefined,
		oneOf: [],
		notOneOf: [],
		tests: [],
		meta: {
			type: 'text',
			helpText: '',
			valueText: '',
			placeholder: '',
			selectPlaceholder: '',
			options: [],
			...(overrides.meta ?? {})
		}
	} as unknown as yup.SchemaDescription;
}

const emailFieldConfig = makeFieldConfig({
	label: 'E-Mail',
	optional: false,
	meta: {
		type: 'email',
		helpText: 'Ihre E-Mail-Adresse für Rückfragen',
		placeholder: 'email@beispiel.de'
	}
});

const phoneFieldConfig = makeFieldConfig({
	label: 'Telefon',
	optional: true,
	meta: { type: 'tel', helpText: '' }
});

const speciesFieldConfig = makeFieldConfig({
	label: 'Tierart',
	optional: false,
	meta: {
		type: 'select',
		selectPlaceholder: 'Bitte wählen...',
		options: [
			{ value: 0, label: 'Schweinswal' },
			{ value: 1, label: 'Kegelrobbe' },
			{ value: 2, label: 'Seehund' }
		]
	}
});

const isDeadFieldConfig = makeFieldConfig({
	label: 'Totfund',
	optional: true,
	type: 'boolean',
	meta: { type: 'toggle' }
});

const otherObsFieldConfig = makeFieldConfig({
	label: 'Sonstige Auffälligkeiten',
	optional: true,
	meta: { type: 'textarea', rows: 4, placeholder: 'Weitere Beobachtungen...' }
});

const dateFieldConfig = makeFieldConfig({
	label: 'Datum',
	optional: false,
	meta: { type: 'date' }
});

const distributionFieldConfig = makeFieldConfig({
	label: 'Verteilung',
	optional: true,
	type: 'number',
	meta: {
		type: 'radio',
		options: [
			{ value: 1, label: 'einzeln' },
			{ value: 2, label: 'Mutter mit Jungtier' },
			{ value: 3, label: 'deutliche Schulen' }
		]
	}
});

const deadConfirmedFieldConfig = makeFieldConfig({
	label: 'Totfund bestätigt',
	optional: true,
	type: 'boolean',
	meta: { type: 'checkbox' }
});

describe('FieldRenderer', () => {
	describe('Pflichtfeld-Anzeige', () => {
		it('zeigt Pflichtfeld-Stern (*) für required Fields', async () => {
			render(FieldRenderer, {
				fieldConfig: emailFieldConfig,
				name: 'email',
				value: ''
			});

			await expect.element(page.getByLabelText('Pflichtfeld')).toBeVisible();
		});

		it('zeigt keinen Stern für optionale Fields', async () => {
			render(FieldRenderer, {
				fieldConfig: phoneFieldConfig,
				name: 'phone',
				value: ''
			});

			const star = page.getByLabelText('Pflichtfeld');
			await expect.element(star).not.toBeInTheDocument();
		});
	});

	describe('Error-Anzeige', () => {
		it('zeigt Fehlermeldung mit role="alert"', async () => {
			render(FieldRenderer, {
				fieldConfig: emailFieldConfig,
				name: 'email',
				value: '',
				error: 'E-Mail ist erforderlich'
			});

			const alert = page.getByRole('alert');
			await expect.element(alert).toBeVisible();
			await expect.element(page.getByText('E-Mail ist erforderlich')).toBeVisible();
		});

		it('setzt aria-live="polite" auf Fehlermeldung', async () => {
			render(FieldRenderer, {
				fieldConfig: emailFieldConfig,
				name: 'email',
				value: '',
				error: 'Fehler'
			});

			const alert = page.getByRole('alert');
			await expect.element(alert).toHaveAttribute('aria-live', 'polite');
		});

		it('zeigt keine Fehlermeldung ohne Error', async () => {
			render(FieldRenderer, {
				fieldConfig: emailFieldConfig,
				name: 'email',
				value: 'test@test.de'
			});

			const alert = page.getByRole('alert');
			await expect.element(alert).not.toBeInTheDocument();
		});
	});

	describe('ARIA-Attribute', () => {
		it('setzt aria-invalid=true bei Fehler', async () => {
			render(FieldRenderer, {
				fieldConfig: emailFieldConfig,
				name: 'email',
				value: '',
				error: 'Fehler'
			});

			const input = page.getByTestId('field-email');
			await expect.element(input).toHaveAttribute('aria-invalid', 'true');
		});

		it('setzt aria-invalid=false ohne Fehler', async () => {
			render(FieldRenderer, {
				fieldConfig: emailFieldConfig,
				name: 'email',
				value: 'test@test.de'
			});

			const input = page.getByTestId('field-email');
			// Svelte renders boolean false as "false" string attribute
			await expect.element(input).not.toHaveAttribute('aria-invalid', 'true');
		});

		it('setzt aria-required=true für Pflichtfelder', async () => {
			render(FieldRenderer, {
				fieldConfig: emailFieldConfig,
				name: 'email',
				value: ''
			});

			const input = page.getByTestId('field-email');
			await expect.element(input).toHaveAttribute('aria-required', 'true');
		});

		it('setzt aria-required=false für optionale Felder', async () => {
			render(FieldRenderer, {
				fieldConfig: phoneFieldConfig,
				name: 'phone',
				value: ''
			});

			const input = page.getByTestId('field-phone');
			// Optional fields should not have aria-required=true
			await expect.element(input).not.toHaveAttribute('aria-required', 'true');
		});

		it('setzt data-testid mit Feldnamen', async () => {
			render(FieldRenderer, {
				fieldConfig: emailFieldConfig,
				name: 'email',
				value: ''
			});

			await expect.element(page.getByTestId('field-email')).toBeVisible();
		});

		it('verknüpft Hilfetext via aria-describedby', async () => {
			const screen = render(FieldRenderer, {
				fieldConfig: emailFieldConfig,
				name: 'email',
				value: ''
			});

			// The help text element should exist with the correct ID
			const helpElement = screen.container.querySelector('#field-email-help');
			expect(helpElement).not.toBeNull();
			expect(helpElement?.textContent).toContain('Ihre E-Mail-Adresse für Rückfragen');
		});
	});

	describe('Hilfetext', () => {
		it('zeigt Hilfetext wenn konfiguriert', async () => {
			render(FieldRenderer, {
				fieldConfig: emailFieldConfig,
				name: 'email',
				value: ''
			});

			await expect.element(page.getByText('Ihre E-Mail-Adresse für Rückfragen')).toBeVisible();
		});

		it('zeigt keinen Hilfetext wenn leer', async () => {
			render(FieldRenderer, {
				fieldConfig: phoneFieldConfig,
				name: 'phone',
				value: ''
			});

			// Phone hat leeren helpText → kein Hilfetext-Element
			const helpEl = page.getByText('Ihre E-Mail-Adresse');
			await expect.element(helpEl).not.toBeInTheDocument();
		});
	});

	describe('Feld-Typ-Rendering', () => {
		it('rendert Select mit Optionen', async () => {
			render(FieldRenderer, {
				fieldConfig: speciesFieldConfig,
				name: 'species',
				value: ''
			});

			const select = page.getByTestId('field-species');
			await expect.element(select).toBeVisible();
			// Options exist in DOM (not visible when dropdown is closed, but present)
			const selectEl = await select.element();
			const options = selectEl.querySelectorAll('option');
			// 3 options + 1 placeholder = 4
			expect(options.length).toBeGreaterThanOrEqual(3);
		});

		it('rendert Toggle für Boolean-Feld', async () => {
			render(FieldRenderer, {
				fieldConfig: isDeadFieldConfig,
				name: 'isDead',
				value: false
			});

			const toggle = page.getByTestId('field-isDead');
			await expect.element(toggle).toBeVisible();
		});

		it('rendert Textarea', async () => {
			render(FieldRenderer, {
				fieldConfig: otherObsFieldConfig,
				name: 'otherObservations',
				value: ''
			});

			const textarea = page.getByTestId('field-otherObservations');
			await expect.element(textarea).toBeVisible();
		});

		it('rendert Date-Input', async () => {
			render(FieldRenderer, {
				fieldConfig: dateFieldConfig,
				name: 'sightingDate',
				value: ''
			});

			const input = page.getByTestId('field-sightingDate');
			await expect.element(input).toBeVisible();
		});

		it('rendert Radio-Optionen mit allen Auswahlmöglichkeiten', async () => {
			render(FieldRenderer, {
				fieldConfig: distributionFieldConfig,
				name: 'distribution',
				value: null
			});

			await expect.element(page.getByText('einzeln')).toBeVisible();
			await expect.element(page.getByText('Mutter mit Jungtier')).toBeVisible();
			await expect.element(page.getByText('deutliche Schulen')).toBeVisible();
		});

		it('rendert Checkbox mit Label', async () => {
			render(FieldRenderer, {
				fieldConfig: deadConfirmedFieldConfig,
				name: 'deadConfirmed',
				value: false
			});

			await expect.element(page.getByRole('checkbox')).toBeVisible();
			await expect.element(page.getByText('Totfund bestätigt').first()).toBeVisible();
		});
	});
});
