<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Icon from '$lib/components/Icon.svelte';
	import OstseeTiereLogo from '$lib/components/OstseeTiereLogo.svelte';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';
	import { resolveDisplayLocale } from '$lib/utils/format/dateTime';

	let { data } = $props();

	// Anzeigesprache der beiden Zahlenkacheln unten — folgt der Sprachwahl,
	// nicht fest auf `de-DE`. Dieselbe Zuordnung wie bei Datum/Zeit
	// (`resolveDisplayLocale`), damit `en` überall als `en-GB` formatiert.
	const zahlenLocale = $derived(resolveDisplayLocale(getLocale()));
</script>

<svelte:head>
	<title>{m.routes_about_page_text_ueber_uns_ostsee_tiere()}</title>
	<meta
		name="description"
		content="Erfahren Sie mehr über die Ostsee-Tiere Plattform. Unterstützen Sie die Meeresforschung durch das Melden von Walsichtungen und anderen Meerestier-Beobachtungen in der Ostsee."
	/>
	<meta
		name="keywords"
		content="Über uns, Ostsee-Tiere, Meeresforschung, Citizen Science, Deutsches Meeresmuseum, Stralsund, Naturschutz"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="Über uns - Ostsee-Tiere" />
	<meta
		property="og:description"
		content="Erfahren Sie mehr über die Ostsee-Tiere Plattform und unsere Mission für den Meeresschutz"
	/>
	<meta property="og:type" content="website" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Über uns - Ostsee-Tiere" />
	<meta
		name="twitter:description"
		content="Erfahren Sie mehr über die Ostsee-Tiere Plattform und unsere Mission für den Meeresschutz"
	/>
</svelte:head>

<!-- Innenabstand schaltet bei `md` (Breakpoint-Vertrag in
     .claude/rules/design-system.md). Bei 320px zählt das: die Seite stapelt drei
     Innenabstände übereinander — dieser hier, der des Handlungsaufforderungs-
     Blocks und die 16px, die DaisyUI dem `hero-content` mitgibt. Zusammen blieben
     von 320px nur 192px für den Inhalt. Die 8px pro Seite, die `p-4` hier spart,
     kommen jedem Abschnitt der Seite zugute, nicht nur dem einen, der gerade die
     Untergrenze bestimmt. -->
