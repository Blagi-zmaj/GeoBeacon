import { pool } from "../../db/pool.js";

export const viewport = {
  west: 10,
  south: 49,
  east: 20,
  north: 55,
};

export const incidentFixtures = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    sourceId: "test-viewport-inside-old",
    title: "Inside old",
    type: "wildfires",
    severity: 2,
    longitude: 15,
    latitude: 50,
    status: "active",
    sourceTimestamp: "2026-10-21T08:00:00.000Z",
    updatedAt: "2026-10-21T09:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    sourceId: "test-viewport-inside-new",
    title: "Inside new",
    type: "wildfires",
    severity: 4,
    longitude: 18,
    latitude: 52,
    status: "active",
    sourceTimestamp: "2026-10-21T11:00:00.000Z",
    updatedAt: "2026-10-21T12:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    sourceId: "test-viewport-outside",
    title: "Outside",
    type: "wildfires",
    severity: 3,
    longitude: 30,
    latitude: 50,
    status: "active",
    sourceTimestamp: "2026-10-21T10:00:00.000Z",
    updatedAt: "2026-10-21T11:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    sourceId: "test-viewport-on-west",
    title: "On west boundary",
    type: "wildfires",
    severity: 3,
    longitude: 10,
    latitude: 50,
    status: "active",
    sourceTimestamp: "2026-10-21T09:00:00.000Z",
    updatedAt: "2026-10-21T10:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    sourceId: "test-viewport-on-east",
    title: "On east boundary",
    type: "wildfires",
    severity: 3,
    longitude: 20,
    latitude: 50,
    status: "active",
    sourceTimestamp: "2026-10-21T09:30:00.000Z",
    updatedAt: "2026-10-21T10:30:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    sourceId: "test-viewport-on-south",
    title: "On south boundary",
    type: "wildfires",
    severity: 2,
    longitude: 15,
    latitude: 49,
    status: "active",
    sourceTimestamp: "2026-10-21T07:00:00.000Z",
    updatedAt: "2026-10-21T08:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    sourceId: "test-viewport-on-north",
    title: "On north boundary",
    type: "wildfires",
    severity: 2,
    longitude: 15,
    latitude: 55,
    status: "active",
    sourceTimestamp: "2026-10-21T07:30:00.000Z",
    updatedAt: "2026-10-21T08:30:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000008",
    sourceId: "test-viewport-closed",
    title: "Closed incident",
    type: "wildfires",
    severity: 5,
    longitude: 16,
    latitude: 51,
    status: "closed",
    sourceTimestamp: "2026-10-21T12:30:00.000Z",
    updatedAt: "2026-10-21T13:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000009",
    sourceId: "test-viewport-dateline-east",
    title: "Dateline east",
    type: "wildfires",
    severity: 3,
    longitude: 179,
    latitude: 0,
    status: "active",
    sourceTimestamp: "2026-10-21T14:00:00.000Z",
    updatedAt: "2026-10-21T14:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000010",
    sourceId: "test-viewport-dateline-west",
    title: "Dateline west",
    type: "wildfires",
    severity: 3,
    longitude: -179,
    latitude: 0,
    status: "active",
    sourceTimestamp: "2026-10-21T15:00:00.000Z",
    updatedAt: "2026-10-21T15:00:00.000Z",
  },
] as const;

function assertTestDatabase() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Viewport fixtures require NODE_ENV=test.");
  }

  const databaseName = process.env.PGDATABASE?.toLowerCase() ?? "";
  if (!databaseName.includes("test")) {
    throw new Error(
      `Refusing to mutate database '${process.env.PGDATABASE ?? ""}'. Set PGDATABASE to a dedicated test database.`,
    );
  }
}

export async function cleanIncidentFixtures() {
  assertTestDatabase();
  await pool.query("TRUNCATE TABLE incidents RESTART IDENTITY CASCADE");
}

export async function seedIncidentFixtures() {
  assertTestDatabase();
  await cleanIncidentFixtures();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const incident of incidentFixtures) {
      await client.query(
        `
        INSERT INTO incidents (
          id,
          title,
          type,
          severity,
          location,
          source_id,
          source_timestamp,
          updated_at,
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
          $7,
          $8,
          $9,
          $10
        )
      `,
        [
          incident.id,
          incident.title,
          incident.type,
          incident.severity,
          incident.longitude,
          incident.latitude,
          incident.sourceId,
          incident.sourceTimestamp,
          incident.updatedAt,
          incident.status,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function viewportUrl(
  values: typeof viewport = viewport,
): string {
  const query = new URLSearchParams({
    west: String(values.west),
    south: String(values.south),
    east: String(values.east),
    north: String(values.north),
  });

  return `/api/incidents/incidents?${query.toString()}`;
}
