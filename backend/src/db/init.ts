import { pool } from "./pool.js";

const createTables = async () => {
  try {
    await pool.query(
      `
        CREATE TABLE IF NOT EXISTS incidents (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          severity INTEGER,
          location GEOGRAPHY(Point, 4326) NOT NULL,
          source_id VARCHAR(1000) UNIQUE NOT NULL,
          source_timestamp TIMESTAMPTZ NOT NULL, 
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS incidents_location_geog_idx 
            ON incidents USING GIST (location);

        CREATE INDEX IF NOT EXISTS incidents_location_geom_idx 
            ON incidents USING GIST ((location::geometry));
      `,
    );
    console.log("Table and indexes created!");
  } catch (error) {
    console.log("Error during table or indexes creation:", error);
  } finally {
    await pool.end();
  }
};

createTables();
