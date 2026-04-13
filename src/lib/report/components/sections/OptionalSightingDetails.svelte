<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
</script>

<!-- Sighting Details Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon icon="lucide:activity" width="20" class="text-primary" />
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
		box-shadow: 0 8px 25px -8px var(--color-base-300);
	}
</style>
