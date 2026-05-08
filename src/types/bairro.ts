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

export interface BairroInfo {
  id: string
  nome: string
  area_ha: number
  perim_km: number
  docLegal: string
  census?: CensusData
}

export interface BairroFeatureProperties {
  id: string
  nome: string
  area_ha: number
  perim_km: number
  doc_legal: string
  color_idx: number
}
