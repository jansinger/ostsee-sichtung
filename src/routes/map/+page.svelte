<script lang="ts">
	import SightingsMapView from '$lib/components/map/SightingsMapView.svelte';
</script>

<svelte:head>
	<title>Sichtungskarte - Deutsches Meeresmuseum</title>
</svelte:head>

<SightingsMapView 
	mapContainerId="map"
	title="Sichtungskarte"
	showTitle={true}
	showLogo={true}
/>
