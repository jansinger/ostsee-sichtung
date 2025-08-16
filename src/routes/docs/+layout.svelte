<script lang="ts">
	// Documentation layout
</script>

<svelte:head>
	<title>Dokumentation - Ostsee-Tiere</title>
	<meta name="description" content="API-Dokumentation für die Ostsee-Tiere Plattform" />
</svelte:head>

<div class="min-h-screen bg-base-100">
	<div class="navbar bg-base-200">
		<div class="flex-1">
			<a href="/" class="btn btn-ghost text-xl">Ostsee-Tiere</a>
			<span class="text-sm opacity-60 ml-2">/ Dokumentation</span>
		</div>
		<div class="flex-none">
			<ul class="menu menu-horizontal px-1">
				<li><a href="/" class="btn btn-ghost">Hauptseite</a></li>
				<li><a href="/map" class="btn btn-ghost">Karte</a></li>
			</ul>
		</div>
	</div>

	<main class="container mx-auto p-4">
		<slot />
	</main>
</div>