import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'

const bank = JSON.parse(readFileSync('scripts/bank.en.json', 'utf8'))
const explanations = new Map()
const problems = []

for (const f of readdirSync('scripts/explained').sort()) {
  const chunk = JSON.parse(readFileSync(`scripts/explained/${f}`, 'utf8'))
  for (const t of chunk) {
    if (typeof t.explanation !== 'string' || t.explanation.trim().length < 20)
      { problems.push(`${f}: id ${t.id} bad explanation`); continue }
    explanations.set(t.id, t.explanation.trim())
  }
}

const missing = bank.filter((q) => !explanations.has(q.id))
console.log(`explained ${explanations.size}/${bank.length}, problems ${problems.length}, missing ${missing.length}`)
if (problems.length) console.log(problems.slice(0, 30).join('\n'))
if (missing.length) console.log('missing ids:', missing.slice(0, 30).map((q) => q.id).join(','))
if (problems.length || missing.length) process.exit(1)

const out = bank.map((q) => ({
  ...q,
  explanation: explanations.get(q.id),
  image: q.image ? `${q.id}.jpg` : null,
}))
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/questions.json', JSON.stringify(out))
console.log('src/data/questions.json written')
