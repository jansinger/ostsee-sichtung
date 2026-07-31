import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import { createForm } from '$lib/form/createForm';
import { key as formContextKey } from '$lib/report/formContext';
import { initialFormState } from '$lib/report/formConfig';
import type { FormContext, SightingFormData } from '$lib/types';
import Media from './Media.svelte';

/**
 * Die Medien-Einwilligung ist eine Aussage der meldenden Person, kein Attribut
 * des Datensatzes. Ein Admin kann sie deshalb nicht stellvertretend erteilen —
 * und ein Häkchen, das er setzen kann, hätte auch keinen Nachweis: Der
 * Zeitstempel würde die Bearbeitungszeit tragen und damit eine Zustimmung
 * behaupten, die nie stattgefunden hat.
 *
 * Im Admin-Formular bleibt das Feld deshalb sichtbar (der Zustand ist für die
 * Sachbearbeitung relevant), aber gesperrt. Im öffentlichen Formular muss es
 * bedienbar bleiben — sonst kann niemand mehr einwilligen.
 */
function renderMedia(props: { adminMode?: boolean } = {}): void {
	const context = {
		...createForm<SightingFormData>({
			initialValues: { ...initialFormState } as SightingFormData,
			onSubmit: () => undefined
		}),
		mediaStore: { mediaFiles: [] }
	} as unknown as FormContext;

	// Sobald `context` mitgegeben wird, verlangt die Render-API die Props unter
	// dem `props`-Schlüssel — sonst gelten sie als unbekannte Svelte-Optionen.
	render(Media, { props, context: new Map([[formContextKey, context]]) });
}

function consentInput(): HTMLInputElement {
	const element = document.querySelector<HTMLInputElement>('[data-testid="field-mediaConsent"]');
	if (!element) throw new Error('Feld "mediaConsent" nicht im DOM');
	return element;
}

describe('Media — Einwilligung zur Veröffentlichung', () => {
	it('ist im öffentlichen Formular bedienbar', () => {
		renderMedia();

		expect(consentInput().disabled).toBe(false);
	});

	it('ist im Admin-Formular gesperrt', () => {
		renderMedia({ adminMode: true });

		expect(consentInput().disabled).toBe(true);
	});

	it('zeigt im Admin-Formular weiterhin den Zustand an', () => {
		// Sperren heißt nicht verstecken — die Sachbearbeitung muss sehen, ob
		// eine Veröffentlichung erlaubt ist.
		renderMedia({ adminMode: true });

		expect(consentInput()).toBeTruthy();
	});

	it('begründet die Sperre sichtbar', () => {
		// Der Grund darf nicht nur in einem `title` stecken: An einem
		// `disabled`-Element ist der per Tastatur nicht erreichbar.
		renderMedia({ adminMode: true });

		expect(document.body.textContent).toMatch(/meldende|melderin|melder|betroffene/i);
	});
});
