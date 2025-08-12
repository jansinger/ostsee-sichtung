<script lang="ts">
	import type { FormStep } from '$lib/report/types';
	import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '$lib/storage/localStorage';

	/**
	 * Schritt 1 - Wesentliche Daten
	 *
	 * currentStep mit -1 initialisieren, damit die Daten aus dem Storage gelesen werden
	 */
	let { steps, currentStep = $bindable(-1) } = $props<{
		steps: FormStep[];
		currentStep?: number;
	}>();

	const totalSteps = steps.length; // Anzahl der Schritte im Formular

	// Aktueller Schritt und Zustandsvariablen aus LocalStorage laden (Runes Mode)
	if (currentStep === undefined || currentStep < 0 || currentStep >= totalSteps) {
		currentStep = loadFromStorage(STORAGE_KEYS.CURRENT_STEP, 0);
	}

	$effect(() => {
		saveToStorage(STORAGE_KEYS.CURRENT_STEP, currentStep);
	});
</script>

<div class="mb-8">
	<ul class="steps steps-horizontal w-full">
		{#each steps as step, index (step.id)}
			<button
				type="button"
				class="step {currentStep >= index ? 'step-primary' : ''} cursor-pointer"
				onclick={() => {
					currentStep = index;
				}}
				aria-current={currentStep === index ? 'step' : undefined}
				title={step.description}
				aria-label={step.title}
				style="background: none; border: none; padding: 0; margin: 0;"
			>
			</button>
		{/each}
	</ul>
</div>
