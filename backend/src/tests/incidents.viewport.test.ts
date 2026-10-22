import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../server.js";
import {
  cleanIncidentFixtures,
  seedIncidentFixtures,
  viewport,
  viewportUrl,
} from "./helpers/incident-fixtures.js";

async function getIncidents(url: string) {
  const response = await app.inject({ method: "GET", url });
  const body = response.json<{
    incidents?: Array<{ id: string; updated_at: string }>;
    meta?: {
      returned?: number;
      truncated?: boolean;
      nextCursor?: string | null;
    };
    error?: unknown;
  }>();

  return { response, body };
}

describe("GET /api/incidents/incidents viewport contract", () => {
  beforeEach(async () => {
    await seedIncidentFixtures();
  });

  afterAll(async () => {
    await cleanIncidentFixtures();
    await app.close();
  });

  it("API-01 returns incidents inside a valid viewport", async () => {
    const { response, body } = await getIncidents(viewportUrl());

    expect(response.statusCode).toBe(200);
    expect(body.incidents?.map((incident) => incident.id)).toEqual([
      "00000000-0000-0000-0000-000000000002",
      "00000000-0000-0000-0000-000000000005",
      "00000000-0000-0000-0000-000000000004",
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000007",
      "00000000-0000-0000-0000-000000000006",
    ]);

    expect(body.incidents?.[0]).toEqual(
      expect.objectContaining({
        id: "00000000-0000-0000-0000-000000000002",
        title: "Inside new",
        type: "wildfires",
        severity: 4,
        status: "active",
        updated_at: "2026-10-21T12:00:00.000Z",
      }),
    );
    expect(body.incidents?.[0]).toHaveProperty("location");
  });

  it("API-02 excludes an incident outside the viewport", async () => {
    const { response, body } = await getIncidents(viewportUrl());

    expect(response.statusCode).toBe(200);
    expect(body.incidents?.map((incident) => incident.id)).not.toContain(
      "00000000-0000-0000-0000-000000000003",
    );
  });

  it("API-03 includes a point on the west boundary", async () => {
    const { body } = await getIncidents(
      viewportUrl({ west: 10, south: 49.5, east: 11, north: 50.5 }),
    );

    expect(body.incidents?.map((incident) => incident.id)).toContain(
      "00000000-0000-0000-0000-000000000004",
    );
  });

  it("API-04 includes a point on the east boundary", async () => {
    const { body } = await getIncidents(
      viewportUrl({ west: 19, south: 49.5, east: 20, north: 50.5 }),
    );

    expect(body.incidents?.map((incident) => incident.id)).toContain(
      "00000000-0000-0000-0000-000000000005",
    );
  });

  it("API-05 includes points on the south and north boundaries", async () => {
    const { body } = await getIncidents(viewportUrl());
    const ids = body.incidents?.map((incident) => incident.id) ?? [];

    expect(ids).toEqual(
      expect.arrayContaining([
        "00000000-0000-0000-0000-000000000006",
        "00000000-0000-0000-0000-000000000007",
      ]),
    );
  });

  it("API-06 rejects a request with a missing west boundary", async () => {
    const { response, body } = await getIncidents(
      "/api/incidents/incidents?south=49&east=20&north=55",
    );

    expect(response.statusCode).toBe(422);
    expect(body.error).toBeTruthy();
  });

  it("API-07 rejects a non-numeric boundary", async () => {
    const { response, body } = await getIncidents(
      "/api/incidents/incidents?west=abc&south=49&east=20&north=55",
    );

    expect(response.statusCode).toBe(422);
    expect(body.error).toBeTruthy();
  });

  it("API-08 rejects a latitude outside the WGS84 range", async () => {
    const { response, body } = await getIncidents(
      "/api/incidents/incidents?west=10&south=49&east=20&north=95",
    );

    expect(response.statusCode).toBe(422);
    expect(body.error).toBeTruthy();
  });

  it("API-09 rejects a longitude outside the WGS84 range", async () => {
    const { response, body } = await getIncidents(
      "/api/incidents/incidents?west=-181&south=49&east=20&north=55",
    );

    expect(response.statusCode).toBe(422);
    expect(body.error).toBeTruthy();
  });

  it("API-10 rejects inverted latitude boundaries", async () => {
    const { response, body } = await getIncidents(
      "/api/incidents/incidents?west=10&south=55&east=20&north=49",
    );

    expect(response.statusCode).toBe(422);
    expect(body.error).toBeTruthy();
  });

  it("API-11 returns both sides of an antimeridian viewport", async () => {
    const { response, body } = await getIncidents(
      viewportUrl({ west: 170, south: -10, east: -170, north: 10 }),
    );
    const ids = body.incidents?.map((incident) => incident.id) ?? [];

    expect(response.statusCode).toBe(200);
    expect(ids).toEqual(
      expect.arrayContaining([
        "00000000-0000-0000-0000-000000000009",
        "00000000-0000-0000-0000-000000000010",
      ]),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("API-12 excludes closed incidents from the default response", async () => {
    const { response, body } = await getIncidents(viewportUrl());

    expect(response.statusCode).toBe(200);
    expect(body.incidents?.map((incident) => incident.id)).not.toContain(
      "00000000-0000-0000-0000-000000000008",
    );
  });
});
