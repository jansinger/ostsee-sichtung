<script lang="ts">
	import type { PublicUser } from '$lib/types/User';
	import Icon from '$lib/components/Icon.svelte';

	let {
		user,
		isAdmin = false
	}: {
		user: PublicUser | null;
		isAdmin?: boolean;
	} = $props();
</script>

{#if user}
	<!-- User Info Header for Mobile Menu -->
	<div class="border-base-200 mb-2 border-b px-0 pb-2">
		<div class="flex items-center gap-3 px-4 py-2">
			{#if user.picture}
				<div class="avatar">
					<div class="h-8 w-8 rounded-full">
						<img src={user.picture} alt="Profilbild" />
					</div>
				</div>
			{:else}
				<div class="avatar placeholder">
					<div class="bg-neutral text-neutral-content h-8 w-8 rounded-full">
						<Icon icon="lucide:user" width="16" class="h-4 w-4" />
					</div>
				</div>
			{/if}
			<div class="min-w-0 flex-1">
				<div class="truncate text-sm font-medium">
					{user.nickname || user.name || 'Benutzer'}
				</div>
				<div class="text-base-content/60 truncate text-xs">
					{user.email || ''}
				</div>
			</div>
		</div>
	</div>

	<!-- User Menu Items for Mobile -->
	{#if isAdmin}
		<li>
			<a href="/admin" class="flex items-center gap-2">
				<Icon icon="lucide:settings" width="16" class="h-4 w-4" />
				Admin-Bereich
			</a>
		</li>
	{/if}

	<li>
		<a href="/api/auth/logout" class="text-error hover:bg-error/10 flex items-center gap-2">
			<Icon icon="lucide:log-out" width="16" class="h-4 w-4" />
			Abmelden
		</a>
	</li>
{/if}
