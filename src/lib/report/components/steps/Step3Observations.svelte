<!--
  Step 2: Behavioral Observations and Environmental Conditions
  Optional detailed information that enhances research value
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { createLogger } from '$lib/logger';
	import Behavior from '$lib/report/components/sections/Behavior.svelte';
	import Environment from '$lib/report/components/sections/Environment.svelte';
	import Media from '$lib/report/components/sections/Media.svelte';
	import { getFormContext } from '$lib/report/formContext';
	import { scrollToElement } from '$lib/utils/fieldNavigation';

	import { Activity, SkipForward } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import OptionalSightingDetails from '../sections/OptionalSightingDetails.svelte';

	const logger = createLogger('report:Step3Observations');
	const formContext = getFormContext();
	const { isSubmitting } = formContext;

	// Props für currentStep - wird vom Parent (ModernReportForm) übergeben
	let { currentStep = $bindable(2) }: { currentStep?: number } = $props();

	const formContent = browser ? (document.getElementById('form-content') as HTMLElement) : null;

	async function skipToNextStep(): Promise<void> {
		try {
			currentStep += 1;
			scrollToElement(formContent);
			logger.info('Step 3 skipped by user');
		} catch (error) {
			logger.error({ error }, 'Error skipping step 3');
		}
	}
</script>

<div class="space-y-8">
	<!-- Step Header -->
	<div class="space-y-4 px-2 text-center sm:px-0">
		<div class="flex justify-center">
			<div
				class="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full sm:h-12 sm:w-12"
			>
				<Icon src={Activity} size="20" class="text-primary sm:size-24" />
			</div>
		</div>
		<h2 class="text-base-content text-xl font-bold sm:text-2xl">Zusätzliche Beobachtungen</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm sm:text-base">
			Diese Details sind <strong>optional, aber extrem wertvoll</strong> für die Forschung!
			Verhaltensinformationen, Umweltbedingungen und <strong>Fotos/Videos</strong> helfen bei der Artbestimmung
			und dem Verständnis der Meerestiere.
		</p>
		<div class="flex items-center justify-center gap-4">
			<div
				class="badge badge-outline badge-primary h-auto min-h-fit max-w-xs px-3 py-2 text-center text-xs whitespace-normal sm:max-w-none sm:text-sm sm:whitespace-nowrap"
			>
				Schritt 3 von 4 - Optional, aber sehr hilfreich
			</div>
		</div>

		<!-- Skip Button prominent oben platziert -->
		<div class="flex justify-center">
			<button
				type="button"
				onclick={skipToNextStep}
				disabled={$isSubmitting}
				class="btn btn-outline btn-secondary gap-2"
				aria-label="Diesen optionalen Schritt überspringen"
			>
				<Icon src={SkipForward} size="16" />
				Schritt überspringen
			</button>
		</div>

		<div class="divider text-xs opacity-50">oder Details hinzufügen</div>
	</div>

	<Media></Media>

	<OptionalSightingDetails></OptionalSightingDetails>

	<Behavior></Behavior>

	<Environment></Environment>
</div>
