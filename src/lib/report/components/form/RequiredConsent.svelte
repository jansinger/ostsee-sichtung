<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import Icon from '$lib/components/Icon.svelte';
	import FormField from './fields/FormField.svelte';

	const { form: _form } = getFormContext();

	let { currentStep } = $props<{
		currentStep: number;
	}>();

	// Only show on the last step (step 3, 0-indexed)
	const isLastStep = $derived(currentStep === 3);
</script>

{#if isLastStep}
	<!-- Required Privacy Consent - Prominently displayed before submit -->
	<div class="bg-primary/5 border-primary/20 mb-6 rounded-lg border-2 p-4">
		<div class="mb-4">
			<h4 class="text-primary mb-2 flex items-center gap-2 text-lg font-bold">
				<Icon icon="lucide:shield-alert" class="text-primary h-5 w-5" />
				Erforderliche Zustimmung zur Datenverwendung
			</h4>
			<p class="text-base-content/80 text-sm">
				<strong>Diese Zustimmung ist erforderlich</strong>, um Ihre Sichtung zu speichern und für
				die wissenschaftliche Forschung zu nutzen.
			</p>
		</div>

		<!-- Compact Privacy Information -->
		<div class="bg-base-100 mb-4 rounded-lg p-4">
			<div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
				<div class="flex items-start gap-3">
					<Icon icon="lucide:check-circle" width="20" height="20" class="text-success mt-0.5" />
					<div>
						<p class="font-medium">Öffentliche Wissenschaftsdaten</p>
						<p class="text-base-content/70 text-xs">
							Datum, Position, Tierart werden für Forschung öffentlich gezeigt
						</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<Icon icon="lucide:lock" width="20" height="20" class="text-info mt-0.5" />
					<div>
						<p class="font-medium">Private Kontaktdaten</p>
						<p class="text-base-content/70 text-xs">
							Ihre persönlichen Daten bleiben vertraulich, nur für Rückfragen
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Required Consent Checkbox -->
		<div class="border-primary/30 bg-primary/5 rounded-lg border p-4">
			<FormField name="privacyConsent" />
			<p class="text-primary/70 mt-2 text-xs">
				<strong>Ohne diese Zustimmung kann Ihre Sichtung nicht gespeichert werden.</strong>
				Sie können diese Zustimmung jederzeit per E-Mail an datenschutz@meeresmuseum.de widerrufen.
			</p>
		</div>
	</div>
{/if}
