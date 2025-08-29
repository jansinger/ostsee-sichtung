<script lang="ts">
	import MaintenanceBanner from '$lib/components/MaintenanceBanner.svelte';
	import PublicFooter from '$lib/components/PublicFooter.svelte';
	import PublicNavbar from '$lib/components/PublicNavbar.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { isNotIFrame } from '$lib/utils/client/isNotIFrame';
	import '../app.css';

	let { children, data } = $props();
</script>

<div class:iframe-mode={!isNotIFrame}>
	<PublicNavbar user={data.user} isAdmin={data.showAdminMenu} />

	<!-- Maintenance Mode Banner for Admins -->
	{#if data.maintenanceConfig?.enabled && data.showAdminMenu && isNotIFrame}
		<div class="container mx-auto px-4 py-2">
			<MaintenanceBanner 
				isAdmin={true} 
				maintenanceMessage={data.maintenanceConfig.message} 
			/>
		</div>
	{/if}

	{@render children()}

	<PublicFooter />

	<!-- Global Toast Container -->
	<ToastContainer />
</div>
