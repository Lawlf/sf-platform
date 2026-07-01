export interface BrAirport {
  iata: string;
  city: string;
  uf: string;
  /** Nome curto do aeroporto, quando a cidade tem mais de um (ex.: "Guarulhos"). */
  name?: string;
  lat: number;
  lon: number;
}

/**
 * Aeroportos brasileiros com codigo IATA e voo regular. Derivado do dataset
 * OurAirports (dominio publico, davidmegginson.github.io/ourairports-data),
 * filtrado para Brasil com voo regular e nome curto do aeroporto.
 */
export const BR_AIRPORTS: ReadonlyArray<BrAirport> = [
  { iata: "BEL", city: "Belém", uf: "PA", name: "Val de Cans", lat: -1.3793, lon: -48.4762 },
  { iata: "CNF", city: "Belo Horizonte", uf: "MG", name: "Confins", lat: -19.6357, lon: -43.9669 },
  { iata: "BVB", city: "Boa Vista", uf: "RR", name: "Atlas Brasil Cantanhede", lat: 2.8462, lon: -60.6906 },
  { iata: "BSB", city: "Brasília", uf: "DF", name: "Juscelino Kubitschek", lat: -15.8692, lon: -47.9208 },
  { iata: "VCP", city: "Campinas", uf: "SP", name: "Viracopos", lat: -23.0074, lon: -47.1345 },
  { iata: "CGB", city: "Cuiabá", uf: "MT", name: "Várzea Grande-Marechal…", lat: -15.6529, lon: -56.1167 },
  { iata: "CWB", city: "Curitiba", uf: "PR", name: "Afonso Pena", lat: -25.5285, lon: -49.1758 },
  { iata: "FLN", city: "Florianópolis", uf: "SC", name: "Hercílio Luz", lat: -27.6703, lon: -48.5525 },
  { iata: "FOR", city: "Fortaleza", uf: "CE", name: "Pinto Martins", lat: -3.7758, lon: -38.5322 },
  { iata: "IGU", city: "Foz do Iguaçu", uf: "PR", name: "Cataratas", lat: -25.5942, lon: -54.4894 },
  { iata: "GYN", city: "Goiânia", uf: "GO", name: "Santa Genoveva", lat: -16.632, lon: -49.2207 },
  { iata: "JPA", city: "João Pessoa", uf: "PB", name: "Presidente Castro Pinto", lat: -7.1487, lon: -34.9506 },
  { iata: "MCZ", city: "Maceió", uf: "AL", name: "Zumbi dos Palmares", lat: -9.5126, lon: -35.7918 },
  { iata: "MAO", city: "Manaus", uf: "AM", name: "Eduardo Gomes", lat: -3.0386, lon: -60.0497 },
  { iata: "NAT", city: "Natal", uf: "RN", name: "Rio Grande do Norte/São…", lat: -5.7698, lon: -35.3666 },
  { iata: "NVT", city: "Navegantes", uf: "SC", name: "Ministro Victor Konder", lat: -26.8794, lon: -48.651 },
  { iata: "POA", city: "Porto Alegre", uf: "RS", name: "Salgado Filho", lat: -29.994, lon: -51.1675 },
  { iata: "BPS", city: "Porto Seguro", uf: "BA", lat: -16.4384, lon: -39.0806 },
  { iata: "PVH", city: "Porto Velho", uf: "RO", name: "Governador Jorge Teixei…", lat: -8.7085, lon: -63.9023 },
  { iata: "REC", city: "Recife", uf: "PE", name: "Guararapes", lat: -8.1275, lon: -34.923 },
  { iata: "RBR", city: "Rio Branco", uf: "AC", name: "Plácido de Castro", lat: -9.869, lon: -67.894 },
  { iata: "GIG", city: "Rio de Janeiro", uf: "RJ", name: "Galeão", lat: -22.81, lon: -43.2506 },
  { iata: "SDU", city: "Rio de Janeiro", uf: "RJ", name: "Santos Dumont", lat: -22.9104, lon: -43.1628 },
  { iata: "SSA", city: "Salvador", uf: "BA", name: "Luís Eduardo Magalhães", lat: -12.9086, lon: -38.3225 },
  { iata: "SLZ", city: "São Luís", uf: "MA", name: "Marechal Cunha Machado", lat: -2.5864, lon: -44.235 },
  { iata: "GRU", city: "São Paulo", uf: "SP", name: "Guarulhos", lat: -23.4313, lon: -46.47 },
  { iata: "CGH", city: "São Paulo", uf: "SP", name: "Congonhas", lat: -23.6277, lon: -46.6546 },
  { iata: "VIX", city: "Vitória", uf: "ES", name: "Eurico de Aguiar Salles", lat: -20.258, lon: -40.285 },
  { iata: "AFL", city: "Alta Floresta", uf: "MT", name: "Piloto Osvaldo Marques…", lat: -9.8664, lon: -56.1063 },
  { iata: "ATM", city: "Altamira", uf: "PA", name: "Interstate", lat: -3.2531, lon: -52.2539 },
  { iata: "AJU", city: "Aracaju", uf: "SE", name: "Santa Maria", lat: -10.9839, lon: -37.0729 },
  { iata: "ARU", city: "Araçatuba", uf: "SP", lat: -21.1415, lon: -50.4246 },
  { iata: "AUX", city: "Araguaína", uf: "TO", lat: -7.2279, lon: -48.2405 },
  { iata: "AQA", city: "Araraquara", uf: "SP", lat: -21.812, lon: -48.133 },
  { iata: "AAX", city: "Araxá", uf: "MG", name: "Romeu Zema", lat: -19.5632, lon: -46.9604 },
  { iata: "JTC", city: "Bauru", uf: "SP", name: "Arealva-Moussa Nakhal T…", lat: -22.1608, lon: -49.0703 },
  { iata: "CPV", city: "Campina Grande", uf: "PB", name: "Presidente João Suassuna", lat: -7.2697, lon: -35.8961 },
  { iata: "CGR", city: "Campo Grande", uf: "MS", lat: -20.47, lon: -54.674 },
  { iata: "CAW", city: "Campos dos Goytacazes", uf: "RJ", name: "Bartolomeu Lisandro", lat: -21.6983, lon: -41.3017 },
  { iata: "CAC", city: "Cascavel", uf: "PR", name: "Coronel Adalberto Mende…", lat: -25.0003, lon: -53.5012 },
  { iata: "CXJ", city: "Caxias do Sul", uf: "RS", name: "Hugo Cantergiani", lat: -29.1972, lon: -51.1876 },
  { iata: "XAP", city: "Chapecó", uf: "SC", name: "Serafin Enoss Bertaso", lat: -27.1342, lon: -52.6566 },
  { iata: "CMG", city: "Corumbá", uf: "MS", lat: -19.0119, lon: -57.6728 },
  { iata: "CCM", city: "Criciúma", uf: "SC", name: "Forquilhinha - Criciúma", lat: -28.7257, lon: -49.4245 },
  { iata: "JJD", city: "Cruz", uf: "CE", name: "Comandante Ariston Pess…", lat: -2.9064, lon: -40.3573 },
  { iata: "CZS", city: "Cruzeiro do Sul", uf: "AC", lat: -7.5999, lon: -72.7695 },
  { iata: "FEC", city: "Feira de Santana", uf: "BA", name: "João Durval Carneiro", lat: -12.2007, lon: -38.9062 },
  { iata: "FEN", city: "Fernando de Noronha", uf: "PE", lat: -3.8545, lon: -32.423 },
  { iata: "GVR", city: "Governador Valadares", uf: "MG", name: "Coronel Altino Machado", lat: -18.8959, lon: -41.9829 },
  { iata: "IOS", city: "Ilhéus", uf: "BA", name: "Bahia - Jorge Amado", lat: -14.8159, lon: -39.0335 },
  { iata: "IMP", city: "Imperatriz", uf: "MA", name: "Prefeito Renato Moreira", lat: -5.5313, lon: -47.46 },
  { iata: "IPN", city: "Ipatinga", uf: "MG", name: "Usiminas", lat: -19.4707, lon: -42.4876 },
  { iata: "ITB", city: "Itaituba", uf: "PA", lat: -4.2421, lon: -56.0007 },
  { iata: "JOI", city: "Joinville", uf: "SC", name: "Lauro Carneiro de Loyola", lat: -26.2245, lon: -48.7974 },
  { iata: "JDF", city: "Juiz de Fora", uf: "MG", name: "Francisco de Assis", lat: -21.7915, lon: -43.3861 },
  { iata: "IZA", city: "Juiz de Fora", uf: "MG", name: "Presidente Itamar Franco", lat: -21.5131, lon: -43.1731 },
  { iata: "LAJ", city: "Lages", uf: "SC", lat: -27.7821, lon: -50.2815 },
  { iata: "LDB", city: "Londrina", uf: "PR", name: "Governor José Richa", lat: -23.3344, lon: -51.1284 },
  { iata: "MCP", city: "Macapá", uf: "AP", name: "Alberto Alcolumbre", lat: 0.0507, lon: -51.0722 },
  { iata: "MNX", city: "Manicoré", uf: "AM", lat: -5.8114, lon: -61.2783 },
  { iata: "MAB", city: "Marabá", uf: "PA", name: "João Correa da Rocha", lat: -5.3686, lon: -49.138 },
  { iata: "MII", city: "Marília", uf: "SP", name: "Frank Miloye Milenkowic…", lat: -22.1969, lon: -49.9265 },
  { iata: "MGF", city: "Maringá", uf: "PR", name: "de Maringá - Sílvio Nam…", lat: -23.4761, lon: -52.0162 },
  { iata: "MOC", city: "Montes Claros", uf: "MG", name: "Mário Ribeiro", lat: -16.7069, lon: -43.8189 },
  { iata: "MVF", city: "Mossoró", uf: "RN", name: "Dix-Sept Rosado", lat: -5.2019, lon: -37.3643 },
  { iata: "TMT", city: "Oriximiná", uf: "PA", name: "Trombetas", lat: -1.4896, lon: -56.3968 },
  { iata: "PMW", city: "Palmas", uf: "TO", name: "Brigadeiro Lysias Rodri…", lat: -10.2915, lon: -48.357 },
  { iata: "CKS", city: "Parauapebas", uf: "PA", name: "Carajás", lat: -6.1178, lon: -50.0034 },
  { iata: "PHB", city: "Parnaíba", uf: "PI", name: "Prefeito Doutor João Si…", lat: -2.8937, lon: -41.732 },
  { iata: "PFB", city: "Passo Fundo", uf: "RS", name: "Lauro Kurtz", lat: -28.244, lon: -52.3278 },
  { iata: "PAV", city: "Paulo Afonso", uf: "BA", lat: -9.4009, lon: -38.2506 },
  { iata: "PET", city: "Pelotas", uf: "RS", name: "João Simões Lopes Neto", lat: -31.7172, lon: -52.3278 },
  { iata: "PNZ", city: "Petrolina", uf: "PE", name: "Senador Nilo Coelho", lat: -9.3624, lon: -40.5691 },
  { iata: "PGZ", city: "Ponta Grossa", uf: "PR", name: "Comandante Antonio Amil…", lat: -25.1845, lon: -50.1438 },
  { iata: "PMG", city: "Ponta Porã", uf: "MS", lat: -22.5496, lon: -55.7026 },
  { iata: "PPB", city: "Presidente Prudente", uf: "SP", lat: -22.1751, lon: -51.4246 },
  { iata: "RAO", city: "Ribeirão Preto", uf: "SP", name: "Leite Lopes", lat: -21.1343, lon: -47.7741 },
  { iata: "RRJ", city: "Rio de Janeiro", uf: "RJ", name: "Jacarepaguá", lat: -22.9868, lon: -43.3722 },
  { iata: "ROO", city: "Rondonópolis", uf: "MT", name: "Maestro Marinho Franco", lat: -16.5843, lon: -54.7248 },
  { iata: "RIA", city: "Santa Maria", uf: "RS", lat: -29.7114, lon: -53.6882 },
  { iata: "STM", city: "Santarém", uf: "PA", name: "Maestro Wilson Fonseca", lat: -2.4224, lon: -54.7931 },
  { iata: "GEL", city: "Santo Ângelo", uf: "RS", lat: -28.2825, lon: -54.1696 },
  { iata: "SJL", city: "São Gabriel da Cachoeira", uf: "AM", lat: -0.1483, lon: -66.9855 },
  { iata: "SJP", city: "São José do Rio Preto", uf: "SP", name: "Prof. Eribelto Manoel R…", lat: -20.8171, lon: -49.407 },
  { iata: "SJK", city: "São José dos Campos", uf: "SP", name: "Professor Urbano Ernest…", lat: -23.2292, lon: -45.8615 },
  { iata: "JSO", city: "Sobral", uf: "CE", name: "Dr. Luciano de Arruda C…", lat: -3.6145, lon: -40.2314 },
  { iata: "TBT", city: "Tabatinga", uf: "AM", lat: -4.2557, lon: -69.9358 },
  { iata: "TFF", city: "Tefé", uf: "AM", lat: -3.3829, lon: -64.7241 },
  { iata: "THE", city: "Teresina", uf: "PI", name: "Senador Petrônio Portela", lat: -5.0602, lon: -42.8237 },
  { iata: "TUR", city: "Tucuruí", uf: "PA", lat: -3.786, lon: -49.7203 },
  { iata: "UBA", city: "Uberaba", uf: "MG", name: "Mário de Almeida Franco", lat: -19.765, lon: -47.9648 },
  { iata: "UDI", city: "Uberlândia", uf: "MG", name: "Ten. Cel. Aviador César…", lat: -18.8836, lon: -48.2259 },
  { iata: "URG", city: "Uruguaiana", uf: "RS", name: "Rubem Berta", lat: -29.7822, lon: -57.0382 },
  { iata: "BVH", city: "Vilhena", uf: "RO", name: "Brigadeiro Camarão", lat: -12.6944, lon: -60.0983 },
  { iata: "VDC", city: "Vitória da Conquista", uf: "BA", name: "Glauber de Andrade Rocha", lat: -14.9079, lon: -40.9148 },
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchAirports(query: string): BrAirport[] {
  const q = normalize(query);
  if (!q) return [];
  return BR_AIRPORTS.filter(
    (a) =>
      normalize(a.city).includes(q) ||
      normalize(a.iata).includes(q) ||
      (a.name ? normalize(a.name).includes(q) : false),
  ).slice(0, 8);
}
