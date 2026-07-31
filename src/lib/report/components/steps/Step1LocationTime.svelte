<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import PositionAndTime from '$lib/report/components/sections/PositionAndTime.svelte';
</script>

<div class="space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 px-2 text-center md:px-0">
		<div class="flex justify-center">
			<div
				class="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full md:h-12 md:w-12"
			>
				<Icon icon="lucide:map-pin" width="20" class="text-primary md:h-6 md:w-6" />
			</div>
		</div>
		<h2 class="text-base-content text-xl font-bold md:text-2xl">Position & Zeitpunkt</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm md:text-base">
			<strong>Wo und wann fand die Sichtung statt?</strong> Je genauer Ihre Angaben zu
			<strong>Ort und Zeitpunkt</strong>, desto wertvoller sind sie für die Forschung.
		</p>
	</div>

	<!-- Step Content -->
	<PositionAndTime />
</div>
