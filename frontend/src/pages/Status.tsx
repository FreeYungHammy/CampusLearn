import { useEffect, useState } from "react";
import api from "../lib/api";

export default function Status() {
  const [msg, setMsg] = useState("Checking…");

  useEffect(() => {
    Promise.all([
      api.get("/health"),
      api.get("/ping"),
    ])
      .then(([_, p]) => {
        const ts = p.data?.ts ?? Date.now();
        setMsg(`API OK • ${new Date(ts).toLocaleTimeString()}`);
      })
      .catch((err) => setMsg("API error: " + (err.message || err.toString())));
  }, []);

  return <div>{msg}</div>;
}
