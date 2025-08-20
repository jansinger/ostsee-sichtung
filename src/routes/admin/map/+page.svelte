<script lang="ts">
	import SightingsMapView from '$lib/components/map/SightingsMapView.svelte';
</script>

<svelte:head>
	<title>Sichtungskarte - Admin - Ostsee-Tiere</title>
	<meta 
		name="description" 
		content="Interaktive Kartenansicht aller Meerestier-Sichtungen für Administratoren. Geografische Verwaltung und Übersicht der gemeldeten Sichtungen." 
	/>
	<meta 
		name="keywords" 
		content="Admin, Karte, Sichtungen, Geografisch, Meerestiere, Ostsee, Verwaltung, Übersicht" 
	/>
	
	<!-- Open Graph -->
	<meta property="og:title" content="Admin-Sichtungskarte - Ostsee-Tiere" />
	<meta 
		property="og:description" 
		content="Interaktive Kartenansicht aller Meerestier-Sichtungen für Administratoren" 
	/>
	<meta property="og:type" content="website" />
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Admin-Sichtungskarte - Ostsee-Tiere" />
	<meta 
		name="twitter:description" 
		content="Interaktive Kartenansicht aller Meerestier-Sichtungen für Administratoren" 
	/>
</svelte:head>

<div class="h-[calc(100vh-65px)] overflow-hidden">
	<SightingsMapView
		mapContainerId="admin-map"
		showTitle={false}
		showLogo={true}
		containerClass="relative h-full w-full"
	/>
</div>
