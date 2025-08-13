<script lang="ts">
	import AnimalInfo from '$lib/report/components/sections/AnimalInfo.svelte';
	import SightingDetails from '$lib/report/components/sections/SightingDetails.svelte';
	import { Binoculars } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
</script>

<div class="space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 text-center">
		<div class="flex justify-center">
			<div class="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
				<Icon src={Binoculars} size="24" class="text-primary" />
			</div>
		</div>
		<h2 class="text-base-content text-2xl font-bold">Sichtungsdetails</h2>
		<p class="text-base-content/70 max-w-2xl mx-auto">
			Was haben Sie genau beobachtet? <strong>Tierart und Anzahl</strong> sind besonders wichtig. 
			Bei Unsicherheit wählen Sie "Unbekannt" - auch geschätzte Angaben sind wertvoll für die 
			Populationsforschung!
		</p>
		<div class="flex justify-center">
			<div class="badge badge-outline badge-primary text-center min-h-fit h-auto py-2 px-3 whitespace-normal sm:whitespace-nowrap max-w-xs sm:max-w-none">
				Schritt 2 von 4 - Beobachtung (erforderlich)
			</div>
		</div>
	</div>

	<!-- Step Content -->
	<AnimalInfo />
	<SightingDetails />
</div>
