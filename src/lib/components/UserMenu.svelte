<script lang="ts">
	import type { PublicUser } from '$lib/types/User';
	import Icon from '$lib/components/Icon.svelte';

	let {
		user,
		position = 'right',
		isAdmin = false
	}: {
		user: PublicUser | null;
		position?: 'left' | 'right';
		isAdmin?: boolean;
	} = $props();

	let detailsElement = $state<HTMLDetailsElement | null>(null);

	function closeMenu() {
		if (detailsElement) {
			detailsElement.open = false;
		}
	}
</script>

{#if user}
	<details
		bind:this={detailsElement}
		class="dropdown {position === 'right' ? 'dropdown-end' : 'dropdown-start'}"
	>
		<!-- User Picture Button -->
		<summary class="btn btn-ghost btn-circle" aria-label="Benutzer-Menü">
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
		</summary>

		<!-- Dropdown Menu -->
		<div
			class="dropdown-content bg-base-100 rounded-box border-base-300 z-[100] mt-2 w-64 border p-2 shadow-xl"
		>
			<!-- User Info Header -->
			<div class="border-base-200 border-b px-4 py-2">
				<div class="flex items-center gap-3">
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

			<!-- Menu Items -->
			<div class="py-2">
				{#if isAdmin}
					<a
						href="/admin"
						class="hover:bg-base-200 flex items-center gap-2 rounded px-4 py-2"
						onclick={closeMenu}
					>
						<Icon icon="lucide:settings" width="16" class="h-4 w-4" />
						Admin-Bereich
					</a>
				{/if}

				<a
					href="/api/auth/logout"
					class="text-error hover:bg-error/10 flex items-center gap-2 rounded px-4 py-2"
					onclick={closeMenu}
				>
					<Icon icon="lucide:log-out" width="16" class="h-4 w-4" />
					Abmelden
				</a>
			</div>
		</div>
	</details>
{/if}
