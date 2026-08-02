<script lang="ts">
	import AnimalInfo from '$lib/report/components/sections/AnimalInfo.svelte';
	import SightingDetails from '$lib/report/components/sections/SightingDetails.svelte';
	import Icon from '$lib/components/Icon.svelte';
</script>

<div class="space-y-6 md:space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 px-2 text-center md:px-0">
		<!-- Unterhalb `md` ausgeblendet: dekorativ, siehe Step1LocationTime.svelte. -->
		<div class="hidden justify-center md:flex">
			<div
				class="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full md:h-12 md:w-12"
			>
				<Icon icon="lucide:binoculars" width="20" class="text-primary md:h-6 md:w-6" />
			</div>
		</div>
		<h2 class="text-base-content text-xl font-bold md:text-2xl">Angaben zum Tier</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm md:text-base">
			<strong>Was haben Sie beobachtet?</strong> Bitte geben Sie
			<strong>Tierart und Anzahl</strong>
			an. Bei Unsicherheit wählen Sie „Unbekannte Walart" bzw. „Unbekannte Robbenart" — auch Schätzungen
			sind wertvoll und unterstützen die Populationsforschung.
		</p>
	</div>

	<!-- Step Content -->
	<AnimalInfo />
	<SightingDetails />
</div>
