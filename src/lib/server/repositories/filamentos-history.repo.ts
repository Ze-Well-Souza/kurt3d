import type { Filamento, FilamentoHistory } from "../../domain/types";
import { nowIso } from "../db.server";
import { createCrudRepo } from "./crud-repo";
import { filamentosRepo } from "./filamentos.repo";
import { fromFilamentoHistoryRow, toFilamentoHistoryRow } from "./mappers";

const baseRepo = createCrudRepo({
  table: "filamentos_history",
  fromRow: fromFilamentoHistoryRow,
  toRow: toFilamentoHistoryRow,
  order: [{ column: "arquivado_at", ascending: false }],
});

export async function filamentosHistoryRepo() {
  const repo = await baseRepo();

  return {
    ...repo,

    /**
     * Move um rolo do estoque ativo para o histórico.
     *
     * A ordem importa e é deliberada: grava no histórico ANTES de remover do
     * ativo. Não há transação entre as duas tabelas via PostgREST, então se a
     * segunda operação falhar o rolo aparece duplicado (visível e corrigível)
     * em vez de desaparecer das duas tabelas (perda de dado irrecuperável).
     */
    async archive(filamento: Filamento): Promise<FilamentoHistory> {
      const historyRow: FilamentoHistory = { ...filamento, arquivadoAt: nowIso() };
      await repo.insert(historyRow);

      const activeRepo = await filamentosRepo();
      await activeRepo.remove(filamento.id);

      return historyRow;
    },
  };
}
