import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GEOJSON_SRC = resolve(__dirname, '../public/bairros-opt.geojson')
const CENSUS_SRC = resolve(__dirname, '../public/data/census.json')
const ASSOCIACOES_SRC = resolve(__dirname, '../public/data/associacoes.json')
const UBS_SRC = resolve(__dirname, '../public/data/ubs.json')
const OUT = resolve(__dirname, '../public/data/bairros-completo.geojson')
const MANIFEST = resolve(__dirname, '../src/lib/geojson-manifest.ts')

function groupByBairroId(list) {
  const map = {}
  for (const item of list) {
    if (!item.bairro_id) continue
    if (!map[item.bairro_id]) map[item.bairro_id] = []
    map[item.bairro_id].push(item)
  }
  return map
}

console.log('Consolidando dados dos bairros (território + censo + associações + UBS)...')

const geojson = JSON.parse(readFileSync(GEOJSON_SRC, 'utf-8'))
const census = JSON.parse(readFileSync(CENSUS_SRC, 'utf-8'))
const associacoes = JSON.parse(readFileSync(ASSOCIACOES_SRC, 'utf-8'))
const ubs = JSON.parse(readFileSync(UBS_SRC, 'utf-8'))

const associacoesByBairro = groupByBairroId(associacoes)
const ubsByBairro = groupByBairroId(ubs)

// Cada feature carrega, além da geometria do território, todas as
// informações já casadas com o bairro — nada disso precisa ser
// recalculado/rejuntado no cliente em tempo de execução.
const features = geojson.features.map((feature) => {
  const id = feature.properties.id
  const properties = { ...feature.properties }
  if (census[id]) properties.census = census[id]
  if (associacoesByBairro[id]) properties.associacoes = associacoesByBairro[id]
  if (ubsByBairro[id]) properties.ubs = ubsByBairro[id]
  return { ...feature, properties }
})

// Listas achatadas (inclui registros sem bairro_id casado) — usadas para
// desenhar todos os pinos no mapa, independente do bairro selecionado.
const output = {
  type: 'FeatureCollection',
  features,
  associacoes,
  ubs,
}

const content = JSON.stringify(output)
writeFileSync(OUT, content)

const hash = createHash('sha256').update(content).digest('hex').slice(0, 8)
writeFileSync(MANIFEST, `// Gerado automaticamente — não editar\nexport const GEOJSON_VERSION = '${hash}'\n`)

console.log(
  `  ${features.length} bairros, ${associacoes.length} associações, ${ubs.length} UBS → ${OUT} (${(content.length / 1024).toFixed(0)} KB)`,
)
