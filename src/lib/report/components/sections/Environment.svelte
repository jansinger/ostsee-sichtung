<script lang="ts">
	import { Waves } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import FormField from '../form/fields/FormField.svelte';
</script>

<!-- Environmental Conditions Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon src={Waves} size="20" class="text-primary" />
			Umweltbedingungen
		</h3>
		<p class="text-base-content/70 mb-4 text-sm">
			Wetter- und Seebedingungen beeinflussen sowohl die Sichtbarkeit als auch das Tierverhalten
		</p>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Sea State -->
			<FormField name="seaState" />

			<!-- Visibility -->
			<FormField name="visibility" />
		</div>

		<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Wind Direction -->
			<FormField name="windDirection" />

			<!-- Wind Force -->
			<FormField name="windForce" />
		</div>
	</div>
</div>

<style>
	/* Card hover effects */
	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px oklch(var(--b3));
	}
</style>
