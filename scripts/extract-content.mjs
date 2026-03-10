// Run with: node --input-type=module scripts/extract-content.mjs
// Requires tsx to handle the TS import

import { createRequire } from 'module'
import { writeFileSync } from 'fs'
import { pathToFileURL } from 'url'

// Use tsx to load the TS file
const { introduction, contact, works, archives } = await import(
  pathToFileURL('./src/lib/data.ts').href
)

const content = {
  homeHero: '/images/hero.jpg',
  introduction,
  contact,
  works,
  archives,
}

writeFileSync('./src/lib/content.json', JSON.stringify(content, null, 2))
console.log('✅ content.json written')
