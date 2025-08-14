<script lang="ts">
	import AnimalInfo from '$lib/report/components/sections/AnimalInfo.svelte';
	import SightingDetails from '$lib/report/components/sections/SightingDetails.svelte';
	import { Binoculars } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
</script>

<div class="space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 text-center px-2 sm:px-0">
		<div class="flex justify-center">
			<div class="bg-primary/20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full">
				<Icon src={Binoculars} size="20" class="text-primary sm:size-24" />
			</div>
		</div>
		<h2 class="text-base-content text-xl sm:text-2xl font-bold">Sichtungsdetails</h2>
		<p class="text-base-content/70 max-w-2xl mx-auto text-sm sm:text-base">
			Was haben Sie genau beobachtet? <strong>Tierart und Anzahl</strong> sind besonders wichtig. 
			Bei Unsicherheit wählen Sie "Unbekannt" - auch geschätzte Angaben sind wertvoll für die 
			Populationsforschung!
		</p>
		<div class="flex justify-center">
			<div class="badge badge-outline badge-primary text-center min-h-fit h-auto py-2 px-3 whitespace-normal text-xs sm:text-sm sm:whitespace-nowrap max-w-xs sm:max-w-none">
				Schritt 2 von 4 - Beobachtung (erforderlich)
			</div>
		</div>
	</div>

	<!-- Step Content -->
	<AnimalInfo />
	<SightingDetails />
</div>
