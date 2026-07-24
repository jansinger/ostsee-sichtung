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
  The step title is rendered as visible <li> content (shown below the
  circle). Navigation is a real <button> for proper keyboard/AT support;
  aria-current marks the active step (WAI stepper pattern).
-->
<nav class="mb-8" aria-label="Formular-Schritte">
	<ul class="steps steps-horizontal w-full">
		{#each steps as step, index (step.id)}
			{@const navigable = canNavigateTo(index)}
			<li
				class="step {currentStep >= index ? 'step-primary' : ''}"
				class:opacity-50={!navigable && index > currentStep}
				aria-current={currentStep === index ? 'step' : undefined}
			>
				<button
					type="button"
					class="step-button px-1 text-xs sm:text-sm"
					disabled={!navigable}
					title={navigable
						? step.description
						: 'Bitte füllen Sie zuerst die vorherigen Schritte aus'}
					onclick={() => handleStepClick(index)}
				>
					{step.title}
				</button>
			</li>
		{/each}
	</ul>
</nav>
