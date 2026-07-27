<!--
  OstseeSichtung - Hauptseite
  Meldeformular für Meerestier-Sichtungen in der Ostsee
-->
<script lang="ts">
	import { createLogger } from '$lib/logger';
	import ModernReportForm from '$lib/report/components/ModernReportForm.svelte';
	import SubmissionSuccess from '$lib/report/components/SubmissionSuccess.svelte';
	import type { SightingFormValues } from '$lib/types/Form';
	import { isNotIFrame } from '$lib/utils/client/isNotIFrame';

	const logger = createLogger('main:page');

	// Success state management
	let submissionSuccess = $state(false);
	let submittedData = $state<SightingFormValues | null>(null);

	/**
	 * Handle form submission
	 */
	async function handleSubmit(formData: SightingFormValues) {
		logger.info(formData, 'Submitting sighting report submitted successfully');
		// Simulate successful submission
		submissionSuccess = true;
		submittedData = formData;
	}

	/**
	 * Handle new submission after success
	 */
	function handleNewReport() {
		submissionSuccess = false;
		submittedData = null;
	}
</script>

<svelte:head>
	<title>Ostsee-Tiere - Meerestiere melden</title>
	<meta
		name="description"
		content="Ostsee-Tiere - Melden Sie Ihre Meerestier-Sichtung in der Ostsee. Unterstützen Sie die Meeresforschung mit Ihren Beobachtungen."
	/>
	<meta
		name="keywords"
		content="Meerestiere, Sichtung, Ostsee, Schweinswal, Robben, Melden, Forschung, Naturbeobachtung"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="Ostsee-Tiere - Meerestiere melden" />
	<meta
		property="og:description"
		content="Melden Sie Ihre Meerestier-Sichtung in der Ostsee. Unterstützen Sie die Meeresforschung mit Ihren Beobachtungen."
	/>
	<meta property="og:type" content="website" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Ostsee-Tiere - Meerestiere melden" />
	<meta
		name="twitter:description"
		content="Melden Sie Ihre Meerestier-Sichtung in der Ostsee. Unterstützen Sie die Meeresforschung mit Ihren Beobachtungen."
	/>
</svelte:head>

<div
	class="bg-base-100 mx-auto p-6"
	class:max-w-[600px]={!isNotIFrame}
	class:max-w-2xl={isNotIFrame}
>
	<div class="mb-8">
		<!-- Form Content -->
		{#if submissionSuccess && submittedData}
			<SubmissionSuccess {submittedData} {handleNewReport} />
		{:else}
			<ModernReportForm onSubmit={handleSubmit} />
		{/if}
	</div>
</div>
