// Strips owner names in src/data/league-history.json down to first names.
// If two different owners share a first name, keeps a last initial to
// disambiguate (e.g. "Chris H." / "Chris P.").
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'league-history.json')
const data = JSON.parse(readFileSync(FILE, 'utf8'))

const fullNames = new Set()
for (const s of Object.values(data.seasons)) for (const t of s.teams) fullNames.add(t.owner)

const firstOf = (full) => full.split(/\s+/)[0]
const counts = {}
for (const full of fullNames) counts[firstOf(full)] = (counts[firstOf(full)] ?? 0) + 1

const short = new Map(
  [...fullNames].map((full) => {
    const parts = full.split(/\s+/)
    const first = parts[0]
    const needsInitial = counts[first] > 1 && parts.length > 1
    return [full, needsInitial ? `${first} ${parts[1][0]}.` : first]
  }),
)

for (const s of Object.values(data.seasons)) for (const t of s.teams) t.owner = short.get(t.owner) ?? t.owner

writeFileSync(FILE, JSON.stringify(data))
console.log('Owners:', [...new Set([...short.values()])].join(', '))
