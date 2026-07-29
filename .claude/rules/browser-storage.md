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
	USER_CONTACT_DATA: 'sichtungen_user_contact_data' // localStorage ODER sessionStorage
};
```

`POSITION_FILE_UIDS` hält die uids der Dateien aus dem Positions-Schritt
(`src/lib/report/components/form/fields/positionFileOrigin.ts`). Die Herkunft
steht bewusst **neben** `FORM_DATA` statt darin: `uploadedFiles` gehört zum
Yup-Schema und wandert beim Absenden zum Server. Beide Schlüssel werden von
`clearFormDataOnly()` und `clearStorage()` gemeinsam geräumt — sonst erbte eine
wiederhergestellte Datei eine fremde Herkunft.

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

| Funktion                               | Zweck                                      |
| -------------------------------------- | ------------------------------------------ |
| `loadFromStorage(key, default)`        | Type-safe JSON Deserialisierung            |
| `saveToStorage(key, value)`            | Automatische Storage-Typ-Wahl              |
| `loadUserContactData()`                | sessionStorage → localStorage Fallback     |
| `saveUserContactDataWithConsent(data)` | GDPR: Consent steuert Storage-Typ          |
| `clearFormDataOnly()`                  | Nur Formulardaten löschen                  |
| `clearAllStorage()`                    | Komplette GDPR-Löschung inkl. Kontaktdaten |

---

## Best Practices

- Formulardaten IMMER in sessionStorage (temporär)
- Kontaktdaten NUR mit explizitem Consent in localStorage
- `clearAllStorage()` für DSGVO-Löschanfragen verwenden
- Verwendet in `Step4Contact.svelte` für gespeicherte Kontaktdaten
