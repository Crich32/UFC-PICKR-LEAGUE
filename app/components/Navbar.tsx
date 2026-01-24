"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkStyle = (path: string) => ({
    background: pathname === path ? "#22c55e" : "#111",
    color: pathname === path ? "#000" : "white",
    fontWeight: "bold",
    padding: "10px 14px",
    borderRadius: "6px",
    textDecoration: "none",
    border: "1px solid #333",
    cursor: "pointer",
  });

  return (
    <nav
      style={{
        borderBottom: "1px solid #333",
        background: "#000",
        padding: "12px 20px",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/" style={{ color: "white", fontWeight: "bold" }}>
          UFC Picks
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            fontSize: "24px",
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
          }}
        >
          ☰
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "12px",
            gap: "10px",
          }}
        >
          <Link href="/" style={linkStyle("/")}>
            Home
          </Link>

          <Link href="/picks" style={linkStyle("/picks")}>
            Picks
          </Link>

          <Link href="/leaderboard" style={linkStyle("/leaderboard")}>
            Leaderboard
          </Link>

          <Link href="/profile" style={linkStyle("/profile")}>
            Profile
          </Link>
        </div>
      )}
    </nav>
  );
}

