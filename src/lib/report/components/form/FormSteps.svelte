<script lang="ts">
	import type { FormStep } from '$lib/report/types';

	/**
	 * Step navigation component - currentStep is managed by parent
	 */
	let { steps, currentStep = $bindable(0) } = $props<{
		steps: FormStep[];
		currentStep?: number;
	}>();
</script>

<div class="mb-8">
	<ul class="steps steps-horizontal w-full">
		{#each steps as step, index (step.id)}
			<button
				type="button"
				class="step {currentStep >= index ? 'step-primary' : ''} step-button cursor-pointer"
				onclick={() => {
					currentStep = index;
				}}
				aria-current={currentStep === index ? 'step' : undefined}
				title={step.description}
				aria-label={step.title}
			>
			</button>
		{/each}
	</ul>
</div>

<style>
	.step-button {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
	}
</style>
