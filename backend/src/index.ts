import app from "./app.js";
import { logger } from "./lib/logger.js";
import { verifyConnectivity } from "./db/driver.js";

const port = Number(process.env.PORT) || 5000;

// Verify CognoDB connectivity on startup (non-fatal — server stays up
// so the frontend can still function with mock data if DB is unreachable).
verifyConnectivity().catch(() => {
  // already logged inside verifyConnectivity
});

app.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Backend server listening");
});
