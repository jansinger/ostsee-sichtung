# EU-KI-Verordnung (AI Act) — Bewertung für Ostsee-Tiere

Stand: 2026-08-13. Bezugsrahmen: VO (EU) 2024/1689 („AI Act“), insbesondere die
Transparenzpflichten aus **Art. 50**, in Kraft seit dem **02.08.2026**, sowie die
finalen Leitlinien und FAQ der EU-Kommission dazu (Links unten).

## Ergebnis

**Es besteht derzeit keine Kennzeichnungs- oder sonstige Pflicht aus Art. 50
für dieses Projekt.** Der freiwillige Transparenzhinweis auf der Über-uns-Seite
(Technik-Abschnitt) geht über das rechtlich Geforderte hinaus.

## Begründung im Einzelnen

1. **Mit KI erstellter Quellcode ist ausgenommen.** Der Großteil dieses
   Repositories wurde mit KI-Unterstützung (Claude Code) entwickelt — das ist
   am öffentlichen Repository ohnehin sichtbar (`.claude/`-Konfiguration,
   PR-Historie). Die Kommissions-Leitlinien zu Art. 50 nehmen **Quellcode
   ausdrücklich von der Markierungspflicht aus**. Software, die mit KI-Hilfe
   _entwickelt_ wurde, ist kein „KI-generierter Inhalt“ im Sinne der Verordnung.

2. **Die Anwendung betreibt selbst kein KI-System.** Zur Laufzeit gibt es
   keinen Chatbot, keine LLM-Aufrufe und keine ML-Modelle; die Spam-Erkennung
   (`docs/SPAM_DETECTION.md`) ist regelbasiert. Damit greifen weder Art. 50(1)
   (Hinweis bei Interaktion mit einem KI-System) noch die übrigen Tatbestände.

3. **Veröffentlichte Texte fallen unter die Redaktions-Ausnahme.** Art. 50(4)
   verlangt eine Kennzeichnung nur für KI-generierten Text, der die
   Öffentlichkeit über Angelegenheiten von öffentlichem Interesse informiert
   **und** ohne menschliche redaktionelle Prüfung und Verantwortung
   veröffentlicht wird. Die Inhalte dieser Plattform (u. a. Bestimmungshilfe,
   Über-uns-Seite) stehen unter redaktioneller Kontrolle des Deutschen
   Meeresmuseums; die Bestimmungshilfe wurde im Juli 2026 fachlich geprüft.
   Inhalte von vor dem 02.08.2026 müssen zudem nicht rückwirkend
   gekennzeichnet werden.

4. **Keine KI-generierten Medien.** Fotos und Videos sind echte Aufnahmen der
   Meldenden bzw. redaktionell ausgewählte Fotografien — die Deepfake- und
   Bildmarkierungs-Regeln sind nicht berührt.

## Wann diese Bewertung zu erneuern ist

Pflichten entstünden erst, wenn eines der Folgenden eintritt:

- **Chatbot/Assistent in der App** → Hinweis nach Art. 50(1), dass mit einem
  KI-System interagiert wird (sofern nicht offensichtlich).
- **Veröffentlichung KI-generierter Bilder/Audio/Video** → maschinenlesbare
  Markierung (Anbieterpflicht des Werkzeugs) und ggf. Offenlegung.
- **Veröffentlichung KI-generierter Texte ohne redaktionelle Prüfung**
  (z. B. automatisch generierte Artbeschreibungen oder Meldungs-Zusammenfassungen
  direkt an die Öffentlichkeit) → Kennzeichnung nach Art. 50(4).

## Quellen

- [EU-Kommission: FAQ zu Art. 50](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [EU-Kommission: Leitlinien zu den Transparenzpflichten (Art. 50)](https://digital-strategy.ec.europa.eu/en/policies/guidelines-transparency-ai-generated-content)
- [artificialintelligenceact.eu: Practical Guide to Article 50](https://artificialintelligenceact.eu/transparency-rules-article-50/)
