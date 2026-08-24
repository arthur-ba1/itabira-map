export interface CensusData {
  populacao: number
  masculino: number
  feminino: number
  de0a14: number
  de15a29: number
  de30a59: number
  de60mais: number
  branca: number
  preta: number
  parda: number
  amarela: number
  indigenaRaca: number
  obitosHouseholds: number
  domicilios: number
  indigenas: number
  quilombolas: number
}

export interface AssociacaoInfo {
  codigo: number
  nome: string
  bairro_raw: string
  bairros_que_compoe: string
  cnpj: string
  fundacao: string
  endereco: string
  numero: string
  complemento: string
  cep: string
  email: string
  presidente: string
  telefone_presidente: string
  bairro_id: string | null
  lat: number | null
  lng: number | null
  geocode_source?: string
}

export interface UbsInfo {
  unidade: string
  endereco: string
  telefone: string
  bairro_raw: string
  bairro_id: string | null
  lat: number | null
  lng: number | null
  geocode_source?: string
}

export interface BairroInfo {
  id: string
  nome: string
  area_ha: number
  perim_km: number
  docLegal: string
  census?: CensusData
  associacoes?: AssociacaoInfo[]
  ubs?: UbsInfo[]
}

export interface BairroFeatureProperties {
  id: string
  nome: string
  area_ha: number
  perim_km: number
  doc_legal: string
  color_idx: number
  census?: CensusData
  associacoes?: AssociacaoInfo[]
  ubs?: UbsInfo[]
}

export interface BairrosCompletoGeoJSON {
  type: 'FeatureCollection'
  features: GeoJSON.Feature<GeoJSON.Geometry, BairroFeatureProperties>[]
  associacoes: AssociacaoInfo[]
  ubs: UbsInfo[]
}