<div class="mx-auto max-w-5xl p-4 md:p-6">
	<!-- Hero Section -->
	<div class="mb-16 text-center">
		<div class="mb-8 flex flex-1 justify-center">
			<OstseeTiereLogo size="lg" showText={true} />
		</div>

		<!-- Größen aus der Rollen-Tabelle in design-system.md, nicht frei gewählt:
		     Seitentitel ist `display`, Abschnittstitel `title`, Titel in Karten
		     `section`. Vorher standen hier text-6xl/5xl/4xl/3xl/2xl/xl — dass das
		     nie auffiel, lag an der globalen h1-Regel aus mapStyles.css, die den
		     Titel auf Mobil auf 20px zwang und die Staffelung damit verdeckte. -->
		<h1 class="text-primary text-display mb-8 font-bold tracking-tight">
			{m.routes_about_page_text_ueber_ostsee_tiere()}
		</h1>
		<div class="mx-auto max-w-4xl">
			<p class="text-base-content/80 mb-6 text-2xl leading-relaxed">
				Die Ostsee-Tiere Plattform ermöglicht es <strong class="text-primary"
					>Bürgern, Forschern und Naturbeobachtern</strong
				>, ihre Sichtungen von Walen, Robben und anderen Meerestieren zu melden.
			</p>
			<p class="text-base-content/70 text-lg">
				Gemeinsam schaffen wir wertvolle Daten für die <em>Meeresforschung und den Naturschutz</em>.
			</p>
		</div>
	</div>

	<!-- Mission Section -->
	<div class="mb-20">
		<div class="grid items-center gap-12 md:grid-cols-2">
			<div>
				<h2 class="text-primary text-title mb-6 flex items-center gap-3 font-bold">
					<Icon icon="lucide:compass" width="36" class="text-primary" aria-hidden="true" />
					{m.routes_about_page_text_unsere_mission()}
				</h2>
				<div class="space-y-4">
					<p class="text-base-content/80 text-lg leading-relaxed">
						Wir glauben, dass <strong>jeder einen Beitrag</strong> zum Schutz der Meeresumwelt leisten
						kann. Durch das Sammeln und Teilen von Sichtungsdaten schaffen wir eine umfassende Wissensbasis
						über die Meerestiere der Ostsee.
					</p>
					<!-- Vorher: „helfen Wissenschaftlern dabei, Wanderungsmuster zu verstehen,
					     Populationen zu überwachen und Schutzmaßnahmen zu entwickeln" — richtig,
					     aber allgemein genug, dass es auf jedes Naturschutzprojekt passt. Die
					     überprüfbare Fassung stand bisher nur im zugeklappten Hilfe-Block am
					     Formular-Ende (FormHelp.svelte, „Wofür die Daten gebraucht werden"):
					     HELCOM und ASCOBANS sind benannte Gremien. Genau das fehlte hier. -->
					<div class="border-primary/30 bg-primary/5 rounded-r-lg border-l-4 px-6 py-3 pl-4">
						<p class="text-base-content text-base leading-relaxed font-medium">
							Ihre Meldung wird vom Deutschen Meeresmuseum wissenschaftlich ausgewertet und an die
							internationalen Gremien für den Schutz der Ostsee-Schweinswale weitergegeben: an
							<strong>HELCOM</strong>, die Helsinki-Kommission zum Schutz der Ostsee, und an
							<strong>ASCOBANS</strong>, das Abkommen zum Schutz der Kleinwale.
						</p>
					</div>
				</div>
			</div>
			<div
				class="card from-primary/5 via-secondary/5 to-accent/5 border-primary/20 shadow-raised bg-gradient-to-br"
			>
				<div class="card-body p-10 text-center">
					<div class="mb-6 flex justify-center">
						<Icon icon="lucide:activity" width="60" class="text-primary opacity-80" />
					</div>
					<h3 class="text-primary text-section mb-4 font-bold">
						{m.routes_about_page_text_citizen_science()}
					</h3>
					<p class="text-base-content/70 text-lg leading-relaxed">
						Bürgerwissenschaft macht <strong>jeden zum Forscher</strong> und trägt zu wichtigen wissenschaftlichen
						Erkenntnissen bei.
					</p>
					<!-- Jahreszahl kommt aus der Datenbank (älteste freigegebene Sichtung),
					     nicht aus dem Template — Begründung in +page.server.ts. -->
					{#if data.earliestSightingYear != null}
						<div class="stats stats-vertical shadow-raised mt-6">
							<div class="stat">
								<div class="stat-title text-xs">{m.routes_about_page_text_sichtungen_seit()}</div>
								<div class="stat-value text-primary text-2xl">{data.earliestSightingYear}</div>
								<!-- Umbrechbar aus demselben Grund wie die Kacheln im
								     Handlungsaufforderungs-Block weiter unten. Diese hier bestimmt die
								     Untergrenze der Seite derzeit nicht — aber sie steht unter
								     derselben DaisyUI-Regel, und die nächste Textänderung würde den
								     Überlauf sonst erneut aufmachen. -->
								<div class="stat-desc whitespace-normal">
									{m.routes_about_page_text_in_unserer_datenbank()}
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div class="mb-20">
		<div class="mb-12 text-center">
			<h2 class="text-primary text-title mb-4 flex items-center justify-center gap-3 font-bold">
				<Icon icon="lucide:layout-grid" width="36" class="text-primary" aria-hidden="true" />
				{m.routes_about_page_text_unsere_plattform()}
			</h2>
			<p class="text-base-content/70 mx-auto max-w-2xl text-lg">
				{m.routes_about_page_text_modernste_technologie_fuer_einfache_bedi()}
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-3">
			<div
				class="card bg-base-100 group shadow-raised duration-instant hover:shadow-floating transition-all"
			>
				<div class="card-body p-8 text-center">
					<div
						class="duration-instant mb-6 flex justify-center transition-transform group-hover:scale-110"
					>
						<Icon icon="lucide:pen-line" width="48" class="text-primary" />
					</div>
					<h3 class="card-title text-primary text-section mb-4 justify-center">
						{m.routes_about_page_text_einfaches_melden()}
					</h3>
					<p class="text-base-content/80 text-base leading-relaxed">
						<strong>Intuitive Formulare</strong> führen Sie Schritt für Schritt durch die Erfassung
						Ihrer Sichtung mit <em>GPS-genauer Lokalisierung</em>.
					</p>
					<div class="mt-4">
						<div class="badge badge-primary badge-outline">
							{m.routes_about_page_text_gps_integration()}
						</div>
					</div>
				</div>
			</div>

			<div
				class="card bg-base-100 group shadow-raised duration-instant hover:shadow-floating transition-all"
			>
				<div class="card-body p-8 text-center">
					<div
						class="duration-instant mb-6 flex justify-center transition-transform group-hover:scale-110"
					>
						<Icon icon="lucide:map" width="48" class="text-secondary-strong" />
					</div>
					<h3 class="card-title text-secondary-strong text-section mb-4 justify-center">
						{m.routes_about_page_text_interaktive_karte()}
					</h3>
					<!-- „alle Sichtungen" traf nicht zu: die Karte zeigt ausschließlich
					     freigegebene Meldungen und filtert dabei auf ein Jahr. -->
					<p class="text-base-content/80 text-base leading-relaxed">
						Sehen Sie die <strong>freigegebenen Sichtungen</strong> jahrweise auf einer
						detaillierten Karte der Ostsee und entdecken Sie <em>Muster und Hotspots</em>.
					</p>
					<div class="mt-4">
						<div class="badge badge-secondary badge-outline">
							{m.routes_about_page_text_openlayers()}
						</div>
					</div>
				</div>
			</div>

			<div
				class="card bg-base-100 group shadow-raised duration-instant hover:shadow-floating transition-all"
			>
				<div class="card-body p-8 text-center">
					<div
						class="duration-instant mb-6 flex justify-center transition-transform group-hover:scale-110"
					>
						<Icon icon="lucide:chart-pie" width="48" class="text-accent-strong" />
					</div>
					<h3 class="card-title text-accent-strong text-section mb-4 justify-center">
						{m.routes_about_page_text_offene_daten()}
					</h3>
					<!-- Vorher: „Alle Daten sind für Forschungszwecke verfügbar und können in
					     verschiedenen Formaten exportiert werden." Der Export in mehrere
					     Formate ist eine Funktion des Admin-Bereichs, nicht der Öffentlichkeit
					     (das Setting `data.exportFormats` wird nirgends gelesen). Öffentlich
					     abrufbar sind die freigegebenen Sichtungen über die dokumentierte
					     API — das steht hier jetzt statt des weitergehenden Versprechens. -->
					<p class="text-base-content/80 text-base leading-relaxed">
						Die freigegebenen Sichtungen sind über eine <strong>offene API</strong> abrufbar und
						damit für <em>Forschung und Lehre</em> nutzbar.
					</p>
					<div class="mt-4">
						<div class="badge badge-accent badge-outline">
							{m.routes_about_page_text_open_data()}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Partnership Section -->
	<div class="mb-16">
		<div class="bg-primary text-primary-content rounded-lg p-8 text-center">
			<img
				src="/logo_dmm_negativ.svg"
				alt={m.routes_about_page_alt_deutsches_meeresmuseum_logo()}
				class="mx-auto mb-4 w-64 p-4"
			/>
			<p class="text-primary-content mx-auto mb-4 max-w-2xl leading-relaxed">
				Diese Plattform wird vom Deutschen Meeresmuseum in Stralsund betrieben, einem der führenden
				Zentren für Meeresforschung und -bildung in Deutschland. Seit über 70 Jahren widmen wir uns
				der Erforschung und dem Schutz der marinen Lebensräume.
			</p>
			<!-- `flex-wrap` ist hier nicht Kosmetik, sondern der Grund für einen
			     Überlauf der ganzen Seite: Buttons tragen `white-space: nowrap`, zwei
			     davon nebeneinander ergaben eine min-content-Breite von 299px. Mit den
			     64px `p-8` dieser Fläche und den 48px `p-6` des Seitencontainers war das
			     Dokument damit auf *jedem* Viewport mindestens 411px breit — bei 360px
			     ließ sich die Seite über ihre volle Höhe seitlich schieben. Die beiden
			     anderen Linkzeilen der Seite (Technik, Handlungsaufforderungen) haben
			     `flex-wrap` von Anfang an; nur diese hier fehlte. -->
			<div class="flex flex-wrap justify-center gap-4">
				<a
					href="https://www.deutsches-meeresmuseum.de"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-outline btn-sm"
				>
					<Icon icon="lucide:globe" width="16" class="mr-1" />
					{m.routes_about_page_text_meeresmuseum_de()}
				</a>
				<a
					href="https://www.deutsches-meeresmuseum.de/wissenschaft/sichtungen"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-outline btn-sm"
				>
					<Icon icon="lucide:file-text" width="16" class="mr-1" />
					{m.routes_about_page_text_mehr_ueber_sichtungen()}
				</a>
			</div>
		</div>
	</div>

	<!-- Datenschutz & Sicherheit

	     Vorher standen hier drei Blöcke über 1.514px: zwei Karten mit je vier
	     Haken, eine Kachel „DSGVO-Konformität" mit vier Betroffenenrechten und
	     eine Kontakt-Box. Vier Aussagen daraus sind gestrichen, nicht nur
	     gekürzt:

	     - „Anonymisierte öffentliche Darstellung" war schlicht falsch. Wer im
	       Formular zustimmt (`nameConsent`, `shipNameConsent`), erscheint mit
	       Vor- und Nachnamen bzw. Schiffsnamen in der öffentlichen Ausgabe. Das
	       ist einwilligungsbasiert und richtig so — aber es ist das Gegenteil von
	       anonym, und die Einwilligung ist das ehrlichere Versprechen.
	     - Die vier Betroffenenrechte standen unter der Behauptung, die Plattform
	       erfülle „alle Anforderungen" der DSGVO. Es fehlten Widerspruch
	       (Art. 21), Einschränkung (Art. 18) und das Beschwerderecht (Art. 77).
	       Eine unvollständige Aufzählung unter einer Vollständigkeitsbehauptung
	       ist schlechter als keine — die Erklärung des Museums führt sie
	       vollständig.
	     - „Keine Weitergabe an unbefugte Dritte" ist durch das Wort „unbefugte"
	       inhaltsleer: der Satz sagt nur, dass keine unbefugte Weitergabe
	       stattfindet.
	     - „Modernste Sicherheitstechnologien" ist ein Superlativ ohne Beleg.

	     Der Hosting-Standort steht jetzt konkret da (GECKO, Rostock) statt als
	     Himmelsrichtung „Deutschland/EU". Ein Anbieter mit Ort ist überprüfbar.

	     Zwei weitere Aussagen sind am 2026-08-02 korrigiert worden, beide beim
	     Abgleich gegen die verlinkte DMM-Erklärung aufgefallen
	     (docs/DATENSCHUTZ_ABGLEICH_DMM_2026-08-02.md):

	     - „Ihre Kontaktdaten sind freiwillig. Eine Sichtung lässt sich auch ohne
	       sie melden." war falsch. `firstName`, `lastName` und `email` sind in
	       sightingSchema.ts unbedingt `.required()` und im JSDoc als Pflichtfeld
	       geführt; POST /api/sightings validiert dasselbe Schema, eine Meldung
	       ohne sie wird also auch serverseitig abgewiesen. Freiwillig sind
	       Telefon, Anschrift und Fax — das steht jetzt da.
	     - Der Schlussabsatz sagte zu, in der DMM-Erklärung stehe „vollständig",
	       auch „wie lange sie gespeichert bleiben". Für Sichtungsmeldungen nennt
	       sie keine Frist (nur für Tickets, Kontaktformular, Bewerbungen), und im
	       Code gibt es außer den 24 h für verwaiste Uploads keine. Die Zusage
	       nennt deshalb nur noch, was dort tatsächlich steht — Betroffenenrechte
	       und Ansprechpartner — und verweist für die Zwecke auf die
	       Einwilligungstexte im Formular, wo sie stehen.

	     Der Schlussabsatz zählt die Betroffenenrechte bewusst NICHT auf. Eine
	     erste Fassung nannte „Auskunft, Berichtigung, Löschung, Widerspruch" —
	     vier von sieben, ohne Einschränkung (Art. 18), Datenübertragbarkeit
	     (Art. 20) und Beschwerderecht (Art. 77). Das ist derselbe Fehler wie in
	     der oben gestrichenen Rechte-Kachel, nur ohne die
	     Vollständigkeitsbehauptung: eine unmarkierte Aufzählung liest sich als
	     abschließend und veraltet mit jeder Änderung. Die verlinkte Erklärung
	     führt sie vollständig — ein Klick entfernt. (PR #714, Review-Hinweis)

	     Sobald das Museum eine Löschfrist festgelegt hat, gehört sie hierher
	     zurück — dann aber mit der Frist im Text, nicht als Verweis. -->
	<div class="mb-16">
		<h2 class="text-title mb-8 flex items-center justify-center gap-3 text-center font-bold">
			<Icon icon="lucide:shield-check" width="30" class="text-success-strong" />
			{m.routes_about_page_text_datenschutz_sicherheit()}
		</h2>

		<div class="card bg-base-100 border-success/20 shadow-raised border">
			<div class="card-body">
				<p class="text-base-content/80 mb-4">
					{m.routes_about_page_text_ihre_meldung_verarbeiten_wir_nach()}
				</p>
				<ul class="space-y-2">
					<li class="flex items-start gap-2">
						<Icon
							icon="lucide:check"
							width="16"
							class="text-success-strong mt-1 shrink-0"
							aria-hidden="true"
						/>
						<span>
							Für Rückfragen zu Ihrer Meldung brauchen wir Name und E-Mail.
							<strong>Anschrift und Telefonnummer sind freiwillig.</strong>
						</span>
					</li>
					<li class="flex items-start gap-2">
						<Icon
							icon="lucide:check"
							width="16"
							class="text-success-strong mt-1 shrink-0"
							aria-hidden="true"
						/>
						<span>
							<strong
								>Name und Schiffsname erscheinen nur öffentlich, wenn Sie dem im Formular
								ausdrücklich zustimmen.</strong
							>
							Ohne Zustimmung bleiben sie bei uns.
						</span>
					</li>
					<li class="flex items-start gap-2">
						<Icon
							icon="lucide:check"
							width="16"
							class="text-success-strong mt-1 shrink-0"
							aria-hidden="true"
						/>
						<span>{m.routes_about_page_text_alle_verbindungen_sind_verschluesselt_ht()}</span>
					</li>
					<li class="flex items-start gap-2">
						<Icon
							icon="lucide:check"
							width="16"
							class="text-success-strong mt-1 shrink-0"
							aria-hidden="true"
						/>
						<span>
							Server und Datenbank stehen bei <strong>GECKO in Rostock</strong>, also in
							Deutschland.
						</span>
					</li>
				</ul>
				<p class="text-base-content/80 mt-4 text-sm">
					{m.routes_about_page_text_welche_rechte_sie_haben_und()}
				</p>
				<div class="card-actions mt-4">
					<a
						href="https://www.deutsches-meeresmuseum.de/datenschutz"
						target="_blank"
						rel="noopener noreferrer"
						class="btn btn-outline btn-sm"
					>
						{m.routes_about_page_text_datenschutzerklaerung()}
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Technik

	     Vorher zwei getrennte Abschnitte über zusammen 2.166px — rund ein Viertel
	     der Seite: „Technologie" mit vier Badges plus Untertiteln und „Open Source
	     & Lizenzen" mit dem **MIT-Volltext** in einem scrollbaren Kasten, einer
	     Liste von sechs Abhängigkeiten samt Lizenzkürzeln, einer Feedback-Box und
	     einer Danksagung mit fünf Projektlinks.

	     Das ist Entwicklerpublikum. Es steht hier auf der Seite, die einem Bürger
	     erklären soll, wer hinter der Plattform steckt — und die eigentliche
	     Zielgruppe findet es ohnehin im Repository, wo es aktuell ist. Der
	     MIT-Volltext war dabei der Extremfall: 190 Wörter englische Rechtssprache
	     zum Scrollen.

	     Die Danksagung ist mit gestrichen. Sie war gut gemeint, aber Auth0,
	     Tailwind Labs und die PostgreSQL Global Development Group brauchen keinen
	     Dank auf der Über-uns-Seite eines Museums — und die Lizenzbedingungen der
	     genutzten Projekte verlangen ihn auch nicht. -->
	<div class="bg-base-200 mb-16 rounded-lg p-8">
		<div class="mb-6 flex flex-col items-center justify-center gap-2">
			<h2 class="text-title flex items-center gap-3 text-center font-bold">
				<Icon icon="lucide:cpu" width="30" class="text-primary" aria-hidden="true" />
				{m.routes_about_page_text_technik()}
			</h2>
			<div class="badge badge-neutral badge-lg font-mono">
				Version {data.version}
			</div>
		</div>
		<p class="text-base-content/80 mx-auto max-w-3xl text-center">
			Die Plattform ist quelloffen und steht unter der
			<strong>MIT-Lizenz</strong>. Sie läuft auf SvelteKit, einer PostgreSQL-Datenbank mit PostGIS
			für die Geodaten und OpenLayers für die Karte. Quellcode, Lizenztext und die Möglichkeit,
			einen Fehler zu melden, finden Sie im Repository.
		</p>
		<div class="mt-6 flex flex-wrap justify-center gap-3">
			<a
				href="https://github.com/jansinger/ostsee-tiere"
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-outline btn-sm"
			>
				<Icon icon="lucide:code" width="16" class="mr-1" aria-hidden="true" />
				{m.routes_about_page_text_quellcode_auf_github()}
			</a>
			<a
				href="https://github.com/jansinger/ostsee-tiere/blob/main/LICENSE"
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-outline btn-sm"
			>
				<Icon icon="lucide:scale" width="16" class="mr-1" aria-hidden="true" />
				{m.routes_about_page_text_lizenztext_mit()}
			</a>
			<a
				href="https://github.com/jansinger/ostsee-tiere/issues/new"
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-ghost btn-sm"
			>
				<Icon icon="lucide:circle-alert" width="16" class="mr-1" aria-hidden="true" />
				{m.routes_about_page_text_fehler_melden()}
			</a>
		</div>
	</div>
	<!-- Call to Action -->
	<!-- Innenabstand schaltet bei `md`, nicht pauschal `p-12`: Die 48px pro Seite
	     waren der zweite Grund für den Überlauf bei 360px — zusammen mit den 4px
	     `border-2` blieben von 312px verfügbarer Breite nur 208px für den Inhalt,
	     der aber 238px braucht. Die Grenze ist `md` gemäß Breakpoint-Vertrag in
	     .claude/rules/design-system.md (dort schalten die Innenabstände), und `p-6`
	     entspricht dem Seitencontainer. -->
	<div
		class="hero from-primary/10 via-secondary/10 to-accent/10 border-primary/20 rounded-2xl border-2 bg-gradient-to-br p-6 md:p-12"
	>
		<div class="hero-content text-center">
			<div class="max-w-4xl">
				<div class="mb-8">
					<div class="avatar mb-6">
						<div
							class="ring-primary ring-offset-base-100 from-primary/10 to-secondary/10 shadow-raised w-32 rounded-full bg-gradient-to-br ring ring-offset-4"
						>
							<OstseeTiereLogo size="lg" showText={false} />
						</div>
					</div>
					<h2 class="text-primary text-title mb-6 font-bold tracking-tight">
						{m.routes_about_page_text_werden_sie_teil_der_bewegung()}
					</h2>
					<p class="text-base-content/80 mb-8 text-xl leading-relaxed">
						<strong>Jede Sichtung zählt!</strong> Helfen Sie uns dabei, die Geheimnisse der Ostsee
						zu entschlüsseln und ihre <em>einzigartigen Bewohner</em> zu schützen.
					</p>
				</div>

				<!--
					Beschriftungen und Rückfallwerte korrigiert (2026-07-30):

					- „Bereits erfasst" war falsch: `totalSightings` zählt über
					  `approvedOnly()` nur die **freigegebenen** Sichtungen. Erfasst sind
					  mehr (die noch nicht freigegebenen fehlen in dieser Zahl).
					- „Aktive Beobachter" war doppelt falsch: der Wert ist die Zahl
					  **unterschiedlicher E-Mail-Adressen** in allen freigegebenen
					  Sichtungen — kumuliert über den gesamten Zeitraum, nicht „aktiv".
					  Melder ohne E-Mail-Angabe fehlen, eine Person mit zwei Adressen
					  zählt zweimal. Deshalb „Melder-Adressen" statt „Beobachter".
					- Die Rückfallwerte `1.800+` und `500+` lagen um den Faktor 10 unter
					  der Realität (19.262 bzw. 6.430). Bei einem Datenbankfehler hätte die
					  Seite also grob falsche Zahlen als Tatsache ausgegeben. Jetzt wird
					  die Kachel in diesem Fall weggelassen — keine Zahl ist besser als
					  eine erfundene (siehe .claude/rules/design-system.md, „Zahlen in
					  Nutzertexten nur mit Quelle").
				-->
				<div
					class="stats stats-vertical sm:stats-horizontal bg-base-100/50 shadow-raised mb-8 w-full"
				>
					{#if data.totalSightings != null}
						<div class="stat">
							<div class="stat-title">{m.routes_about_page_text_veroeffentlicht()}</div>
							<div class="stat-value text-primary">
								{new Intl.NumberFormat(zahlenLocale).format(data.totalSightings)}
							</div>
							<!-- `whitespace-normal` hebt DaisyUIs `white-space: nowrap` auf den
							     Kachel-Zeilen auf. Das ist für kurze Labels gedacht; „Melder-Adressen
							     insgesamt" in der Kachel darunter misst so 158px und war zusammen mit
							     dem `padding-inline` der `.stat` (48px) die Untergrenze der ganzen
							     Seite bei 320px. Wo Platz ist, ändert sich nichts — umbrechbarer Text
							     bricht erst, wenn er muss. -->
							<div class="stat-desc whitespace-normal">
								{m.routes_about_page_text_freigegebene_sichtungen()}
							</div>
						</div>
					{/if}
					{#if data.totalObservers != null}
						<div class="stat">
							<div class="stat-title">{m.routes_about_page_text_beteiligt()}</div>
							<div class="stat-value text-secondary-strong">
								{new Intl.NumberFormat(zahlenLocale).format(data.totalObservers)}
							</div>
							<div class="stat-desc whitespace-normal">
								{m.routes_about_page_text_melder_adressen_insgesamt()}
							</div>
						</div>
					{/if}
					<!-- Die dritte Kachel („Für die / Wissenschaft / verfügbar") ist
					     entfallen: eine Parole im Zahlen-Bauteil, direkt neben zwei
					     belegten Werten. Sie entwertet die beiden echten, weil sie das
					     Format der Aussage borgt, ohne eine zu machen. -->
				</div>

				<div class="flex flex-wrap justify-center gap-6">
					<a
						href={localizeHref('/')}
						class="btn btn-primary btn-lg shadow-raised duration-instant hover:shadow-floating px-8 py-4 text-lg transition-all"
					>
						<Icon icon="custom:porpoise" width="20" height="20" class="mr-2" aria-hidden="true" />
						{m.routes_about_page_text_sichtung_melden()}
					</a>
					<a
						href={localizeHref('/map')}
						class="btn btn-secondary btn-outline btn-lg shadow-raised duration-instant hover:shadow-floating px-8 py-4 text-lg transition-all"
					>
						<Icon icon="lucide:map" width="20" height="20" class="mr-2" />
						{m.routes_about_page_text_karte_erkunden()}
					</a>
					<!-- Der dritte Knopf hieß „Mehr erfahren" und zeigte auf /docs — die
					     OpenAPI-Dokumentation („Testen Sie alle Endpunkte direkt im
					     Browser"). Für die Zielgruppe dieser Schaltflächen das falsche
					     Ziel; #700 hat ihn deshalb ersatzlos entfernt, ausdrücklich mit
					     dem Vermerk, er gehöre zurück, sobald es eine
					     Bestimmungshilfen-Seite gibt. Die gibt es jetzt — er ist hier
					     wieder, mit dem Ziel, das an dieser Stelle immer gemeint war,
					     und mit einer Beschriftung, die es benennt statt zu umschreiben. -->
					<a
						href={localizeHref('/bestimmungshilfe')}
						class="btn btn-accent btn-outline btn-lg shadow-raised duration-instant hover:shadow-floating px-8 py-4 text-lg transition-all"
					>
						<Icon icon="lucide:book-open" width="20" height="20" class="mr-2" />
						{m.routes_about_page_text_tiere_bestimmen()}
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
