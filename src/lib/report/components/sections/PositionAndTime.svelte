<script lang="ts">
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import PositionPanel from '$lib/report/components/form/position/PositionPanel.svelte';
	import SectionCard from '$lib/report/components/sections/SectionCard.svelte';
</script>

<div class="space-y-6">
	<PositionPanel />

	<!-- Date and Time Section (always visible) -->
	<SectionCard title="Datum und Uhrzeit" icon="lucide:calendar" variant="inset">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="sightingDate" />
			<FormField name="sightingTime" />
		</div>
	</SectionCard>
</div>
