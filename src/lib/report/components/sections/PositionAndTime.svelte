<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import PositionPanel from '$lib/report/components/form/position/PositionPanel.svelte';
</script>

<div class="space-y-6">
	<PositionPanel />

	<!-- Date and Time Section (always visible) -->
	<div class="border-base-300 bg-base-200/50 rounded-lg border p-3 md:p-4">
		<h3 class="mb-3 flex items-center gap-2 text-base font-semibold md:text-lg">
			<Icon aria-hidden="true" icon="lucide:calendar" width="20" class="text-primary" />
			Datum und Uhrzeit
		</h3>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="sightingDate" />
			<FormField name="sightingTime" />
		</div>
	</div>
</div>
