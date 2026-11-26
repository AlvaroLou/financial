# Dinheiro em Dia

App de finanças pessoais em **React Native (Expo SDK 58 + Expo Router + TypeScript)** — **dois apps em um**:

- **Orçamento**: lançamentos, categorias com etiquetas, limites, parcelas, recorrentes, metas, estatísticas.
- **Investimentos**: carteira de renda fixa e variável, cotações e taxas automáticas, proventos, IR, ferramentas.

Cada app tem as próprias abas, a própria cor e as próprias telas. O seletor **Orçamento | Investimentos** fica no topo das telas iniciais (Início e Carteira), e o app reabre no último usado.
O app começa **vazio**: tudo é cadastrado pelo usuário e fica salvo só no aparelho. Os idiomas são 10, com pt-BR como padrão. Há modo claro, escuro e automático, com uma cor de destaque para cada app.

## Como rodar

```bash
npm install
npx expo start        # abra no Expo Go (Android/iOS), ou pressione a / i / w
npm run web           # direto no navegador
npm run typecheck     # tsc --noEmit
npm test              # testes unitários (vitest)
npm run doctor        # confere se as versões batem com o Expo SDK 58
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

Requisitos: Node 20+ e o app **Expo Go** (ou um emulador) — ou só um navegador, com `npm run web`.

> Na web: biometria não existe, o CSV é baixado direto e o PDF abre a janela de impressão ("Salvar como PDF"). As chaves das APIs ficam no AsyncStorage (no celular, no `expo-secure-store`).

### APK de release (Android)

- Requisitos: Android Studio (JDK em `JAVA_HOME`) e o Android SDK (`ANDROID_HOME`).
- O APK sai em `android/app/build/outputs/apk/release/app-release.apk`. Sem a chave de upload configurada, ele é assinado com a chave de debug: serve para instalar no celular, mas não para a Play Store.
- Para um build mais rápido, só para celulares atuais: `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`.
- A pasta `android/` é **gerada** pelo `expo prebuild` e fica fora do git. Ajustes nativos vão em `app.json` ou em `plugins/`, nunca direto em `android/`.
- Windows: o CMake padrão (3.22.1) não aceita caminhos acima de 260 caracteres. Sem ajuste, o build falha com `ninja: error: mkdir(...)` ou `Filename longer than 260 characters`. `plugins/withWindowsCmake.js` fixa o CMake 3.31.6, cujo Ninja aceita caminhos longos. Para funcionar, é preciso:
  - caminhos longos habilitados no Windows (`LongPathsEnabled` = 1);
  - o pacote "CMake 3.31.6" (Android Studio › SDK Manager › SDK Tools). O Gradle tenta baixá-lo se faltar.
- Permissões que o app não usa (`SYSTEM_ALERT_WINDOW` e armazenamento externo) ficam bloqueadas em `android.blockedPermissions`, no `app.json`.
- `react-native-reanimated`, `react-native-worklets` e `react-native-gesture-handler` ficam nas versões do SDK 58 (`npx expo install …`). O app não os usa diretamente, mas o expo-router os puxa como dependências (peers do `react-native-drawer-layout`), então eles entram no build de qualquer jeito.

### Play Store (AAB assinado)

Guia completo, com textos da loja, formulários da Play Console e liberação: **[store/play-store.md](store/play-store.md)**.

- ID do app: `com.dinheiroemdia.app`. É **definitivo**: depois de publicado, não muda mais.
- `plugins/withReleaseSigning.js` assina o release com a chave de upload. A chave e as senhas vêm de `DINHEIRO_UPLOAD_*` em `~/.gradle/gradle.properties`, **fora do repositório**. Sem elas, o `bundleRelease` para com uma mensagem, e o APK continua com a chave de debug.
- Build: `npx expo prebuild --platform android --clean`, depois `cd android` e `.\gradlew bundleRelease` (PowerShell) ou `./gradlew bundleRelease` (Git Bash). O pacote sai em `android/app/build/outputs/bundle/release/app-release.aab`.
- **A cada versão**, aumente `expo.android.versionCode` (+1) e ajuste `expo.version` no `app.json`.
- A política de privacidade fica em `docs/privacidade.html` (GitHub Pages, servindo `main` / `/docs`), com link em Ajustes › Privacidade (`PRIVACY_POLICY_URL` em `components/GeneralSettings.tsx`). Se o app passar a enviar dados para fora do aparelho, atualize essa página e o formulário de Segurança dos dados.
- `store/`: ícone da loja (512×512), gráfico de destaque (1024×500) e o guia.

## Telas

### Orçamento — `src/app/(orcamento)/` (`<ThemeScope app="orcamento">`)

| Rota | Tela |
|---|---|
| `index.tsx` (`/`) | **Início** — seletor de app, saldo do mês (olho temporário), orçamento, "pode gastar por dia", vencimentos, recentes, alertas, botão **+** |
| `estatisticas.tsx` | **Estatísticas** — total vs. mês anterior, rosca por categoria, **por etiqueta**, fixos × variáveis, forma de pagamento |
| `planejar.tsx` | **Planejar** — orçamento, limites por categoria (slider), parcelas futuras, recorrentes, metas |
| `extrato.tsx` | **Extrato** — busca (inclui etiquetas), filtros por grupo, forma de pagamento e categoria (principal ou etiqueta), swipe |
| `ajustes.tsx` | **Ajustes** — contas e cartões, categorias, alertas, Exportar + ajustes gerais |

### Investimentos — `src/app/(investimentos)/` (`<ThemeScope app="investimentos">`)

| Rota | Tela |
|---|---|
| `carteira.tsx` | **Carteira** — seletor de app, patrimônio (olho temporário), alocação (classe / RF×RV / instituição), evolução, maiores posições, vencimentos, metas, botão **+** (nova operação) |
| `ativos.tsx` | **Ativos** — Posições (filtro por classe, ordenação) e Movimentações |
| `proventos.tsx` | **Proventos** — mês/ano/12 meses, barras mensais, por tipo e por ativo, yield on cost, aviso da retenção de 10% sobre dividendos acima de R$ 50 mil/mês |
| `metas.tsx` | **Metas** — as mesmas metas do Orçamento, preenchidas pelos investimentos vinculados |
| `mais.tsx` | **Mais** — ferramentas, Exportar, atualização automática + ajustes gerais |

### Telas por cima (modais e pilha) — `src/app/`

| Rota | Tela |
|---|---|
| `boas-vindas.tsx` | Primeira abertura (com escolha de idioma) |
| `registro.tsx?id=&ym=` | Novo/editar lançamento: categoria principal + "Também em" (etiquetas), parcelado, "Repetir todo mês" |
| `categoria.tsx?id=&tipo=` · `conta.tsx?id=&tipo=conta\|cartao` · `meta.tsx?id=` | Cadastros (formulários em tela cheia) |
| `exportar.tsx?app=orcamento\|investimentos` | Relatório mensal ou anual, CSV ou PDF |
| `aparencia.tsx` · `idioma.tsx` | Claro/escuro/automático e cor de cada app · idioma |
| `invest/ativo/[id].tsx` | Detalhe do investimento: valor, líquido estimado, vs. CDI, preço médio, cotação/valor manual, operações |
| `invest/ativo-form.tsx?id=` | Novo/editar investimento (campos por tipo; busca de ticker e de cripto) |
| `invest/operacao.tsx?assetId=&tipo=&id=` | Compra, venda, aplicação, resgate, provento, desdobramento, grupamento, bonificação, taxa |
| `invest/taxas.tsx` | CDI/Selic/IPCA (Banco Central ou manual) e chaves das APIs, com teste de conexão |
| `invest/rebalanceamento.tsx` · `simulador.tsx` · `imposto-de-renda.tsx` · `instituicoes.tsx` | Ferramentas |

As rotas ficam protegidas em `src/app/_layout.tsx` (`Stack.Protected`): sem onboarding, só `boas-vindas`.

## Estrutura

```
src/
  app/              rotas (acima)
  components/       TabBar (os dois apps), ModeSwitch, BalanceCard, GoalsSection/GoalCard, GeneralSettings,
                    ColorPicker, DueList, RecordRow/Item, SwipeableRow, AlertsButton, BiometricGate
    ui/             AppText, Screen, Fields (BottomSheet com gesto, SelectField, MoneyInput…), FormScreen,
                    Fab, StackHeader, DateField(.web), Dialog, Snackbar, Icon, primitives
    charts/         DonutChart, LimitSlider, ProjectionChart (SVG)
  hooks/            useMonthData, useRecordActions, useHiddenValues, useSyncAppMode
  lib/              money, dates (por idioma), finance (regras do orçamento), reports (relatórios do orçamento),
                    export (CSV/HTML), share(.web), clock, labels, iconOptions
  store/            useFinanceStore — orçamento + ajustes gerais (zustand + persist)
  invest/           tudo dos Investimentos
    types.ts, catalog.ts (tipos de ativo e classes), store.ts (carteira e mercado), hooks.ts, labels.ts,
    useMarketRefresh.ts, usePortfolioStatus.ts
    lib/            calendar (dias úteis/feriados), fixedIncome, positions, portfolio, goals, tax, rebalance,
                    simulator, reports, exportInvest
    services/       http, bcb, brapi, coingecko, secrets(.web)
    components/     PortfolioHero, AllocationCard, PositionRow, OperationRow, EvolutionChart, IncomeBars
  i18n/             index (i18next), languages, labels (rótulos traduzidos de categorias, pagamentos…)
  locales/          pt-BR, en, es, fr, de, it, ru, zh-CN, ja, ko (.json)
  theme/            palette (cores derivadas do acento), ThemeProvider (useTheme), tokens (gráficos, fontes,
                    medidas), typography (fonte do sistema em chinês/japonês/coreano)
  data/defaults.ts  categorias padrão (inclui "Cartão", fixa) e preferências iniciais
  types/            modelos do orçamento
