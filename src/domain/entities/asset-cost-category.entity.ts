/**
 * Liga uma categoria de gasto (chave livre do usuário, ex: "transporte") a um
 * bem. Os lançamentos avulsos daquela categoria entram no "custo total" do bem
 * (gasolina, IPVA, conserto somam à parcela). Marca uma vez, vale pra sempre.
 */
export interface AssetCostCategory {
  id: string;
  profileId: string;
  assetId: string;
  categoryKey: string;
  createdAt: Date;
}
