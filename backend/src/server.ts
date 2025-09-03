import "dotenv/config";
import http from "http";
import app from "./app";

const internalPort = Number(process.env.PORT || 5000);
const publicUrl = process.env.PUBLIC_URL; // e.g. "http://localhost:5001"

const server = http.createServer(app);

server.listen(internalPort, () => {
  const internal = `http://localhost:${internalPort}`;
  if (publicUrl) {
    console.log(`API listening (container): ${internal}`);
    console.log(`API reachable (host):     ${publicUrl}`);
  } else {
    console.log(`API listening on ${internal}`);
  }
});

// clean shutdowns in containers
const shutdown = (sig: string) => () => {
  console.log(`\nReceived ${sig}. Closing server...`);
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
};
process.on("SIGTERM", shutdown("SIGTERM"));
process.on("SIGINT", shutdown("SIGINT"));
