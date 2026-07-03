"use client";

import { useEffect, useState } from "react";

/** Live monospace clock, e.g. "8:39 PM". Empty until mounted (avoids SSR mismatch). */
export default function Clock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const format = () =>
      new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setTime(format());
    const id = window.setInterval(() => setTime(format()), 15000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-xs uppercase tracking-[0.2em] tabular-nums text-white/45">
      {time || " "}
    </span>
  );
}
