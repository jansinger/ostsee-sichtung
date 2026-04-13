<script lang="ts">
	import DeadAnimal from './DeadAnimal.svelte';

	import { getFormContext } from '$lib/report/formContext';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';

	const { form } = getFormContext();
</script>

<!-- Animal Information Section -->
<SectionCard title="Tierinformationen" icon="lucide:eye">
	<!-- Species Selection -->
	<FormField name="species" />

	<!-- Animal Count -->
	<div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
		<FormField name="totalCount" />
		<FormField name="juvenileCount" />
	</div>

	<!-- Dead/Alive Status -->
	<div class="mt-4">
		<FormField name="isDead" />
	</div>

	<!-- Dead Animal Additional Fields -->
	{#if $form.isDead}
		<DeadAnimal></DeadAnimal>
	{/if}
</SectionCard>
