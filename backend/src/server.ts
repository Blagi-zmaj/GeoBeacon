// need to set on top according to hoisting (imports go first) => if next import uses password from .env, it will return error
import "dotenv/config";
import Fastify from "fastify";
import { pool } from "./db/pool.js";

console.log("My database", process.env.PGDATABASE)

const fastify = Fastify({logger: true});

fastify.get("/", async(request, reply) => {
    const client = await pool.connect()
    const res = await client.query('SELECT PostGIS_Full_Version();')

    return {"status": "OK", app_name: process.env.PGDATABASE || "Default Ecowatch", postgis: res?.rows?.[0].postgis_full_version}
})

const start = async()=>{
    try{
        await fastify.listen({port: 3000})
    } catch(error){
       fastify.log.error(error) 
       process.exit(1)
    }
}

start()