<script lang="ts">
	import { getSpeciesLabel } from '$lib/report/formOptions/species';
	import { TrendingUp, Calendar, Users, Activity, ChartPie } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const monthNames = [
		'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
	];

	// Helper function to format numbers
	function formatNumber(num: number | string | null | undefined): string {
		const numValue = typeof num === 'string' ? parseFloat(num) : (num || 0);
		return new Intl.NumberFormat('de-DE').format(numValue);
	}

	// Helper function to format percentages
	function formatPercentage(num: number | string | null | undefined): string {
		const numValue = typeof num === 'string' ? parseFloat(num) : (num || 0);
		return `${numValue.toFixed(1)}%`;
	}

	// Types
	type Insight = {
		type: 'critical' | 'warning' | 'info';
		title: string;
		description: string;
	};

	// Calculate scientific insights
	let scientificInsights = $derived(() => {
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
			.filter(m => m.month >= 6 && m.month <= 8)
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
		const criticalSpecies = data.speciesStats.filter(s => {
			const deadPerc = typeof s.deadPercentage === 'string' ? parseFloat(s.deadPercentage) : (s.deadPercentage || 0);
			return deadPerc > 30;
		});
		if (criticalSpecies.length > 0) {
			criticalSpecies.forEach(species => {
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

<div class="space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-base-content">Wissenschaftliche Statistiken</h1>
			<p class="text-base-content/70 mt-2">
				Analyse von {formatNumber(data.basicStats?.totalSightings || 0)} Meerestier-Sichtungen
			</p>
		</div>
		<div class="badge badge-primary badge-lg">
			{formatNumber(data.basicStats?.verifiedSightings || 0)} verifiziert
		</div>
	</div>

	<!-- Scientific Insights Alert Box -->
	{#if scientificInsights().length > 0}
		<div class="alert alert-info">
			<Icon src={TrendingUp} class="h-6 w-6" />
			<div class="flex-1">
				<h3 class="font-bold">Wissenschaftliche Erkenntnisse</h3>
				<div class="space-y-2 mt-2">
					{#each scientificInsights() as insight (insight.title)}
						{@const alertClass = insight.type === 'critical' ? 'alert-error' : insight.type === 'warning' ? 'alert-warning' : 'alert-info'}
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
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
		<div class="stats shadow">
			<div class="stat">
				<div class="stat-figure text-primary">
					<Icon src={Users} class="h-8 w-8" />
				</div>
				<div class="stat-title">Gesamtsichtungen</div>
				<div class="stat-value text-primary">{formatNumber(data.basicStats?.totalSightings || 0)}</div>
				<div class="stat-desc">
					{formatNumber(data.basicStats?.verifiedSightings || 0)} verifiziert 
					({formatPercentage(((data.basicStats?.verifiedSightings || 0) / (data.basicStats?.totalSightings || 1)) * 100)})
				</div>
			</div>
		</div>

		<div class="stats shadow">
			<div class="stat">
				<div class="stat-figure text-secondary">
					<Icon src={Activity} class="h-8 w-8" />
				</div>
				<div class="stat-title">Ø Gruppengröße</div>
				<div class="stat-value text-secondary">{formatNumber(parseFloat(String(data.basicStats?.avgGroupSize || 0)).toFixed(1))}</div>
				<div class="stat-desc">Max: {data.basicStats?.maxGroupSize || 0} Tiere</div>
			</div>
		</div>

		<div class="stats shadow">
			<div class="stat">
				<div class="stat-figure text-warning">
					<Icon src={TrendingUp} class="h-8 w-8" />
				</div>
				<div class="stat-title">Totfunde</div>
				<div class="stat-value text-warning">{formatNumber(data.basicStats?.deadAnimals || 0)}</div>
				<div class="stat-desc">
					{formatPercentage(((data.basicStats?.deadAnimals || 0) / (data.basicStats?.totalSightings || 1)) * 100)} aller Sichtungen
				</div>
			</div>
		</div>

		<div class="stats shadow">
			<div class="stat">
				<div class="stat-figure text-accent">
					<Icon src={Calendar} class="h-8 w-8" />
				</div>
				<div class="stat-title">Mit Medien</div>
				<div class="stat-value text-accent">{formatNumber(data.basicStats?.withMedia || 0)}</div>
				<div class="stat-desc">
					{formatPercentage(((data.basicStats?.withMedia || 0) / (data.basicStats?.totalSightings || 1)) * 100)} dokumentiert
				</div>
			</div>
		</div>
	</div>

	<!-- Species Distribution -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">
					<Icon src={ChartPie} class="h-6 w-6" />
					Artenverteilung
				</h2>
				<div class="overflow-x-auto">
					<table class="table table-zebra">
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
								{@const deadPerc = typeof species.deadPercentage === 'string' ? parseFloat(species.deadPercentage) : (species.deadPercentage || 0)}
								<tr class={deadPerc > 30 ? 'bg-error/10' : deadPerc > 15 ? 'bg-warning/10' : ''}>
									<td class="font-medium">{getSpeciesLabel(species.species)}</td>
									<td>{formatNumber(species.count)}</td>
									<td>{formatPercentage(species.percentage)}</td>
									<td>{formatNumber(parseFloat(String(species.avgGroupSize || 0)).toFixed(1))}</td>
									<td class={deadPerc > 30 ? 'text-error font-bold' : deadPerc > 15 ? 'text-warning font-semibold' : ''}>
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
					<Icon src={Calendar} class="h-6 w-6" />
					Saisonalität (2015-2024)
				</h2>
				<div class="space-y-2">
					{#each data.monthlyStats as month (month.month)}
						{@const maxSightings = Math.max(...data.monthlyStats.map(m => m.sightings))}
						{@const percentage = (month.sightings / maxSightings) * 100}
						<div class="flex items-center gap-3">
							<div class="w-16 text-sm">{monthNames[month.month - 1]}</div>
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<progress 
										class="progress progress-primary w-full" 
										value={percentage} 
										max="100"
									></progress>
									<span class="text-sm font-medium min-w-fit">
										{formatNumber(month.sightings)}
									</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Yearly Trends -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">
				<Icon src={TrendingUp} class="h-6 w-6" />
				Jahrestrends (2010-2025)
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
							{@const change = prevYear ? ((year.sightings - prevYear.sightings) / prevYear.sightings) * 100 : 0}
							{@const maxSightings = Math.max(...data.yearlyStats.map(y => y.sightings))}
							{@const barWidth = (year.sightings / maxSightings) * 100}
							<tr>
								<td class="font-medium">{year.year}</td>
								<td>{formatNumber(year.sightings)}</td>
								<td>
									{#if prevYear}
										<span class={change > 0 ? 'text-success' : change < 0 ? 'text-error' : 'text-base-content'}>
											{change > 0 ? '+' : ''}{formatPercentage(change)}
										</span>
									{:else}
										<span class="text-base-content/50">-</span>
									{/if}
								</td>
								<td class="w-32">
									<div class="w-full bg-base-200 rounded-full h-2">
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
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">
					<Icon src={Calendar} class="h-6 w-6" />
					Aktivität der letzten 30 Tage
				</h2>
				<div class="grid grid-cols-7 gap-1 text-center">
					{#each data.recentActivity.slice().reverse() as activity (activity.date)}
						{@const _date = new Date(activity.date)}
						{@const maxCount = Math.max(...data.recentActivity.map(a => a.count))}
						{@const intensity = Math.min((activity.count / maxCount) * 4, 4)}
						<div class="tooltip" data-tip="{activity.date}: {activity.count} Sichtungen">
							<div 
								class="w-3 h-3 rounded-sm border border-base-300 {
									intensity === 0 ? 'bg-base-200' :
									intensity >= 4 ? 'bg-primary' :
									intensity >= 3 ? 'bg-primary/75' :
									intensity >= 2 ? 'bg-primary/50' :
									'bg-primary/25'
								}"
							></div>
						</div>
					{/each}
				</div>
				<div class="text-xs text-base-content/60 mt-2">
					Insgesamt {formatNumber(data.recentActivity.reduce((sum, a) => sum + a.count, 0))} neue Sichtungen
				</div>
			</div>
		</div>
	{/if}
</div>