import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BetSlipSelection {
  oddId: string;
  matchId: string;
  marketId: string;
  matchLabel: string;
  marketLabel: string;
  selectionLabel: string;
  oddValue: number;
}

interface BetSlipState {
  selections: BetSlipSelection[];
  /**
   * Uma "aposta" no cupom é, na prática, uma partida: se o usuário escolher
   * só uma seleção daquela partida, é uma aposta simples; se escolher duas ou
   * mais (Bet Builder / "criar aposta"), elas se combinam em uma única
   * aposta múltipla com odd combinada. Por isso o valor em Coins é definido
   * por partida (`matchId`), não por seleção — ver `bet-slip.tsx`.
   */
  stakes: Record<string, number>;
  toggleSelection: (selection: BetSlipSelection) => void;
  removeSelection: (oddId: string) => void;
  setStake: (matchId: string, stake: number) => void;
  clear: () => void;
}

export const DEFAULT_STAKE = 50;

export const useBetSlipStore = create<BetSlipState>()(
  persist(
    (set) => ({
      selections: [],
      stakes: {},
      toggleSelection: (selection) =>
        set((state) => {
          const alreadySelected = state.selections.some((s) => s.oddId === selection.oddId);
          if (alreadySelected) {
            return { selections: state.selections.filter((s) => s.oddId !== selection.oddId) };
          }

          // Só permite uma seleção ativa por mercado (ex.: não dá pra apostar
          // em "Casa" e "Fora" do mesmo mercado ao mesmo tempo).
          const withoutSameMarket = state.selections.filter(
            (s) => s.marketId !== selection.marketId
          );

          return { selections: [...withoutSameMarket, selection] };
        }),
      removeSelection: (oddId) =>
        set((state) => ({
          selections: state.selections.filter((s) => s.oddId !== oddId),
        })),
      setStake: (matchId, stake) =>
        set((state) => ({ stakes: { ...state.stakes, [matchId]: stake } })),
      clear: () => set({ selections: [], stakes: {} }),
    }),
    // Nome novo (v2) porque o formato mudou: seleção não guarda mais `stake`
    // próprio, agora é por partida (`stakes`). Evita crashar com dados antigos
    // já salvos no localStorage de quem estava com o cupom aberto.
        { name: "demoscore-bet-slip-v2" }
  )
);
