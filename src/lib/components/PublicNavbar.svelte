<script lang="ts">
	import { page } from '$app/state';
	import { List } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	import type { User } from '$lib/types';
	import { isNotIFrame } from '$lib/utils/client/isNotIFrame';
	import OstseeTiereLogo from './OstseeTiereLogo.svelte';
	import UserMenu from './UserMenu.svelte';
	import UserMenuMobile from './UserMenuMobile.svelte';

	let { user, isAdmin = false }: { user: User | null; isAdmin: boolean } = $props();

	const currentPath = $derived(page.url.pathname);
</script>

{#snippet menuitems()}
	<li>
		<a href="/" class={currentPath === '/' ? 'active font-medium' : ''}> Meldung </a>
	</li>

	<li>
		<a href="/map" class={currentPath === '/map' ? 'active font-medium' : ''}> Karte </a>
	</li>
	{#if isAdmin}
		<li>
			<a href="/admin" class={currentPath === '/admin' ? 'active font-medium' : ''}> Verwalten </a>
		</li>
		<li>
			<a
				href="/admin/statistics"
				class={currentPath === '/admin/statistics' ? 'active font-medium' : ''}
			>
				Statistiken
			</a>
		</li>
	{/if}
	<li>
		<a href="/docs" class={currentPath.includes('/docs') ? 'active font-medium' : ''}> API-Docs </a>
	</li>
{/snippet}

{#if isNotIFrame}
	<!-- Fixed Navbar -->
	<header class="bg-base-200 bg-opacity-95 sticky top-0 z-50 shadow-md backdrop-blur-lg">
		<div class="container mx-auto">
			<div class="navbar">
				<div class="navbar-start">
					<OstseeTiereLogo size="sm" showText={true} className="ml-2" />
					<span class="divider divider-horizontal mx-2"></span>
					{#if isAdmin}
						<span class="text-base-content/70 text-lg font-semibold">Admin</span>
					{/if}
				</div>
				<div class="navbar-end">
					<!-- Desktop menu -->
					<div class="hidden lg:flex lg:items-center lg:gap-4">
						<ul class="menu menu-horizontal px-1">
							{@render menuitems()}
						</ul>

						<!-- User Menu - Desktop -->
						<UserMenu user={user || null} position="right" />
					</div>

					<!-- Mobile menu -->
					<div class="dropdown dropdown-end lg:hidden">
						<button tabindex="0" aria-label="Menü" class="btn btn-ghost">
							<Icon src={List} class="h-6 w-6 shrink-0" />
						</button>
						<ul
							class="dropdown-content menu menu-sm rounded-box bg-base-100 absolute right-0 z-50 mt-3 w-52 p-2 shadow"
						>
							{@render menuitems()}

							<!-- User Menu - Mobile -->
							<div class="divider my-2"></div>
							<UserMenuMobile user={user || null} />
						</ul>
					</div>
				</div>
			</div>
		</div>
	</header>
{/if}
