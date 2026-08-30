// need to set on top according to hoisting (imports go first) => if next import uses password from .env, it will return error
import "dotenv/config";
import Fastify from "fastify";
import { pool } from "./db/pool.js";
import type { IncidentBody } from "./types/serverTypes.js";
import { latLngToCell } from "h3-js";

const fastify = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
    },
  },
});

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

fastify.get("/incidents/heatmap", async (request, reply) => {
  try {
    const coordinates = await pool.query<{ lng: number; lat: number }>(
      `
    SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat FROM incidents;
    `,
    );
    const heatMap = new Map();
    coordinates.rows.forEach((row) => {
      const { lng, lat } = row;
      const h3Index = latLngToCell(lat, lng, 4);
      heatMap.set(h3Index, (heatMap.get(h3Index) ?? 0) + 1);
    });
    reply.status(200).send({ heatMap: Object.fromEntries(heatMap) });
  } catch (error) {
    reply.status(500).send({ error: "Server error" });
  }
});

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
      return reply.status(201).send({ clientData: clientData.rows[0] });
    } catch (err) {
      return reply.status(500).send({ error: "Internal server error" });
    }
  },
);

export const app = fastify;
