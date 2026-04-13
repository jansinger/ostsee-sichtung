<script lang="ts">
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';
</script>

<!-- Date & Time Section -->
<SectionCard title="Zeitpunkt der Sichtung" icon="lucide:calendar">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField name="sightingDate" />
		<FormField name="sightingTime" />
	</div>
</SectionCard>
