import { describe, expect, it } from 'vitest';
import { TABELLEN_PARAMETER } from '../[id]/tableReturnUrl';
import {
	addFilterPreset,
	capturePresetParams,
	FILTER_PRESETS_STORAGE_KEY,
	loadFilterPresets,
	matchesPreset,
	PRESET_PARAMETER,
	presetUrl,
	removeFilterPreset,
	renameFilterPreset,
	serializeFilterPresets,
	type FilterPreset
} from './filterPresets';

const BASIS = 'https://localhost:4000/admin/sichtungen';

function preset(name: string, params: Record<string, string>): FilterPreset {
	return { id: `id-${name}`, name, params };
}

describe('PRESET_PARAMETER', () => {
	it('leitet sich aus TABELLEN_PARAMETER ab, statt die Liste zu duplizieren', () => {
		// Jeder Preset-Parameter muss auch ein Tabellen-Parameter sein — sonst
		// speicherte ein Preset etwas, das die Tabelle gar nicht liest.
		for (const param of PRESET_PARAMETER) {
			expect(TABELLEN_PARAMETER).toContain(param);
		}
	});

	it('lässt genau `page` aus', () => {
		const fehlend = TABELLEN_PARAMETER.filter(
			(param) => !(PRESET_PARAMETER as readonly string[]).includes(param)
		);
		expect(fehlend).toEqual(['page']);
	});
});

describe('capturePresetParams', () => {
	it('übernimmt gesetzte Tabellen-Parameter', () => {
		const url = new URL(`${BASIS}?verified=open&deadFinding=1&sort=sightingDate&order=desc`);
		expect(capturePresetParams(url)).toEqual({
			verified: 'open',
			deadFinding: '1',
			sort: 'sightingDate',
			order: 'desc'
		});
	});

	it('ignoriert leere Werte und fremde Parameter', () => {
		const url = new URL(`${BASIS}?verified=&q=Fahrwasser&unbekannt=x`);
		expect(capturePresetParams(url)).toEqual({ q: 'Fahrwasser' });
	});

	it('ignoriert die Seitenzahl', () => {
		const url = new URL(`${BASIS}?verified=open&page=7`);
		expect(capturePresetParams(url)).toEqual({ verified: 'open' });
	});
});

describe('presetUrl', () => {
	it('baut die Tabellen-URL mit den gespeicherten Parametern', () => {
		const url = new URL(
			presetUrl(preset('Offen', { verified: 'open' }), new URL(`${BASIS}?q=alt`))
		);
		expect(url.pathname).toBe('/admin/sichtungen');
		expect(url.searchParams.get('verified')).toBe('open');
	});

	it('verwirft Filter, die das Preset nicht trägt', () => {
		const url = new URL(
			presetUrl(preset('Offen', { verified: 'open' }), new URL(`${BASIS}?q=alt&deadFinding=1`))
		);
		expect(url.searchParams.get('q')).toBeNull();
		expect(url.searchParams.get('deadFinding')).toBeNull();
	});

	it('springt auf Seite 1', () => {
		const url = new URL(
			presetUrl(preset('Offen', { verified: 'open' }), new URL(`${BASIS}?page=7`))
		);
		expect(url.searchParams.get('page')).toBe('1');
	});
});

describe('matchesPreset', () => {
	it('erkennt den exakt passenden Zustand', () => {
		const p = preset('Offen', { verified: 'open' });
		expect(matchesPreset(p, new URL(`${BASIS}?verified=open`))).toBe(true);
	});

	it('ignoriert die Seitenzahl beim Vergleich', () => {
		const p = preset('Offen', { verified: 'open' });
		expect(matchesPreset(p, new URL(`${BASIS}?verified=open&page=3`))).toBe(true);
	});

	it('passt nicht, wenn ein zusätzlicher Filter aktiv ist', () => {
		const p = preset('Offen', { verified: 'open' });
		expect(matchesPreset(p, new URL(`${BASIS}?verified=open&deadFinding=1`))).toBe(false);
	});

	it('passt nicht bei abweichendem Wert', () => {
		const p = preset('Offen', { verified: 'open' });
		expect(matchesPreset(p, new URL(`${BASIS}?verified=approved`))).toBe(false);
	});

	it('passt auf die ungefilterte Tabelle, wenn das Preset leer ist', () => {
		const p = preset('Alle', {});
		expect(matchesPreset(p, new URL(BASIS))).toBe(true);
		expect(matchesPreset(p, new URL(`${BASIS}?q=x`))).toBe(false);
	});
});

