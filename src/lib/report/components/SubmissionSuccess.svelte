<script lang="ts">
	import { getSpeciesLabel } from '$lib/report/formOptions/species';
	import type { SightingFormValues } from '$lib/types/Form';
	import { formatWallClockDateTime } from '$lib/utils/format/formatWallClockDateTime';
	import { formatLocation } from '$lib/utils/format/formatLocation';
	import { maskEmail } from '$lib/utils/privacy/emailMask';
	import { MEDIA_FALLBACK_EMAIL } from '$lib/constants/contact';
	import Icon from '$lib/components/Icon.svelte';

	// Success state management
	let { submittedData, handleNewReport } = $props<{
		submittedData: SightingFormValues | null;
		handleNewReport: () => void;
	}>();
</script>

<!-- Success Page -->
<div class="bg-base-100 min-h-screen py-12">
	<div class="container mx-auto max-w-2xl px-4">
		<!-- Success Header -->
		<div class="mb-8 space-y-6 text-center">
			<div class="flex justify-center">
				<div class="bg-success/20 flex h-20 w-20 items-center justify-center rounded-full">
					<Icon icon="lucide:check" width="40" class="text-success-strong" />
				</div>
			</div>

			<h1
				class="text-base-content flex items-center justify-center gap-3 text-3xl font-bold lg:text-4xl"
			>
				Vielen Dank!
				<Icon
					icon="custom:porpoise"
					width="32"
					height="32"
					class="text-primary"
					aria-hidden="true"
				/>
			</h1>

			<!-- „Meldung … übermittelt" statt „Sichtung … gemeldet" (A5.3): Über
			     dieses Formular wird auch ein Totfund gemeldet, und „Sichtung"
			     schloss diesen Fall sprachlich aus. „Übermittelt" statt
			     „gemeldet", weil „Ihre Meldung wurde gemeldet" doppelt sagt. -->
			<p class="text-base-content/80 text-xl">Ihre Meldung wurde erfolgreich übermittelt</p>
		</div>

		<!-- Success Details -->
		<div class="card bg-base-200 shadow-raised mb-8">
			<div class="card-body">
				<h2 class="card-title text-success-strong mb-4">Was passiert als Nächstes?</h2>

				<div class="space-y-4">
					<!-- Kein automatischer Mailversand an die meldende Person — weder beim
					     Absenden noch bei der Freigabe; `notification.email.*` steuert
					     ausschließlich die interne Mail ans Museum. Zugesagt wird deshalb
					     nur, dass die Kontaktdaten angekommen sind — nicht, dass etwas
					     zurückkommt. Eine persönliche Rückmeldung des Museums bleibt damit
					     möglich, ohne dass die Seite sie versprochen hätte, und der Kanal
					     bleibt offen (Rückfragen laufen auch telefonisch). -->
					<div class="flex items-start gap-3">
						<Icon
							icon="lucide:message-circle"
							width="24"
							height="24"
							class="text-info-strong mt-1"
						/>
						<div>
							<h3 class="font-semibold">Rückfragen zu Ihrer Meldung</h3>
							<p class="text-base-content/70 text-sm">
								Eine automatische Bestätigungsmail versenden wir nicht. Falls zu Ihrer Meldung etwas
								offen bleibt, melden wir uns bei Ihnen — per E-Mail an <strong
									>{submittedData?.email ? maskEmail(submittedData.email) : '***@***.***'}</strong
								>{#if submittedData?.phone}
									oder telefonisch{/if}.
							</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<Icon icon="lucide:activity" width="24" height="24" class="text-info-strong mt-1" />
						<div>
							<h3 class="font-semibold">Wissenschaftliche Auswertung</h3>
							<p class="text-base-content/70 text-sm">
								Ihre Daten fließen in die Forschung ein und helfen beim Schutz der Meerestiere
							</p>
						</div>
					</div>

					<div class="flex items-start gap-3">
						<Icon icon="lucide:camera" width="24" height="24" class="text-accent-strong mt-1" />
						<div>
							<h3 class="font-semibold">Fotos und Videos</h3>
							<p class="text-base-content/70 text-sm">
								{#if submittedData?.mediaUpload}
									Ihre Aufnahmen wurden übermittelt und werden gemeinsam mit Ihrer Meldung geprüft.
								{/if}
								Waren Aufnahmen zu groß für den Upload, senden Sie sie bitte an
								<a class="link" href="mailto:{MEDIA_FALLBACK_EMAIL}">{MEDIA_FALLBACK_EMAIL}</a> — mit
								Datum und Uhrzeit Ihrer Beobachtung, damit wir sie zuordnen können.
							</p>
						</div>
					</div>

					{#if submittedData?.isDead}
						<div class="flex items-start gap-3">
							<Icon
								icon="lucide:triangle-alert"
								width="24"
								height="24"
								class="text-warning-strong mt-1"
							/>
							<div>
								<h3 class="font-semibold">Totfund gemeldet</h3>
								<p class="text-base-content/70 text-sm">
									Totfunde werden prioritär behandelt. Bei Bedarf werden wir Sie kontaktieren.
								</p>
							</div>
						</div>
					{/if}

					<div class="flex items-start gap-3">
						<Icon icon="lucide:chart-pie" width="24" height="24" class="text-primary mt-1" />
						<div>
							<h3 class="font-semibold">Daten einsehen</h3>
							<p class="text-base-content/70 text-sm">
								Ihre Meldung erscheint nach Prüfung auf der
								<a href="/map" class="link link-primary">interaktiven Karte</a>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Submission Summary -->
		{#if submittedData}
			<div class="card bg-base-100 shadow-raised mb-8">
				<div class="card-body">
					<h2 class="card-title mb-4">Ihre Meldung</h2>
					<div class="mb-4 grid grid-cols-1 gap-1 text-sm">
						<div>
							<span class="font-medium">Referenz-ID:</span>
							{submittedData.referenceId}
						</div>
						<span class="text-base-content/70 text-xs">
							(Bitte geben Sie die ID bei Rückfragen an unser Team an. Die ID hilft bei der
							Zuordnung Ihrer Meldung)
						</span>
					</div>
					<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
						<div>
							<span class="font-medium">Tierart:</span>
							{getSpeciesLabel(submittedData.species)}
						</div>
						<div>
							<span class="font-medium">Anzahl:</span>
							{submittedData.totalCount} Tier{submittedData.totalCount > 1 ? 'e' : ''}
						</div>
						<div>
							<span class="font-medium">Datum:</span>
							{formatWallClockDateTime(submittedData.sightingDate, submittedData.sightingTime)}
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
		<!-- Nur noch ein Button: „Zur Startseite" landete wegen des gespeicherten
		     Zweigs (ReportKind) faktisch im leeren Formular des alten Zweigs statt
		     auf der Einstiegsseite — fast dieselbe Wirkung wie „Weitere Meldung
		     abgeben", nur ohne den sauberen Zweig-Reset (UX-Review 2026-08-07). -->
		<div class="flex flex-col justify-center gap-4 md:flex-row">
			<button onclick={handleNewReport} class="btn btn-primary btn-lg">
				Weitere Meldung abgeben
			</button>
		</div>

		<!-- Additional Resources -->
		<div class="mt-12">
			<div class="card bg-base-200">
				<div class="card-body text-center">
					<h3 class="mb-4 text-lg font-semibold">Interessiert an mehr?</h3>

					<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
						<a href="/map" class="btn btn-outline btn-sm flex items-center gap-2">
							<Icon icon="lucide:map" width="16" height="16" />
							Alle Sichtungen auf der Karte
						</a>
						<a
							href="https://www.meeresmuseum.de"
							target="_blank"
							rel="noopener"
							class="btn btn-outline btn-sm flex items-center gap-2"
						>
							<Icon icon="lucide:shield-check" width="16" height="16" />
							Deutsches Meeresmuseum
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

	/* Link styling */
	.link {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.link:hover {
		text-decoration-thickness: 2px;
	}

	/* Mobile-first responsive adjustments */
	@media (max-width: 640px) {
		.container {
			padding-left: 1rem;
			padding-right: 1rem;
		}
	}
</style>
