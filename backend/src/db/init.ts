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
                source_id VARCHAR(1000) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS locationIndex ON incidents USING GIST(location);
            `,
    );
  } catch (error) {
    console.log(error);
  } finally {
    await pool.end();
  }
};

createTables();
