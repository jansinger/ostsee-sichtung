# Tierfotos für Species Identification

Um echte Fotos anstatt der SVG-Illustrationen zu verwenden, können Sie folgende Bilder aus freien Quellen herunterladen und in `/static/species/` ablegen:

## Multiple Bilder pro Art
Die Anwendung unterstützt jetzt mehrere Bilder pro Tierart. Jedes Bild kann individuelle Copyright-Informationen haben.

## Empfohlene Quellen für freie Tierfotos:

### 1. Wikimedia Commons (Public Domain/CC-Lizenzen)
- **Schweinswal**: https://commons.wikimedia.org/wiki/Category:Phocoena_phocoena
- **Kegelrobbe**: https://commons.wikimedia.org/wiki/Category:Halichoerus_grypus  
- **Seehund**: https://commons.wikimedia.org/wiki/Category:Phoca_vitulina
- **Ringelrobbe**: https://commons.wikimedia.org/wiki/Category:Pusa_hispida
- **Delphin**: https://commons.wikimedia.org/wiki/Category:Tursiops_truncatus
- **Beluga**: https://commons.wikimedia.org/wiki/Category:Delphinapterus_leucas
- **Zwergwal**: https://commons.wikimedia.org/wiki/Category:Balaenoptera_acutorostrata
- **Finnwal**: https://commons.wikimedia.org/wiki/Category:Balaenoptera_physalus
- **Buckelwal**: https://commons.wikimedia.org/wiki/Category:Megaptera_novaeangliae

### 2. Unsplash (frei für kommerzielle Nutzung)
- Suche nach: "harbor porpoise", "grey seal", "harbor seal", etc.

### 3. Pixabay (frei für kommerzielle Nutzung)
- Suchbegriffe: "Schweinswal", "Kegelrobbe", "Seehund", etc.

## Dateiformat und Größe:
- **Format**: JPG oder PNG
- **Auflösung**: Mindestens 400x300px für gute Darstellung
- **Dateigröße**: Max. 200KB pro Bild für schnelle Ladezeiten

## Dateinamen (für multiple Bilder):
```
# Basis-Bilder (bereits in der Anwendung definiert)
harbor-porpoise.png
Two_seals_in_the_water.jpg (Kegelrobbe)
harbor-seal.jpg
ringed-seal.jpg
dolphin.jpg
beluga.jpg
minke-whale.jpg
fin-whale.jpg
humpback-whale.jpg

# Zusätzliche Detail-Bilder (optional)
grey-seal-head.jpg (Kegelrobbe Kopfdetail)
harbor-seal-group.jpg (Seehund-Gruppe)
dolphin-underwater.jpg (Delphin unter Wasser)

# Platzhalter
unknown-whale.jpg (generisches Wal-Foto oder Platzhalter)
unknown-seal.jpg (generisches Robben-Foto oder Platzhalter)
```

## Konfiguration der Copyright-Informationen:
Die Copyright-Informationen werden direkt im Code der `SpeciesIdentificationHelp.svelte` Komponente konfiguriert:

```javascript
images: [
  {
    src: '/species/bildname.jpg',
    alt: 'Beschreibung des Bildes',
    copyright: '© Fotograf / Lizenz' // oder null für kein Copyright
  }
]
```

## Automatische Bildformate:
Die Komponente unterstützt sowohl SVG als auch JPG/PNG. Bei Fehlern erfolgt automatisches Fallback auf SVG-Dateien.

## Copyright-Hinweise:
Stellen Sie sicher, dass alle verwendeten Bilder:
- Gemeinfrei (Public Domain) sind, oder
- Unter einer Creative Commons Lizenz stehen, oder  
- Explizit für kommerzielle Nutzung freigegeben sind

Bei CC-lizenzierten Bildern sollten Urheberangaben in der App oder Dokumentation ergänzt werden.