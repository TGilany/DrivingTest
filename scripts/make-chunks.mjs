import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const bank = JSON.parse(readFileSync('scripts/bank.en.json', 'utf8'))
mkdirSync('scripts/chunks', { recursive: true })
mkdirSync('scripts/explained', { recursive: true })
const SIZE = 100
for (let i = 0; i * SIZE < bank.length; i++) {
  const chunk = bank.slice(i * SIZE, (i + 1) * SIZE).map((q) => ({
    id: q.id,
    category: q.category,
    question: q.question,
    answers: q.answers,
    correct: q.correct,
    hasImage: Boolean(q.image),
  }))
  writeFileSync(
    `scripts/chunks/chunk-${String(i).padStart(2, '0')}.json`,
    JSON.stringify(chunk, null, 1),
  )
}
console.log('chunks written:', Math.ceil(bank.length / SIZE))
