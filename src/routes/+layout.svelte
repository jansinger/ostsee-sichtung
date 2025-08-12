<script lang="ts">
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}

<!-- Global Toast Container -->
<ToastContainer />
