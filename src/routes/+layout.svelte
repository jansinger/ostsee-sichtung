<script lang="ts">
	import PublicFooter from '$lib/components/PublicFooter.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}

<PublicFooter></PublicFooter>

<!-- Global Toast Container -->
<ToastContainer />
