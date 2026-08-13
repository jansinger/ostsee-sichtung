import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import ReportHeading from './ReportHeading.svelte';

/**
 * Der Kopf stand bis zum 2026-08-13 nur über dem Formular; die Einstiegsseite
 * trug ihre eigene, kürzere Überschrift („Meerestier melden", ohne Unterzeile).
 * Das Meeresmuseum wünscht denselben Kopf an beiden Stellen — er ist deshalb
 * eine eigene Komponente und kein zweimal gepflegtes Markup.
 *
 * Die beiden Botschaftsschlüssel behalten ihren `modernreportform`-Präfix: Die
 * Namen entstehen beim Extrahieren aus dem damaligen Dateipfad und sind reine
 * Bezeichner. Sie umzubenennen hieße, dieselben zwei Texte in beiden
 * Sprachdateien neu anzulegen — ohne dass sich ein sichtbares Wort ändert.
 *
 * Was dieser Test NICHT abdeckt: die `isNotIFrame`-Bedingung. Sie steht
 * bewusst an den beiden Aufrufstellen und nicht hier drin, damit diese
 * Komponente überhaupt testbar bleibt — der Vitest-Browser-Modus rendert jede
 * Testdatei in einem iframe, `isNotIFrame` ist hier also immer `false`
 * (siehe `ReportKindChoice.svelte.test.ts`, letzter Block).
 */
describe('ReportHeading', () => {
	it('nennt die Aufgabe als Seitenüberschrift', async () => {
		const screen = render(ReportHeading);

		await expect
			.element(
				screen.getByRole('heading', { level: 1, name: 'Sichtung von Meeressäugetieren melden' })
			)
			.toBeVisible();
	});

	it('nennt darunter den Zweck — die Forschung des Museums', async () => {
		const screen = render(ReportHeading);

		await expect
			.element(screen.getByText('für die Forschung des Deutschen Meeresmuseums'))
			.toBeVisible();
	});
});
