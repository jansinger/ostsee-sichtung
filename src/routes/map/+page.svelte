<script lang="ts">
	import SightingsMapView from '$lib/components/map/SightingsMapView.svelte';
</script>

<svelte:head>
	<title>Sichtungskarte - Ostsee-Tiere</title>
	<meta name="description" content="Interaktive Karte der Meerestier-Sichtungen" />
</svelte:head>

<SightingsMapView mapContainerId="map" title="Sichtungskarte" showTitle={true} showLogo={true} />
