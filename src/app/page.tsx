import Link from "next/link";
import LiveFeed from "@/components/LiveFeed";
import ActiveFires from "@/components/ActiveFires";
import { SITE } from "@/lib/site";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>{SITE.tagline}</h1>
          <div className="rule" />
          <p>{SITE.description}</p>
          <div className="row">
            <Link href="/check" className="btn">Check my address</Link>
            <Link href="#how" className="link">See how it works</Link>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="container">
          <LiveFeed />
        </div>
      </section>

      <section id="fires" className="band">
        <div className="container">
          <h2>Active fires right now</h2>
          <div className="rule" />
          <p className="muted" style={{ maxWidth: 640 }}>
            The largest clusters of satellite detections in the United States from the last 24 hours. Pick one to see the brief a house next to it would get. A few clusters are industrial heat such as steel mills or gas flares, not wildfire; the satellite cannot tell them apart.
          </p>
          <ActiveFires />
        </div>
      </section>

      <section id="how">
        <div className="container">
          <h2>How it works</h2>
          <div className="rule" />
          <div className="grid-3">
            <div className="card">
              <div className="step">Step 1</div>
              <h3>Enter an address</h3>
              <p>Type any address or use your location. Tell us who lives there: children, older adults, pets, medication, whether there is a car.</p>
            </div>
            <div className="card">
              <div className="step">Step 2</div>
              <h3>Get a live risk brief</h3>
              <p>Satellite detections within 50 km are grouped into fires. With the wind and humidity we score the risk, say which way each fire is being pushed, and estimate how long the nearest one needs to reach the door.</p>
            </div>
            <div className="card">
              <div className="step">Step 3</div>
              <h3>Get a way out and a checklist</h3>
              <p>Roads out in eight directions are checked against the fire. The safe one is drawn in green, the fastest one in red if it runs past the fire. The checklist changes for a family with no car, a person on oxygen, or pets. Read it in English or Spanish, print it, or text it.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="data" className="band">
        <div className="container grid-2">
          <div>
            <h2>The data behind every brief</h2>
            <div className="rule" />
            <p className="muted">All sources are free and public, so the tool costs nothing to run and works anywhere on Earth.</p>
          </div>
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <h3>NASA FIRMS</h3>
              <p>Heat detections from the VIIRS instrument on the Suomi NPP satellite, updated several times a day, with fire radiative power and confidence.</p>
            </div>
            <div className="card" style={{ marginBottom: 12 }}>
              <h3>Open-Meteo</h3>
              <p>Current wind speed, gusts, direction, and relative humidity. These drive the upwind check and the spread estimate.</p>
            </div>
            <div className="card" style={{ marginBottom: 12 }}>
              <h3>OSRM and OpenStreetMap</h3>
              <p>Real driving routes on real roads, and address lookup for any place in the world.</p>
            </div>
            <div className="card">
              <h3>National Weather Service</h3>
              <p>Active Red Flag Warnings and evacuation notices for the exact point. United States only; the rest of the brief works everywhere.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="goals">
        <div className="container">
          <h2>Faster, more accurate, more equitable</h2>
          <div className="rule" />
          <p className="muted" style={{ maxWidth: 640 }}>
            The prompt asks how technology can make emergency preparedness and response faster, more accurate, and more equitable for everyone. This is our answer, mapped to the UN Sustainable Development Goals.
          </p>
          <div className="grid-3">
            <div className="card">
              <div className="step">SDG 3</div>
              <h3>Good health and well-being</h3>
              <p>Most wildfire deaths and injuries come from leaving late or down the wrong road. The brief gives a time window, a route, and a checklist that covers smoke masks, medication, and medical equipment.</p>
            </div>
            <div className="card">
              <div className="step">SDG 9</div>
              <h3>Industry, innovation, and infrastructure</h3>
              <p>Satellite, weather, and road infrastructure already exists. We turn it into a household tool in seconds, with no paid services, so any city or school can host it.</p>
            </div>
            <div className="card">
              <div className="step">SDG 11</div>
              <h3>Sustainable cities and communities</h3>
              <p>County-wide alerts treat every home the same. Scoring each address and each household, in two languages, means the people who need the most time get the earliest, clearest instruction.</p>
            </div>
          </div>
          <div className="row" style={{ marginTop: 28 }}>
            <Link href="/check" className="btn">Try it with your address</Link>
          </div>
        </div>
      </section>
    </>
  );
}
