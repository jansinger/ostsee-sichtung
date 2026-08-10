<script lang="ts">
	import { page } from '$app/state';
	import { LOCALE_COOKIE } from '$lib/i18n/localeCookie';
	import { cookieMaxAge, getLocale, localizeHref } from '$lib/paraglide/runtime';

	const andere = $derived(getLocale() === 'de' ? 'en' : 'de');
	const beschriftung = $derived(andere === 'en' ? 'English' : 'Deutsch');
	const ziel = $derived(localizeHref(page.url.pathname, { locale: andere }));

	function sprachePersistieren(): void {
		document.cookie = `${LOCALE_COOKIE}=${andere}; path=/; max-age=${cookieMaxAge}`;
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

	`data-sveltekit-reload` ist Pflicht, nicht Vorsicht: Ohne vollen Seitenaufbau
	bleibt die Laufzeit-Locale die des zuerst gerenderten Dokuments, während sich
	nur die URL ändert — URL, SSR-Dokument und Locale liefen sonst auseinander.
	`hreflang` sagt Suchmaschinen, wohin der Verweis führt; `lang` am Element
	sorgt zusätzlich dafür, dass ein Screenreader „English" englisch statt
	deutsch ausspricht.

	Auf von der Lokalisierung ausgeschlossenen Routen (`/admin`, `/docs`,
	`/maintenance`, …) löst `getLocale()` über die `url`-Strategie dort immer
	`de` auf, unabhängig vom Cookie — der Umschalter zeigt „English" an, das
	Cookie wird beim Klick zwar geschrieben, aber `ziel` bleibt dieselbe,
	unlokalisierte Route, und die sichtbare Sprache ändert sich dort nicht. Das
	ist eine strukturelle Grenze der `url`-Strategie, kein Bug dieser Komponente.
	Bekannte Ausnahme mit doppeltem Effekt: Der Wartungsmodus verliert das
	Sprachpräfix in beide Richtungen (`maintenanceMode.ts:31` beim Hinein-,
	`maintenance/+page.server.ts:11` beim Heraus-Redirect) — wer dort landet,
	verlässt die Wartungsseite auf Deutsch, unabhängig vom Cookie.

	Bequemlichkeit für Direktaufrufer, kein tragender Weg zur englischen Fassung:
	Die Komponente sitzt in der Navigation und ist damit im iframe auf
	meeresmuseum.de unsichtbar (`PublicNavbar.svelte`, `isNotIFrame`) — den Weg
	zur englischen Fassung liefert dort die Einbettung der Elternseite. An
	genau dieser Fehlannahme ist `/bestimmungshilfe` schon einmal gescheitert,
	siehe docs/IFRAME_EINBETTUNG.md.
-->
<a
	href={ziel}
	hreflang={andere}
	lang={andere}
	data-sveltekit-reload
	onclick={sprachePersistieren}
	class="btn btn-ghost btn-sm"
>
	{beschriftung}
</a>
