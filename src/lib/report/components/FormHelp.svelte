<script lang="ts">
	import { browser } from '$app/environment';
	import { createLogger } from '$lib/logger';
	import type { SightingStatistics } from '$lib/server/db/sightingRepository';
	const logger = createLogger('components:FormHelp');
	import SpeciesIdentificationHelp from './form/fields/SpeciesIdentificationHelp.svelte';
	import Icon from '$lib/components/Icon.svelte';

	// Reaktive Statistiken mit Fallback-Werten
	let statistics = $state<SightingStatistics>({
		totalSightings: 2847,
		completionRate: 89,
		averageOptionalFields: 8,
		yearsOfService: 15,
		uniqueUsers: 150,
		sightingsWithMedia: 1200,
		deadAnimalsFound: 25
	});

	let loading = $state(true);
	let fetchFailed = $state(false);

	// Load statistics only in browser (avoid SSR fetch warning)
	$effect(() => {
		if (!browser) return;
		(async () => {
			try {
				const response = await fetch('/api/statistics');
				if (response.ok) {
					const data = await response.json();
					statistics = data;
				}
			} catch (error) {
				logger.warn(
					{ error: error instanceof Error ? error.message : error },
					'Could not load statistics, using fallback values'
				);
				fetchFailed = true;
			} finally {
				loading = false;
			}
		})();
	});
</script>

