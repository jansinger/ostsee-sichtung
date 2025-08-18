<!--
  Step 2: Behavioral Observations and Environmental Conditions
  Optional detailed information that enhances research value
-->
<script lang="ts">
	import Behavior from '$lib/report/components/sections/Behavior.svelte';
	import Environment from '$lib/report/components/sections/Environment.svelte';
	import Media from '$lib/report/components/sections/Media.svelte';
	import { getFormContext } from '$lib/report/formContext';
	import { createLogger } from '$lib/logger';
	import { scrollToElement } from '$lib/utils/fieldNavigation';
	import { browser } from '$app/environment';

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
	<div class="space-y-4 text-center px-2 sm:px-0">
		<div class="flex justify-center">
			<div class="bg-primary/20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full">
				<Icon src={Activity} size="20" class="text-primary sm:size-24" />
			</div>
		</div>
		<h2 class="text-base-content text-xl sm:text-2xl font-bold">Zusätzliche Beobachtungen</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm sm:text-base">
			Diese Details sind <strong>optional, aber extrem wertvoll</strong> für die Forschung!
			Verhaltensinformationen, Umweltbedingungen und <strong>Fotos/Videos</strong> helfen bei der Artbestimmung
			und dem Verständnis der Meerestiere.
		</p>
		<div class="flex justify-center items-center gap-4">
			<div class="badge badge-outline badge-secondary text-center min-h-fit h-auto py-2 px-3 whitespace-normal text-xs sm:text-sm sm:whitespace-nowrap max-w-xs sm:max-w-none">
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
