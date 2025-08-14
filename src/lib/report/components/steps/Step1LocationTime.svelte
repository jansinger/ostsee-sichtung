<script lang="ts">
	import { MapPin } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import PositionAndTime from '../sections/PositionAndTime.svelte';
</script>

<div class="space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 text-center px-2 sm:px-0">
		<div class="flex justify-center">
			<div class="bg-primary/20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full">
				<Icon src={MapPin} size="20" class="text-primary sm:size-24" />
			</div>
		</div>
		<h2 class="text-base-content text-xl sm:text-2xl font-bold">Position & Zeit</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm sm:text-base">
			Wo und wann haben Sie die Sichtung gemacht? <strong
				>GPS-Koordinaten sind am wertvollsten</strong
			>
			für die Forschung, aber auch Gewässernamen helfen weiter. Je genauer die Angaben, desto nützlicher
			für die Wissenschaft!
		</p>
		<div class="flex justify-center">
			<div class="badge badge-outline badge-primary text-center min-h-fit h-auto py-2 px-3 whitespace-normal text-xs sm:text-sm sm:whitespace-nowrap max-w-xs sm:max-w-none">
				Schritt 1 von 4 - Grunddaten (erforderlich)
			</div>
		</div>
	</div>

	<!-- Step Content -->
	<PositionAndTime />
</div>
