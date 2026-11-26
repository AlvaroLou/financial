# Publicação na Google Play

Passo a passo para publicar o **Dinheiro em Dia** (`com.dinheiroemdia.app`), com os textos da loja e as respostas dos formulários da Play Console.

| Item | Valor |
|---|---|
| ID do app (definitivo) | `com.dinheiroemdia.app` |
| Versão inicial | `1.0.0` (versionCode `1`) |
| targetSdk / minSdk | 36 / 24 |
| Formato | Android App Bundle (`.aab`) |
| Política de privacidade | https://alvarolou.github.io/financial/privacidade.html (`docs/privacidade.html`) |
| Ícone da loja | `store/icon-512.png` (512×512) |
| Gráfico de destaque | `store/feature-graphic.png` (1024×500) |

---

## 1. Antes de tudo

1. **Conta de desenvolvedor**: [play.google.com/console](https://play.google.com/console), taxa única de US$ 25 e verificação de identidade.
2. **Teste fechado obrigatório**: contas **pessoais** criadas depois de 13/11/2023 só liberam a produção depois de um teste fechado com **pelo menos 12 testadores** que continuem inscritos por **14 dias seguidos**. Comece a juntar testadores (amigos e família com Android) desde já. Contas de organização (com D-U-N-S) não têm essa exigência.
3. **Política de privacidade no ar**: faça o commit e o push da pasta `docs/` no `main` e ative o GitHub Pages em **Settings › Pages › Deploy from a branch › `main` / `/docs`**. O repositório precisa ser público, a menos que a conta seja Pro. Confira se https://alvarolou.github.io/financial/privacidade.html abre. O app também tem um link para essa página (Ajustes › Privacidade › Política de privacidade).

## 2. Chave de upload (uma vez só)

A Play usa o **Play App Signing**: o Google guarda a chave que assina o app instalado nos celulares, e você assina cada envio com a sua **chave de upload**. Se perder a chave de upload, dá para pedir a troca no Play Console, mas isso leva alguns dias. Faça backup.

No PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.android-keys"
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v `
  -storetype PKCS12 -keyalg RSA -keysize 2048 -validity 10000 `
  -alias upload `
  -keystore "$env:USERPROFILE\.android-keys\dinheiro-em-dia-upload.jks"
```

No Git Bash:

```bash
mkdir -p ~/.android-keys
winpty "$JAVA_HOME/bin/keytool" -genkeypair -v \
  -storetype PKCS12 -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload \
  -keystore ~/.android-keys/dinheiro-em-dia-upload.jks
```

(O `winpty` faz o pedido de senha funcionar no terminal do Git Bash. Se ele não existir, rode o comando do PowerShell.)

O keytool pede uma senha (no formato PKCS12, a do arquivo e a da chave são a **mesma**) e os dados do certificado (nome, cidade…), que não aparecem na loja.

Depois, crie ou edite `%USERPROFILE%\.gradle\gradle.properties`, fora do repositório, com barras normais no caminho:

```properties
DINHEIRO_UPLOAD_STORE_FILE=C:/Users/alvar/.android-keys/dinheiro-em-dia-upload.jks
DINHEIRO_UPLOAD_STORE_PASSWORD=sua-senha
DINHEIRO_UPLOAD_KEY_ALIAS=upload
DINHEIRO_UPLOAD_KEY_PASSWORD=sua-senha
```

**Backup**: guarde o `.jks` e a senha em um gerenciador de senhas ou em um drive pessoal. Nunca coloque no git (o `.gitignore` já ignora `*.jks`).

O plugin `plugins/withReleaseSigning.js` lê essas propriedades. Sem elas, o `bundleRelease` para com uma mensagem explicando o que falta, e o `assembleRelease` (APK para testar no celular) continua usando a chave de debug.

## 3. Gerar o `.aab`

```powershell
npx expo prebuild --platform android --clean   # só depois de mudar app.json, plugins/ ou dependências nativas
cd android
.\gradlew bundleRelease      # PowerShell / cmd
./gradlew bundleRelease      # Git Bash (no bash, "\" é escape: use "/")
```

Saída: `android/app/build/outputs/bundle/release/app-release.aab`.

Para conferir se ele foi assinado com a chave de upload (e não com a de debug):

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -printcert -jarfile android\app\build\outputs\bundle\release\app-release.aab
```

O "Proprietário" deve ser o seu nome, e não `CN=Android Debug`.

**A cada nova versão**, antes do build: aumente `expo.android.versionCode` em 1 no `app.json` (a Play recusa um número repetido) e ajuste `expo.version` (ex.: `1.0.1`). Depois rode o `prebuild --clean`.

## 4. Criar o app no Play Console

**Criar app**: nome `Dinheiro em Dia` · idioma padrão **Português (Brasil)** · **App** · **Gratuito** · aceite as declarações.

### Conteúdo do app (Política › Conteúdo do app)

| Seção | Resposta |
|---|---|
| Política de privacidade | `https://alvarolou.github.io/financial/privacidade.html` |
| Anúncios | Não, o app não tem anúncios |
| Acesso ao app | Todas as funcionalidades ficam disponíveis sem acesso especial (não há login; a biometria é opcional e vem desligada) |
| Classificação do conteúdo | Questionário IARC, categoria "Utilitário, produtividade, comunicação ou outro". Responda "Não" a tudo (violência, sexo, linguagem, drogas, apostas, interação entre usuários, compartilhamento de localização, compras digitais). Resultado esperado: Livre |
| Público-alvo | **18 anos ou mais**. É um app financeiro, e essa faixa evita as exigências da política de Famílias |
| App de notícias | Não |
| Apps governamentais | Não |
| Recursos financeiros | Declare que o app é só de **controle financeiro pessoal** (orçamento e acompanhamento de investimentos registrados pelo usuário). Ele **não** oferece empréstimos, pagamentos, transferências, conta bancária, corretagem nem custódia ou negociação de cripto |
| Apps de saúde | Não |
| Segurança dos dados | Veja abaixo |

### Segurança dos dados (Data safety)

Na definição do Google, "coletar" é transmitir dados para fora do aparelho. Os dados registrados no app ficam só no celular, e as consultas de cotação mandam apenas identificadores públicos: o código da série do BCB, os tickers da B3 e os IDs de cripto. Nenhum valor, quantidade ou dado pessoal é enviado.

Resposta recomendada:

- **O app coleta ou compartilha algum dos tipos de dados exigidos?** **Não.**
- Isso basta: com "Não", o formulário termina e a ficha da loja mostra "Nenhum dado coletado" e "Nenhum dado compartilhado com terceiros".

Alternativa mais conservadora, se você preferir declarar os tickers como informação financeira: **Sim** › *Informações financeiras › Outras informações financeiras* › **Coletados** (não compartilhados) › processados de forma **efêmera** › **obrigatório** para cotações › finalidade **Funcionalidade do app** › criptografados em trânsito: **Sim** (HTTPS) › exclusão: **Sim** (Ajustes › Apagar todos os dados).

Se um dia entrar analytics, um serviço de crash ou um backup na nuvem, este formulário **e** a política de privacidade precisam ser atualizados antes.

## 5. Ficha da loja (Crescimento › Presença na loja › Ficha principal)

### Português (Brasil), o idioma padrão

**Nome do app** (até 30 caracteres):

```
Dinheiro em Dia
```

**Descrição curta** (até 80 caracteres):

```
Orçamento e investimentos num só app, sem cadastro e com dados só no celular.
```

**Descrição completa** (até 4.000 caracteres):

```
Dinheiro em Dia junta dois apps em um: um orçamento para o dia a dia e uma carteira de investimentos completa. Sem cadastro, sem anúncios e com os seus dados guardados só no seu celular.

ORÇAMENTO
• Lançamentos de ganhos e gastos, com categorias, etiquetas e forma de pagamento
• Compras parceladas e contas recorrentes lançadas uma vez só
• Limite por categoria, com aviso quando o gasto chega perto ou passa do limite
• "Pode gastar por dia": quanto ainda cabe no orçamento até o fim do mês
• Vencimentos do mês e alertas
• Estatísticas: gasto por categoria e por etiqueta, fixos × variáveis, comparação com o mês anterior
• Metas de economia, com progresso automático

INVESTIMENTOS
• Renda fixa calculada na curva: prefixado, % do CDI, CDI + taxa, IPCA + taxa, Selic e poupança, com dias úteis e feriados
• IR regressivo, IOF e isenções de LCI, LCA, CRI, CRA e debêntures incentivadas
• Ações, FIIs, ETFs, BDRs e criptomoedas com cotação automática
• Preço médio, lucro realizado, desdobramento, grupamento e bonificação
• Proventos por mês, por tipo e por ativo, com yield on cost
• Alocação por classe, por renda fixa × variável e por instituição
• Estimativa do IR mensal sobre vendas (com isenções e compensação de prejuízos) e posição em 31/12 para a declaração
• Rebalanceamento da carteira e simulador de aportes
• CDI, Selic e IPCA atualizados direto do Banco Central

RELATÓRIOS
• Relatório mensal ou anual de cada app, em PDF ou CSV, para guardar ou compartilhar

PRIVACIDADE
• Sem cadastro e sem servidor: tudo fica salvo no seu aparelho
• Desbloqueio com biometria (opcional)
• Valores ocultos na tela inicial, com o olho para mostrar quando quiser
• Apagar todos os dados a qualquer momento

DO SEU JEITO
• Modo claro, escuro ou automático, com uma cor de destaque para cada app
• 10 idiomas: português, inglês, espanhol, francês, alemão, italiano, russo, chinês, japonês e coreano

Observação: os cálculos de IR, DARF e renda fixa são estimativas para organização pessoal e não substituem a orientação de um contador ou os informes da sua instituição. As cotações vêm do Banco Central, da brapi.dev e da CoinGecko e podem ter atraso.
```

**Categoria**: Finanças · **E-mail de contato**: obrigatório e público na ficha (pode ser um e-mail só para o app) · **Site**: opcional (pode ser o link do GitHub Pages).

### English (United States), tradução opcional

**Nome:** `Dinheiro em Dia`

**Descrição curta:**

```
Budget and investments in one app. No sign-up, data stays on your phone.
```

**Descrição completa:**

```
Dinheiro em Dia is two apps in one: a day-to-day budget and a full investment portfolio, built for Brazil. No sign-up, no ads, and your data stays on your phone.

BUDGET
• Income and expenses with categories, tags and payment method
• Installment purchases and recurring bills entered only once
• Limits per category, with a heads-up when spending gets close or goes over
• "Daily allowance": how much still fits in the budget until month end
• Upcoming due dates and alerts
• Stats by category and tag, fixed vs. variable, month-over-month comparison
• Savings goals with automatic progress

INVESTMENTS
• Brazilian fixed income on the curve: fixed rate, % of CDI, CDI + spread, IPCA + spread, Selic and savings, with business days and holidays
• Regressive income tax, IOF and exemptions (LCI, LCA, CRI, CRA, incentivized debentures)
• B3 stocks, REITs (FIIs), ETFs, BDRs and crypto with automatic prices
• Average cost, realized gains, splits, reverse splits and bonus shares
• Dividends and income by month, type and asset, with yield on cost
• Allocation by asset class, fixed vs. variable income and institution
• Estimated monthly capital gains tax and year-end positions for the tax return
• Rebalancing and contribution simulator
• CDI, Selic and IPCA straight from the Central Bank of Brazil

REPORTS
• Monthly or yearly reports for each app, as PDF or CSV

PRIVACY
• No account, no server: everything is stored on your device
• Optional biometric unlock
• Hidden balances on the home screens
• Erase all data at any time

YOUR WAY
• Light, dark or automatic theme, with an accent color for each app
• 10 languages

Note: tax and fixed-income figures are estimates for personal organization and do not replace professional advice or your broker's statements. Prices come from the Central Bank of Brazil, brapi.dev and CoinGecko and may be delayed.
```

### Imagens

| Recurso | Arquivo / requisito |
|---|---|
| Ícone do app | `store/icon-512.png` (PNG 512×512, até 1 MB) |
| Gráfico de destaque | `store/feature-graphic.png` (1024×500) |
| Capturas de tela do celular | **De 2 a 8** (recomendado: 4 ou mais), em 9:16, de 1080×1920 para cima. Precisam ser feitas no aparelho ou no emulador |

Sugestão de capturas, todas com **dados de exemplo** (nunca os seus dados reais): Início (Orçamento) · Estatísticas · Carteira · Detalhe de um investimento de renda fixa · Proventos · Exportar · uma tela no modo escuro. No emulador do Android Studio, use o botão de câmera da barra lateral.

## 6. Liberar

1. **Teste interno** (Testar › Teste interno): envie o `.aab`, adicione o seu e-mail e instale pelo link. Isso confirma que o upload, a assinatura e a instalação funcionam. Esse teste não conta para os 14 dias.
2. **Teste fechado** (Testar › Teste fechado): crie uma faixa, envie o mesmo `.aab` (ou um novo, com o versionCode maior) e adicione os 12 ou mais testadores, por lista de e-mails ou Grupo do Google. Eles precisam aceitar o convite pelo link e manter a inscrição por 14 dias seguidos. A primeira análise do Google costuma levar de alguns dias a uma semana.
3. **Pedir acesso à produção** (Painel › Solicitar acesso à produção): responda o questionário sobre o teste fechado.
4. **Produção**: crie a versão, escreva as notas da versão ("Primeira versão.") e prefira o **lançamento gradual** (ex.: 20%), aumentando aos poucos.

## Checklist

- [ ] Conta de desenvolvedor criada e verificada
- [ ] `docs/` publicado no GitHub Pages e link da política abrindo
- [ ] Chave de upload gerada, com backup, e `~/.gradle/gradle.properties` configurado
- [ ] `.aab` gerado e assinado com a chave de upload (`keytool -printcert`)
- [ ] App criado no Play Console (pt-BR, App, Gratuito)
- [ ] Conteúdo do app: privacidade, anúncios, acesso, classificação, público-alvo, recursos financeiros, segurança dos dados
- [ ] Ficha da loja: textos, ícone, gráfico de destaque, 4 ou mais capturas, e-mail de contato
- [ ] Teste interno instalado e funcionando
- [ ] Teste fechado com 12 ou mais testadores por 14 dias
- [ ] Acesso à produção solicitado e liberado
- [ ] Produção com lançamento gradual
