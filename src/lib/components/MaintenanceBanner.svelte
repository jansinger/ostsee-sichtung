<script lang="ts">
	import { CogOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';

	let { isAdmin = false, maintenanceMessage = '' } = $props();
</script>

<!-- Maintenance Mode Banner for Admins -->
{#if isAdmin}
	<div class="alert alert-warning shadow-lg">
		<div class="flex items-center gap-2">
			<CogOutline class="size-5 animate-spin" />
			<ExclamationCircleOutline class="size-5" />
		</div>
		<div class="flex-1">
			<h3 class="font-bold">⚠️ Wartungsmodus ist aktiv</h3>
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

<style>
	/* Slow spinning animation for maintenance mode */
	:global(.animate-spin) {
		animation: spin 3s linear infinite;
	}
	
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>