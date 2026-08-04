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

/**
 * Der Einleitungstext folgt der Fassung des Museums — mit einer bewussten
 * Auslassung.
 *
 * Das Dokument schlägt vor: „Mit dem Hochladen Ihrer Fotos stimmen Sie deren
 * Speicherung durch das Deutsche Meeresmuseum zu." Genau das steht schon an
 * jeder Dropzone, und zwar genauer: `UPLOAD_NOTICE` nennt die sofortige
 * Übertragung, die Zweckbindung auf die fachliche Prüfung, die automatische
 * Löschung nicht abgeschickter Meldungen und die spätere eigene Entscheidung
 * über eine Veröffentlichung. Eine zweite, kürzere Fassung daneben wäre keine
 * Zusammenfassung, sondern eine abweichende Aussage über denselben Vorgang —
 * dieselbe Begründung, aus der `UploadNotice.svelte` den vollen Wortlaut in
 * einem Dialog hält statt ihn zu kürzen.
 *
 * Übernommen sind deshalb Titel, Einladungssatz und der Verweis auf die
 * Einwilligung darunter. Die zweite Einwilligung („ausschließlich intern"),
 * die das Dokument zusätzlich vorsieht, ist bewusst nicht gebaut: Sie bräuchte
 * ein Schema-Feld, eine DB-Spalte und zwei Nachweisspalten. Ohne sie ist der
 * unangekreuzte Zustand die interne Nutzung — was `mediaConsent.valueText`
 * bereits sagt.
 */
describe('Media — Einleitungstext nach der Fassung des Museums', () => {
	it('kündigt den Abschnitt als optional an', () => {
		renderMedia();

		expect(document.body.textContent).toContain('Fotos/Videos hochladen (optional)');
	});

	it('lädt zum Hochladen ein', () => {
		renderMedia();

		expect(document.body.textContent).toMatch(/Sie können Aufnahmen zu Ihrer Meldung hochladen/i);
	});

	/**
	 * Auf einen Ausschnitt des neuen Satzes geprüft, nicht auf das Wort
	 * „Veröffentlichung" allein: Das steht bereits im Schema-Label von
	 * `mediaConsent` („Veröffentlichung meiner Aufnahmen"), ein Test darauf wäre
	 * auch ohne den neuen Absatz grün.
	 */
	it('verweist auf die Auswahl zur Veröffentlichung darunter', () => {
		renderMedia();

		expect(document.body.textContent).toMatch(/Bitte wählen Sie unten aus/i);
	});

	/**
	 * Der Absatz gilt nur im Meldeformular. In der Admin-Maske fordert
	 * „Bitte wählen Sie unten aus …" zu etwas auf, das direkt darunter gesperrt
	 * ist — und widerspricht damit dem Hinweis, dass nur die meldende Person
	 * diese Einwilligung erteilen kann.
	 */
	it('fordert den Admin nicht zu einer Auswahl auf, die dort gesperrt ist', () => {
		renderMedia({ adminMode: true });

		expect(document.body.textContent).not.toMatch(/Bitte wählen Sie unten aus/i);
	});

	/**
	 * Der Kern der Auslassung: Der Einwilligungssatz gehört in den
	 * Datenschutzhinweis, nicht ein zweites Mal in den Fließtext. Bräche das
	 * auf, stünden zwei unterschiedlich formulierte Aussagen über die
	 * Speicherung im selben Abschnitt.
	 */
	it('behauptet keine Einwilligung durch das Hochladen selbst', () => {
		renderMedia();

		expect(document.body.textContent).not.toMatch(/Mit dem Hochladen .*stimmen Sie/i);
	});

	it('behält den Datenschutzhinweis an der Dropzone', () => {
		renderMedia();

		expect(document.querySelector('[data-testid="upload-notice-trigger"]')).not.toBeNull();
	});
});
