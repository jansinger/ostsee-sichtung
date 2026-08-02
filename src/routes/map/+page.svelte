<script lang="ts">
	import LazyMapWrapper from '$lib/components/map/LazyMapWrapper.svelte';
</script>

<svelte:head>
	<title>Sichtungskarte - Ostsee-Tiere</title>
	<meta
		name="description"
		content="Interaktive Karte der freigegebenen Wal- und Robbensichtungen in der Ostsee — jahrweise filterbar, mit Verbreitung und Hotspots."
	/>
	<meta
		name="keywords"
		content="Sichtungskarte, Ostsee, Schweinswal, Robbe, Verbreitung, Karte, Meeressäuger, Citizen Science"
	/>

	<!--
		og:/twitter:-Tags standen bis 2026-08-02 global in `app.html` und trugen
		dort den Text der Startseite. Beim Entfernen der Dopplung (siehe Kommentar
		in `app.html`) war diese Route die einzige öffentliche ohne eigenen Satz —
		sie wäre sonst beim Teilen ohne Vorschaukarte geblieben.
	-->
	<meta property="og:title" content="Sichtungskarte - Ostsee-Tiere" />
	<meta
		property="og:description"
		content="Freigegebene Wal- und Robbensichtungen in der Ostsee auf einer interaktiven Karte."
	/>
	<meta property="og:type" content="website" />

	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Sichtungskarte - Ostsee-Tiere" />
	<meta
		name="twitter:description"
		content="Freigegebene Wal- und Robbensichtungen in der Ostsee auf einer interaktiven Karte."
	/>
</svelte:head>

<LazyMapWrapper
	mapContainerId="map"
	title="Sichtungskarte"
	showTitle={true}
	showLogo={true}
	containerClass="relative h-[calc(100dvh-4rem)] w-screen overflow-hidden"
/>
