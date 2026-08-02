<!--
  Step 2: Behavioral Observations and Environmental Conditions
  Optional detailed information that enhances research value
-->
<script lang="ts">
	import { createLogger } from '$lib/logger';
	import Behavior from '$lib/report/components/sections/Behavior.svelte';
	import BoatInfo from '$lib/report/components/sections/BoatInfo.svelte';
	import Environment from '$lib/report/components/sections/Environment.svelte';
	import Media from '$lib/report/components/sections/Media.svelte';
	import { getFormContext } from '$lib/report/formContext';
	import { scrollToElement } from '$lib/utils/fieldNavigation';

	import Icon from '$lib/components/Icon.svelte';
	import OptionalSightingDetails from '$lib/report/components/sections/OptionalSightingDetails.svelte';

	const logger = createLogger('report:Step3Observations');
	const formContext = getFormContext();
	const { isSubmitting } = formContext;

	// Props für currentStep - wird vom Parent (ModernReportForm) übergeben
	let { currentStep = $bindable(2) }: { currentStep?: number } = $props();

	async function skipToNextStep(): Promise<void> {
		try {
			currentStep += 1;
			scrollToElement(document.getElementById('form-content'));
			// Fokus auf den Header des neuen Schritts setzen (Screenreader-Ansage), analog StepNavigation
			requestAnimationFrame(() => {
				const stepHeader = document.querySelector('#form-content h2');
				if (stepHeader instanceof HTMLElement) {
					stepHeader.setAttribute('tabindex', '-1');
					stepHeader.focus({ preventScroll: true });
				}
			});
			logger.info('Step 3 skipped by user');
		} catch (error) {
			logger.error({ error }, 'Error skipping step 3');
		}
	}
</script>

<div class="space-y-6 md:space-y-8">
	<!-- Step Header -->
	<div class="space-y-4 px-2 text-center md:px-0">
		<!-- Unterhalb `md` ausgeblendet: dekorativ, siehe Step1LocationTime.svelte. -->
		<div class="hidden justify-center md:flex">
			<div
				class="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full md:h-12 md:w-12"
			>
				<Icon icon="lucide:activity" width="20" class="text-primary md:h-6 md:w-6" />
			</div>
		</div>
		<h2 class="text-base-content text-xl font-bold md:text-2xl">Weitere Informationen</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm md:text-base">
			Diese Details sind <strong>optional, aber extrem wertvoll</strong> für die Forschung!
			Verhaltensinformationen, Umweltbedingungen und <strong>Fotos/Videos</strong> helfen bei der Artbestimmung
			und dem Verständnis der Meeressäuger.
		</p>

		<!-- Skip Button prominent oben platziert -->
		<div class="flex justify-center">
			<button
				type="button"
				onclick={skipToNextStep}
				disabled={$isSubmitting}
				class="btn btn-outline btn-secondary gap-2"
				aria-label="Diesen optionalen Schritt überspringen"
			>
				<Icon icon="lucide:skip-forward" width="16" />
				Schritt überspringen
			</button>
		</div>

		<div class="divider text-xs opacity-70">oder Details hinzufügen</div>
	</div>

	<Media></Media>

	<OptionalSightingDetails></OptionalSightingDetails>

	<Behavior></Behavior>

	<Environment></Environment>

	<BoatInfo></BoatInfo>
</div>
