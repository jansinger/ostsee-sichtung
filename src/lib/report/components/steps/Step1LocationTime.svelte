<script lang="ts">
	import PositionAndTime from '../sections/PositionAndTime.svelte';
	import { MapPin } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
</script>

<div class="space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 text-center">
		<div class="flex justify-center">
			<div class="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
				<Icon src={MapPin} size="24" class="text-primary" />
			</div>
		</div>
		<h2 class="text-base-content text-2xl font-bold">Position & Zeit</h2>
		<p class="text-base-content/70 max-w-2xl mx-auto">
			Wo und wann haben Sie die Sichtung gemacht? <strong>GPS-Koordinaten sind am wertvollsten</strong> 
			für die Forschung, aber auch Gewässernamen helfen weiter. Je genauer die Angaben, desto 
			nützlicher für die Wissenschaft!
		</p>
		<div class="badge badge-outline badge-primary">
			Schritt 1 von 4 - Grunddaten (erforderlich)
		</div>
	</div>

	<!-- Step Content -->
	<PositionAndTime />
</div>