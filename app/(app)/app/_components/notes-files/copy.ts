import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

interface EntityCopy {
  cardTitle: string;
  subtitle: string;
  notePlaceholder: string;
}

export const ENTITY_COPY: Record<AttachableEntityType, EntityCopy> = {
  debt: {
    cardTitle: "Contrato e anotações",
    subtitle: "Pra guardar contrato, comprovante ou um lembrete. Fica salvo aqui, ligado a esta dívida.",
    notePlaceholder: "Ex: renegociei a taxa em junho, novo vencimento dia 10.",
  },
  debt_payment: {
    cardTitle: "Comprovante e nota",
    subtitle: "Pra guardar o comprovante deste pagamento ou um lembrete. Fica salvo aqui, ligado a este pagamento.",
    notePlaceholder: "Ex: paguei via PIX, comprovante no app do banco.",
  },
  transaction: {
    cardTitle: "Comprovante e anotações",
    subtitle: "Pra guardar comprovante ou um lembrete. Fica salvo aqui, ligado a este lançamento.",
    notePlaceholder: "Ex: pagamento da parcela 3 de 12.",
  },
  income: {
    cardTitle: "Comprovante e anotações",
    subtitle: "Pra guardar comprovante ou um lembrete. Fica salvo aqui, ligado a esta renda.",
    notePlaceholder: "Ex: freela, valor varia todo mês.",
  },
  goal: {
    cardTitle: "Anotações desta meta",
    subtitle: "Pra guardar um documento ou um lembrete. Fica salvo aqui, ligado a esta meta.",
    notePlaceholder: "Ex: meta da viagem em dezembro.",
  },
  account: {
    cardTitle: "Documentos e anotações",
    subtitle: "Pra guardar documento ou um lembrete. Fica salvo aqui, ligado a esta conta.",
    notePlaceholder: "Ex: conta salário, agência 0001.",
  },
};

export const FILES_COPY = {
  emptyList: "Nenhum arquivo guardado ainda.",
  attachButton: "Anexar arquivo",
  fileHint: "PDF ou imagem, até 10 MB cada.",
  dropzone: "Arraste um arquivo ou clique pra escolher",
  dropzoneHint: "PDF, JPG, PNG ou WEBP. Até 10 MB.",
  download: "Baixar",
  remove: "Apagar",
  saved: "Salvo",
  editing: "Editando",
  deleteTitle: "Apagar este arquivo?",
  deleteBody: "Ele some pra sempre. Não dá pra recuperar.",
  deleteConfirm: "Apagar",
  deleteCancel: "Cancelar",
  errorTooLarge: "Esse arquivo tem mais de 10 MB. Tente um menor ou comprima antes.",
  errorType: "Esse tipo de arquivo não dá pra guardar aqui. Use PDF ou imagem.",
  errorQuota: "Esse arquivo passa do seu espaço. Apague algum antigo e tente de novo.",
  nearLimit: "Você está quase no limite de espaço. Apague arquivos antigos pra liberar.",
  paywallEyebrow: "Disponível no Pro",
  paywallTitle: "Guarde o contrato e o comprovante aqui",
  paywallBody:
    "No Pro você anexa o PDF do contrato, o comprovante do pagamento ou a foto do boleto. Fica tudo ligado a esta dívida, pra consultar quando precisar.",
  paywallButton: "Conhecer o Pro",
};

export function usagePhrase(totalBytes: number): string {
  const mb = totalBytes / (1024 * 1024);
  const shown = mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10;
  return `Você usou ${shown} MB do seu espaço.`;
}