```

Arquivos `*.web.tsx` / `*.web.ts` são escolhidos automaticamente pelo Metro na web.

## Tema e cores

- `useTheme()` devolve `colors` do app em que a tela está (`<ThemeScope>`); telas modais usam o app aberto por último. Estilos: `useThemedStyles(makeStyles)`.
- `buildColors(acento, base)` em `theme/palette.ts` deriva todas as cores de **uma** cor de destaque, garantindo contraste (WCAG): texto sobre o acento, herói (cartão de saldo/patrimônio), tons de fundo. Padrões: verde `#21644C` (Orçamento) e azul `#1F5FAD` (Investimentos).
- Gráficos: paleta categórica fixa de 8 cores (claro e escuro, validada para daltonismo) em `theme/tokens.ts`. **A cor segue a categoria/classe**, nunca a posição no ranking. A partir da 9ª, as fatias viram "Outros" (cinza).
- Não use cores fixas nos componentes: tudo vem do tema.

## Idiomas

- `i18next` + `react-i18next`. Todo texto visível usa `t('chave')`. O pt-BR é a referência e o fallback.
- O idioma é o escolhido em Ajustes, ou, no "Automático", o do aparelho. Valores continuam em **reais**; muda só o formato (`R$ 1.234,56`, `R$1,234.56`, `1.234,56 R$`…) e as datas. `lib/money.ts` e `lib/dates.ts` acompanham o idioma.
- Plurais no padrão do i18next (`_one`, `_few`, `_many`, `_other`, `_zero`). O teste `src/i18n/__tests__/parity.test.ts` exige, em todos os idiomas, as mesmas chaves, as formas de plural de cada idioma e os mesmos `{{placeholders}}` do pt-BR.
- **Nova chave:** adicione no `pt-BR.json` e nos outros 9 arquivos; o teste aponta o que faltar.
- Chinês, japonês e coreano usam a fonte do sistema (a Inter não tem esses glifos), com o mesmo peso. A troca é feita no `AppText`.
- Termos brasileiros (CDI, Selic, IPCA, DARF, FII, LCI/LCA, FGC) aparecem com uma explicação curta nos outros idiomas.

