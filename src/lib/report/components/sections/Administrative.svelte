<script lang="ts">
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';
</script>

<!-- Administrative Section -->
<SectionCard title="Administratives" icon="lucide:settings">
	<FormField name="verified" />

	<FormField name="entryChannel" />

	<FormField name="internalComment" />
</SectionCard>
