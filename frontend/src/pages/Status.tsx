import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Status() {
  const [msg, setMsg] = useState("Checking…");

  useEffect(() => {
    Promise.all([api.health(), api.ping()])
      .then(([_, p]) =>
        setMsg(`API OK • ${new Date(p.ts ?? Date.now()).toLocaleTimeString()}`),
      )
      .catch((err) => setMsg("API error: " + err.message));
  }, []);

  return <div>{msg}</div>;
}