## Investimentos — cálculos e dados

- **Renda fixa "na curva"**: pré, % do CDI, CDI + taxa, IPCA + taxa, Selic e poupança, com dias úteis (base 252) e feriados nacionais. Resgates abatem os lotes mais antigos primeiro (FIFO). Também calcula IR regressivo, IOF e isenções (LCI/LCA/CRI/CRA/debênture incentivada). Se o valor do banco for diferente, "Informar valor atual" recalibra a curva.
- **Renda variável**: preço médio com custos, vendas com lucro realizado, desdobramento/grupamento/bonificação e proventos por tipo.
- **Metas**: progresso = valor guardado à parte + valor atual dos investimentos vinculados (`metaId`). Concluem sozinhas.
- **IR** (`invest/lib/tax.ts`, regras de 2026): ações isentas até R$ 20 mil/mês de vendas; ETF/BDR 15%; FII 20%; cripto isenta até R$ 35 mil/mês. Inclui compensação de prejuízos, DARF 6015 (B3) e 4600 (cripto), DARF mínimo de R$ 10 acumulado e posição em 31/12 pelo custo. São **estimativas** (sem day trade), com aviso na tela.
- **Evolução**: a Carteira grava um snapshot mensal do patrimônio. Nos meses sem snapshot, o relatório estima o valor (renda fixa pelos índices, variável pelo custo) e marca com `*`.

