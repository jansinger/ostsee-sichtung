<script lang="ts">
	import { createLogger } from '$lib/logger';
	import type { ConfigItem, ConfigValue } from '$lib/server/db/configRepository';
	import {
		Check,
		CircleAlert,
		Cog,
		Globe,
		Lock,
		Mail,
		RefreshCw,
		Save,
		Send,
		Smartphone
	} from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import { SvelteSet } from 'svelte/reactivity';

	const logger = createLogger('admin:settings');

	let { data } = $props();
	let groupedConfigs = $state(data.groupedConfigs);
	let saveMessage = $state('');
	let errorMessage = $state(data.error || '');
	let savingStates = $state<Record<string, boolean>>({});
	let changedConfigs = $state<Set<string>>(new Set());
	let showAllSettings = $state(false);
	let isSuperAdmin = $state(data.isSuperAdmin || false);

	const categoryIcons: Record<string, any> = {
		email: Mail,
		display: Globe,
		security: Lock,
		data: Cog,
		integration: Globe,
		mobile: Smartphone
	};

	const categoryLabels: Record<string, string> = {
		email: '📧 E-Mail Einstellungen',
		display: '🎨 Anzeige-Einstellungen',
		security: '🔒 Sicherheit & Validierung',
		data: '📊 Datenverarbeitung',
		integration: '🌐 Integration',
		mobile: '📱 Mobile App'
	};

	const categoryDescriptions: Record<string, string> = {
		email: 'Konfigurieren Sie E-Mail-Benachrichtigungen und SMTP-Einstellungen',
		display: 'Anpassung der Benutzeroberfläche und Kartenansichten',
		security: 'Sicherheitseinstellungen und Upload-Beschränkungen',
		data: 'Einstellungen für Datenverarbeitung und Validierung',
		integration: 'APIs und externe Service-Integrationen',
		mobile: 'Mobile App-spezifische Einstellungen'
	};

	// Define which settings are currently implemented and should be shown
	const activeConfigKeys = new Set([
		// Email settings - fully implemented
		'notification.email.enabled',
		'notification.email.recipient',
		'notification.email.sender',
		'notification.email.senderName',
		'notification.email.template',
		'email.smtp.host',
		'email.smtp.port',
		'email.smtp.secure',
		'email.smtp.user',
		'email.smtp.password',

		// Display settings - implemented
		'display.maintenanceMode',
		'display.maintenanceMessage',
		'display.maxSightingsPerPage',

		// Security settings - partially implemented
		'security.maxFileSize',
		'security.allowedFileTypes'

		// Note: Other settings are planned but not yet actively used:
		// - Most data processing settings (duplicate check, auto-approve, etc.)
		// - Integration settings (weather API, geocoding, webhooks)
		// - Advanced display settings (map defaults, date format)
		// - Mobile app settings
		// - Advanced security settings
	]);

	// Filter configurations to only show active ones
	function filterActiveConfigs(
		configs: Record<string, ConfigItem[]>
	): Record<string, ConfigItem[]> {
		const filtered: Record<string, ConfigItem[]> = {};

		for (const [category, configList] of Object.entries(configs)) {
			const activeConfigs = configList.filter((config) => activeConfigKeys.has(config.key));
			if (activeConfigs.length > 0) {
				filtered[category] = activeConfigs;
			}
		}

		return filtered;
	}

	// Apply filtering to the configurations
	$effect(() => {
		if (showAllSettings) {
			groupedConfigs = data.groupedConfigs;
		} else {
			groupedConfigs = filterActiveConfigs(data.groupedConfigs);
		}
	});

	function getValueDisplay(value: unknown): string {
		if (value === null || value === undefined) return '';
		if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
		if (Array.isArray(value)) return value.join(', ');
		if (typeof value === 'object') return JSON.stringify(value, null, 2);
		return String(value);
	}

	function getInputType(value: unknown): string {
		if (typeof value === 'boolean') return 'checkbox';
		if (typeof value === 'number') return 'number';
		if (Array.isArray(value)) return 'tags';
		if (typeof value === 'object') return 'json';
		if (typeof value === 'string' && value.length > 100) return 'textarea';
		return 'text';
	}

	function handleInputChange(config: ConfigItem, newValue: unknown) {
		// Update the config value
		config.value = newValue as ConfigValue;
		changedConfigs = new SvelteSet(changedConfigs).add(config.key);

		// Force reactivity update for the specific config object
		groupedConfigs = { ...groupedConfigs };
	}

	function handleArrayChange(config: ConfigItem, event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value;

		// Split by comma and trim whitespace
		const arrayValue = value
			.split(',')
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
		handleInputChange(config, arrayValue);
	}

	function handleJsonChange(config: ConfigItem, event: Event) {
		const target = event.target as HTMLTextAreaElement;
		try {
			const jsonValue = JSON.parse(target.value);
			handleInputChange(config, jsonValue);
		} catch (_error) {
			// Invalid JSON - keep as string for now
			handleInputChange(config, target.value);
		}
	}

	async function saveConfig(config: ConfigItem) {
		if (savingStates[config.key]) return;

		savingStates[config.key] = true;

		try {
			const requestBody = {
				key: config.key,
				value: config.value,
				description: config.description,
				category: config.category
			};

			const response = await fetch('/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				throw new Error('Failed to save configuration');
			}

			const newChangedConfigs = new SvelteSet(changedConfigs);
			newChangedConfigs.delete(config.key);
			changedConfigs = newChangedConfigs;

			// Special handling for maintenance mode
			if (config.key === 'display.maintenanceMode') {
				const isEnabled = Boolean(config.value);
				saveMessage = `✅ Wartungsmodus ${isEnabled ? 'aktiviert' : 'deaktiviert'} - Änderung ist sofort wirksam`;
			} else {
				saveMessage = `✅ ${config.key} gespeichert`;
			}

			errorMessage = '';

			setTimeout(() => (saveMessage = ''), 5000);
		} catch (error) {
			logger.error({ error, config: config.key }, 'Failed to save configuration');
			errorMessage = `❌ Fehler beim Speichern von ${config.key}`;
			setTimeout(() => (errorMessage = ''), 5000);
		} finally {
			savingStates[config.key] = false;
		}
	}

	async function saveAllChanges() {
		const configsToSave = [];

		for (const [_category, configs] of Object.entries(groupedConfigs)) {
			for (const config of configs) {
				if (changedConfigs.has(config.key)) {
					configsToSave.push(config);
				}
			}
		}

		if (configsToSave.length === 0) {
			saveMessage = 'ℹ️ Keine Änderungen zu speichern';
			setTimeout(() => (saveMessage = ''), 3000);
			return;
		}

		for (const config of configsToSave) {
			await saveConfig(config);
		}

		if (changedConfigs.size === 0) {
			saveMessage = `✅ ${configsToSave.length} Einstellungen gespeichert`;
			setTimeout(() => (saveMessage = ''), 5000);
		}
	}

	async function resetToDefaults() {
		if (!confirm('Möchten Sie wirklich alle Einstellungen auf die Standardwerte zurücksetzen?')) {
			return;
		}

		try {
			const response = await fetch('/api/config/reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.ok) {
				// Reload page to get fresh data
				window.location.reload();
			}
		} catch (error) {
			logger.error({ error }, 'Failed to reset configurations');
			errorMessage = '❌ Fehler beim Zurücksetzen der Einstellungen';
			setTimeout(() => (errorMessage = ''), 5000);
		}
	}

	async function testEmailConfiguration(recipientEmail: string) {
		try {
			const response = await fetch('/api/config/test-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ recipient: recipientEmail })
			});

			const result = await response.json();

			if (response.ok && result.success) {
				saveMessage = '✅ Test-E-Mail wurde erfolgreich gesendet';
				setTimeout(() => (saveMessage = ''), 5000);
			} else {
				errorMessage = result.message || '❌ Test-E-Mail konnte nicht gesendet werden';
				setTimeout(() => (errorMessage = ''), 5000);
			}
		} catch (error) {
			logger.error({ error }, 'Failed to send test email');
			errorMessage = '❌ Fehler beim Senden der Test-E-Mail';
			setTimeout(() => (errorMessage = ''), 5000);
		}
	}

	function handleTestEmail(_config: unknown) {
		const recipient = groupedConfigs.email?.find(
			(c) => c.key === 'notification.email.recipient'
		)?.value;
		if (recipient && typeof recipient === 'string' && recipient.includes('@')) {
			testEmailConfiguration(recipient);
		} else {
			errorMessage = '❌ Bitte konfigurieren Sie zuerst eine gültige Empfänger-E-Mail-Adresse';
			setTimeout(() => (errorMessage = ''), 5000);
		}
	}

	async function testMaintenanceMode() {
		try {
			const response = await fetch('/api/maintenance-status', {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await response.json();

			if (response.ok) {
				const status = result.enabled ? 'aktiviert' : 'deaktiviert';
				saveMessage = `✅ Wartungsmodus-Status: ${status} (${result.timestamp})`;
				setTimeout(() => (saveMessage = ''), 5000);
			} else {
				errorMessage = result.message || '❌ Wartungsmodus-Status konnte nicht abgerufen werden';
				setTimeout(() => (errorMessage = ''), 5000);
			}
		} catch (error) {
			logger.error({ error }, 'Failed to test maintenance mode');
			errorMessage = '❌ Fehler beim Testen des Wartungsmodus';
			setTimeout(() => (errorMessage = ''), 5000);
		}
	}
</script>

<svelte:head>
	<title>Einstellungen - Admin | Ostsee-Tiere</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">⚙️ Anwendungseinstellungen</h1>
			<p class="mt-2 text-gray-600">
				Konfigurieren Sie alle Aspekte der Ostsee-Tiere Anwendung über diese zentrale Oberfläche.
			</p>
		</div>

		<div class="flex gap-3">
			<!-- Toggle for showing all/active settings - only visible to superadmins -->
			{#if isSuperAdmin}
				<div class="form-control">
					<label class="label cursor-pointer gap-2">
						<span class="label-text text-sm">Alle Einstellungen anzeigen</span>
						<input
							type="checkbox"
							class="toggle toggle-primary toggle-sm"
							bind:checked={showAllSettings}
							title={showAllSettings
								? 'Nur aktive Einstellungen anzeigen'
								: 'Alle Einstellungen anzeigen (inkl. geplante Features)'}
						/>
					</label>
				</div>
			{/if}

			{#if changedConfigs.size > 0}
				<button onclick={saveAllChanges} class="btn btn-success gap-2">
					<Icon src={Save} class="size-5" />
					Alle Änderungen speichern ({changedConfigs.size})
				</button>
			{/if}

			<button onclick={resetToDefaults} class="btn btn-warning gap-2">
				<Icon src={RefreshCw} class="size-5" />
				Zurücksetzen
			</button>
		</div>
	</div>

	<!-- Messages -->
	{#if saveMessage}
		<div class="alert alert-success mb-6">
			<span>{saveMessage}</span>
		</div>
	{/if}

	{#if errorMessage}
		<div class="alert alert-error mb-6">
			<Icon src={CircleAlert} class="size-5" />
			<span>{errorMessage}</span>
		</div>
	{/if}

	<!-- Info about filtered settings - only visible to superadmins -->
	{#if isSuperAdmin && !showAllSettings}
		{@const totalCategories = Object.keys(data.groupedConfigs).length}
		{@const activeCategories = Object.keys(groupedConfigs).length}
		{@const totalSettings = Object.values(data.groupedConfigs).flat().length}
		{@const activeSettings = Object.values(groupedConfigs).flat().length}

		<div class="alert alert-info mb-6">
			<div>
				<div class="flex items-center gap-2">
					<Icon src={Cog} class="size-5" />
					<span class="font-semibold">Nur aktiv genutzte Einstellungen werden angezeigt</span>
				</div>
				<p class="mt-1 text-sm">
					Angezeigt: {activeSettings} von {totalSettings} Einstellungen in {activeCategories} von {totalCategories}
					Kategorien. Schalten Sie den Toggle oben rechts um, um alle geplanten Einstellungen zu sehen.
				</p>
			</div>
		</div>
	{/if}

	<!-- Configuration Categories -->
	<div class="grid gap-8 lg:grid-cols-2">
		{#each Object.entries(groupedConfigs) as [category, configs] (category)}
			{@const IconComponent = categoryIcons[category] || Cog}
			<div class="card bg-base-100 shadow-lg">
				<div class="card-body">
					<h2 class="card-title mb-4 flex items-center gap-3">
						<Icon src={IconComponent} class="text-primary size-7" />
						<div class="flex-1">
							<div class="text-xl">{categoryLabels[category] || category}</div>
							<div class="text-sm font-normal text-gray-500">
								{categoryDescriptions[category] || ''}
							</div>
						</div>

						<!-- Special actions for email category -->
						{#if category === 'email'}
							<button
								onclick={() => handleTestEmail(configs)}
								class="btn btn-outline btn-sm gap-1"
								title="Test-E-Mail senden"
							>
								<Icon src={Send} class="size-4" />
								Test-E-Mail
							</button>
						{/if}

						<!-- Special actions for display category (maintenance mode) -->
						{#if category === 'display'}
							<button
								onclick={testMaintenanceMode}
								class="btn btn-outline btn-sm gap-1"
								title="Wartungsmodus-Status testen"
							>
								<Icon src={RefreshCw} class="size-4" />
								Status testen
							</button>
						{/if}
					</h2>

					<div class="space-y-6">
						{#each configs as config (config.key)}
							{@const inputType = getInputType(config.value)}

							<div
								class="rounded-lg border p-4 {changedConfigs.has(config.key)
									? 'border-warning bg-warning/5'
									: activeConfigKeys.has(config.key)
										? 'border-base-300'
										: 'border-gray-200 bg-gray-50'}"
							>
								<!-- Config Header -->
								<div class="mb-3 flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<div class="text-sm font-semibold text-gray-900">
												{config.key}
											</div>
											{#if changedConfigs.has(config.key)}
												<span class="badge badge-warning badge-sm">Geändert</span>
											{:else if showAllSettings && !activeConfigKeys.has(config.key)}
												<span class="badge badge-outline badge-sm text-gray-500">Geplant</span>
											{/if}
										</div>
										{#if config.description}
											<p class="mt-1 text-sm text-gray-600">{config.description}</p>
										{/if}
									</div>

									{#if changedConfigs.has(config.key)}
										<button
											onclick={() => saveConfig(config)}
											disabled={savingStates[config.key]}
											class="btn btn-success btn-sm gap-1"
										>
											{#if savingStates[config.key]}
												<span class="loading loading-spinner loading-xs"></span>
											{:else}
												<Icon src={Check} class="size-4" />
											{/if}
											Speichern
										</button>
									{/if}
								</div>

								<!-- Config Input -->
								<div class="form-control w-full">
									{#if inputType === 'checkbox'}
										<label class="label cursor-pointer justify-start gap-3">
											<input
												type="checkbox"
												class="checkbox checkbox-primary"
												checked={Boolean(config.value)}
												onchange={(e) =>
													handleInputChange(config, (e.target as HTMLInputElement).checked)}
											/>
											<span class="label-text">
												{config.value ? 'Aktiviert' : 'Deaktiviert'}
											</span>
										</label>
									{:else if inputType === 'number'}
										<input
											type="number"
											class="input input-bordered w-full"
											value={Number(config.value)}
											oninput={(e) =>
												handleInputChange(config, Number((e.target as HTMLInputElement).value))}
											placeholder="Numerischer Wert"
										/>
									{:else if inputType === 'tags'}
										<div>
											<input
												type="text"
												class="input input-bordered w-full"
												value={Array.isArray(config.value) ? config.value.join(', ') : ''}
												oninput={(e) => handleArrayChange(config, e)}
												placeholder="Werte durch Komma getrennt"
											/>
											<div class="label">
												<span class="label-text-alt text-gray-500">
													Aktuelle Werte: {getValueDisplay(config.value) || 'Keine'}
												</span>
											</div>
										</div>
									{:else if inputType === 'json'}
										<textarea
											class="textarea textarea-bordered h-24 font-mono text-sm"
											value={typeof config.value === 'object'
												? JSON.stringify(config.value, null, 2)
												: String(config.value)}
											oninput={(e) => handleJsonChange(config, e)}
											placeholder="JSON-Format"
										></textarea>
									{:else if inputType === 'textarea'}
										<textarea
											class="textarea textarea-bordered h-32"
											value={String(config.value)}
											oninput={(e) =>
												handleInputChange(config, (e.target as HTMLTextAreaElement).value)}
											placeholder="Mehrzeiliger Text"
										></textarea>
									{:else}
										<input
											type="text"
											class="input input-bordered w-full"
											value={String(config.value)}
											oninput={(e) =>
												handleInputChange(config, (e.target as HTMLTextAreaElement).value)}
											placeholder="Textwert"
										/>
									{/if}
								</div>

								<!-- Current Value Display (for complex types) -->
								{#if inputType === 'json' || inputType === 'tags'}
									<div class="bg-base-200 mt-2 rounded p-2 text-xs">
										<strong>Aktueller Wert:</strong>
										<pre class="mt-1 whitespace-pre-wrap">{getValueDisplay(config.value)}</pre>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Summary -->
	{#if changedConfigs.size > 0}
		<div class="alert alert-info mt-8">
			<div>
				<h3 class="text-lg font-semibold">Ungespeicherte Änderungen</h3>
				<p>
					Sie haben {changedConfigs.size} ungespeicherte Änderungen. Vergessen Sie nicht, diese zu speichern!
				</p>
				<div class="mt-2">
					<button onclick={saveAllChanges} class="btn btn-success btn-sm"> Alle speichern </button>
				</div>
			</div>
		</div>
	{/if}
</div>
