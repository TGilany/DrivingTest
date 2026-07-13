import { readFileSync, writeFileSync } from 'node:fs'

const CATEGORY = {
  'Rules and Regulations': 'traffic-laws',
  'Traffic Signs': 'signs',
  'Safety': 'safety',
  'Know Your Vehicle': 'vehicle',
}

const raw = JSON.parse(readFileSync('scripts/bank_en_raw.json', 'utf8'))

const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const dropped = []
const bank = []

for (const r of raw) {
  const m = r.title2.match(/^(\d+)\.\s*([\s\S]*)$/)
  if (!m) { dropped.push({ title: r.title2.slice(0, 40), why: 'no id in title2' }); continue }
  const id = parseInt(m[1], 10)
  const question = m[2].trim()
  const desc = r.html ?? ''
  const lis = [...desc.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1])
  if (lis.length !== 4) { dropped.push({ id, why: `${lis.length} answers` }); continue }
  const correct = lis.findIndex((h) => h.includes('id="correctAnswer'))
  if (correct === -1) { dropped.push({ id, why: 'no correct marker' }); continue }
  const answers = lis.map(strip)
  if (answers.some((a) => !a)) { dropped.push({ id, why: 'empty answer' }); continue }
  const img = desc.match(/<img src="([^"]+)"/)
  const category = CATEGORY[r.category]
  if (!category) { dropped.push({ id, why: `unknown category ${r.category}` }); continue }
  bank.push({
    id,
    category,
    question,
    answers,
    correct,
    image: img ? img[1] : null,
    licenses: [...desc.matchAll(/«([^»]+)»/g)].map((x) => x[1]),
  })
}

const ids = new Set(bank.map((q) => q.id))
if (ids.size !== bank.length) throw new Error('duplicate question ids')

bank.sort((a, b) => a.id - b.id)
writeFileSync('scripts/bank.en.json', JSON.stringify(bank, null, 1))
console.log(`kept ${bank.length}, dropped ${dropped.length}`)
if (dropped.length) console.log(JSON.stringify(dropped.slice(0, 20), null, 1))
const counts = {}
for (const q of bank) counts[q.category] = (counts[q.category] ?? 0) + 1
console.log(counts)
console.log('with image:', bank.filter((q) => q.image).length)
