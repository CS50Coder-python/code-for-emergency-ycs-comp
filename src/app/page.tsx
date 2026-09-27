import Link from "next/link";
import LiveFeed from "@/components/LiveFeed";
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

      <section id="how" className="band">
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
              <p>We pull every satellite heat detection within 50 km from the last 24 hours, current wind and humidity, and official warnings, then score them in plain English.</p>
            </div>
            <div className="card">
              <div className="step">Step 3</div>
              <h3>Follow a checklist for that house</h3>
              <p>Not generic advice. A family with no car is told to arrange a ride before roads close. Someone on oxygen is told to pack a battery. Print it or text it.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="data">
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
              <p>Current wind speed, gusts, direction, and relative humidity. We use these to tell whether a fire is upwind of the house and whether the air is dry enough to carry embers.</p>
            </div>
            <div className="card">
              <h3>National Weather Service and OpenStreetMap</h3>
              <p>Active Red Flag Warnings and evacuation notices for the exact point, and address lookup for any place in the world.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="goals" className="band">
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
              <p>Most wildfire deaths and injuries come from leaving late. The brief gives a clear go signal and the checklist covers smoke masks, medication, and medical equipment so evacuation does not become a health emergency.</p>
            </div>
            <div className="card">
              <div className="step">SDG 9</div>
              <h3>Industry, innovation, and infrastructure</h3>
              <p>Satellite and weather infrastructure already exists. We turn it into a household tool in seconds, with no paid services, so any city or school can host it.</p>
            </div>
            <div className="card">
              <div className="step">SDG 11</div>
              <h3>Sustainable cities and communities</h3>
              <p>County-wide alerts treat every home the same. Scoring each address and each household means the people who need the most time get the earliest, clearest instruction.</p>
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
