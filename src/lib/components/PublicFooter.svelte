<script>
	import { isNotIFrame } from '$lib/utils/client/isNotIFrame';
	import Icon from '$lib/components/Icon.svelte';
</script>

<!-- Footer with navigation (versteckt in iFrame) -->
{#if isNotIFrame}
	<footer class="footer footer-center bg-base-200 text-base-content mt-8 rounded-t-lg p-4 sm:p-6">
		<!-- Navigation Links - Responsive Grid -->
		<nav class="flex flex-wrap justify-center gap-2 sm:gap-4 md:grid md:grid-flow-col">
			<a href="/about" class="link link-hover text-sm sm:text-base">Über uns</a>
			<a href="/docs" class="link link-hover text-sm sm:text-base">Dokumentation</a>
			<a href="/map" class="link link-hover text-sm sm:text-base">Sichtungskarte</a>
			<!--
				Anbieterkennzeichnung nach § 5 DDG und Datenschutzhinweis nach Art. 13 DSGVO.
				Beides fehlte bis 2026-07-30 vollständig: es gab weder eine Route noch einen
				Link, und unter eigener Domain deckt die iframe-Einbettung auf
				meeresmuseum.de die Pflicht nicht ab.

				Verlinkt werden bewusst die Seiten des Betreibers (Deutsches Meeresmuseum)
				statt einer eigenen Kopie — eine zweite, separat zu pflegende Fassung
				derselben Rechtstexte würde nur auseinanderlaufen. „Ständig verfügbar" ist
				gegeben, weil dieser Footer auf jeder Seite steht; im iframe-Modus ist er
				ausgeblendet, dort trägt die einbettende Seite ihre eigene Kennzeichnung.
			-->
			<a
				href="https://www.deutsches-meeresmuseum.de/impressum"
				target="_blank"
				rel="noopener noreferrer"
				class="link link-hover text-sm sm:text-base">Impressum</a
			>
			<a
				href="https://www.deutsches-meeresmuseum.de/datenschutz"
				target="_blank"
				rel="noopener noreferrer"
				class="link link-hover text-sm sm:text-base">Datenschutz</a
			>
		</nav>

		<!-- External Links - Stack on Mobile, Inline on Desktop -->
		<nav>
			<div class="flex flex-col gap-2 sm:flex-row sm:gap-4">
				<a
					href="https://github.com/jansinger/ostsee-tiere"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-ghost btn-xs sm:btn-sm text-xs sm:text-sm"
					aria-label="GitHub Repository"
				>
					<Icon icon="lucide:github" width="16" height="16" class="h-3 w-3 sm:h-5 sm:w-5" />
					<span class="xs:inline hidden">GitHub</span>
					<span class="xs:hidden">Code</span>
				</a>
				<a
					href="https://deutsches-meeresmuseum.de"
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-ghost btn-xs sm:btn-sm text-xs sm:text-sm"
				>
					<span class="hidden sm:inline">Deutsches Meeresmuseum</span>
					<span class="sm:hidden">Meeresmuseum</span>
				</a>
			</div>
		</nav>

		<!-- Copyright - Mobile Optimized -->
		<aside class="text-center">
			<p class="text-xs opacity-70 sm:text-sm">
				© 2025–2026
				<span class="hidden sm:inline">Deutsches Meeresmuseum, Stralsund, Deutschland</span>
				<span class="sm:hidden">Deutsches Meeresmuseum</span>
			</p>
			<p class="mt-1 text-xs opacity-70">
				<span class="hidden sm:inline">Meldeplattform für Meerestiere in der Ostsee</span>
				<span class="sm:hidden">Ostsee Sichtungen</span>
			</p>
		</aside>
	</footer>
{/if}
