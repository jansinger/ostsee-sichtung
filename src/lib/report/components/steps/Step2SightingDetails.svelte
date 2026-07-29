<script lang="ts">
	import AnimalInfo from '$lib/report/components/sections/AnimalInfo.svelte';
	import SightingDetails from '$lib/report/components/sections/SightingDetails.svelte';
	import Icon from '$lib/components/Icon.svelte';
</script>

<div class="space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 text-center px-2 md:px-0">
		<div class="flex justify-center">
			<div class="bg-primary/20 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full">
				<Icon icon="lucide:binoculars" width="20" class="text-primary md:w-6 md:h-6" />
			</div>
		</div>
		<h2 class="text-base-content text-xl md:text-2xl font-bold">Sichtungsdetails</h2>
		<p class="text-base-content/70 max-w-2xl mx-auto text-sm md:text-base">
			Was haben Sie genau beobachtet? <strong>Tierart und Anzahl</strong> sind besonders wichtig. 
			Bei Unsicherheit wählen Sie "Unbekannt" - auch geschätzte Angaben sind wertvoll für die 
			Populationsforschung!
		</p>
		<div class="flex justify-center">
			<div class="badge badge-outline badge-primary text-center min-h-fit h-auto py-2 px-3 whitespace-normal text-xs md:text-sm md:whitespace-nowrap max-w-xs md:max-w-none">
				Schritt 2 von 4 - Beobachtung (erforderlich)
			</div>
		</div>
	</div>

	<!-- Step Content -->
	<AnimalInfo />
	<SightingDetails />
</div>
