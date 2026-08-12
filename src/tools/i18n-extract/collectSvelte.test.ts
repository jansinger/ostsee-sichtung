import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';
import { applySvelteSitesToSource } from './apply';
import { collectSvelteSites } from './collect';
import { createKeyRegistry } from './messageKey';

const FILE = 'src/lib/report/components/SubmissionSuccess.svelte';

function collect(source: string) {
	return collectSvelteSites(source, FILE, createKeyRegistry());
}

describe('collectSvelteSites — Extraktion', () => {
	it('extrahiert einen Textknoten, der einziges Kind seines Elements ist', () => {
		const result = collect(`<p>Ein Text</p>`);
		expect(result.sites.map((s) => [s.key, s.text, s.aspect])).toEqual([
			['report_components_submissionsuccess_text_ein_text', 'Ein Text', 'text']
		]);
		expect(result.skipped).toEqual([]);
	});

	it('extrahiert einen rein statischen Attributwert (placeholder/title/aria-label/alt)', () => {
		const result = collect(
			`<input placeholder="Bitte eingeben" title="Ein Titel" aria-label="Eine Beschriftung" alt="Ein Bild" />`
		);
		expect(result.sites.map((s) => [s.aspect, s.text])).toEqual([
			['placeholder', 'Bitte eingeben'],
			['title', 'Ein Titel'],
			['aria-label', 'Eine Beschriftung'],
			['alt', 'Ein Bild']
		]);
	});

	it('markiert die Offsets eines Textknotens so, dass genau der getrimmte Text ersetzbar ist', () => {
		const source = `<p>\n\tEin Text\n</p>`;
		const [site] = collect(source).sites;
		expect(source.slice(site!.start, site!.end)).toBe('Ein Text');
	});

	it('markiert die Offsets eines Attributs so, dass die gesamte Zuweisung inkl. Anführungszeichen ersetzbar ist', () => {
		const source = `<input placeholder="Bitte eingeben" />`;
		const [site] = collect(source).sites;
		expect(source.slice(site!.start, site!.end)).toBe('placeholder="Bitte eingeben"');
	});

	it('ignoriert Bool-Shortcut-Attribute (disabled) und rein dynamische Attribute ohne Meldung', () => {
		const result = collect(`<input disabled />`);
		expect(result.sites).toEqual([]);
		expect(result.skipped).toEqual([]);
	});

	// Die Reihenfolge ist nicht Kosmetik — siehe der gleichnamige Test in
	// collect.test.ts für collectSchemaSites. Ein Walk über die Kind-Arrays des
	// Svelte-AST besucht ein Fragment zwar bereits in Quelltextreihenfolge
	// (anders als ts.forEachChild über eine Aufrufkette), aber die
	// Kollisionssuffix-Vergabe im zweiten Durchgang bleibt in collect.ts
	// trotzdem bestehen — dieser Test belegt, dass sie hier ebenfalls in
	// Quelltextreihenfolge landet.
	it('liefert Fundstellen in Quelltextreihenfolge und vergibt Kollisionssuffixe entsprechend', () => {
		const result = collect(`<p>Ein Text</p>\n<p>Ein Text</p>`);
		expect(result.sites.map((s) => s.key)).toEqual([
			'report_components_submissionsuccess_text_ein_text',
			'report_components_submissionsuccess_text_ein_text_2'
		]);
	});
});

