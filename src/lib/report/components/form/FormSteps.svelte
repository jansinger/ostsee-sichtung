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

<!--
  DaisyUI steps component styles the <li> directly via .step class.
  We can't nest a <button> inside without breaking the grid layout.
  Using role="navigation" + aria-label on the wrapper, and keeping
  the <li> interactive via tabindex/onclick with aria-current="step"
  for the active step indicator (WAI stepper pattern).
-->
<nav class="mb-8" aria-label="Formular-Schritte">
	<ul class="steps steps-horizontal w-full" role="tablist">
		{#each steps as step, index (step.id)}
			{@const navigable = canNavigateTo(index)}
			<li
				role="tab"
				class="step step-button {currentStep >= index ? 'step-primary' : ''}"
				class:cursor-pointer={navigable}
				class:cursor-not-allowed={!navigable}
				class:opacity-50={!navigable && index > currentStep}
				tabindex={navigable ? 0 : -1}
				aria-disabled={!navigable}
				aria-current={currentStep === index ? 'step' : undefined}
				aria-label={step.title}
				title={navigable ? step.description : 'Bitte füllen Sie zuerst die vorherigen Schritte aus'}
				onclick={() => handleStepClick(index)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						handleStepClick(index);
					}
				}}
			></li>
		{/each}
	</ul>
</nav>
