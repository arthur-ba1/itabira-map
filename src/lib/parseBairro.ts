import type { BairroFeatureProperties, BairroInfo } from '@/types/bairro'

export function parseBairroProperties(props: BairroFeatureProperties): BairroInfo {
  return {
    id: props.id,
    nome: props.nome,
    area_ha: props.area_ha,
    perim_km: props.perim_km,
    docLegal: props.doc_legal,
    census: props.census,
    associacoes: props.associacoes,
    ubs: props.ubs,
  }
}
