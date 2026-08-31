// need to set on top according to hoisting (imports go first) => if next import uses password from .env, it will return error
import "dotenv/config";
import type { FastifyInstance } from "fastify";
import { pool } from "../../db/pool.js";
import type { IncidentBody } from "../../types/serverTypes.js";
import fastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
import { getHeatmap } from "./incidents.repository.js";
import { connectedClients } from "../../server.js";

const schema = {
  body: {
    type: "object",
    properties: {
      title: { type: "string" },
      type: { type: "string" },
      severity: {
        type: "number",
        minimum: 1,
        maximum: 5,
      },
      lng: { type: "number" },
      lat: { type: "number" },
    },
    required: ["title", "type", "severity", "lng", "lat"],
  },
};

export default async function incidentRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (request, reply) => {
    try {
      const res = await pool.query("SELECT PostGIS_Full_Version();");

      return {
        status: "OK",
        app_name: process.env.PGDATABASE || "Default Ecowatch",
        postgis: res?.rows?.[0].postgis_full_version,
      };
    } catch (error) {
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/incidents", async (request, reply) => {
    try {
      const incidents = await pool.query(`
      SELECT id, title, type, severity, ST_AsGeoJSON(location)::json as geojson, created_at FROM incidents;  
        `);
      reply.status(200).send({ incidentsData: incidents.rows });
    } catch (error) {
      reply.status(500).send({ error: "Server/Database error" });
    }
  });

  fastify.get("/heatmap", async (request, reply) => {
    try {
      const coordinates = await getHeatmap();
      console.log("coordinates", coordinates);

      reply.status(200).send({ heatMap: coordinates });
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: "Server error" });
    }
  });

  fastify.post<{ Body: IncidentBody }>(
    "/incidents",
    { schema: schema },
    async (request, reply) => {
      try {
        const { title, type, severity, lng, lat } = request.body;
        const values = [title, type, severity, lng, lat];
        const clientData = await pool.query(
          `
        INSERT INTO incidents (title, type, severity, location) VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)) RETURNING *;
      `,
          values,
        );

        const newIncident = clientData.rows[0];
        const eventPayload = JSON.stringify({
          type: "New incident",
          data: newIncident,
        });

        connectedClients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(eventPayload);
          }
        });

        return reply.status(201).send({ clientData: clientData.rows[0] });
      } catch (err) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
}
