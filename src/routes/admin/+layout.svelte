<script lang="ts">
	import { page } from '$app/stores';
	import OstseeTiereLogo from '$lib/components/OstseeTiereLogo.svelte';
	import UserMenu from '$lib/components/UserMenu.svelte';
	import UserMenuMobile from '$lib/components/UserMenuMobile.svelte';
	import { List } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<!-- Fixed Navbar for Admin -->
	<header class="bg-base-200 shadow-md sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
		<div class="container mx-auto">
			<div class="navbar">
				<div class="navbar-start">
					<OstseeTiereLogo size="sm" showText={true} className="ml-2" />
					<span class="divider divider-horizontal mx-2"></span>
					<span class="text-base-content/70 text-lg font-semibold">Admin</span>
				</div>
				<div class="navbar-end">
					<!-- Desktop menu -->
					<div class="hidden lg:flex lg:items-center lg:gap-4">
						<ul class="menu menu-horizontal px-1">
							<li>
								<a
									href="/admin"
									class={$page.url.pathname === '/admin' ? 'active font-medium' : ''}
								>
									Sichtungen
								</a>
							</li>
							<li>
								<a
									href="/admin/map"
									class={$page.url.pathname.includes('/admin/map') ? 'active font-medium' : ''}
								>
									Karte
								</a>
							</li>
							<li>
								<a
									href="/admin/statistics"
									class={$page.url.pathname.includes('/admin/statistics')
										? 'active font-medium'
										: ''}
								>
									Statistiken
								</a>
							</li>
							<li>
								<a
									href="/admin/docs"
									class={$page.url.pathname.includes('/admin/docs') ? 'active font-medium' : ''}
								>
									API-Docs
								</a>
							</li>
							<li>
								<a
									href="/admin/about"
									class={$page.url.pathname.includes('/admin/about') ? 'active font-medium' : ''}
								>
									Info
								</a>
							</li>
						</ul>

						<!-- User Menu - Desktop -->
						<UserMenu user={data.user || null} position="right" />
					</div>

					<!-- Mobile menu -->
					<div class="dropdown dropdown-end lg:hidden">
						<button tabindex="0" aria-label="Menü" class="btn btn-ghost">
							<Icon src={List} class="h-6 w-6 shrink-0" />
						</button>
						<ul
							class="dropdown-content menu menu-sm rounded-box bg-base-100 absolute right-0 z-50 mt-3 w-52 p-2 shadow"
						>
							<li>
								<a
									href="/admin"
									class={$page.url.pathname === '/admin' ? 'active font-medium' : ''}
								>
									Sichtungen
								</a>
							</li>
							<li>
								<a
									href="/admin/export"
									class={$page.url.pathname.includes('/export') ? 'active font-medium' : ''}
								>
									Export
								</a>
							</li>
							<li>
								<a
									href="/admin/map"
									class={$page.url.pathname.includes('/admin/map') ? 'active font-medium' : ''}
								>
									Karte
								</a>
							</li>
							<li>
								<a
									href="/admin/statistics"
									class={$page.url.pathname.includes('/admin/statistics')
										? 'active font-medium'
										: ''}
								>
									Statistiken
								</a>
							</li>
							<li>
								<a
									href="/admin/docs"
									class={$page.url.pathname.includes('/admin/docs') ? 'active font-medium' : ''}
								>
									API-Docs
								</a>
							</li>
							<li>
								<a
									href="/admin/about"
									class={$page.url.pathname.includes('/admin/about') ? 'active font-medium' : ''}
								>
									Info
								</a>
							</li>

							<!-- User Menu - Mobile -->
							<div class="divider my-2"></div>
							<UserMenuMobile user={data.user || null} />
						</ul>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Page content with top padding for fixed navbar -->
	<main
		class={$page.url.pathname.includes('/admin/map')
			? 'flex-grow pt-8'
			: 'container mx-auto flex-grow p-6 pt-12'}
	>
		{@render children()}
	</main>

	<!-- Footer - Hidden on map page for full screen experience and in iFrame -->
	{#if !$page.url.pathname.includes('/admin/map') && typeof window !== 'undefined' && window === window.top}
		<footer class="footer-center footer bg-base-200 text-base-content p-4">
			<div class="text-center">
				<p class="mb-2">© 2025 Deutsches Meeresmuseum - Alle Rechte vorbehalten</p>
				<div class="flex justify-center gap-4 text-sm">
					<a 
						href="https://github.com/jansinger/ostsee-sichtung" 
						target="_blank" 
						rel="noopener noreferrer" 
						class="link link-hover opacity-70"
					>
						GitHub Repository
					</a>
					<span class="opacity-30">•</span>
					<a href="/about" class="link link-hover opacity-70">Über die Plattform</a>
				</div>
			</div>
		</footer>
	{/if}
</div>
