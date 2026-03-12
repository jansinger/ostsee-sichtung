<script lang="ts">
	import LazyMapWrapper from '$lib/components/map/LazyMapWrapper.svelte';
</script>

<svelte:head>
	<title>Sichtungskarte - Ostsee-Tiere</title>
	<meta name="description" content="Interaktive Karte der Meerestier-Sichtungen" />
</svelte:head>

<LazyMapWrapper
	mapContainerId="map"
	title="Sichtungskarte"
	showTitle={true}
	showLogo={true}
	containerClass="relative h-[calc(100dvh-4rem)] w-screen overflow-hidden"
/>
