# Unklare Funde aus dem i18n-Inventar

Stand: Commit `19d9ce71`. **44 Fälle**, die das Werkzeug nicht sicher zuordnen konnte.
Es legt im Zweifel hier ab statt unter `uebersetzbar` — diese Liste ist damit die
Genauigkeitsprobe auf die Gesamtzahl. Jeder Fall braucht eine Entscheidung:
übersetzbar oder technisch.

| Datei | Zeile | Quelle | Text | Grund | Schlüsselvorschlag |
| --- | ---: | --- | --- | --- | --- |
| `src/lib/components/Icon.svelte` | 277 | attr `title` | Missing icon: | enthält dynamische Interpolation ({…}) — statischer Anteil allein nicht sicher beurteilbar | `components_icon_title_missing_icon` |
| `src/lib/components/map/Panel/LegendPanel.svelte` | 180 | attr `aria-label` | Sichtbarkeit für  umschalten. Aktuell  von  Sichtungen sichtbar. | enthält dynamische Interpolation ({…}) — statischer Anteil allein nicht sicher beurteilbar | `components_map_panel_legendpanel_aria-label_sichtbarkeit_fuer_umschalten_aktuell_von` |
| `src/lib/components/map/Panel/LegendPanel.svelte` | 215 | attr `aria-label` | Sichtungen der Gruppe  anzeigen/ausblenden | enthält dynamische Interpolation ({…}) — statischer Anteil allein nicht sicher beurteilbar | `components_map_panel_legendpanel_aria-label_sichtungen_der_gruppe_anzeigen_ausblende` |
| `src/lib/components/map/Panel/MapPanel.svelte` | 139 | attr `aria-label` | schließen | enthält dynamische Interpolation ({…}) — statischer Anteil allein nicht sicher beurteilbar | `components_map_panel_mappanel_aria-label_schliessen` |
| `src/lib/components/map/SightingsMapView.svelte` | 693 | attr `aria-label` | Filter Jahr  entfernen und zum Standard-Jahr  wechseln | enthält dynamische Interpolation ({…}) — statischer Anteil allein nicht sicher beurteilbar | `components_map_sightingsmapview_aria-label_filter_jahr_entfernen_und_zum` |
| `src/lib/components/map/SightingsMapView.svelte` | 704 | attr `aria-label` | Suchfilter  entfernen | enthält dynamische Interpolation ({…}) — statischer Anteil allein nicht sicher beurteilbar | `components_map_sightingsmapview_aria-label_suchfilter_entfernen` |
| `src/lib/components/map/SightingsMapView.svelte` | 726 | attr `aria-label` | wieder anzeigen | enthält dynamische Interpolation ({…}) — statischer Anteil allein nicht sicher beurteilbar | `components_map_sightingsmapview_aria-label_wieder_anzeigen` |
| `src/lib/components/map/SightingsMapView.svelte` | 737 | attr `aria-label` | Gruppe  wieder anzeigen | enthält dynamische Interpolation ({…}) — statischer Anteil allein nicht sicher beurteilbar | `components_map_sightingsmapview_aria-label_gruppe_wieder_anzeigen` |
| `src/lib/components/map/SightingsMapView.svelte` | 809 | attr `title` | Keine Sichtungen für  vorhanden | enthält dynamische Interpolation ({…}) — statischer Anteil allein nicht sicher beurteilbar | `components_map_sightingsmapview_title_keine_sichtungen_fuer_vorhanden` |
| `src/lib/form/validation/sightingSchema.ts` | 181 | yup-schema | Referenz-ID | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar | `sighting_referenceid_label` |
| `src/lib/form/validation/sightingSchema.ts` | 216 | yup-schema | toggle | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar | `sighting_hasposition_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 245 | yup-schema | number | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_latitude_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 270 | yup-schema | number | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_longitude_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 350 | yup-schema | date | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar | `sighting_sightingdate_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 371 | yup-schema | time | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar | `sighting_sightingtime_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 396 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_species_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 503 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_deadcondition_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 526 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_deadsex_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 601 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_sightingfrom_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 669 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_distance_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 690 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_distribution_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 730 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_behavior_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 798 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_seastate_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 821 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_visibility_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 842 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_winddirection_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 863 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_windforce_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 876 | yup-schema | API-Wetterdaten | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar | `sighting_weatherdata_label` |
| `src/lib/form/validation/sightingSchema.ts` | 880 | yup-schema | hidden | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar | `sighting_weatherdata_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 1029 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_boatdrive_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 1071 | yup-schema | checkbox | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_shipnameconsent_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 1122 | yup-schema | E-Mail-Adresse | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar | `sighting_email_label` |
| `src/lib/form/validation/sightingSchema.ts` | 1127 | yup-schema | email | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_email_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 1128 | yup-schema | email | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_email_meta_autocomplet` |
| `src/lib/form/validation/sightingSchema.ts` | 1162 | yup-schema | tel | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_phone_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 1163 | yup-schema | tel | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_phone_meta_autocomplet` |
| `src/lib/form/validation/sightingSchema.ts` | 1231 | yup-schema | checkbox | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_nameconsent_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 1252 | yup-schema | textarea | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_notes_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 1283 | yup-schema | checkbox | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_privacyconsent_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 1298 | yup-schema | checkbox | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_persistentdataconsent_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 1329 | yup-schema | textarea | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_internalcomment_meta_type` |
| `src/lib/form/validation/sightingSchema.ts` | 1345 | yup-schema | select | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `sighting_entrychannel_meta_type` |
| `src/lib/report/components/form/FormSteps.svelte` | 50 | attr `aria-label` | Formular-Schritte | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `report_components_form_formsteps_aria-label_formular_schritte` |
| `src/lib/report/components/form/StepProgressCompact.svelte` | 60 | attr `aria-label` | Formular-Schritte | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar — Dublette, | `report_components_form_stepprogresscompact_aria-label_formular_schritte` |
| `src/lib/report/formOptions/entryChannel.ts` | 19 | form-options | E-Mail | einzelnes Wort ohne Sprachsignal — von einem Token nicht sicher unterscheidbar | `report_formoptions_entrychannel_email` |
