<script lang="ts">
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';
</script>

<!-- Sighting Details Section -->
<SectionCard title="Weitere Sichtungsdetails" icon="lucide:activity">
	<!-- Distribution -->
	<FormField name="distribution" />

	<FormField name="shipCount" />
</SectionCard>
