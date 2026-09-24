# Rally

Wildfire apps show the fire. **Rally draws the play.**

People don't die in wildfires because they missed the alert. They die because a family waits in the driveway for someone who is still at school, or drives back up the canyon for grandma. Rally is a **huddle engine**: it treats evacuation like a coach diagram. Every person is a player, the wind is the defense, one rally lot is the huddle, and every car runs a pickup chain.

Built for Young Coders Sphere · Code for Emergency. SDG 11 (cities), 13 (climate), 3 (health).

**Zero keys required.** The Palisades demo, live weather, NWS alerts, OpenStreetMap places and OSRM road routing all run on free public APIs.

## What it does

| Feature | What happens |
| --- | --- |
| **Arrival field** | NASA FIRMS hotspots + Open-Meteo wind feed a Rothermel-style anisotropic spread model. Rings on the map show when the front reaches every door and every candidate lot. |
| **Pickup chains** | Drivers collect riders (kid at school, grandma at home, the neighbor with no car) in the order the fire dictates. OSRM times each leg on real roads. A rider whose door burns before any car can arrive is flagged **stranded**. |
| **Rally solver** | Every candidate lot is scored by *slack*: front arrival minus the slowest member's arrival, with penalties for hot lots and stranded people. The winner is the lot with the most slack for the slowest person, not the closest one. The "Why this lot" table shows every loser's verdict; click a row to force a lot. |
| **Run the tape** | Scrub the next 90 minutes. The front grows, every person moves along their route, riders wait at the door until their car arrives, and the scorecard says who makes it and by how many minutes. |
| **Neighbor mesh** | Volunteers with empty seats claim the stranded. The claimed car joins the solver as a driver and the play re-draws. In the demo, Rosa is unreachable by the household sedan until Dev at the San Vicente hub claims her. |
| **Anywhere on Earth** | Use your location or search a town. Rally stages a red-flag drill on today's wind direction, OpenStreetMap supplies schools, lots and fire stations as candidates, NWS alerts filter to the exact point. |
| **Your household** | Add, edit, drag and place people. Set roles, mobility minutes and needs. Persisted locally, shareable as one link, printable as a fridge card, installable as a PWA. |
| **Pulses & voice** | GO / AT RALLY / NEED RIDE texts (Twilio when keyed, simulated otherwise) and a coach voice that reads the play aloud. |
| **Household plan** | Rules engine always; OpenAI or Anthropic rewrite when keyed. |

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm test` runs 31 checks on the pure simulation core (spread field, isochrones, pickup chains, tape, share links, live scenarios).

## The scoring, in one screen

```
slack    = arrival(front, lot) − max(arrival(member, lot))
score    = slack − 22·threat(lot) + 6·[civic or lot] − 30·stranded
chain    = driver → nearest urgent door → … → lot
stranded = no car reaches the door 3 minutes before the front
```

Rate of spread: `ROS = 2.2 · (1 + 0.2·U^1.12) · e^(−2.1·RH)` km/h at the head, 45% on the flanks, 18% backing. FRP boosts speed; 8 minutes of spotting are subtracted.

## Optional keys

Copy `.env.example` to `.env.local`:

| Key | What it unlocks |
| --- | --- |
| `FIRMS_MAP_KEY` | NASA FIRMS VIIRS hotspots for live scenarios |
| `TWILIO_*` | Real SMS pulses (a trial account is enough) |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | Model-written play text (`ANTHROPIC_MODEL` defaults to `claude-opus-5`) |
| `NWS_USER_AGENT` | Set to an email you control; NWS and Nominatim ask for one |

The Palisades scene always uses its scripted Santa Ana night (38 km/h, RH 12%) so the demo is reproducible. Live scenarios use live wind direction and gusts, floored to red-flag conditions so a drill is always a drill.

## Deploy (judges click a link)

1. Push to GitHub.
2. Import in [Vercel](https://vercel.com/new). Framework: Next.js. No env vars needed.
3. Share the production URL. `/play` is the huddle, `/mesh` is the volunteer view, `/card` prints.

## Judge walkthrough (90 seconds)

1. Open `/play`. Read the go window and the rationale: Maya collects Leon, then Samir. Rosa is stranded.
2. Press **Run the tape**. Watch the front swallow Rosa's street while the sedan reaches the civic lot.
3. Open `/mesh`. Claim Dev's SUV. The play re-draws: Dev collects Rosa, everyone meets.
4. Type any town in the search box. Rally stages a drill on live wind with real OSM lots.
5. Press **Edit**, drag a person, add one more. Press **Share huddle**. Open **Fridge card**.

## Stack

Next.js 16 · React 19 · Tailwind 4 · Leaflet · Open-Meteo · NWS · NASA FIRMS · OpenStreetMap (Nominatim, Overpass) · OSRM · Esri dark canvas tiles · Twilio · OpenAI / Anthropic

## Layout

```
src/lib        pure simulation core (spread, chains, solver, tape, share, scenario)
src/app/api    thin fetchers with demo fallbacks (fires, weather, alerts, places, geocode, huddle, plan, sms)
src/hooks      useHuddle: one state machine for the playboard
src/components map, tape deck, roster, mesh, plan, landing, fridge card
```
