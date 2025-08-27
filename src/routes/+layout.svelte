<script lang="ts">
	import PublicFooter from '$lib/components/PublicFooter.svelte';
	import PublicNavbar from '$lib/components/PublicNavbar.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { isNotIFrame } from '$lib/utils/client/isNotIFrame';
	import '../app.css';

	let { children, data } = $props();
</script>

<div class:iframe-mode={!isNotIFrame}>
	<PublicNavbar user={data.user} isAdmin={data.isAdmin} />

	{@render children()}

	<PublicFooter />

	<!-- Global Toast Container -->
	<ToastContainer />
</div>
