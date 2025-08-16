<script lang="ts">
	import { goto } from '$app/navigation';
	import type { SightingFormData } from '$lib/report/types';
	import { formatLocation } from '$lib/utils/format/formatLocation';
	import { maskEmail } from '$lib/utils/privacy/emailMask';
	import { ArrowLeft, Check } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	// Success state management
	let { submittedData, handleNewReport } = $props<{
		submittedData: SightingFormData | null;
		handleNewReport: () => void;
	}>();

	/**
	 * Handle returning to main page
	 */
	function handleReturnHome() {
		goto('/');
	}
</script>

<!-- Success Page -->
<div class="bg-base-100 min-h-screen py-12">
	<div class="container mx-auto max-w-2xl px-4">
		<!-- Success Header -->
		<div class="mb-8 space-y-6 text-center">
			<div class="flex justify-center">
				<div class="bg-success/20 flex h-20 w-20 items-center justify-center rounded-full">
					<Icon src={Check} size="40" class="text-success" />
				</div>
			</div>

			<h1 class="text-base-content text-3xl font-bold lg:text-4xl">Vielen Dank! 🐋</h1>

			<p class="text-base-content/80 text-xl">Ihre Sichtung wurde erfolgreich gemeldet</p>
		</div>

		<!-- Success Details -->
		<div class="card bg-base-200 mb-8 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-success mb-4">Was passiert als Nächstes?</h2>

				<div class="space-y-4">
					<div class="flex items-start gap-3">
						<span class="text-2xl">✅</span>
						<div>
							<h3 class="font-semibold">Bestätigung per E-Mail</h3>
							<p class="text-base-content/70 text-sm">
								Sie erhalten in Kürze eine Bestätigung an <strong>{submittedData?.email ? maskEmail(submittedData.email) : '***@***.***'}</strong>
							</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<span class="text-2xl">🔬</span>
						<div>
							<h3 class="font-semibold">Wissenschaftliche Auswertung</h3>
							<p class="text-base-content/70 text-sm">
								Ihre Daten fließen in die Forschung ein und helfen beim Schutz der Meerestiere
							</p>
						</div>
					</div>

					{#if submittedData?.mediaUpload}
						<div class="flex items-start gap-3">
							<span class="text-2xl">📷</span>
							<div>
								<h3 class="font-semibold">Medien-Upload</h3>
								<p class="text-base-content/70 text-sm">
									Sie erhalten Anweisungen zum Upload Ihrer Fotos/Videos per E-Mail
								</p>
							</div>
						</div>
					{/if}

					{#if submittedData?.isDead}
						<div class="flex items-start gap-3">
							<span class="text-2xl">⚠️</span>
							<div>
								<h3 class="font-semibold">Totfund gemeldet</h3>
								<p class="text-base-content/70 text-sm">
									Totfunde werden prioritär behandelt. Bei Bedarf werden wir Sie kontaktieren.
								</p>
							</div>
						</div>
					{/if}

					<div class="flex items-start gap-3">
						<span class="text-2xl">📊</span>
						<div>
							<h3 class="font-semibold">Daten einsehen</h3>
							<p class="text-base-content/70 text-sm">
								Ihre Sichtung erscheint nach Prüfung auf der
								<a href="/map" class="link link-primary">interaktiven Karte</a>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Submission Summary -->
		{#if submittedData}
			<div class="card bg-base-100 mb-8 shadow-lg">
				<div class="card-body">
					<h2 class="card-title mb-4">Ihre gemeldete Sichtung</h2>
					<div class="mb-4 grid grid-cols-1 gap-1 text-sm">
						<div>
							<span class="font-medium">Referenz-ID:</span>
							{submittedData.referenceId}
						</div>
						<span class="text-base-content/70 text-xs">
							(Bitte gehen Sie die ID bei Rückfragen an unser Team an. Die ID hilft bei der
							Zuordnung Ihrer Sichtung)
						</span>
					</div>
					<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
						<div>
							<span class="font-medium">Tierart:</span>
							{submittedData.species === 0
								? 'Schweinswal'
								: submittedData.species === 1
									? 'Kegelrobbe'
									: submittedData.species === 2
										? 'Seehund'
										: 'Andere Art'}
						</div>
						<div>
							<span class="font-medium">Anzahl:</span>
							{submittedData.totalCount} Tier{submittedData.totalCount > 1 ? 'e' : ''}
						</div>
						<div>
							<span class="font-medium">Datum:</span>
							{new Date(submittedData.sightingDate).toLocaleDateString('de-DE')}
						</div>
						<div>
							<span class="font-medium">Position:</span>
							{submittedData.hasPosition
								? formatLocation(submittedData.longitude, submittedData.latitude)
								: submittedData.waterway || 'Nicht angegeben'}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="flex flex-col justify-center gap-4 sm:flex-row">
			<button onclick={handleNewReport} class="btn btn-primary btn-lg">
				Weitere Sichtung melden
			</button>

			<button onclick={handleReturnHome} class="btn btn-outline btn-lg">
				<Icon src={ArrowLeft} size="20" />
				Zur Startseite
			</button>
		</div>

		<!-- Additional Resources -->
		<div class="mt-12">
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body text-center">
					<h3 class="mb-4 text-lg font-semibold">Interessiert an mehr?</h3>

					<div class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
						<a href="/map" class="btn btn-outline btn-sm"> 🗺️ Alle Sichtungen auf der Karte </a>
						<a
							href="https://www.meeresmuseum.de"
							target="_blank"
							rel="noopener"
							class="btn btn-outline btn-sm"
						>
							🏛️ Deutsches Meeresmuseum
						</a>
					</div>

					<p class="text-base-content/60 mt-4 text-xs">
						Folgen Sie uns für Updates zu Meeresforschung und Naturschutz
					</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Success page specific styles */
	.container {
		max-width: 768px;
	}

	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 28px -8px oklch(var(--b3));
	}

	/* Link styling */
	.link {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.link:hover {
		text-decoration-thickness: 2px;
	}

	/* Button animations */
	.btn {
		transition: all 0.2s ease;
	}

	.btn:hover {
		transform: translateY(-1px);
	}

	/* Mobile-first responsive adjustments */
	@media (max-width: 640px) {
		.container {
			padding-left: 1rem;
			padding-right: 1rem;
		}
	}
</style>
