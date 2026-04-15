<script lang="ts">
	import { getSpeciesLabel } from '$lib/report/formOptions/species';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const monthNames = [
		'Januar',
		'Februar',
		'März',
		'April',
		'Mai',
		'Juni',
		'Juli',
		'August',
		'September',
		'Oktober',
		'November',
		'Dezember'
	];

	// Helper function to format numbers
	function formatNumber(num: number | string | null | undefined): string {
		const numValue = typeof num === 'string' ? parseFloat(num) : num || 0;
		return new Intl.NumberFormat('de-DE').format(numValue);
	}

	// Helper function to format percentages
	function formatPercentage(num: number | string | null | undefined): string {
		const numValue = typeof num === 'string' ? parseFloat(num) : num || 0;
		return `${numValue.toFixed(1)}%`;
	}

	// Types
	type Insight = {
		type: 'critical' | 'warning' | 'info';
		title: string;
		description: string;
	};

	// Calculate scientific insights
	let scientificInsights = $derived.by(() => {
		if (!data.basicStats) return [];

		const insights: Insight[] = [];

		// Mortality rate analysis
		const totalDeadAnimals = data.basicStats.deadAnimals;
		const totalSightings = data.basicStats.totalSightings;
		const overallMortalityRate = (totalDeadAnimals / totalSightings) * 100;

		if (overallMortalityRate > 10) {
			insights.push({
				type: 'warning',
				title: 'Erhöhte Mortalitätsrate',
				description: `${formatPercentage(overallMortalityRate)} der Sichtungen betreffen tote Tiere - deutlich über dem erwarteten Niveau.`
			});
		}

		// Seasonal patterns
		const summerSightings = data.monthlyStats
			.filter((m) => m.month >= 6 && m.month <= 8)
			.reduce((sum, m) => sum + m.sightings, 0);
		const totalYearSightings = data.monthlyStats.reduce((sum, m) => sum + m.sightings, 0);
		const summerPercentage = (summerSightings / totalYearSightings) * 100;

		if (summerPercentage > 60) {
			insights.push({
				type: 'info',
				title: 'Starke Saisonalität',
				description: `${formatPercentage(summerPercentage)} aller Sichtungen finden in den Sommermonaten statt - deutliche Wanderungsmuster erkennbar.`
			});
		}

		// Species-specific concerns
		const criticalSpecies = data.speciesStats.filter((s) => {
			const deadPerc =
				typeof s.deadPercentage === 'string' ? parseFloat(s.deadPercentage) : s.deadPercentage || 0;
			return deadPerc > 30;
		});
		if (criticalSpecies.length > 0) {
			criticalSpecies.forEach((species) => {
				insights.push({
					type: 'critical',
					title: `Kritische Mortalität: ${getSpeciesLabel(species.species)}`,
					description: `${formatPercentage(species.deadPercentage)} Mortalitätsrate bei ${getSpeciesLabel(species.species)} - erfordert sofortige wissenschaftliche Aufmerksamkeit.`
				});
			});
		}

		return insights;
	});
</script>

<svelte:head>
	<title>Statistiken - Admin - Ostsee-Tiere</title>
	<meta
		name="description"
		content="Wissenschaftliche Statistiken und Auswertungen der Meerestier-Sichtungen. Detaillierte Analysen für Forschung und Monitoring."
	/>
	<meta
		name="keywords"
		content="Statistiken, Wissenschaft, Analyse, Meerestiere, Ostsee, Forschung, Daten, Admin"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="Sichtungsstatistiken - Admin - Ostsee-Tiere" />
	<meta
		property="og:description"
		content="Wissenschaftliche Statistiken und Auswertungen der Meerestier-Sichtungen"
	/>
	<meta property="og:type" content="website" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Sichtungsstatistiken - Admin - Ostsee-Tiere" />
	<meta
		name="twitter:description"
		content="Wissenschaftliche Statistiken und Auswertungen der Meerestier-Sichtungen"
	/>