describe('collectSvelteSites — Verweigerungsregeln', () => {
	it('verweigert ein Satzfragment: Textknoten mit Geschwister-Element', () => {
		const result = collect(`<p>Vielen Dank für Ihre <strong>Meldung</strong>!</p>`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([
			['Vielen Dank für Ihre', 'sentence-fragment'],
			['Meldung', 'sentence-fragment'],
			['!', 'sentence-fragment']
		]);
	});

	it('verweigert eine Interpolation: Textknoten mit Geschwister-Ausdruck', () => {
		const result = collect(`<p>Insgesamt {count} Tiere gesichtet</p>`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([
			['Insgesamt', 'interpolation'],
			['Tiere gesichtet', 'interpolation']
		]);
	});

	it('verweigert einen Plural-Kandidaten: Text mit Ziffer', () => {
		const result = collect(`<p>Noch 3 Schritte</p>`);
		expect(result.sites).toEqual([]);
		expect(result.skipped).toEqual([
			{
				file: FILE,
				line: 1,
				text: 'Noch 3 Schritte',
				aspect: 'text',
				reason: 'plural-candidate',
				explanation:
					'enthält eine Ziffer — möglicher ICU-Plural, menschliche Entscheidung (Aufgabe 2.4)'
			}
		]);
	});

	it('verweigert einen Plural-Kandidaten auch in einem Attribut', () => {
		const result = collect(`<input placeholder="Bitte 3 Zeichen eingeben" />`);
		expect(result.skipped.map((s) => s.reason)).toEqual(['plural-candidate']);
	});

	it('verweigert Text ohne Buchstabengruppe: reine Satzzeichen/Symbole/Zahlen', () => {
		const result = collect(`<p>—</p>`);
		expect(result.sites).toEqual([]);
		expect(result.skipped).toEqual([
			{
				file: FILE,
				line: 1,
				text: '—',
				aspect: 'text',
				reason: 'no-letter-group',
				explanation: 'keine Buchstabengruppe — reine Satzzeichen, Symbole oder Zahlen'
			}
		]);
	});

	it('verweigert ein dynamisches Attribut', () => {
		const result = collect(`<input title={dynamicTitle} />`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => [s.aspect, s.reason])).toEqual([
			['title', 'dynamic-attribute']
		]);
	});

	it('verweigert ein Attribut mit gemischtem statisch/dynamischem Wert', () => {
		const result = collect(`<input title="Hallo {name}" />`);
		expect(result.skipped.map((s) => s.reason)).toEqual(['dynamic-attribute']);
	});

	// Befund aus dem Review: `aria-label={m.foo()}` ist bereits ersetzte Arbeit
	// (Welle 1/Schicht A/B haben genau diese Form geschrieben), wurde aber als
	// `isDynamic` erkannt und fälschlich erneut als offener Fall gemeldet.
	// Textknoten haben das Problem nicht (ein ersetzter Textknoten ist danach ein
	// ExpressionTag, der Textknoten-Besucher fasst ihn nie mehr an) — Attribute
	// bleiben Attribute-Knoten und brauchen dieselbe Erkennung wie meta()/test().
	it('erkennt ein bereits ersetztes Attribut (attr={m.key()}) als erledigt, nicht als offenen Fall', () => {
		const result = collect(
			`<script>\n\timport * as m from '$lib/paraglide/messages';\n</script>\n<input aria-label={m.foo()} />`
		);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => [s.aspect, s.reason])).toEqual([
			['aria-label', 'already-translated']
		]);
	});

	// Gegentest (eng bleiben): gemischter Inhalt ist WEITERHIN ein offener Fall.
	// Ohne diesen Test wäre die Erkennung ein Freibrief, jedes dynamische
	// Attribut zu verschlucken, sobald irgendwo ein `m.`-Aufruf vorkommt.
	it('bleibt bei einem gemischten Attribut mit m.-Aufruf-Anteil bei dynamic-attribute', () => {
		const result = collect(
			`<script>\n\timport * as m from '$lib/paraglide/messages';\n</script>\n<input title="Stand: {m.foo()}" />`
		);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => [s.aspect, s.reason])).toEqual([
			['title', 'dynamic-attribute']
		]);
	});

	// Die Kommentar-Gegenprobe (Auftrag, Schritt 1): Ein deutscher Satz im
	// Markup-Kommentar darf nicht gefunden werden — weder als Fund noch als
	// Übersprungen. `Comment`-Knoten tragen ihren Inhalt in `data`, die
	// Traversierung steigt dort nie ab (siehe `visitNode` in collect.ts).
	it('findet einen deutschen Satz in einem Markup-Kommentar NICHT', () => {
		const result = collect(
			`<!-- Dieser Hinweis erklärt, warum das Formular hier absichtlich leer bleibt -->\n<p>Ein Text</p>`
		);
		expect(result.sites).toHaveLength(1);
		expect(result.sites[0]!.text).toBe('Ein Text');
		expect(result.skipped).toEqual([]);
	});

	it('ignoriert Attribute außerhalb der Ziel-Liste (z.B. class) vollständig', () => {
		const result = collect(`<div class="btn btn-primary">Ein Text</div>`);
		expect(result.sites.map((s) => s.aspect)).toEqual(['text']);
		expect(result.skipped).toEqual([]);
	});

	// Abgrenzung 1 (Auftrag): Verschachtelung ist KEIN gemischter Inhalt. `div`s
	// eigenes Fragment enthält nur das Element `p`, keinen Text — nicht mixed.
	// `p`s eigenes Fragment enthält nur Text, kein Element — ebenfalls nicht
	// mixed. Der innere Text bleibt extrahierbar.
	it('macht aus reiner Verschachtelung (Element enthält nur ein Element) kein Satzfragment', () => {
		const result = collect(`<div><p>Text</p></div>`);
		expect(result.sites.map((s) => [s.text, s.aspect])).toEqual([['Text', 'text']]);
		expect(result.skipped).toEqual([]);
	});

	// Abgrenzung 2 (Auftrag): der gesunde Fall bleibt extrahierbar, auch mit
	// einem Element, dessen einziges Kind ein Textknoten ist.
	it('extrahiert Text in einem Listenelement ohne Geschwister', () => {
		const result = collect(`<li>Nur Text</li>`);
		expect(result.sites.map((s) => [s.text, s.aspect])).toEqual([['Nur Text', 'text']]);
		expect(result.skipped).toEqual([]);
	});
});

