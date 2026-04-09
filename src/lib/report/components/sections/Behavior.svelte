<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { getFormContext } from '$lib/report/formContext';
	import { AnimalBehaviorEnum } from '$lib/report/formOptions/animalBehavior';
	import { slide } from 'svelte/transition';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';

	const { form } = getFormContext();
</script>

<!-- Animal Behavior Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title text-lg flex items-center gap-2">
			<Icon icon="lucide:waves" width="20" height="20" class="text-primary" />
			Verhalten der Tiere
		</h3>
		<p class="text-base-content/70 mb-4 text-sm">
			Verhaltensinformationen helfen Wissenschaftlern, die Ökologie und das Wohlbefinden der Tiere zu verstehen
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

		<FormField name="otherObservations" />
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
