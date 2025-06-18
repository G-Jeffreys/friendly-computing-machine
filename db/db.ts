/*
<ai_context>
Initializes the database connection and schema for the app.
</ai_context>
*/

import { profilesTable, documentsTable } from "@/db/schema"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

config({ path: ".env.local" })

const schema = {
  profiles: profilesTable,
  documents: documentsTable
}

// Prefer the dedicated Supabase connection string when it is present. This makes it
// explicit that we are connecting to the Supabase Postgres instance while
// maintaining backwards-compatibility with DATABASE_URL for local or legacy setups.
const connectionString =
  process.env.SUPABASE_DB_URL || process.env.DATABASE_URL!

const client = postgres(connectionString)

export const db = drizzle(client, { schema })
