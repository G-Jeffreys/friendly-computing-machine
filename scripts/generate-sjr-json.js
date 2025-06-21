#!/usr/bin/env node
/**
 * Strip SCImago 2024 CSV chunks down to { ISSN -> SJR } and write
 * lib/data/sjr_2024.json.  Run once a year when the dataset updates:
 *   node scripts/generate-sjr-json.js
 *
 * Requires csv-parse: npm i -D csv-parse
 */

const fs = require("fs")
const path = require("path")
const { parse } = require("csv-parse/sync")

const SRC_DIR = path.join(process.cwd(), "docs/scimagojr_chunks")
const OUT_PATH = path.join(process.cwd(), "lib/data/sjr_2024.json")

if (!fs.existsSync(SRC_DIR)) {
  console.error(`[generate-sjr-json] Directory not found: ${SRC_DIR}`)
  process.exit(1)
}

console.log(`🛠  [generate-sjr-json] Reading CSV chunks in ${SRC_DIR}`)

const lookup = {}

fs.readdirSync(SRC_DIR)
  .filter(f => f.endsWith(".csv"))
  .forEach(file => {
    const fp = path.join(SRC_DIR, file)
    console.log(`   • Parsing ${file}`)
    const raw = fs.readFileSync(fp, "utf8")
    const records = parse(raw, {
      delimiter: ";",
      columns: true,
      skip_empty_lines: true
    })

    records.forEach(rec => {
      const issnField = rec.Issn || rec.ISSN || rec.issn || ""
      const sjrStr = rec.SJR || rec.sjr || ""
      if (!issnField || !sjrStr) return

      const sjrVal = parseFloat(String(sjrStr).replace(/,/g, "."))
      if (isNaN(sjrVal)) return

      issnField.split(",").forEach(rawIssn => {
        const norm = rawIssn.replace(/[-\s]/g, "").toLowerCase()
        if (!norm) return
        if (!lookup[norm] || lookup[norm] < sjrVal) {
          lookup[norm] = sjrVal
        }
      })
    })
  })

console.log(`✅  [generate-sjr-json] Collected ${Object.keys(lookup).length} unique ISSNs`)

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
fs.writeFileSync(OUT_PATH, JSON.stringify(lookup))
console.log(`💾  [generate-sjr-json] Wrote lookup to ${OUT_PATH}`) 