describe('loadFilterPresets', () => {
	it('liest ein gespeichertes, versioniertes Format', () => {
		const raw = serializeFilterPresets([preset('Offen', { verified: 'open' })]);
		expect(loadFilterPresets(raw)).toEqual([
			{ id: 'id-Offen', name: 'Offen', params: { verified: 'open' } }
		]);
	});

	it('serialisiert mit Version', () => {
		expect(JSON.parse(serializeFilterPresets([])).v).toBe(1);
	});

	it('gibt bei fehlendem Wert eine leere Liste zurück', () => {
		expect(loadFilterPresets(null)).toEqual([]);
	});

	it('gibt bei kaputtem JSON eine leere Liste zurück', () => {
		expect(loadFilterPresets('{nicht json')).toEqual([]);
	});

	it('verwirft eine fremde Version', () => {
		expect(loadFilterPresets(JSON.stringify({ v: 99, presets: [preset('X', {})] }))).toEqual([]);
	});

	it('überspringt einzelne unbrauchbare Einträge, statt alles zu verwerfen', () => {
		const raw = JSON.stringify({
			v: 1,
			presets: [
				{ id: 'a', name: 'Gut', params: { verified: 'open' } },
				{ id: 'b', name: '' },
				'kaputt',
				{ id: 'c', name: 'AuchGut', params: { fremd: 'x', q: 'ja' } }
			]
		});
		expect(loadFilterPresets(raw)).toEqual([
			{ id: 'a', name: 'Gut', params: { verified: 'open' } },
			{ id: 'c', name: 'AuchGut', params: { q: 'ja' } }
		]);
	});

	it('verwirft nicht-string Parameterwerte', () => {
		const raw = JSON.stringify({
			v: 1,
			presets: [{ id: 'a', name: 'Gut', params: { verified: 3, q: 'ja' } }]
		});
		expect(loadFilterPresets(raw)).toEqual([{ id: 'a', name: 'Gut', params: { q: 'ja' } }]);
	});
});

describe('addFilterPreset', () => {
	it('hängt ein Preset mit eigener id an', () => {
		const [neu, ...rest] = addFilterPreset([], 'Offene Meldungen', { verified: 'open' });
		expect(rest).toEqual([]);
		expect(neu?.name).toBe('Offene Meldungen');
		expect(neu?.params).toEqual({ verified: 'open' });
		expect(neu?.id).toBeTruthy();
	});

	it('vergibt eindeutige ids', () => {
		const ids = addFilterPreset(addFilterPreset([], 'A', {}), 'B', {}).map((p) => p.id);
		expect(new Set(ids).size).toBe(2);
	});

	it('trimmt den Namen', () => {
		expect(addFilterPreset([], '  Offen  ', {}).map((p) => p.name)).toEqual(['Offen']);
	});

	it('ignoriert einen leeren Namen', () => {
		expect(addFilterPreset([], '   ', { verified: 'open' })).toEqual([]);
	});

	it('ignoriert einen bereits vergebenen Namen', () => {
		const liste = [preset('Offen', { verified: 'open' })];
		expect(addFilterPreset(liste, 'Offen', { deadFinding: '1' })).toBe(liste);
	});

	it('erkennt die Dublette unabhängig von Groß-/Kleinschreibung und Rand-Leerzeichen', () => {
		const liste = [preset('Offen', {})];
		expect(addFilterPreset(liste, '  offen ', {})).toBe(liste);
	});

	it('lässt die übergebene Liste unverändert', () => {
		const original: FilterPreset[] = [];
		addFilterPreset(original, 'A', {});
		expect(original).toEqual([]);
	});
});

describe('renameFilterPreset', () => {
	it('benennt das passende Preset um', () => {
		const liste = [preset('Alt', {}), preset('Anderes', {})];
		expect(renameFilterPreset(liste, 'id-Alt', ' Neu ').map((p) => p.name)).toEqual([
			'Neu',
			'Anderes'
		]);
	});

	it('ignoriert einen leeren Namen', () => {
		const liste = [preset('Alt', {})];
		expect(renameFilterPreset(liste, 'id-Alt', '  ')).toEqual(liste);
	});

	it('ignoriert den Namen einer anderen Ansicht', () => {
		const liste = [preset('Alt', {}), preset('Anderes', {})];
		expect(renameFilterPreset(liste, 'id-Alt', 'Anderes')).toBe(liste);
	});

	it('lässt das Umbenennen auf den eigenen Namen zu (etwa nur Groß-/Kleinschreibung)', () => {
		const liste = [preset('Alt', {})];
		expect(renameFilterPreset(liste, 'id-Alt', 'ALT').map((p) => p.name)).toEqual(['ALT']);
	});

	it('ignoriert eine unbekannte id', () => {
		const liste = [preset('Alt', {})];
		expect(renameFilterPreset(liste, 'fremd', 'Neu')).toEqual(liste);
	});
});

describe('removeFilterPreset', () => {
	it('entfernt das passende Preset', () => {
		const liste = [preset('A', {}), preset('B', {})];
		expect(removeFilterPreset(liste, 'id-A').map((p) => p.name)).toEqual(['B']);
	});

	it('ignoriert eine unbekannte id', () => {
		const liste = [preset('A', {})];
		expect(removeFilterPreset(liste, 'fremd')).toEqual(liste);
	});
});

describe('FILTER_PRESETS_STORAGE_KEY', () => {
	it('liegt im Admin-Namespace, nicht im Formular-Namespace', () => {
		expect(FILTER_PRESETS_STORAGE_KEY).toMatch(/^admin\.sichtungen\./);
	});
});
