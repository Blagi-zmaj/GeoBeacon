import { Redis } from "ioredis";
import { Queue, Worker } from "bullmq";
import { pool } from "../../db/pool.js";

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
    for (const event of data.events) {
      const values = [
        event.title,
        event.categories[0].id,
        4,
        event.geometry[0].coordinates[0],
        event.geometry[0].coordinates[1],
        event.id,
      ];
      await pool.query(
        `
        INSERT INTO incidents(title, type, severity , location, source_id)
        VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6)
        ON CONFLICT (source_id) DO NOTHING;
        `,
        values,
      );
    }
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
