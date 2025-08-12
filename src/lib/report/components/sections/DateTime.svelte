<script lang="ts">
	import { Calendar } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import FormField from '../form/fields/FormField.svelte';
</script>

<!-- Date & Time Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon src={Calendar} size="20" class="text-primary" />
			Zeitpunkt der Sichtung
		</h3>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="sightingDate" />
			<FormField name="sightingTime" />
		</div>
	</div>
</div>

<style>
	/* Card hover effects for better interactivity */
	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px oklch(var(--b3));
	}
</style>
