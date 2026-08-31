import "dotenv/config";
import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
import incidentRoutes from "./modules/incidents/incidents.routes.js";

const app = Fastify({
  routerOptions: {
    ignoreTrailingSlash: true,
  },
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
    },
  },
});
await app.register(fastifyWebsocket);

export const connectedClients = new Set<WebSocket>();

app.get("/live", { websocket: true }, (socket: WebSocket, req) => {
  connectedClients.add(socket);

  socket.on("message", (message) => {
    socket.send("Test hello");
  });

  socket.on("close", () => {
    connectedClients.delete(socket);
  });
});

await app.register(incidentRoutes, { prefix: "/api/incidents" });

const start = async () => {
  try {
    await app.listen({ port: 3000 });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
