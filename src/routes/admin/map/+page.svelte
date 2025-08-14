<script lang="ts">
	import SightingsMapView from '$lib/components/map/SightingsMapView.svelte';
</script>

<svelte:head>
	<title>Sichtungskarte - Admin - Deutsches Meeresmuseum</title>
</svelte:head>

<!-- Header für Admin-Karte -->
<div class="bg-base-100 border-b p-4">
	<div class="container mx-auto">
		<h1 class="text-2xl font-bold">Sichtungskarte</h1>
		<p class="text-base-content/70 text-sm">
			Interaktive Kartenansicht aller Sichtungen mit Filtermöglichkeiten
		</p>
	</div>
</div>

<div style="height: calc(100vh - 120px);">
	<SightingsMapView 
		mapContainerId="admin-map"
		showTitle={false}
		showLogo={true}
		containerClass="relative h-full w-full"
	/>
</div>
