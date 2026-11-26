# Dinheiro em Dia

App de finanças pessoais em **React Native (Expo SDK 58 + Expo Router + TypeScript)**, baseado no layout V3 (verde-floresta, Inter, 5 abas + botão "+").
O app começa **vazio**: lançamentos, contas, cartões, metas e limites são todos cadastrados pelo usuário e ficam salvos só no aparelho.

## Como rodar

```bash
npm install
npx expo start        # abra no Expo Go (Android/iOS), ou pressione a / i / w
npm run web           # direto no navegador
npm run typecheck     # tsc --noEmit
npm test              # testes unitários (vitest)
npm run doctor        # confere se as versões batem com o Expo SDK 58
```

Requisitos: Node 20+ e o app **Expo Go** (ou um emulador) — ou só um navegador, com `npm run web`.

> Na web: biometria não existe, o CSV é baixado direto e o PDF abre a janela de impressão ("Salvar como PDF").

## Telas

| Rota | Tela |
|---|---|
| `src/app/boas-vindas.tsx` | **Boas-vindas** — só na primeira abertura |
| `src/app/(tabs)/index.tsx` | **Início** — saldo, orçamento, "pode gastar por dia", vencimentos, recentes, sino de alertas; guia de primeiros passos quando vazio |
| `src/app/(tabs)/estatisticas.tsx` | **Estatísticas** — total vs. mês anterior, rosca por categoria, fixos × variáveis, forma de pagamento |
| `src/app/(tabs)/planejar.tsx` | **Planejar** — orçamento, limites por categoria (slider), parcelas futuras, recorrentes, metas (criar/contribuir/excluir) |
| `src/app/(tabs)/extrato.tsx` | **Extrato** — busca, filtros (Fixos/Variáveis/Parcelados/Recorrentes/À Vista/Forma de pagamento), subtotal por dia, swipe |
| `src/app/(tabs)/ajustes.tsx` | **Ajustes** — contas e cartões, categorias (criar/editar/excluir), exportar CSV/PDF, preferências, biometria, apagar dados |
| `src/app/registro.tsx` | **Novo/Editar lançamento** (modal; `?id=&ym=`), com compra parcelada e "Repetir todo mês" |

## Estrutura

```
src/
  app/            rotas (Expo Router): _layout, boas-vindas, (tabs)/*, registro
  components/     TabBar, BalanceCard, DueList, GoalCard, AlertsButton, RecordRow/Item, SwipeableRow, BiometricGate
    manage/       CategorySheet, AccountSheet (cadastros)
    ui/           AppText, Screen, Fields, DateField(.web), Dialog, Snackbar, primitives
    charts/       DonutChart (SVG), LimitSlider, ProjectionChart
  lib/            money, dates, finance (regras), labels, export (CSV/HTML), share(.web) (salvar/compartilhar), clock, iconOptions
  store/          useFinanceStore (zustand + persist em AsyncStorage)
  hooks/          useMonthData, useRecordActions
  data/defaults.ts categorias padrão (sem limites) e preferências iniciais
  theme/tokens.ts cores, fontes, raios, sombras, cores de gráfico
  types/          modelos
```

Arquivos `*.web.tsx` / `*.web.ts` são escolhidos automaticamente pelo Metro na web.

## Convenções importantes

- **Dinheiro sempre em centavos (inteiros).** Formatação manual pt-BR em `lib/money.ts` (não depende de `Intl`).
- **Compra parcelada = um único registro.** `valorTotal` é o total e `parcelaAtual` é a parcela do mês de `data`; as demais são *derivadas* em `lib/finance.ts` (`occurrenceIn`).
- **Recorrente = um único registro** (`recorrente: true`) que aparece todo mês a partir de `data`, até `recorrenteAte` (inclusive) se houver. Excluir uma ocorrência de um mês posterior pergunta: "a partir deste mês" (encerra) ou "todos os meses". Editar altera todos os meses.
- **Vencimento** mantém a distância em meses até `data` (compra em 28/11 com vencimento 03/12 → parcela de dezembro vence 03/01).
- **Orçamento do mês = soma dos limites das categorias de despesa.** Limite 0 = sem limite (não conta no orçamento). Status: sem limite, ok, atenção (≥ 80%), estourou (> 100%). Sem orçamento, "pode gastar por dia" não aparece.
- **Categorias** com lançamentos não podem ser excluídas (renomeie ou mova os lançamentos); sempre resta ao menos uma de despesa e uma de receita.
- **Cores:** âmbar = parcelas, vermelho = despesa, verde = receita; categorias padrão têm cor fixa nos gráficos e as criadas pelo usuário recebem a paleta de reserva por ordem de criação. Sempre há legenda com valores.
- **Diálogos:** `useDialog()` usa o `Alert` nativo no iOS/Android e um diálogo próprio na web.
- **Data:** `lib/clock.ts` usa a data real; troque `FIXED_TODAY` para depurar com uma data fixa.
- A store é persistida com a chave `dinheiro-em-dia/v1` (versão 3). Ao mudar o formato dos dados, aumente `version` e trate no `migrate`. A v3 remove os dados fictícios que versões antigas traziam.
- **Testes:** `src/**/__tests__`. O cenário do layout (nov/2026) existe só como *fixture* de teste (`src/lib/__tests__/fixtures.ts`), não no app.

## Próximos passos sugeridos

1. Notificações locais (`expo-notifications`) para vencimentos/orçamento — hoje os alertas aparecem no sino da tela inicial.
2. Vincular lançamentos a contas/cartões (saldo automático e fatura do cartão) — hoje o saldo das contas é informativo.
3. Backup/importação (exportar e restaurar todos os dados em JSON) e, depois, sincronização.
4. Modo escuro (os tokens já estão centralizados em `theme/tokens.ts`).
