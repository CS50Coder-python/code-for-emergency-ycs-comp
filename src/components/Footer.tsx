import { SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div>{SITE.name}. {SITE.team}</div>
        <div>Data: NASA FIRMS, Open-Meteo, National Weather Service, OpenStreetMap.</div>
      </div>
    </footer>
  );
}
