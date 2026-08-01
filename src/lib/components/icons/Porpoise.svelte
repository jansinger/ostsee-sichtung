<script lang="ts">
	/**
	 * Schweinswal im Lucide-Stil (24er-Raster, `stroke-width: 2`, runde Enden) —
	 * die Kontur folgt dem springenden Tier aus dem Projektlogo.
	 *
	 * Ersetzt `lucide:fish` am Tierart-Feld: Gemeldet werden Wale, Schweinswale
	 * und Robben, keine Fische. Ein passendes Icon führt kein gängiger Satz
	 * (Lucide, Tabler, Phosphor, Iconoir, MDI, Icon-Park) — deren `seal`-Treffer
	 * sind Wachssiegel. Begründung und Regel: `.claude/rules/design-system.md`.
	 *
	 * Das Auge ist ein Pfad der Länge null (`h.01`); mit `stroke-linecap: round`
	 * rendert er als Punkt. Dasselbe Mittel nutzt Lucide für Augen und Punkte.
	 */
	interface Props {
		width?: string | number;
		height?: string | number;
		class?: string;
		[key: string]: unknown;
	}

	let { width = '20', height = '20', class: className = '', ...rest }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	{width}
	{height}
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	{...rest}
>
	<path
		d="M9.01 4.61C9.73 4.63 10.49 5.26 11.67 5.36C12.85 5.46 14.87 5.11 16.09 5.23C17.32 5.36 18.2 5.72 19.02 6.11C19.84 6.5 20.35 6.8 21.01 7.57C21.67 8.34 22.77 9.99 23 10.72C23.23 11.45 23.15 11.66 22.38 11.96C21.61 12.26 19.23 12.21 18.4 12.53C17.57 12.85 17.81 13.57 17.42 13.9C17.04 14.23 16.48 14.53 16.09 14.52C15.7 14.51 15.71 13.85 15.08 13.86C14.45 13.87 12.93 14.53 12.33 14.57C11.73 14.61 11.66 14.34 11.49 14.12C11.32 13.91 11.45 13.41 11.31 13.28C11.17 13.15 11.09 13.24 10.65 13.33C10.21 13.42 9.35 13.43 8.66 13.81C7.97 14.19 6.68 14.96 6.49 15.59C6.3 16.22 7.39 16.98 7.51 17.58C7.63 18.18 7.36 18.87 7.2 19.17C7.05 19.47 7.07 19.58 6.58 19.39C6.09 19.2 5.06 18.14 4.28 18.02C3.5 17.9 2.44 18.66 1.89 18.68C1.34 18.7 1.1 18.5 1 18.15C0.9 17.8 0.81 17.13 1.27 16.56C1.73 15.99 3.1 15.72 3.74 14.74C4.38 13.76 4.44 11.92 5.12 10.67C5.8 9.42 7.48 8.04 7.82 7.26C8.16 6.48 7.23 6.31 7.15 5.98C7.08 5.65 7.06 5.5 7.37 5.27C7.68 5.04 8.29 4.6 9.01 4.61Z"
	/>
	<path d="M18.62 9.21h.01" />
</svg>
