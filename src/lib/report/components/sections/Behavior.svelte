<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { AnimalBehaviorEnum } from '$lib/report/formOptions/animalBehavior';
	import { slide } from 'svelte/transition';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';

	const { form } = getFormContext();
</script>

<!-- Animal Behavior Section -->
<SectionCard title="Verhalten der Tiere" icon="lucide:waves">
	<p class="text-base-content/70 mb-4 text-sm">
		Verhaltensinformationen helfen Wissenschaftlern, die Ökologie und das Wohlbefinden der Tiere zu
		verstehen
	</p>

	<!-- Behavior with select -->
	<FormField name="behavior" />

	{#if String($form.behavior) === String(AnimalBehaviorEnum.OTHER)}
		<!-- Additional field for custom behavior -->
		<div transition:slide>
			<FormField name="behaviorText" />
		</div>
	{/if}

	<FormField name="reaction" />
</SectionCard>
