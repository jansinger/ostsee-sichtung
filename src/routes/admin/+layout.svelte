<script lang="ts">
	import { page } from '$app/stores';
	import { List, LogOut, User } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import OstseeTiereLogo from '$lib/components/OstseeTiereLogo.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<!-- Navbar -->
	<header class="bg-base-200 shadow-md">
		<div class="container mx-auto">
			<div class="navbar">
				<div class="navbar-start">
					<OstseeTiereLogo size="sm" showText={true} className="ml-2" />
					<span class="divider divider-horizontal mx-2"></span>
					<span class="text-lg font-semibold text-base-content/70">Admin</span>
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
						</ul>

						<!-- User menu - Desktop -->
						{#if data.user}
							<div class="dropdown dropdown-end">
								<button tabindex="0" aria-label="Benutzer-Menü" class="btn btn-ghost gap-2">
									{#if data.user.picture}
										<div class="avatar">
											<div class="h-8 w-8 rounded-full">
												<img src={data.user.picture} alt="Profilbild" />
											</div>
										</div>
									{:else}
										<Icon src={User} class="h-5 w-5" />
									{/if}
									<span class="hidden xl:inline">{data.user.nickname || data.user.name}</span>
								</button>
								<ul
									class="dropdown-content menu menu-sm rounded-box bg-base-100 absolute right-0 z-50 mt-3 w-52 p-2 shadow"
								>
									<li class="menu-title">
										<span>{data.user.name}</span>
									</li>
									<li class="menu-title">
										<span class="text-xs opacity-70">{data.user.email}</span>
									</li>
									<li><hr class="my-2" /></li>
									<li>
										<a href="/api/auth/logout">
											<Icon src={LogOut} class="h-4 w-4" />
											Abmelden
										</a>
									</li>
								</ul>
							</div>
						{/if}
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

							<!-- User info - Mobile -->
							{#if data.user}
								<li><hr class="my-2" /></li>
								<li class="menu-title">
									<div class="flex items-center gap-2">
										{#if data.user.picture}
											<div class="avatar">
												<div class="h-6 w-6 rounded-full">
													<img src={data.user.picture} alt="Profilbild" />
												</div>
											</div>
										{:else}
											<Icon src={User} class="h-4 w-4" />
										{/if}
										<span>{data.user.nickname || data.user.name}</span>
									</div>
								</li>
								<li class="menu-title">
									<span class="text-xs opacity-70">{data.user.email}</span>
								</li>
								<li>
									<a href="/api/auth/logout">
										<Icon src={LogOut} class="h-4 w-4" />
										Abmelden
									</a>
								</li>
							{/if}
						</ul>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Page content -->
	<main
		class={$page.url.pathname.includes('/admin/map')
			? 'flex-grow'
			: 'container mx-auto flex-grow p-6'}
	>
		{@render children()}
	</main>

	<!-- Footer - Hidden on map page for full screen experience -->
	{#if !$page.url.pathname.includes('/admin/map')}
		<footer class="footer-center footer bg-base-200 text-base-content p-4">
			<div>
				<p>© 2025 Deutsches Meeresmuseum - Alle Rechte vorbehalten</p>
			</div>
		</footer>
	{/if}
</div>
