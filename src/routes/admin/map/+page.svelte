<script lang="ts">
	import SightingsMapView from '$lib/components/map/SightingsMapView.svelte';
</script>

<svelte:head>
	<title>Sichtungskarte - Admin - Deutsches Meeresmuseum</title>
</svelte:head>

<div style="height: calc(100vh - 65px);">
	<SightingsMapView
		mapContainerId="admin-map"
		showTitle={false}
		showLogo={true}
		containerClass="relative h-full w-full"
	/>
</div>
