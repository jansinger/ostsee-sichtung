<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	let { isAdmin = false, maintenanceMessage = '' } = $props();
</script>

<!-- Maintenance Mode Banner for Admins -->
{#if isAdmin}
	<div class="alert alert-warning shadow-lg">
		<div class="flex items-center gap-2">
			<Icon icon="lucide:settings" class="size-5" style="animation: spin 3s linear infinite" />
			<Icon icon="lucide:alert-circle" class="size-5" />
		</div>
		<div class="flex-1">
			<h3 class="font-bold flex items-center gap-2">
				<Icon icon="lucide:triangle-alert" width="20" height="20" class="text-warning-strong" />
				Wartungsmodus ist aktiv
			</h3>
			<div class="text-sm">
				Normale Benutzer sehen die Wartungsseite. Als Admin haben Sie weiterhin Zugriff.
			</div>
			{#if maintenanceMessage}
				<div class="mt-2 text-sm opacity-80">
					<strong>Aktuelle Nachricht:</strong> {maintenanceMessage}
				</div>
			{/if}
		</div>
		<div>
			<a href="/admin/settings" class="btn btn-warning btn-sm">
				Einstellungen
			</a>
		</div>
	</div>
{/if}

<!-- Spin animation ist jetzt global in app.css definiert -->