# Hearth

Check your home against live fire data.

Enter an address. Hearth pulls every NASA satellite heat detection within 50 km from the last 24 hours, groups them into fires, reads the live wind and humidity, estimates how long the nearest fire needs to reach the door, finds a road out that stays clear of it, and writes a checklist for that house and the people in it. In English or Spanish, printable, or sent as a text message.

Built for Young Coders Sphere, Code for Emergency 2026.

**Prompt:** How can we use technology to make emergency preparedness and response faster, more accurate, and more equitable for everyone?

- **Faster.** One address, one click, a brief in seconds. No waiting for a county-wide alert.
- **More accurate.** Scored for the exact address, not the whole county. Uses the wind to tell whether the fire is upwind, which way it is being pushed, and how many hours it needs to arrive.
- **More equitable.** The checklist changes for households with no car, with children or older adults, with medical equipment, or with pets. Two languages. Free, no account, works on any phone, and the brief can be copied or texted to someone without a smartphone.

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

## What happens behind one brief

1. **Geocode** the address with OpenStreetMap Nominatim (`src/lib/nominatim.ts`, one request per second, cached).
2. **Hotspots.** Download NASA FIRMS's regional 24 hour VIIRS file, parse it, keep detections within 50 km (`src/lib/firms.ts`, cached 15 minutes).
3. **Fires.** Single-linkage clustering: two detections belong to the same fire if a chain of neighbours within 2.5 km connects them. Each fire gets a size, total fire radiative power, its longest span, the orientation it is stretched along (from the covariance of its positions), the time of the latest satellite pass, and the point closest to the address (`src/lib/clusters.ts`).
4. **Risk score.** Points for distance, cluster size, upwind position, gusts, dry air, and National Weather Service warnings (`src/lib/risk.ts`, table below).
5. **Arrival time.** A simplified rate-of-spread model, `ROS = 0.5 km/h * (1 + 0.08 * wind) * humidity factor * shape factor`, where the shape factor is 1 at the head of the fire, about 0.35 on the flanks, and 0.15 at the back, following the elliptical spread of wind-driven fires. Time is distance divided by ROS, shown with a half-to-double range because fuel, slope, and spotting are unknown (`src/lib/spread.ts`).
6. **Way out.** OSRM routes from the address to a point 20 km out in each of eight compass directions. Each route is scored by the closest it comes to any detection, ignoring the first 2 km. A route 5 km or more from every detection is safe. The fastest safe route is drawn in green. If the fastest route overall is not safe, it is drawn in red (`src/lib/routes.ts`).
7. **Checklist.** Keys chosen by risk level and household, rendered in the chosen language (`src/lib/checklist.ts`, `src/lib/i18n.ts`).

## Risk score

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
| Every sentence on the check page, in English and Spanish | `src/lib/i18n.ts` |
| Landing page text | `src/app/page.tsx` |
| The address checker page | `src/components/CheckClient.tsx` |
| Risk scoring rules | `src/lib/risk.ts` |
| Spread model constants | `src/lib/spread.ts` |
| Clustering distance | `src/lib/clusters.ts` |
| Route reach, safe distance, directions | `src/lib/routes.ts` |
| Checklist logic | `src/lib/checklist.ts` |
| Map look | `src/components/FireMap.tsx`, `src/lib/colors.ts` |

## API routes

| Route | Returns |
| --- | --- |
| `/api/brief?q=address` or `?lat=&lon=` | place, hotspots, fires, arrival, weather, alerts, risk |
| `/api/routes?lat=&lon=` | best and risky escape routes |
| `/api/active` | the largest fire clusters in the US right now |
| `/api/fires?lat=&lon=&radius=` | raw hotspots near a point |
| `/api/placename?lat=&lon=` | short place name |
| `/api/suggest?q=` | address suggestions |

## Data sources

- NASA FIRMS, VIIRS active fire CSV, last 24 hours: https://firms.modaps.eosdis.nasa.gov/active_fire/
- Open-Meteo current weather: https://open-meteo.com/
- OSRM routing: https://project-osrm.org/
- OpenStreetMap Nominatim geocoding: https://nominatim.org/
- National Weather Service alerts (US only): https://api.weather.gov/

## Honest limits

- Satellite passes are a few hours apart, so a detection can be up to about 12 hours old. The brief shows the age.
- The spread model knows wind, humidity, and distance. It does not know fuel, slope, or ember spotting. It gives a planning window, not a countdown.
- Routes come from map data. They do not know road closures or traffic. Official instructions win.
- Some clusters are industrial heat (steel mills, gas flares), not wildfire. The satellite cannot tell them apart.

## Demo script (for the video)

1. Open the home page. Point at the live feed, then the "Active fires right now" list.
2. Click "Check this area" on the largest fire, or type an address near one. Tick "No car" and "Medical equipment".
3. Read the risk level and reasons. Show the fire card (how big, which way the wind is pushing it) and the arrival estimate with its range.
4. Show the map: green route out, red route to avoid. Read the "Way out" sentence.
5. Scroll to the checklist. Point out the ride and battery items that only appear because of the boxes ticked.
6. Click "Español". Then "Text this to a phone".