</svelte:head>
<div class="container mx-auto p-4">
	<div class="space-y-8 pt-2">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-base-content text-3xl font-bold">Statistiken</h1>
				<p class="text-base-content/70 mt-2">
					Analyse von {formatNumber(data.basicStats?.totalSightings || 0)} Meerestier-Sichtungen
				</p>
			</div>
			<div class="badge badge-primary badge-lg">
				{formatNumber(data.basicStats?.verifiedSightings || 0)} verifiziert
			</div>
		</div>

		<!-- Scientific Insights Alert Box -->
		{#if scientificInsights.length > 0}
			<div class="alert alert-info">
				<Icon icon="lucide:trending-up" class="h-6 w-6" />
				<div class="flex-1">
					<h3 class="font-bold">Wissenschaftliche Erkenntnisse</h3>
					<div class="mt-2 space-y-2">
						{#each scientificInsights as insight (insight.title)}
							{@const alertClass =
								insight.type === 'critical'
									? 'alert-error'
									: insight.type === 'warning'
										? 'alert-warning'
										: 'alert-info'}
							<div class="alert {alertClass} alert-sm">
								<div>
									<div class="font-semibold">{insight.title}</div>
									<div class="text-sm">{insight.description}</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Key Metrics Grid -->
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
			<div class="stats shadow">
				<div class="stat">
					<div class="stat-figure text-primary">
						<Icon icon="lucide:users" class="h-8 w-8" />
					</div>
					<div class="stat-title">Gesamtsichtungen</div>
					<div class="stat-value text-primary">
						{formatNumber(data.basicStats?.totalSightings || 0)}
					</div>
					<div class="stat-desc">
						{formatNumber(data.basicStats?.verifiedSightings || 0)} verifiziert ({formatPercentage(
							((data.basicStats?.verifiedSightings || 0) / (data.basicStats?.totalSightings || 1)) *
								100
						)})
					</div>
				</div>
			</div>

			<div class="stats shadow">
				<div class="stat">
					<div class="stat-figure text-secondary">
						<Icon icon="lucide:activity" class="h-8 w-8" />
					</div>
					<div class="stat-title">Ø Gruppengröße</div>
					<div class="stat-value text-secondary">
						{formatNumber(parseFloat(String(data.basicStats?.avgGroupSize || 0)).toFixed(1))}
					</div>
					<div class="stat-desc">Max: {data.basicStats?.maxGroupSize || 0} Tiere</div>
				</div>
			</div>

			<div class="stats shadow">
				<div class="stat">
					<div class="stat-figure text-warning">
						<Icon icon="lucide:trending-up" class="h-8 w-8" />
					</div>
					<div class="stat-title">Totfunde</div>
					<div class="stat-value text-warning">
						{formatNumber(data.basicStats?.deadAnimals || 0)}
					</div>
					<div class="stat-desc">
						{formatPercentage(
							((data.basicStats?.deadAnimals || 0) / (data.basicStats?.totalSightings || 1)) * 100
						)} der Sichtungen
					</div>
				</div>
			</div>

			<div class="stats shadow">
				<div class="stat">
					<div class="stat-figure text-accent">
						<Icon icon="lucide:calendar" class="h-8 w-8" />
					</div>
					<div class="stat-title">Mit Medien</div>
					<div class="stat-value text-accent">{formatNumber(data.basicStats?.withMedia || 0)}</div>
					<div class="stat-desc">
						{formatPercentage(
							((data.basicStats?.withMedia || 0) / (data.basicStats?.totalSightings || 1)) * 100
						)} aller Sichtungen
					</div>
				</div>
			</div>

			<div class="stats shadow">
				<div class="stat">
					<div class="stat-figure text-info">
						<Icon icon="lucide:users" class="h-8 w-8" />
					</div>
					<div class="stat-title">Unique Nutzer</div>
					<div class="stat-value text-info">{formatNumber(data.userStats?.uniqueUsers || 0)}</div>
					<div class="stat-desc">
						{formatNumber(data.userStats?.repeatUsers || 0)} Wiederholungs-Nutzer ({formatPercentage(
							data.userStats?.repeatUserPercentage || 0
						)})
					</div>
				</div>
			</div>
		</div>

		<!-- Species Distribution -->
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">
						<Icon icon="lucide:chart-pie" class="h-6 w-6" />
						Artenverteilung (verifizierte Sichtungen)
					</h2>
					<div class="overflow-x-auto">
						<table class="table-zebra table">
							<thead>
								<tr>
									<th>Art</th>
									<th>Sichtungen</th>
									<th>Anteil</th>
									<th>Ø Gruppe</th>
									<th>Mortalität</th>
								</tr>
							</thead>
							<tbody>
								{#each data.speciesStats as species (species.species)}
									{@const deadPerc =
										typeof species.deadPercentage === 'string'
											? parseFloat(species.deadPercentage)
											: species.deadPercentage || 0}
									<tr class={deadPerc > 30 ? 'bg-error/10' : deadPerc > 15 ? 'bg-warning/10' : ''}>
										<td class="font-medium">{getSpeciesLabel(species.species)}</td>
										<td>{formatNumber(species.count)}</td>
										<td>{formatPercentage(species.percentage)}</td>
										<td>{formatNumber(parseFloat(String(species.avgGroupSize || 0)).toFixed(1))}</td
										>
										<td
											class={deadPerc > 30
												? 'text-error font-bold'
												: deadPerc > 15
													? 'text-warning font-semibold'
													: ''}
										>
											{formatPercentage(species.deadPercentage)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- Monthly Seasonality -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">
						<Icon icon="lucide:calendar" class="h-6 w-6" />
						Saisonalität (verifizierte Sichtungen)
					</h2>
					<div class="space-y-2">
						{#each data.monthlyStats as month (month.month)}
							{@const maxSightings = Math.max(...data.monthlyStats.map((m) => m.sightings))}
							{@const percentage = (month.sightings / maxSightings) * 100}
							<div class="flex items-center gap-3">
								<div class="w-16 text-sm">{monthNames[month.month - 1]}</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<progress class="progress progress-primary w-full" value={percentage} max="100"
										></progress>
										<span class="min-w-fit text-sm font-medium">
											{formatNumber(month.sightings)}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Data Quality & User Engagement -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">
						<Icon icon="lucide:users" class="h-6 w-6" />
						Nutzerengagement & Datenqualität (verifizierte Sichtungen)
					</h2>

					<!-- User Engagement Stats -->
					<div class="stats stats-vertical lg:stats-horizontal mb-4 shadow">
						<div class="stat">
							<div class="stat-title">Eindeutige Nutzer</div>
							<div class="stat-value text-primary">
								{formatNumber(data.userStats?.uniqueUsers || 0)}
							</div>
						</div>
						<div class="stat">
							<div class="stat-title">Wiederkehrer</div>
							<div class="stat-value text-secondary">
								{formatNumber(data.userStats?.repeatUsers || 0)}
							</div>
							<div class="stat-desc">
								{formatPercentage(data.userStats?.repeatUserPercentage || 0)} Quote
							</div>
						</div>
						<div class="stat">
							<div class="stat-title">Eindeutige Schiffsnamen</div>
							<div class="stat-value text-accent">
								{formatNumber(data.shipStats?.uniqueShips || 0)}
							</div>
							<div class="stat-desc">
								{formatNumber(data.shipStats?.totalWithShipName || 0)} mit Namen
							</div>
						</div>
					</div>

					<!-- Data Quality Indicators -->
					<div class="space-y-2">
						<h3 class="font-semibold">Datenqualität</h3>
						{#if data.qualityStats}
							{@const total = data.qualityStats?.total || 1}
							<div class="flex items-center gap-3">
								<div class="w-24 text-sm">Koordinaten</div>
								<div class="flex-1">
									<progress
										class="progress progress-primary w-full"
										value={data.qualityStats?.withCoordinates || 0}
										max={total}
									></progress>
								</div>
								<span class="min-w-16 text-sm font-medium">
									{formatPercentage(((data.qualityStats?.withCoordinates || 0) / total) * 100)}
								</span>
							</div>
							<div class="flex items-center gap-3">
								<div class="w-24 text-sm">Verhalten</div>
								<div class="flex-1">
									<progress
										class="progress progress-accent w-full"
										value={data.qualityStats?.withBehavior || 0}
										max={total}
									></progress>
								</div>
								<span class="min-w-16 text-sm font-medium">
									{formatPercentage(((data.qualityStats?.withBehavior || 0) / total) * 100)}
								</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Top Observers -->
		{#if data.topObservers && data.topObservers.length > 0}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">
						<Icon icon="lucide:trending-up" class="h-6 w-6" />
						Top Beobachter (verifizierte Sichtungen, ohne meeresmuseum.de)
					</h2>
					<div class="overflow-x-auto">
						<table class="table">
							<thead>
								<tr>
									<th>E-Mail</th>
									<th>Sichtungen</th>
									<th>Ø Gruppengröße</th>
									<th>Zeitraum</th>
									<th>Aktivität</th>
								</tr>
							</thead>
							<tbody>
								{#each data.topObservers as observer, index (observer.email)}
									{@const daysDiff =
										Math.ceil(
											(new Date(observer.lastSighting).getTime() -
												new Date(observer.firstSighting).getTime()) /
												(1000 * 3600 * 24)
										) + 1}
									<tr>
										<td class="font-mono text-sm">
											<span class="badge badge-ghost">#{index + 1}</span>
											{observer.email}
										</td>
										<td>
											<span class="font-semibold">{formatNumber(observer.sightingCount)}</span>
										</td>
										<td>{formatNumber(parseFloat(String(observer.avgGroupSize)).toFixed(1))}</td>
										<td class="text-sm">
											{new Date(observer.firstSighting).getFullYear()} -
											{new Date(observer.lastSighting).getFullYear()}
										</td>
										<td>
											<div class="text-xs">
												{Math.round(daysDiff)} Tage aktiv
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Yearly Trends -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">
					<Icon icon="lucide:trending-up" class="h-6 w-6" />
					Jahrestrends (verifizierte Sichtungen)
				</h2>
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>Jahr</th>
								<th>Sichtungen</th>
								<th>Entwicklung</th>
								<th>Visualisierung</th>
							</tr>
						</thead>
						<tbody>
							{#each data.yearlyStats as year, index (year.year)}
								{@const prevYear = index > 0 ? data.yearlyStats[index - 1] : null}
								{@const change = prevYear
									? ((year.sightings - prevYear.sightings) / prevYear.sightings) * 100
									: 0}
								{@const maxSightings = Math.max(...data.yearlyStats.map((y) => y.sightings))}
								{@const barWidth = (year.sightings / maxSightings) * 100}
								<tr>
									<td class="font-medium">{year.year}</td>
									<td>{formatNumber(year.sightings)}</td>
									<td>
										{#if prevYear}
											<span
												class={change > 0
													? 'text-success'
													: change < 0
														? 'text-error'
														: 'text-base-content'}
											>
												{change > 0 ? '+' : ''}{formatPercentage(change)}
											</span>
										{:else}
											<span class="text-base-content/50">-</span>
										{/if}
									</td>
									<td class="w-32">
										<div class="bg-base-200 h-2 w-full rounded-full">
											<div
												class="bg-primary h-2 rounded-full transition-all"
												style="width: {barWidth}%"
											></div>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Recent Activity -->
		{#if data.recentActivity.length > 0}
			{@const totalRecentSightings = data.recentActivity.reduce(
				(sum, a) => sum + Number(a.count),
				0
			)}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">
						<Icon icon="lucide:calendar" class="h-6 w-6" />
						Aktivität der letzten 30 Tage (alle Sichtungen)
					</h2>

					<!-- Activity Heatmap -->
					<div class="mb-4">
						<div class="grid grid-cols-7 gap-1">
							{#each Array(30)
								.fill(null)
								.map((_, i) => i) as dayIndex (dayIndex)}
								{@const targetDate = new Date(Date.now() - (29 - dayIndex) * 24 * 60 * 60 * 1000)}
								{@const dateStr = targetDate.toISOString().split('T')[0]}
								{@const activity = data.recentActivity.find((a) => a.date === dateStr)}
								{@const count = activity ? Number(activity.count) : 0}
								{@const maxCount = Math.max(...data.recentActivity.map((a) => Number(a.count)))}
								{@const intensity = maxCount > 0 ? count / maxCount : 0}
								<div
									class="tooltip"
									data-tip="{dateStr}: {count} Sichtung{count !== 1 ? 'en' : ''}"
								>
									<div
										class="border-base-300 flex h-8 w-8 items-center justify-center rounded-sm border text-xs
									{intensity === 0
											? 'bg-base-200 text-base-content/30'
											: intensity >= 0.75
												? 'bg-primary text-primary-content'
												: intensity >= 0.5
													? 'bg-primary/75 text-base-content'
													: intensity >= 0.25
														? 'bg-primary/50 text-base-content'
														: 'bg-primary/25 text-base-content'}"
									>
										{count > 0 ? count : ''}
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Summary Stats -->
					<div class="stats stats-vertical lg:stats-horizontal shadow">
						<div class="stat">
							<div class="stat-title">Neue Sichtungen</div>
							<div class="stat-value text-primary">{formatNumber(totalRecentSightings)}</div>
							<div class="stat-desc">in den letzten 30 Tagen</div>
						</div>
						<div class="stat">
							<div class="stat-title">Durchschnitt</div>
							<div class="stat-value text-secondary">
								{formatNumber((totalRecentSightings / 30).toFixed(1))}
							</div>
							<div class="stat-desc">Sichtungen pro Tag</div>
						</div>
						<div class="stat">
							<div class="stat-title">Aktivste Tage</div>
							<div class="stat-value text-accent">{data.recentActivity.length}</div>
							<div class="stat-desc">Tage mit Meldungen</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
