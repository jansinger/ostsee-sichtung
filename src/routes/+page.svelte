<!--
  OstseeSichtung - Hauptseite
  Meldeformular für Meerestier-Sichtungen in der Ostsee
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { createLogger } from '$lib/logger';
	import ModernReportForm from '$lib/report/components/ModernReportForm.svelte';
	import SubmissionSuccess from '$lib/report/components/SubmissionSuccess.svelte';
	import type { SightingFormData } from '$lib/report/types';

	const logger = createLogger('main:page');

	// Success state management
	let submissionSuccess = $state(false);
	let submittedData = $state<SightingFormData | null>(null);

	/**
	 * Handle form submission
	 */
	async function handleSubmit(formData: SightingFormData) {
		logger.info(formData, 'Submitting sighting report submitted successfully');
		// Simulate successful submission
		submissionSuccess = true;
		submittedData = formData;
	}

	/**
	 * Handle form cancellation
	 */
	function handleCancel() {
		logger.info('Form cancelled');
		goto('/');
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
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
	<!-- Form Content -->
	<div class="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
		{#if submissionSuccess && submittedData}
			<SubmissionSuccess {submittedData} {handleNewReport} />
		{:else}
			<div class="mx-auto max-w-4xl">
				<ModernReportForm onSubmit={handleSubmit} onCancel={handleCancel} />
			</div>
		{/if}
	</div>
</div>
