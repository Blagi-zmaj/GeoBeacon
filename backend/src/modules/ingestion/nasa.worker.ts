import { Redis } from "ioredis";
import { Queue, Worker } from "bullmq";
import { pool } from "../../db/pool.js";
import type { NasaWildfireIncident } from "../../types/nasaTypes.js";
import format from "pg-format";

const connection = { host: "localhost", port: 6379 };
const myQueue = new Queue("nasaQueue", { connection });

await myQueue.upsertJobScheduler(
  "nasa-scheduler",
  {
    every: 45000,
  },
  {
    name: "limited-execution-job",
    data: { message: "Limited runs" },
  },
);
setTimeout(async () => {
  await myQueue.removeJobScheduler("nasa-scheduler");
}, 900000);
const myWorker = new Worker(
  "nasaQueue",
  async (job) => {
    const response = await fetch(
      "https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires",
    );
    const data = await response.json();

    const dataMatrix = data.events.map((event: NasaWildfireIncident) => {
      const lon = event.geometry[0]?.coordinates[0];
      const lat = event.geometry[0]?.coordinates[1];

      return [
        event.title,
        event.categories[0]?.id ?? null,
        4,
        `POINT(${lon} ${lat})`,
        event.id,
      ];
    });

    const sql = format(
      `
      INSERT INTO incidents (title, type, severity, location, source_id)
      VALUES %L
      ON CONFLICT (source_id) DO NOTHING; 
      `,
      dataMatrix,
    );

    await pool.query(sql);

    console.log(`Write ${dataMatrix.length} incidents.`);
  },
  {
    connection,
  },
);

myWorker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

myWorker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
