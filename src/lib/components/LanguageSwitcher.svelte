<script lang="ts">
	import { page } from '$app/state';
	import { LOCALE_COOKIE } from '$lib/i18n/localeCookie';
	import { istAusgeschlossen } from '$lib/legacy-api/languagePrefix';
	import {
		cookieDomain,
		cookieMaxAge,
		deLocalizeUrl,
		getLocale,
		localizeHref
	} from '$lib/paraglide/runtime';

	const andere = $derived(getLocale() === 'de' ? 'en' : 'de');
	const beschriftung = $derived(andere === 'en' ? 'English' : 'Deutsch');

	// `deLocalizeUrl` kennt nur Paraglides eigene Locale-Präfixe, nicht die
	// Ausschlussliste — die lebt allein in `src/hooks.ts`/`languagePrefix.ts`.
	// Ohne diese Prüfung würde `ziel` unten für `/admin` zu `/en/admin`
	// lokalisiert, `reroute` kennt diesen Pfad nicht, gibt `undefined` zurück,
	// und SvelteKit löst ihn wörtlich auf: 404, kein wirkungsloser Knopf.
	const ausgeschlossen = $derived(istAusgeschlossen(deLocalizeUrl(page.url).pathname));

	// Pfad, Query-String UND Hash gehören zusammen in die Lokalisierung —
	// `localizeHref` bekäme mit nur `page.url.pathname` keine Chance, sie zu
	// erhalten. Kampagnen-Marker aus Museums-Links (`?art=…`, siehe
	// `zielFuerStartseite`/`reportKindHref`) gingen sonst beim Umschalten
	// verloren, obwohl dieselbe Zusage für jeden anderen internen Link im
	// Formular bereits gilt.
	const ziel = $derived(
		localizeHref(page.url.pathname + page.url.search + page.url.hash, { locale: andere })
	);

	function sprachePersistieren(event: MouseEvent): void {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
		const domain = cookieDomain ? `; domain=${cookieDomain}` : '';
		document.cookie = `${LOCALE_COOKIE}=${andere}; path=/; max-age=${cookieMaxAge}${domain}`;
	}
</script>

<!--
	Der Verweis wechselt die Locale durch einen echten Seitenaufruf, nicht durch
	`setLocale()` der Paraglide-Laufzeit: `setLocale()` navigiert selbst und passt
	nicht zu einem einfachen `<a>` mit `hreflang`/`lang`, das auch ohne JavaScript
	und für Screenreader funktioniert. `localizeHref` liefert dafür nur die
	Ziel-URL — das Cookie setzt sonst ausschließlich `setLocale()`. Ohne das Cookie
	fiele „Zurück auf Deutsch" beim nächsten Aufruf von `/` mit englischem
	`Accept-Language` wieder auf Englisch zurück, weil die Cookie-Strategie dann
	nichts findet und auf `preferredLanguage` durchfällt — eine Einbahnstraße.
	`sprachePersistieren` schreibt das Cookie deshalb synchron im Klick-Handler,
	noch vor der Browser-Navigation (kein `preventDefault` nötig, der Handler
	läuft vor dem eigentlichen Seitenwechsel ab), sodass es im folgenden Request
	bereits vorliegt.

	Cmd/Ctrl-Klick und Shift-Klick öffnen den Verweis in einem neuen Tab bzw.
	Fenster — der aktuelle Tab bleibt auf der bisherigen Sprache stehen. Das
	Cookie darf dann nicht geschrieben werden, sonst würde ein späterer
	normaler Klick im selben Tab (z. B. auf `/`) die dort gar nicht vollzogene
	Umschaltung nachträglich behaupten. Mittelklick tut dasselbe (neuer Tab),
	löst an einem `<a>` aber KEIN `click`-Event aus, sondern `auxclick` mit
	`button === 1` — geprüft per Playwright/Chromium
	(`page.click(selector, { button: 'middle' })` gegen eine Testseite mit
	`click`- und `auxclick`-Listenern: nur `auxclick` feuerte, `click` blieb
	aus). Der Handler ist deshalb zusätzlich an `onauxclick` verdrahtet; die
	Bedingung in `sprachePersistieren` deckt beide Aufrufe über dieselbe
	Prüfung ab, weil `button` bei einem regulären `click` 0 ist und die
	Bedingung dort nie zuschlägt.

	`data-sveltekit-reload` ist Pflicht, nicht Vorsicht: Ohne vollen Seitenaufbau
	bleibt die Laufzeit-Locale die des zuerst gerenderten Dokuments, während sich
	nur die URL ändert — URL, SSR-Dokument und Locale liefen sonst auseinander.
	`hreflang` sagt Suchmaschinen, wohin der Verweis führt; `lang` am Element
	sorgt zusätzlich dafür, dass ein Screenreader „English" englisch statt
	deutsch ausspricht.

	Auf von der Lokalisierung ausgeschlossenen Routen (`/admin`, `/docs`,
	`/styleguide`, `/maintenance`, …) rendert die Komponente bewusst NICHTS,
	nicht nur einen wirkungslosen Knopf: `reroute` in `src/hooks.ts` lehnt jeden
	`/en/…`-Pfad zu einer ausgeschlossenen Route mit `undefined` ab, SvelteKit
	löst ihn dann wörtlich auf und liefert 404. Ein sichtbarer, aber kaputter
	Link in der global gerenderten Navigation wäre schlimmer als gar keiner.
	Bekannte Ausnahme mit doppeltem Effekt: Der Wartungsmodus verliert das
	Sprachpräfix in beide Richtungen (`maintenanceMode.ts:31` beim Hinein-,
	`maintenance/+page.server.ts:11` beim Heraus-Redirect) — wer dort landet,
	verlässt die Wartungsseite auf Deutsch, unabhängig vom Cookie. `/maintenance`
	steht zudem selbst in der Ausschlussliste, der Umschalter bleibt dort also
	ohnehin ausgeblendet.

	Bequemlichkeit für Direktaufrufer, kein tragender Weg zur englischen Fassung:
	Die Komponente sitzt in der Navigation und ist damit im iframe auf
	meeresmuseum.de unsichtbar (`PublicNavbar.svelte`, `isNotIFrame`) — den Weg
	zur englischen Fassung liefert dort die Einbettung der Elternseite. An
	genau dieser Fehlannahme ist `/bestimmungshilfe` schon einmal gescheitert,
	siehe docs/IFRAME_EINBETTUNG.md.
-->
{#if !ausgeschlossen}
	<a
		href={ziel}
		hreflang={andere}
		lang={andere}
		data-sveltekit-reload
		onclick={sprachePersistieren}
		onauxclick={sprachePersistieren}
		class="btn btn-ghost btn-sm"
	>
		{beschriftung}
	</a>
{/if}
