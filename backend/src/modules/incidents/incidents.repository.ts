import { pool } from "../../db/pool.js";

export const getHeatmap = async (): Promise<any[]> => {
  const heatmap = await pool.query(`
    SELECT json_object_agg(h3_index, incident_count) AS heatmap_data
    FROM (
      SELECT 
        h3_lat_lng_to_cell(point(ST_Y(location::geometry), ST_X(location::geometry)), 4)::text AS h3_index,
        COUNT (*) AS incident_count
      FROM incidents
      GROUP BY h3_index
    ) subquery;
    `);
  return heatmap.rows[0].heatmap_data;
};
