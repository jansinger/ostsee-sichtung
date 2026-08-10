import { render } from 'vitest-browser-svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCALE_COOKIE } from '$lib/i18n/localeCookie';

/**
 * `page` aus `$app/state` ist außerhalb eines Routing-Kontexts nicht
 * verfügbar — die Komponente braucht für jeden Test eine eigene URL
 * (Startseite, Query-String, ausgeschlossene Route). `pageState` ist deshalb
 * über `vi.hoisted` erreichbar und wird pro Test überschrieben, bevor
 * gerendert wird.
 */
const { pageState } = vi.hoisted(() => ({
	pageState: { url: new URL('https://localhost:4000/') }
}));
vi.mock('$app/state', () => ({ page: pageState }));

const LanguageSwitcher = (await import('./LanguageSwitcher.svelte')).default;

function cookieLocale(): string | undefined {
	return document.cookie
		.split('; ')
		.find((teil) => teil.startsWith(`${LOCALE_COOKIE}=`))
		?.split('=')[1];
}

/**
 * Ein echter Klick auf den `<a href>` mit `data-sveltekit-reload` würde den
 * Test-iframe von Vitests Browser-Mode wegnavigieren (derselbe Befund wie in
 * `ReportKindChoice.svelte.test.ts`, „modifizierte Klicks bleiben Browser-
 * Sache"). Ein Listener in der Bubbling-Phase am `document` unterbindet die
 * Navigation, nachdem der Handler der Komponente bereits gelaufen ist — dessen
 * Wirkung (Cookie schreiben) bleibt dabei unangetastet.
 */
function klickenOhneNavigation(link: Element, modifier: MouseEventInit = {}): void {
	const wächter = (event: Event) => event.preventDefault();
	document.addEventListener('click', wächter);
	try {
		link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...modifier }));
	} finally {
		document.removeEventListener('click', wächter);
	}
}

beforeEach(() => {
	pageState.url = new URL('https://localhost:4000/');
	// Jeder Test startet ohne Cookie-Vorbelastung aus einem vorherigen Lauf.
	document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
});

it('verweist auf die jeweils andere Sprache und kennzeichnet sie', async () => {
	const bildschirm = render(LanguageSwitcher);
	const verweis = bildschirm.getByRole('link', { name: 'English' });
	await expect.element(verweis).toHaveAttribute('hreflang', 'en');
	await expect.element(verweis).toHaveAttribute('lang', 'en');
	// Ohne data-sveltekit-reload navigiert SvelteKit clientseitig, während die
	// Laufzeit-Locale aus dem zuerst gerenderten Dokument stammt — URL, SSR und
	// Locale laufen auseinander.
	await expect.element(verweis).toHaveAttribute('data-sveltekit-reload');
});

it('führt auf die englische Startseite', async () => {
	const bildschirm = render(LanguageSwitcher);
	const verweis = bildschirm.getByRole('link', { name: 'English' });
	await expect.element(verweis).toHaveAttribute('href', '/en/');
});

it('nimmt Query-String und Hash mit auf die Reise', async () => {
	// Kampagnen-Marker aus Museums-Links (`?art=…`) dürfen beim Umschalten
	// nicht verloren gehen — dieselbe Zusage gilt bereits für jeden anderen
	// internen Link (`zielFuerStartseite`, `ReportKindChoice`).
	pageState.url = new URL('https://localhost:4000/?art=schweinswal#foto');
	const bildschirm = render(LanguageSwitcher);
	const verweis = bildschirm.getByRole('link', { name: 'English' });
	await expect.element(verweis).toHaveAttribute('href', '/en/?art=schweinswal#foto');
});

it('schreibt beim Klick PARAGLIDE_LOCALE, nicht nur die URL', async () => {
	const bildschirm = render(LanguageSwitcher);
	const link = document.querySelector('a[hreflang="en"]');
	expect(link).not.toBeNull();
	klickenOhneNavigation(link as Element);
	expect(cookieLocale()).toBe('en');
	// Hält die Komponente selbst im DOM (kein toBeInTheDocument-Fehlschlag
	// durch die abgefangene Navigation).
	await expect.element(bildschirm.getByRole('link', { name: 'English' })).toBeInTheDocument();
});

describe('auf ausgeschlossenen Routen', () => {
	it('rendert nichts statt eines Verweises, der in einen 404 führt', () => {
		// `/en/admin` gibt es nicht: `reroute` (src/hooks.ts) lehnt ausgeschlossene
		// Pfade mit `undefined` ab, SvelteKit löst sie wörtlich auf. Ein
		// sichtbarer Verweis dorthin wäre schlimmer als gar keiner.
		pageState.url = new URL('https://localhost:4000/admin');
		render(LanguageSwitcher);
		expect(document.querySelector('a[hreflang]')).toBeNull();
	});
});

it('Strg-Klick öffnet einen neuen Tab und schreibt kein Cookie im aktuellen', () => {
	render(LanguageSwitcher);
	const link = document.querySelector('a[hreflang="en"]');
	klickenOhneNavigation(link as Element, { ctrlKey: true });
	expect(cookieLocale()).toBeUndefined();
});
