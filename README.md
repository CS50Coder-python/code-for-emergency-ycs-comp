# Hearth

Check your home against live fire data.

Enter an address. Hearth pulls every NASA satellite heat detection within 50 km from the last 24 hours, current wind and humidity, and official National Weather Service warnings, scores the risk in plain English, and builds a checklist for that house and the people in it.

Built for Young Coders Sphere, Code for Emergency 2026.

**Prompt:** How can we use technology to make emergency preparedness and response faster, more accurate, and more equitable for everyone?

- **Faster.** One address, one click, a brief in seconds. No waiting for a county-wide alert.
- **More accurate.** Scored for the exact address, not the whole county. Uses the direction the wind is blowing from to tell whether the fire is upwind.
- **More equitable.** The checklist changes for households with no car, with children or older adults, with medical equipment, or with pets. Free, no account, works on any phone, printable, and can be copied as a text message.

**UN Goals:** 3 (Good health and well-being), 9 (Industry, innovation, and infrastructure), 11 (Sustainable cities and communities).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. No API keys are needed. Everything runs on free public data.

## Deploy (so judges can click a link)

1. Push to GitHub.
2. Go to https://vercel.com/new and import the repo. Framework: Next.js. No environment variables needed.
3. Share the URL.

## How the risk score works

`src/lib/risk.ts`. Points are added for each factor, capped at 100.

| Factor | Points |
| --- | --- |
| Nearest heat detection under 5 km / 15 km / 30 km / 50 km | 50 / 35 / 20 / 8 |
| Two or more detections within 25 km | 3 each, up to 15 |
| A detection within 30 km on the side the wind is blowing from | 15 |
| Gusts over 40 km/h / 25 km/h | 15 / 8 |
| Humidity under 15% / 25% | 15 / 8 |
| NWS evacuation order / Red Flag Warning / Fire Weather Watch | 40 / 20 / 10 |

Level: 70+ Extreme, 45+ High, 20+ Moderate, otherwise Low.

## Where to edit things

| Want to change | File |
| --- | --- |
| Site name, tagline, description | `src/lib/site.ts` |
| Colours and fonts | `src/app/globals.css` (top of file) |
| Landing page text | `src/app/page.tsx` |
| The address checker page | `src/app/check/page.tsx` |
| Risk scoring rules | `src/lib/risk.ts` |
| Checklist wording and household questions | `src/lib/checklist.ts` and the checkboxes in `src/app/check/page.tsx` |
| Map look | `src/components/FireMap.tsx` |
| Data fetching (NASA, weather, alerts, geocoding) | `src/lib/firms.ts` and `src/app/api/brief/route.ts` |

## Data sources

- NASA FIRMS, VIIRS active fire CSV, last 24 hours: https://firms.modaps.eosdis.nasa.gov/active_fire/
- Open-Meteo current weather: https://open-meteo.com/
- National Weather Service alerts (US only): https://api.weather.gov/
- OpenStreetMap Nominatim geocoding: https://nominatim.org/

## Demo script (for the video)

1. Open the home page. Point at the live feed: every satellite heat detection in the US from the last 24 hours.
2. Click **Check my address**. Type an address near an active fire (look at the map for a cluster of orange dots). Tick "No car" and "Medical equipment".
3. Read the risk level and the reasons. Show the nearest detection distance and the wind direction.
4. Scroll to the checklist. Point out the ride and battery items that only appear because of the boxes ticked.
5. Click **Copy as text message** and paste it into a note, then click **Print**.
