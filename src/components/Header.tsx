import Link from "next/link";
import { SITE } from "@/lib/site";

export default function Header() {
  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="brand">
          <span className="mark" aria-hidden="true"><i /><i /><i /><i /></span>
          {SITE.name}
        </Link>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#data">Data</Link>
          <Link href="/#goals">UN Goals</Link>
          <Link href="/check" className="primary">Try it</Link>
        </nav>
      </div>
    </header>
  );
}
