<script lang="ts">
	import { canNavigateToStep } from '$lib/form/validation/stepNavigation';
	import { getFormContext } from '$lib/report/formContext';
	import type { FormStep } from '$lib/report/types';

	/**
	 * Step navigation component - currentStep is managed by parent
	 * Forward navigation requires all intermediate steps to be valid
	 * Backward navigation is always allowed
	 */
	let { steps, currentStep = $bindable(0) } = $props<{
		steps: FormStep[];
		currentStep?: number;
	}>();

	const { form } = getFormContext();

	function canNavigateTo(targetIndex: number): boolean {
		return canNavigateToStep(currentStep, targetIndex, $form);
	}

	function handleStepClick(index: number) {
		if (canNavigateTo(index)) {
			currentStep = index;
		}
	}
</script>

<div class="mb-8">
	<ul class="steps steps-horizontal w-full">
		{#each steps as step, index (step.id)}
			{@const navigable = canNavigateTo(index)}
			<button
				type="button"
				class="step {currentStep >= index ? 'step-primary' : ''} step-button"
				class:cursor-pointer={navigable}
				class:cursor-not-allowed={!navigable}
				class:opacity-50={!navigable && index > currentStep}
				onclick={() => handleStepClick(index)}
				disabled={!navigable}
				aria-current={currentStep === index ? 'step' : undefined}
				title={navigable ? step.description : 'Bitte füllen Sie zuerst die vorherigen Schritte aus'}
				aria-label={step.title}
			>
			</button>
		{/each}
	</ul>
</div>
