import fs from 'fs'
import readline from 'readline'

const DATA_DIR = 'public/data'
const OUT_FILE = 'public/data/census.json'

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

async function parseCSV(filename) {
  const rows = []
  const rl = readline.createInterface({
    input: fs.createReadStream(`${DATA_DIR}/${filename}`),
    crlfDelay: Infinity,
  })
  let headers = null
  for await (const line of rl) {
    if (!line.trim()) continue
    const cols = parseCSVLine(line)
    if (!headers) { headers = cols; continue }
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cols[i] ?? '' })
    rows.push(obj)
  }
  return rows
}

function n(v) { return parseInt(v, 10) || 0 }

async function main() {
  console.log('Processando dados censitários...')

  const [demo, raca, obitos, dom, indig, quilom] = await Promise.all([
    parseCSV('demografia.csv'),
    parseCSV('cor_raca.csv'),
    parseCSV('obitos.csv'),
    parseCSV('caracteristicas_domicilios.csv'),
    parseCSV('indigenas.csv'),
    parseCSV('quilombolas.csv'),
  ])

  const byId = {}

  const index = (rows, fn) => {
    for (const row of rows) {
      const id = row['bairro_id']
      if (!id) continue
      if (!byId[id]) byId[id] = {}
      fn(byId[id], row)
    }
  }

  index(demo, (b, r) => {
    b.populacao = n(r['Quantidade de moradores'])
    b.masculino = n(r['Sexo masculino'])
    b.feminino = n(r['Sexo feminino'])
    b.de0a14 = n(r['0 a 4 anos']) + n(r['5 a 9 anos']) + n(r['10 a 14 anos'])
    b.de15a29 = n(r['15 a 19 anos']) + n(r['20 a 24 anos']) + n(r['25 a 29 anos'])
    b.de30a59 = n(r['30 a 39 anos']) + n(r['40 a 49 anos']) + n(r['50 a 59 anos'])
    b.de60mais = n(r['60 a 69 anos']) + n(r['70 anos ou mais'])
  })

  index(raca, (b, r) => {
    b.branca = n(r['Cor ou raça é branca'])
    b.preta = n(r['Cor ou raça é preta'])
    b.parda = n(r['Cor ou raça é parda'])
    b.amarela = n(r['Cor ou raça é amarela'])
    b.indigenaRaca = n(r['Cor ou raça é indígena'])
  })

  index(obitos, (b, r) => {
    b.obitosHouseholds = n(r['Existe pessoa falecida, no período de janeiro de 2019 a julho de 2022, que morava no domicílio'])
  })

  index(dom, (b, r) => {
    b.domicilios = n(r['Domicílios Particulares Permanentes Ocupados'])
  })

  index(indig, (b, r) => {
    b.indigenas = n(r['Pessoa indígena'])
  })

  index(quilom, (b, r) => {
    b.quilombolas = n(r['Pessoa quilombola'])
  })

  fs.writeFileSync(OUT_FILE, JSON.stringify(byId))
  console.log(`  ${Object.keys(byId).length} bairros → ${OUT_FILE}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