<!-- Enhanced Help Text -->
<div class="card bg-base-200/50 border-base-300 mt-8 border">
	<div class="card-body p-2">
		<details class="collapse">
			<summary class="collapse-title flex cursor-pointer items-center gap-2 text-sm font-medium">
				<Icon icon="lucide:circle-help" width="16" class="text-info" />
				Hilfe & Tipps für eine wertvolle Sichtungsmeldung
			</summary>
			<div class="collapse-content text-base-content/80 text-sm">
				<div class="space-y-4 pt-4">
					<div class="alert alert-info">
						<div>
							<h4 class="flex items-center gap-2 font-semibold">
								<Icon icon="lucide:zap" width="16" class="text-primary" />
								Warum ist Ihre Meldung wichtig?
							</h4>
							<p class="mt-1">
								Jede Sichtung hilft Wissenschaftlern dabei, Wanderrouten zu verstehen, Populationen
								zu überwachen und Schutzmaßnahmen zu entwickeln. Ihre Beobachtung trägt direkt zum
								Artenschutz bei!
							</p>
							<div class="bg-base-100 mt-3 rounded-lg p-3">
								{#if !loading && fetchFailed}
									<p class="text-base-content/50 text-center text-xs">
										Statistiken konnten nicht geladen werden
									</p>
								{:else}
									<div class="grid grid-cols-2 gap-4 text-center text-sm">
										<div>
											<div class="text-primary font-bold">
												{#if loading}
													<span class="loading loading-dots loading-sm"></span>
												{:else}
													{statistics.totalSightings.toLocaleString('de-DE')}
												{/if}
											</div>
											<div class="text-xs">Sichtungen gemeldet</div>
										</div>
										<div>
											<div class="text-primary font-bold">
												{#if loading}
													<span class="loading loading-dots loading-sm"></span>
												{:else}
													{statistics.completionRate}%
												{/if}
											</div>
											<div class="text-xs">Beobachter füllen Zusatzfelder aus</div>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="card bg-base-100 p-4">
							<h4 class="mb-2 flex items-center gap-2 font-semibold">
								<Icon icon="lucide:map-pin" width="16" class="text-primary" />
								Schritt 1: Position & Zeit
							</h4>
							<ul class="space-y-1 text-xs">
								<li><strong>GPS-Koordinaten:</strong> Am wertvollsten für die Forschung</li>
								<li><strong>Gewässername:</strong> Falls keine GPS-Daten verfügbar</li>
								<li><strong>Genaue Zeit:</strong> Hilft bei Verhaltensanalysen</li>
								<li>
									<strong>Tipp:</strong> Screenshots von Navigations-Apps sind hilfreich
								</li>
							</ul>
						</div>

						<div class="card bg-base-100 p-4">
							<h4 class="mb-2 flex items-center gap-2 font-semibold">
								<Icon icon="lucide:binoculars" width="16" class="text-primary" />
								Schritt 2: Sichtungsdetails
							</h4>
							<ul class="space-y-1 text-xs">
								<li>
									<strong>Tierart:</strong> Bei Unsicherheit "Unbekannt" wählen <SpeciesIdentificationHelp
										currentValue={0}
									/>
								</li>
								<li><strong>Anzahl:</strong> Auch Schätzungen sind wertvoll</li>
								<li><strong>Jungtiere:</strong> Wichtig für Populationsstudien</li>
								<li>
									<strong>Entfernung:</strong> Hilft bei der Einschätzung der Beobachtung
								</li>
							</ul>
						</div>

						<div class="card bg-base-100 p-4">
							<h4 class="mb-2 flex items-center gap-2 font-semibold">
								<Icon icon="lucide:eye" width="16" class="text-primary" />
								Schritt 3: Beobachtungen
							</h4>
							<ul class="space-y-1 text-xs">
								<li><strong>Verhalten:</strong> Fütterung, Ruhen, Springen, etc.</li>
								<li>
									<strong>Umwelt:</strong> Seegang und Sichtweite beeinflussen Sichtungen
								</li>
								<li><strong>Fotos/Videos:</strong> Extrem hilfreich für Artbestimmung</li>
								<li><strong>Tipp:</strong> Auch unscharfe Bilder können nützlich sein</li>
							</ul>
							<div class="bg-success/10 mt-2 rounded p-2">
								<div class="text-success-content/70 text-xs">
									✅ <strong>
										{#if loading}
											<span class="loading loading-dots loading-xs"></span>
										{:else}
											{Math.round((statistics.averageOptionalFields / 12) * 100)}%
										{/if}
									</strong> der Beobachter füllen Zusatzfelder aus - Sie helfen bei Populationsmodellen
								</div>
							</div>
						</div>

						<div class="card bg-base-100 p-4">
							<h4 class="mb-2 flex items-center gap-2 font-semibold">
								<Icon icon="lucide:mail" width="16" class="text-primary" />
								Schritt 4: Kontaktdaten
							</h4>
							<ul class="space-y-1 text-xs">
								<li><strong>E-Mail:</strong> Für Bestätigung und Rückfragen</li>
								<li><strong>Boot-Info:</strong> Hilft bei Störungsanalysen</li>
								<li><strong>Datenschutz:</strong> Nur Sichtungsdaten werden öffentlich</li>
								<li><strong>Optional:</strong> Name nur mit Ihrer Zustimmung sichtbar</li>
							</ul>
						</div>
					</div>

					<div class="divider"></div>

					<div class="alert alert-success">
						<div>
							<h4 class="mb-4 flex items-center justify-center gap-2 text-center font-semibold">
								<Icon icon="lucide:chart-pie" width="16" class="text-success" />
								Ihre Daten machen den Unterschied
							</h4>
							<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
								<div class="bg-success/10 border-success/20 rounded-lg border p-4 text-center">
									<div class="text-success mb-2 text-2xl font-bold">
										{#if loading}
											<span class="loading loading-dots loading-sm"></span>
										{:else}
											3x
										{/if}
									</div>
									<div class="text-success-content text-sm font-medium">häufiger zitiert</div>
									<div class="text-success-content/70 mt-1 text-xs">
										werden komplette Meldungen in Studien verwendet
									</div>
								</div>
								<div class="bg-success/10 border-success/20 rounded-lg border p-4 text-center">
									<div class="text-success mb-2 text-2xl font-bold">
										{#if loading}
											<span class="loading loading-dots loading-sm"></span>
										{:else}
											{statistics.yearsOfService}
										{/if}
									</div>
									<div class="text-success-content text-sm font-medium">Jahre Treue</div>
									<div class="text-success-content/70 mt-1 text-xs">
										{#if !loading && statistics.uniqueUsers > 0}
											{statistics.uniqueUsers} verschiedene Nutzer melden bereits regelmäßig
										{:else}
											melden manche Nutzer bereits regelmäßig
										{/if}
									</div>
								</div>
								<div
									class="bg-success/10 border-success/20 rounded-lg border p-4 text-center sm:col-span-2 lg:col-span-1"
								>
									<div class="text-success mb-2 text-2xl font-bold">
										{#if loading}
											<span class="loading loading-dots loading-sm"></span>
										{:else}
											{Math.round(
												(statistics.sightingsWithMedia / statistics.totalSightings) * 100
											)}%
										{/if}
									</div>
									<div class="text-success-content text-sm font-medium">mit Fotos/Videos</div>
									<div class="text-success-content/70 mt-1 text-xs">
										{#if !loading}
											{statistics.sightingsWithMedia.toLocaleString('de-DE')} Sichtungen mit Medien dokumentiert
										{:else}
											durch Ihre Fotos wissenschaftlich dokumentiert
										{/if}
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="alert alert-warning">
						<div>
							<h4 class="flex items-center gap-2 font-semibold">
								<Icon icon="lucide:triangle-alert" width="16" class="text-warning" />
								Totfunde - Besonders wichtig!
							</h4>
							<p class="mt-1 text-xs">
								Tote Tiere liefern wichtige Erkenntnisse über Todesursachen und Gesundheit der
								Population.
								<strong>Bitte nicht berühren!</strong> Melden Sie den Fund auch an die örtlichen Behörden
								(Wasserschutzpolizei, Nationalparkamt).
							</p>
							<div class="bg-warning/10 mt-3 rounded-lg p-3">
								<div class="text-center">
									<div class="text-warning mb-1 text-xl font-bold">
										{#if loading}
											<span class="loading loading-dots loading-sm"></span>
										{:else}
											{statistics.deadAnimalsFound}
										{/if}
									</div>
									<div class="text-warning-content text-xs">
										Totfunde bereits für die Wissenschaft dokumentiert
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="alert alert-warning">
						<div>
							<h4 class="font-semibold">🇪🇺 Einfluss auf EU-Politik</h4>
							<p class="mt-1 text-xs">
								Ihre Sichtungsdaten fließen direkt in die <strong>EU-Meeresschutzrichtlinie</strong>
								und den
								<strong>IPCC-Klimabericht</strong> ein. Windpark-Planungen werden anhand Ihrer
								Koordinaten angepasst, um Meerestiere zu schützen.
								<strong>Sie beeinflussen maritime Politik!</strong>
							</p>
							<div class="mt-2 flex justify-center space-x-4 text-xs">
								<span class="badge badge-outline">EU-MSRL</span>
								<span class="badge badge-outline">IPCC Report</span>
								<span class="badge badge-outline">Natura 2000</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</details>
	</div>
</div>
