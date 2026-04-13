import { describe, it, expect } from 'vitest';
import {
	getWeatherIconName,
	getWindDirectionIconName,
	getWindDirectionClass,
	getWeatherIconClass,
	getWindIconClass,
	getWindDirectionIconClass
} from './weatherIcons';

describe('getWeatherIconName', () => {
	it('gibt Sonnensymbol für Code 0 (Clear sky)', () => {
		expect(getWeatherIconName(0)).toBe('wi:day-sunny');
	});

	it('gibt Regensymbol für Code 61', () => {
		expect(getWeatherIconName(61)).toBe('wi:rain');
	});

	it('gibt Gewitter für Code 95', () => {
		expect(getWeatherIconName(95)).toBe('wi:thunderstorm');
	});

	it('gibt Fallback für unbekannten Code', () => {
		expect(getWeatherIconName(999)).toBe('wi:na');
	});

	it('gibt Fallback für null', () => {
		expect(getWeatherIconName(null)).toBe('wi:na');
	});
});

describe('getWindDirectionIconName', () => {
	it('gibt korrektes Icon für N', () => {
		expect(getWindDirectionIconName('N')).toBe('wi:wind from-n');
	});

	it('unterstützt Legacy-API deutsche Notation SO für Südost (SE)', () => {
		expect(getWindDirectionIconName('SO')).toBe('wi:wind from-se');
	});

	it('unterstützt Legacy-API deutsche Notation NO für Nordost (NE)', () => {
		expect(getWindDirectionIconName('NO')).toBe('wi:wind from-ne');
	});

	it('unterstützt Legacy-API deutsche Notation O für Ost (E)', () => {
		expect(getWindDirectionIconName('O')).toBe('wi:wind from-e');
	});

	it('ist case-insensitive', () => {
		expect(getWindDirectionIconName('nw')).toBe('wi:wind from-nw');
	});

	it('gibt Fallback für null', () => {
		expect(getWindDirectionIconName(null)).toBe('wi:wind');
	});

	it('gibt Fallback für unbekannte Richtung', () => {
		expect(getWindDirectionIconName('XYZ')).toBe('wi:wind');
	});
});

describe('getWindDirectionClass', () => {
	it('gibt rotate-0 für N', () => {
		expect(getWindDirectionClass('N')).toBe('transform rotate-0');
	});

	it('gibt rotate-180 für S', () => {
		expect(getWindDirectionClass('S')).toBe('transform rotate-180');
	});

	it('gibt leeren String für null', () => {
		expect(getWindDirectionClass(null)).toBe('');
	});

	it('gibt korrekte Rotation für NO (Nordost = NE, rotate-45)', () => {
		expect(getWindDirectionClass('NO')).toBe('transform rotate-45');
	});

	it('gibt leeren String für unbekannte Richtung', () => {
		expect(getWindDirectionClass('INVALID')).toBe('');
	});
});

describe('getWeatherIconClass', () => {
	it('gibt CSS-Klasse für unterstützten WMO Code', () => {
		expect(getWeatherIconClass(0)).toBe('wi-wmo4680-0');
		expect(getWeatherIconClass(95)).toBe('wi-wmo4680-95');
	});

	it('gibt Fallback für nicht-unterstützten Code', () => {
		expect(getWeatherIconClass(999)).toBe('wi-na');
	});

	it('gibt Fallback für undefined', () => {
		expect(getWeatherIconClass(undefined)).toBe('wi-na');
	});
});

describe('getWindIconClass', () => {
	it('gibt CSS-Klasse mit gerundeter Gradzahl', () => {
		expect(getWindIconClass(270)).toBe('wi-wind from-270-deg');
		expect(getWindIconClass(45.7)).toBe('wi-wind from-46-deg');
	});
});

describe('getWindDirectionIconClass', () => {
	it('gibt CSS-Klasse für Kardinalrichtung', () => {
		expect(getWindDirectionIconClass('N')).toBe('wi-wind wi-from-n');
	});

	it('gibt Fallback für undefined', () => {
		expect(getWindDirectionIconClass(undefined)).toBe('wi-wind');
	});
});
