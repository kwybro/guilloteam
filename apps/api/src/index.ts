import { createDb, tasks } from '@guilloteam/data-ops';
import figlet from 'figlet'; 

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable")
}

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": () => {
      const body = figlet.textSync('guilloteam!'); 
      return new Response(body); 
    },
    "/tasks": async () => {
      const db = createDb(DATABASE_URL);
      const response = await db.select().from(tasks);
      return Response.json(response);
    }
  }
});

console.log(`Listening on ${server.url}`);