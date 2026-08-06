---
paths:
  - 'src/lib/storage/**'
---

# Browser Storage (GDPR)

Regeln für DSGVO-konforme Browser-Speicherung.

---

## Storage Keys

```typescript
STORAGE_KEYS = {
	CURRENT_STEP: 'sichtungen_current_step', // sessionStorage
	FORM_DATA: 'sichtungen_form_data', // sessionStorage
	POSITION_FILE_UIDS: 'sichtungen_position_file_uids', // sessionStorage
	USER_CONTACT_DATA: 'sichtungen_user_contact_data', // localStorage ODER sessionStorage
	REPORT_KIND: 'sichtungen_report_kind' // sessionStorage — 'alive' | 'dead'
};
```

`POSITION_FILE_UIDS` hält die uids der Dateien aus dem Positions-Schritt
(`src/lib/report/components/form/fields/positionFileOrigin.ts`). Die Herkunft
steht bewusst **neben** `FORM_DATA` statt darin: `uploadedFiles` gehört zum
Yup-Schema und wandert beim Absenden zum Server. Beide Schlüssel werden von
`clearFormDataOnly()` und `clearStorage()` gemeinsam geräumt — sonst erbte eine
wiederhergestellte Datei eine fremde Herkunft.

**`REPORT_KIND` lag bis zum Abschlussreview (2026-08-06, Befund B3) im
`localStorage`** und überlebte damit die Formulardaten, die er beschreibt —
die Einstiegsfrage („Was möchten Sie melden?") wurde pro Browser nur einmal
gestellt, auch Wochen später für ein anderes Tier. Er liegt jetzt in
`sessionKeys`, wie `FORM_DATA`, und `clearFormDataOnly()` räumt ihn mit auf.
Der Migrationspfad in `resolveReportKind()` (dritte Quelle: `isDead` aus
`FORM_DATA`) bleibt trotzdem nötig — er deckt weiterhin den Fall ab, dass ein
Deploy mitten in einer laufenden Sitzung passiert, bevor `REPORT_KIND` für
diese Sitzung je geschrieben wurde.

**Arrays nicht direkt speichern:** `loadFromStorage` verwirft ein gespeichertes
Array und liefert den Default zurück (Array-Guard in der Sanitisierung). Listen
deshalb in ein Objekt einpacken, wie `{ uids: [...] }` oben.

---

## GDPR-Consent Pattern

```
persistentDataConsent = true  → localStorage (überlebt Browser-Neustart)
persistentDataConsent = false → sessionStorage (gelöscht bei Tab-Schließung)
```

---

## Schlüsselfunktionen (`src/lib/storage/localStorage.ts`)

| Funktion                               | Zweck                                                              |
| -------------------------------------- | ------------------------------------------------------------------ |
| `loadFromStorage(key, default)`        | Type-safe JSON Deserialisierung                                    |
| `saveToStorage(key, value)`            | Automatische Storage-Typ-Wahl                                      |
| `removeFromStorage(key)`               | Schlüssel vollständig entfernen (nicht `saveToStorage(key, null)`) |
| `loadUserContactData()`                | sessionStorage → localStorage Fallback                             |
| `saveUserContactDataWithConsent(data)` | GDPR: Consent steuert Storage-Typ                                  |
| `clearFormDataOnly()`                  | Nur Formulardaten löschen                                          |
| `clearAllStorage()`                    | Komplette GDPR-Löschung inkl. Kontaktdaten                         |

---

## Best Practices

- Formulardaten IMMER in sessionStorage (temporär)
- Kontaktdaten NUR mit explizitem Consent in localStorage
- `clearAllStorage()` für DSGVO-Löschanfragen verwenden
- Verwendet in `Step4Contact.svelte` für gespeicherte Kontaktdaten
