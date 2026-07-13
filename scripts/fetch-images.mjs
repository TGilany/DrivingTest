import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const bank = JSON.parse(readFileSync('scripts/bank.en.json', 'utf8'))
mkdirSync('public/images', { recursive: true })

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/*,*/*',
  Referer: 'https://www.gov.il/',
}

const jobs = bank.filter((q) => q.image)
let ok = 0
const failed = []

for (let i = 0; i < jobs.length; i += 10) {
  await Promise.all(
    jobs.slice(i, i + 10).map(async (q) => {
      const path = `public/images/${q.id}.jpg`
      if (existsSync(path)) { ok++; return }
      try {
        const res = await fetch(q.image, { headers: HEADERS })
        if (!res.ok) throw new Error(String(res.status))
        writeFileSync(path, Buffer.from(await res.arrayBuffer()))
        ok++
      } catch (e) {
        failed.push({ id: q.id, url: q.image, err: String(e) })
      }
    }),
  )
  if (i % 100 === 0) console.log(`${i}/${jobs.length}`)
}
console.log(`ok ${ok}, failed ${failed.length}`)
if (failed.length) writeFileSync('scripts/images-failed.json', JSON.stringify(failed, null, 1))
