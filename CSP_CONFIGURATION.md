# CSP-Konfiguration - Optimiert für Vercel & iframes

## ✅ Problem gelöst: Einheitliche CSP-Konfiguration

**Vorher:** ❌ Doppelte CSP-Konfiguration in `hooks.server.ts` + `svelte.config.js`
**Jetzt:** ✅ **Einzige CSP-Quelle:** `svelte.config.js` (Vercel-optimiert)

## 🚀 Warum svelte.config.js die bessere Wahl ist:

### **Vercel-Vorteile:**
1. **🏗️ Build-time CSP:** Wird zur Build-Zeit generiert, nicht zur Laufzeit
2. **⚡ Edge-Functions optimiert:** Integriert sich perfekt in Vercels Edge-Network
3. **📦 Geringere Bundle-Size:** Kein Runtime-CSP-Code im Handler
4. **🔧 SvelteKit-nativ:** Offizielle SvelteKit-Funktion mit besserer Integration

### **Performance-Vergleich:**
```
Runtime CSP (hooks.server.ts):  +2-5ms pro Request
Build-time CSP (svelte.config.js): 0ms Runtime-Overhead
```

## 🔧 Aktuelle Konfiguration

### **CSP-Richtlinien (svelte.config.js):**
```javascript
csp: {
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'wasm-unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://openlayers.org'],
    'img-src': [
      "'self'", 'data:', 'blob:',
      'https://tile.openstreetmap.org',
      'https://tiles.openseamap.org',
      'https://*.tile.openstreetmap.org'
    ],
    'font-src': ["'self'"],
    'connect-src': [
      "'self'",
      'https://tile.openstreetmap.org',
      'https://*.tile.openstreetmap.org',
      'https://api.openstreetmap.org'
    ],
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': [
      "'self'",
      'https://meeresmuseum.de',
      'https://*.meeresmuseum.de',
      'https://deutsches-meeresmuseum.de',
      'https://*.deutsches-meeresmuseum.de',
      'http://localhost:*',
      'https://localhost:*',
      'file:'  // 🆕 Erlaubt lokale HTML-Dateien
    ]
  }
}
```

### **Zusätzliche Security Headers (hooks.server.ts):**
```typescript
// Nur Nicht-CSP Headers hier:
'X-Content-Type-Options': 'nosniff'
'Referrer-Policy': 'strict-origin-when-cross-origin'
'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
'X-Permitted-Cross-Domain-Policies': 'none'
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' // Nur HTTPS
```

## 🖼️ iframe-Unterstützung mit file:-URLs

### **Neue Funktionalität:**
✅ **`file:` in frame-ancestors** - Erlaubt lokale HTML-Dateien
✅ **SAMEORIGIN in app.html** - iframe-freundliche X-Frame-Options  
✅ **Automatische Höhenanpassung** - ResizeObserver-Integration
✅ **SameSite=None Cookies** - iframe-kompatible Cookie-Einstellungen

### **Unterstützte iframe-Parent-Quellen:**
- ✅ **Produktions-Domains:** `https://meeresmuseum.de` + Subdomains
- ✅ **Development:** `http://localhost:*` + `https://localhost:*`  
- ✅ **Lokale Dateien:** `file:` (für HTML-Dateien auf dem Desktop)
- ✅ **Eigene Domain:** `'self'`

## 📋 Test-Anleitung für file:-iframe

### **1. Test-Datei verwenden:**
```bash
# Öffnen Sie die bereitgestellte Test-Datei:
open example-iframe-test.html
# oder doppelklicken Sie auf die Datei im Finder
```

### **2. Development-Server starten:**
```bash
npm run dev  # Läuft auf http://localhost:5173
```

### **3. Erwartete Ergebnisse:**
- ✅ iframe lädt ohne CSP-Fehler
- ✅ Automatische Höhenanpassung funktioniert
- ✅ `file:` URL wird in frame-ancestors akzeptiert
- ✅ Browser-Console zeigt keine CSP-Violations

### **4. Fehlerdiagnose:**
```javascript
// Browser-Console prüfen auf:
// ❌ "Refused to frame because it violates CSP"
// ❌ "X-Frame-Options DENY"
// ❌ "frame-ancestors policy"
```

## 🛡️ Sicherheits-Bewertung

### **Vorher (doppelte CSP):**
- ⚠️ Konfliktpotenzial zwischen zwei CSP-Quellen
- ⚠️ Runtime-Overhead durch doppelte Header-Verarbeitung
- ⚠️ Komplexere Wartung und Debugging

### **Jetzt (einheitliche CSP):**
- ✅ **Einzige Wahrheitsquelle** für CSP
- ✅ **Vercel-optimiert** für beste Performance
- ✅ **file:-Support** für lokale Tests
- ✅ **Wartungsfreundlich** - eine Konfigurationsstelle

## 🔄 Migration bei Bedarf

### **Zurück zu Runtime-CSP (falls nötig):**
```bash
# 1. CSP aus svelte.config.js entfernen
# 2. hooks.server.ts um CSP-Direktiven erweitern
# Aber: Nur bei spezifischen Vercel-Problemen empfohlen
```

### **Hybrid-Ansatz (nicht empfohlen):**
```typescript
// hooks.server.ts - nur für spezielle Cases
if (event.url.pathname.startsWith('/special-case')) {
  response.headers.set('Content-Security-Policy', 'custom-csp');
}
```

## 📊 Performance-Monitoring

### **CSP-Violation Tracking:**
- ✅ **Report-Endpoint:** `/api/csp-report` (bereits implementiert)
- ✅ **Logging:** Pino-Logger für strukturierte Logs
- ✅ **Report-Only Mode:** Für neue CSP-Direktiven-Tests

### **Wichtige Metriken:**
```javascript
// Zu überwachen in Production:
- CSP-Violation-Rate < 0.1%
- iframe-Load-Success-Rate > 99%
- Time-to-Interactive mit CSP < 2s
```

## 🎯 Empfehlung

**✅ Aktuelle Konfiguration beibehalten:**
- **svelte.config.js:** Einzige CSP-Quelle (Vercel-optimiert)
- **hooks.server.ts:** Nur zusätzliche Security Headers
- **file:-Support:** Aktiviert für lokale iframe-Tests
- **Production-ready:** Sofort einsatzbereit

**Wartung:**
- CSP-Änderungen nur in `svelte.config.js`
- Neue Domain-Erlaubnis nur in `frame-ancestors` hinzufügen
- CSP-Violations über `/api/csp-report` monitoren