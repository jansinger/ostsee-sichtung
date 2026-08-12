# Sichtungsmeldung per iframe einbetten

Anleitung zum Einbetten des Sichtungsmeldeformulars auf meeresmuseum.de.

## Einbettungscode

```html
<iframe
	src="https://ostsee-tiere.de/"
	title="Sichtung melden"
	style="display:block; width:100%; max-width:700px; min-width:320px; height:3350px; border:0;"
></iframe>
```

Navigation, Footer und Formular-Titel der Anwendung blenden sich automatisch aus, sobald die Seite in einem iframe läuft — es entsteht kein doppeltes Menü oder Footer neben dem der Museumsseite.

## Breite: max. 650–700px

Das Formular begrenzt sich selbst auf 648px Gesamtbreite. Ist das iframe breiter, bleibt links und rechts sichtbarer Leerraum in der (hellen) Hintergrundfarbe der Anwendung stehen — das ist kein Fehler, sieht auf einer breiten Spalte aber wie ein Darstellungsproblem aus.

**Empfehlung:** iframe-Breite auf ca. 650–700px begrenzen, nicht auf 100 % der Spaltenbreite. Nach unten darf das iframe schmaler werden (bis 320px) — das Formular passt sich dort automatisch an mobile Breiten an.

## Höhe: feste 3350px, kein automatisches Mitwachsen

Die Anwendung passt ihre Höhe nicht automatisch an den Elterncontainer an. Je nach Formularschritt schwankt der Platzbedarf zwischen ca. 440px (Einstiegsseite) und ca. 3.260px (letzter Schritt mit allen Validierungsfehlern) — mehr als das Siebenfache.

**Empfehlung:** iframe-Höhe fest auf **3350px** setzen (deckt auch den ungünstigsten Fall ab, mit etwas Puffer). Das bedeutet auf kurzen Formularschritten sichtbaren Leerraum unterhalb des Inhalts — das ist der Kompromiss, bis eine automatische Höhenanpassung nachgerüstet ist.

Zusätzlich sollte das iframe **kein** `scrolling="no"` gesetzt bekommen, damit unvorhergesehen lange Inhalte (z. B. sehr lange Freitext-Eingaben) notfalls innerhalb des iframes scrollen können, statt abgeschnitten zu werden.

## Checkliste vor dem Livegang

- [ ] iframe-Breite auf 650–700px begrenzt (nicht 100 % der Spalte)
- [ ] iframe-Höhe auf 3350px gesetzt
- [ ] `scrolling` nicht auf `no` gesetzt
- [ ] Test mit einer echten Sichtung durchgeklickt (alle Formularschritte, inkl. Erfolgsseite)
- [ ] Test auf einem schmalen Bildschirm (Smartphone-Breite) durchgeführt

Ein Testaufbau zum lokalen Ausprobieren der Einbettung liegt in [test-iframe.html](test-iframe.html).