### Fontes de dados (`src/invest/services/`)

| Fonte | Uso | Conta/chave |
|---|---|---|
| Banco Central (SGS) | CDI (12 diária, 4389 anual), Selic (11, 432), IPCA (433 mensal, 13522 em 12 meses) | não precisa |
| brapi.dev | ações, FIIs, ETFs e BDRs da B3 | **token gratuito** (sem token, só PETR4, VALE3, MGLU3 e ITUB4) |
| CoinGecko | cripto em reais, com variação de 24 h | opcional (chave Demo aumenta o limite) |

- Atualiza ao abrir a Carteira (cotações a cada 15 min, taxas a cada 12 h) e ao puxar para atualizar. Sem internet, usa o último valor salvo ou o digitado (cotação/valor manual).
- Chaves: **Investimentos › Mais › Taxas e cotações**, com "Testar e salvar".
- BCB: use sempre consultas **por período** (`dataInicial`/`dataFinal`). O endpoint `/ultimos/N` responde `304` sem corpo no navegador e quebra a atualização na web.

## Exportação

`Exportar` em cada app (Ajustes ou Mais): **Mês | Ano**, **PDF | CSV**, no idioma escolhido.

- **Orçamento**: ganhos, gastos, saldo, por categoria, por etiqueta, por forma de pagamento, lançamentos. No anual: mês a mês com saldo acumulado, médias, taxa de poupança, maiores gastos e comparação com o ano anterior.
- **Investimentos**: patrimônio inicial e final, aportes, resgates, proventos por tipo, lucro realizado, valorização, rentabilidade aproximada (Dietz), IR estimado por mês, posição pelo custo e operações.
- CSV com BOM, separador `;` nos idiomas com vírgula decimal (`,` nos demais) e valores no formato do idioma. Código puro em `lib/reports.ts`, `invest/lib/reports.ts`, `lib/export.ts` e `invest/lib/exportInvest.ts`.

## Convenções importantes

