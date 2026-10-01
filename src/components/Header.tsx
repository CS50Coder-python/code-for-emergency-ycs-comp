"use client";

import Link from "next/link";
import { useState } from "react";
import { SITE } from "@/lib/site";

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="brand">
          <span className="mark" aria-hidden="true"><i /><i /><i /><i /></span>
          {SITE.name}
        </Link>
        <button
          className="menu-btn"
          type="button"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav id="site-nav" className={`nav${open ? " open" : ""}`} onClick={() => setOpen(false)}>
          <Link href="/">Home</Link>
          <Link href="/#fires">Active fires</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#data">Data</Link>
          <Link href="/#goals">UN Goals</Link>
          <Link href="/check" className="primary">Try it</Link>
        </nav>
      </div>
    </header>
  );
}