// Die Fragment-Regel prüfte bisher nur, OB ein Geschwister-Element existiert —
// nicht, ob es selbst Text trägt. Ein Icon-Geschwister hat keine Wortstellung,
// die eine Übersetzung brechen könnte, und darf deshalb kein Satzfragment
// erzeugen. Sechs Fälle je Auftrag, dazu die Wiederholung des `<strong>`-Falls
// als Gegenprobe (bereits oben abgedeckt, hier zur Vollständigkeit der Liste
// referenziert).
describe('collectSvelteSites — Fragment nur bei textbehaftetem Geschwister', () => {
	it('verweigert weiterhin ein Satzfragment, wenn das Geschwister-Element selbst Text enthält (<strong>)', () => {
		const result = collect(`<p>Vielen Dank für Ihre <strong>Meldung</strong>!</p>`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([
			['Vielen Dank für Ihre', 'sentence-fragment'],
			['Meldung', 'sentence-fragment'],
			['!', 'sentence-fragment']
		]);
	});

	it('verweigert ein Satzfragment, wenn ein Link-Geschwister Text enthält', () => {
		const result = collect(`<p>Bitte <a href="/hilfe">hier klicken</a>, um fortzufahren</p>`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([
			['Bitte', 'sentence-fragment'],
			['hier klicken', 'sentence-fragment'],
			[', um fortzufahren', 'sentence-fragment']
		]);
	});

	it('extrahiert Text neben einem Icon-Geschwister ohne eigenen Text (Button-Label)', () => {
		const result = collect(`<button><SaveIcon /> Speichern</button>`);
		expect(result.sites.map((s) => [s.text, s.aspect])).toEqual([['Speichern', 'text']]);
		expect(result.skipped).toEqual([]);
	});

	it('extrahiert eine Überschrift neben einem Icon-Geschwister ohne eigenen Text', () => {
		const result = collect(`<h2><MapPin /> Ortsangaben</h2>`);
		expect(result.sites.map((s) => [s.text, s.aspect])).toEqual([['Ortsangaben', 'text']]);
		expect(result.skipped).toEqual([]);
	});

	it('extrahiert Text bei reiner Verschachtelung ohne gemischten Inhalt', () => {
		const result = collect(`<div><p>Ein reiner Text</p></div>`);
		expect(result.sites.map((s) => [s.text, s.aspect])).toEqual([['Ein reiner Text', 'text']]);
		expect(result.skipped).toEqual([]);
	});

	// Das Badge selbst trägt „3" — eine Ziffer ohne Buchstabengruppe, kein
	// Kandidat für Wortstellung. Es taucht separat als `plural-candidate` in
	// `skipped` auf (unabhängige Regel, siehe `addSite`), macht aber „Sichtungen"
	// daneben NICHT zum Satzfragment.
	it('extrahiert Text neben einem Badge-Geschwister ohne Buchstabengruppe', () => {
		const result = collect(`<p><span class="badge">3</span> Sichtungen</p>`);
		expect(result.sites.map((s) => [s.text, s.aspect])).toEqual([['Sichtungen', 'text']]);
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([['3', 'plural-candidate']]);
	});
});

// Befund aus dem Review: `nodeContainsLetterText` gab für `ExpressionTag`
// bewusst `false` zurück, aber kein Teil der Erkennung fing einen
// Kontrollfluss-Block (`{#if}`/`{#each}`/`{#await}`/`{#key}`) als Geschwister
// auf. Ein dynamischer Ausdruck, der eine Ebene tiefer in einem solchen Block
// steckt, war deshalb für die Satzfragment- UND die Interpolationsregel
// unsichtbar — `<p>Admins: {#each admins as a}{a.name}{/each}</p>` extrahierte
// „Admins:" ohne jede Meldung. `nodeHasDynamicContent` schließt diese Lücke.
describe('collectSvelteSites — dynamischer Inhalt in einem Kontrollfluss-Block', () => {
	it('verweigert Text neben einem {#each}-Block mit Ausdruck (Interpolation, keine Ebene zu flach)', () => {
		const result = collect(`<p>Admins: {#each admins as a}{a.name}{/each}</p>`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([['Admins:', 'interpolation']]);
	});

	it('verweigert Text neben einem {#if}-Block, dessen Zweige nur statischen Text tragen', () => {
		const result = collect(`<p>Status: {#if online}online{:else}offline{/if}</p>`);
		expect(result.sites).toEqual([]);
		// "Status:" landet über die Geschwister-Regel bei 'interpolation' — der
		// {#if}-Block ist dynamisch, auch ohne eigenes {ausdruck}. Die Texte in
		// seinen beiden Zweigen ("online"/"offline") sind zusätzlich Kinder eines
		// gemischten Vorfahr-Fragments (das äußere <p> mischt Text und Block) und
		// werden deshalb ein zweites Mal — über die ancestorMixed-Regel — als
		// 'sentence-fragment' gemeldet. Dasselbe Muster wie beim <strong>-Fall
		// oben: mehrere Meldungen zu derselben Ursache sind kein Fehler.
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([
			['Status:', 'interpolation'],
			['online', 'sentence-fragment'],
			['offline', 'sentence-fragment']
		]);
	});

	it('verweigert Text neben einem {#await}-Block', () => {
		const result = collect(`<p>Wert: {#await p}lädt{:then v}{v}{/await}</p>`);
		expect(result.sites).toEqual([]);
		// "lädt" (pending-Zweig) ist ebenfalls Kind des gemischten <p>-Fragments —
		// dieselbe ancestorMixed-Doppelmeldung wie im {#if}-Test oben. Der
		// then-Zweig ({v}) enthält keinen Textknoten, taucht deshalb nicht auf.
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([
			['Wert:', 'interpolation'],
			['lädt', 'sentence-fragment']
		]);
	});

	it('extrahiert weiterhin Text neben einem textlosen Icon-Geschwister (Nachschärfung 44698ff1 bleibt intakt)', () => {
		const result = collect(`<button><SaveIcon /> Speichern</button>`);
		expect(result.sites.map((s) => [s.text, s.aspect])).toEqual([['Speichern', 'text']]);
		expect(result.skipped).toEqual([]);
	});

	it('extrahiert weiterhin Text bei reiner Verschachtelung ohne gemischten Inhalt', () => {
		const result = collect(`<div><p>Ein reiner Text</p></div>`);
		expect(result.sites.map((s) => [s.text, s.aspect])).toEqual([['Ein reiner Text', 'text']]);
		expect(result.skipped).toEqual([]);
	});
});

describe('applySvelteSitesToSource — Ersetzungsformen parsen als gültiges Svelte', () => {
	it('ersetzt einen Textknoten durch {m.key()} — Ergebnis parst erneut', () => {
		const source = `<p>Ein Text</p>`;
		const result = collect(source);
		const after = applySvelteSitesToSource(source, result.sites);
		expect(after).toBe('<p>{m.report_components_submissionsuccess_text_ein_text()}</p>');
		expect(() => parse(after, { modern: true })).not.toThrow();
	});

	it('ersetzt ein Attribut durch attr={m.key()} inkl. Anführungszeichen — Ergebnis parst erneut', () => {
		const source = `<input placeholder="Bitte eingeben" />`;
		const result = collect(source);
		const after = applySvelteSitesToSource(source, result.sites);
		expect(after).toBe(
			'<input placeholder={m.report_components_submissionsuccess_placeholder_bitte_eingeben()} />'
		);
		expect(() => parse(after, { modern: true })).not.toThrow();
	});

	it('ersetzt mehrere Fundstellen (Text + mehrere Attribute) in einer Datei — Ergebnis parst erneut', () => {
		const source = `<input placeholder="Bitte eingeben" title="Ein Titel" />\n<p>Ein Text</p>`;
		const result = collect(source);
		const after = applySvelteSitesToSource(source, result.sites);
		expect(() => parse(after, { modern: true })).not.toThrow();
		expect(after).toContain('{m.');
		expect(after).not.toContain('"Bitte eingeben"');
		expect(after).not.toContain('"Ein Titel"');
		expect(after).not.toContain('>Ein Text<');
	});

	it('lässt keine Anführungszeichen um den Botschaftsaufruf eines Attributs übrig (attr="{m.key()}" wäre falsch)', () => {
		const source = `<input alt="Ein Bild" />`;
		const result = collect(source);
		const after = applySvelteSitesToSource(source, result.sites);
		expect(after).not.toMatch(/alt="\{m\./);
		expect(after).toMatch(/alt=\{m\.[a-z0-9_]+\(\)\}/);
	});
});