- **Dinheiro sempre em centavos (inteiros)**; quantidades de ativos são decimais. Formatação manual em `lib/money.ts` (não depende de `Intl`).
- **Compra parcelada = um único registro.** `valorTotal` é o total e `parcelaAtual` é a parcela do mês de `data`; as demais são *derivadas* em `lib/finance.ts` (`occurrenceIn`).
- **Recorrente = um único registro** (`recorrente: true`) que aparece todo mês a partir de `data`, até `recorrenteAte` (inclusive) se houver. Excluir uma ocorrência de um mês posterior pergunta: "a partir deste mês" (encerra) ou "todos os meses". Editar altera todos os meses.
- **Vencimento** mantém a distância em meses até `data` (compra em 28/11 com vencimento 03/12 → parcela de dezembro vence 03/01).
- **Categoria principal + etiquetas.** `categoriaId` é a que conta no orçamento e nos gráficos. `etiquetas` são outras categorias do mesmo tipo e servem para filtros, "Por etiqueta" e relatórios, sem contar duas vezes. Ao escolher Crédito, a etiqueta **Cartão** entra sozinha (pode tirar).
- **"Cartão" é fixa** (`fixa: true`): não pode ser excluída nem renomeada; ícone, natureza e limite podem mudar.
- **Orçamento do mês = soma dos limites das categorias de despesa.** Limite 0 = sem limite. Status: sem limite, ok, atenção (≥ 80%), estourou (> 100%).
- **Categorias** em uso como principal não podem ser excluídas. Sempre resta ao menos uma de despesa e uma de receita. Ao excluir, ela sai das etiquetas.
- **Ocultar valores** (Ajustes gerais) é o padrão de Início e Carteira. O olho mostra ou esconde só até sair da tela ou mandar o app para o segundo plano, e nunca muda a opção (`hooks/useHiddenValues.ts`).
- **Diálogos:** `useDialog()` usa o `Alert` nativo no iOS/Android e um diálogo próprio na web. Listas curtas usam `BottomSheet` (arrastar para baixo fecha, para cima expande). Formulários longos são telas com `FormScreen`.
- **Data:** `lib/clock.ts` usa a data real; troque `FIXED_TODAY` para depurar com uma data fixa.
- **Persistência** (AsyncStorage). Ao mudar o formato, aumente `version` e trate no `migrate`:
  - `dinheiro-em-dia/v1`: orçamento e ajustes gerais (v4: acrescenta a categoria Cartão, as etiquetas, o tema, o idioma e o modo do app).
  - `dinheiro-em-dia/investimentos/v1`: carteira.
  - `dinheiro-em-dia/mercado/v1`: cotações e taxas.

  "Apagar todos os dados" limpa os três e as chaves das APIs, mas mantém as preferências gerais.

## Testes

`npm test` roda as regras puras em `src/**/__tests__` (vitest, Node):

- orçamento: finanças, etiquetas, relatórios, store e migrações;
- dinheiro e datas por idioma;
- paleta e contraste;
- paridade das traduções;
- investimentos: feriados, renda fixa, IR/IOF, preço médio, IR mensal, rebalanceamento, simulador, relatórios e parsers das APIs.

Componentes não rodam no vitest. O cenário do layout (nov/2026) existe só como *fixture* (`src/lib/__tests__/fixtures.ts`).

## Limitações conhecidas

- Renda fixa é estimada pela curva (sem marcação a mercado de Tesouro/debêntures). IR/DARF são estimativas.
- Fundos, previdência e "outros" não têm cotação automática: informe o valor atual de vez em quando.
- Idiomas da direita para a esquerda (árabe, hebraico) ficaram de fora: exigiriam layout espelhado.

## Próximos passos sugeridos

1. Notificações locais (`expo-notifications`) para vencimentos, orçamento e vencimentos de renda fixa.
2. Vincular lançamentos a contas/cartões (saldo automático e fatura do cartão).
3. Backup/importação (todos os dados em JSON) e, depois, sincronização.
4. Importar notas de corretagem / extrato da B3 (Área do Investidor) para preencher operações.
5. Come-cotas dos fundos e day trade no cálculo de IR.
