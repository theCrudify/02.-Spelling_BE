import { serve } from '@hono/node-server'
import { app } from './app.ts'
import { listenMasterChanges } from './core/masters.ts'

const port = Number(process.env.PORT ?? 4000)
void listenMasterChanges()
serve({ fetch: app.fetch, port }, () => console.log(`Spelling API listening on http://localhost:${port}`))
