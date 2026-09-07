Dart Turnier – Vercel / GitHub Pages

Diese Version ist eine statische Web-App und kann direkt über Vercel oder GitHub Pages veröffentlicht werden.

Neu in dieser Version:
- Hintergrund-Auswahl mit 3 Varianten: Schlicht, Dartscheibe, Dart-Details
- Auswahl wird lokal auf dem Gerät gespeichert und bleibt beim nächsten Öffnen erhalten
- Hintergrund passt sich an iPhone/PWA-Statusleiste an
- Vercel-Konfiguration vorhanden
- PWA/Service-Worker-Cache aktualisiert
- KO-Freilose robuster verarbeitet

Vercel:
1. Projekt hochladen/mit GitHub verbinden.
2. Framework Preset: Other bzw. keine Framework-Erkennung nötig.
3. Build Command leer lassen.
4. Output Directory: . (Projektwurzel).

GitHub Pages:
1. Dateien in ein Repository hochladen.
2. Settings > Pages öffnen.
3. Deploy from a branch auswählen und den gewünschten Branch/Root wählen.
