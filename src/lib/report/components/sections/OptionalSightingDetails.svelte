<script lang="ts">
	import { Activity } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import FormField from '../form/fields/FormField.svelte';
</script>

<!-- Sighting Details Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon src={Activity} size="20" class="text-primary" />
			Weitere Sichtungsdetails
		</h3>

		<!-- Distribution -->
		<FormField name="distribution" />

		<FormField name="shipCount" />
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
