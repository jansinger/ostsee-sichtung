import type { Page } from '@playwright/test';

/**
 * WCAG-Kontrastmessung im echten Browser.
 *
 * Warum nicht über die CSS-Quelle: Die Theme-Farben in `src/app.css` stehen in
 * `oklch()` und werden teils per `color-mix(in oklab, …)` verrechnet. Ein
 * Kontrastwert lässt sich daraus erst ableiten, wenn die Browser-Engine sie
 * auflöst — inklusive Gamut-Mapping nach sRGB. Der Canvas-Umweg unten erzwingt
 * genau diese Auflösung: `fillStyle` akzeptiert den serialisierten Computed
 * Value, `getImageData` liefert die echten sRGB-Bytes zurück.
 *
 * Transparente Elementhintergründe (z. B. `btn-outline`) werden über `backdrop`
 * komponiert, damit auch Textfarben auf durchsichtigen Flächen korrekt messen.
 */
export interface ContrastProbe {
	/** Beschriftung für die Fehlermeldung. */
	name: string;
	/** Klassen des zu messenden Elements. Ignoriert, wenn `selector` gesetzt ist. */
	className?: string;
	/** Statt eines Probe-Elements ein echtes Element aus der Seite messen. */
	selector?: string;
	/** CSS-Farbe der Fläche, auf der das Element liegt (z. B. `var(--color-base-200)`). */
	backdrop: string;
}

export interface ContrastResult {
	name: string;
	/** Kontrastverhältnis Vordergrund : Hintergrund, auf 2 Nachkommastellen. */
	ratio: number;
	/** Serialisierte sRGB-Werte — hilfreich, wenn eine Messung überrascht. */
	foreground: string;
	background: string;
}

export async function measureContrast(
	page: Page,
	probes: ContrastProbe[]
): Promise<ContrastResult[]> {
	return page.evaluate((items: ContrastProbe[]) => {
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

		/** Beliebige CSS-Farbe → serialisierter Computed Value. */
		function resolve(cssColor: string): string {
			const probe = document.createElement('span');
			probe.style.cssText = `position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;color:${cssColor}`;
			document.body.appendChild(probe);
			const value = getComputedStyle(probe).color;
			probe.remove();
			return value;
		}

		/** Serialisierte CSS-Farbe → sRGB-Bytes, ggf. über einen Backdrop komponiert. */
		function toRgb(cssColor: string, backdrop?: string): [number, number, number] {
			ctx.clearRect(0, 0, 1, 1);
			ctx.fillStyle = '#000000';
			if (backdrop) {
				ctx.fillStyle = backdrop;
				ctx.fillRect(0, 0, 1, 1);
				ctx.fillStyle = '#000000';
			}
			ctx.fillStyle = cssColor;
			ctx.fillRect(0, 0, 1, 1);
			const d = ctx.getImageData(0, 0, 1, 1).data;
			return [d[0], d[1], d[2]];
		}

		function luminance([r, g, b]: [number, number, number]): number {
			const lin = [r, g, b]
				.map((v) => v / 255)
				.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
			return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
		}

		return items.map((item) => {
			const backdrop = resolve(item.backdrop);

			let element: Element | null = null;
			let temporary: HTMLElement | null = null;
			if (item.selector) {
				element = document.querySelector(item.selector);
				if (!element) {
					throw new Error(`Kontrastmessung: Element "${item.selector}" nicht gefunden`);
				}
			} else {
				temporary = document.createElement('div');
				temporary.className = item.className ?? '';
				temporary.style.cssText =
					'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none';
				temporary.textContent = 'Kontrastprobe';
				document.body.appendChild(temporary);
				element = temporary;
			}

			const style = getComputedStyle(element);
			const fg = toRgb(style.color, backdrop);
			const bg = toRgb(style.backgroundColor, backdrop);
			temporary?.remove();

			const l1 = luminance(fg);
			const l2 = luminance(bg);
			return {
				name: item.name,
				ratio: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100,
				foreground: `rgb(${fg.join(', ')})`,
				background: `rgb(${bg.join(', ')})`
			};
		});
	}, probes);
}
