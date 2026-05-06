# CLAUDE.md — NEOiD PTZ Deck

Guia de contexto para o assistente de IA. Leia antes de qualquer mudança no código.

---

## 1. Contexto do projeto

**NEOiD PTZ Deck** é um plugin para o Elgato Stream Deck que controla câmeras PTZ profissionais (pan, tilt, zoom) via rede local. Suporta dois fabricantes: **NEOiD** (via CGI HTTP com fallback VISCA/HTTP) e **Telycam** (via JSON API com fallback VISCA/UDP).

- Runtime: Node.js 20
- SDK: `@elgato/streamdeck` v2.0.0
- Linguagem: TypeScript
- Build: Rollup + Terser → `com.neoid.ptzneoid.sdPlugin/bin/plugin.js`
- Ponto de entrada: `src/plugin.ts`

---

## 2. Lógica principal — como os botões funcionam juntos

### O Global Settings é o barramento de estado

Todos os botões compartilham estado exclusivamente via **Global Settings** do Stream Deck SDK. Nenhum botão conhece o IP da câmera por conta própria — ele sempre lê dos globals. As chaves principais são:

| Chave global | Tipo | Descrição |
|---|---|---|
| `cameraIP` | string \| false | IP da câmera ativa |
| `camera` | string | Nome/título da câmera |
| `isTelycam` | boolean | Tipo de câmera |
| `keyTelycam` | number | Session key da Telycam |
| `panMode` | SpeedType | Velocidade de pan/tilt |
| `zoomMode` | SpeedType | Velocidade de zoom |
| `focusMode` | SpeedType | Velocidade de foco |
| `isBacklight` | boolean | Estado do backlight |
| `isOsd` | boolean | Estado do menu OSD |
| `trackingMode_${IP}` | string | Modo de tracking (NEOiD) |
| `trackingModeTelycam_${IP}` | string | Modo de tracking (Telycam) |
| `trackingActive_${IP}` | boolean | Tracking ligado/desligado |
| `presetImage${N}${IP}` | string (base64) | Snapshot do preset N |

**As chaves com `_${IP}` são intencionais** — permitem múltiplas câmeras coexistirem no mesmo perfil sem conflito de estado.

### PTZRegister é o maestro

`PTZRegister` (`src/actions/ptz-register.ts`) é a única ação que escreve as chaves principais nos globals. Quando pressionado:

1. Valida a câmera na rede (ou faz login se Telycam)
2. Escreve `cameraIP`, `isTelycam`, `keyTelycam`, `camera` nos globals
3. Itera os botões de todas as outras ações e chama `getSettings()` em cada um

### `getSettings()` como gatilho de refresh — não quebrar isso

Chamar `actionInstance.getSettings()` no SDK dispara o evento `onDidReceiveSettings` na instância, fazendo o botão reler os globals e atualizar seu visual. **Este é o único mecanismo de notificação cross-button do sistema.** O código que parece "só buscar settings" está na verdade forçando um re-render em cascata.

```ts
// PTZRegister.onKeyDown — após atualizar globals:
this.ptzControls.actions.forEach(actionInstance => {
  actionInstance.getSettings() // dispara onDidReceiveSettings → re-render
});
```

### Injeção de dependências no construtor do PTZRegister

`PTZRegister` recebe instâncias das outras classes via construtor para acessar `.actions` (iterable de botões ativos no deck do usuário). O SDK não oferece registro global por tipo — a única forma de iterar botões de uma ação é via instância da classe.

Em `plugin.ts`, isso cria duas instâncias de cada classe:
- Uma registrada no SDK via `registerAction(new PTZControls())`
- Uma injetada no `PTZRegister` para iterar `.actions`

O `.actions` do SDK é compartilhado por UUID, então as duas instâncias enxergam os mesmos botões ativos. **Não "simplificar" isso sem entender o impacto.**

### Stop-on-release para movimentos contínuos

`PTZControls`, `PTZZoom` e `PTZFocus` seguem o padrão:
- `onKeyDown` → envia comando de movimento
- `onKeyUp` → envia comando de parada

A câmera se move enquanto o botão está segurado. **Remover ou inverter essa ordem torna o movimento incontrolável.**

### Long press com setTimeout

`PTZTracking` (900ms) e `PTZPreset` (1100ms) usam `setTimeout` no `onKeyDown` para distinguir clique curto de pressão longa:
- Timer dispara → ação longa (toggle tracking / salvar preset)
- `onKeyUp` antes do timer → cancela timer → ação curta (mudar modo / chamar preset)

**O `longPress` flag é necessário** para que `onKeyUp` não execute a ação curta quando o timer já disparou.

### Dead zone de 200ms para dials

`FocusDial` e `ZoomDial` não têm evento "parei de girar". A cada tick de rotação, o timer anterior é cancelado e um novo de 200ms é criado. Se nenhum tick chegar em 200ms, o timer envia o comando de parada. **Este timer é o que impede a câmera de ficar travada em movimento.**

---

## 3. Regras obrigatórias

### NÃO quebrar a lógica existente

- Nunca remover o padrão `onKeyDown` → move / `onKeyUp` → para de mover
- Nunca remover o mecanismo de `getSettings()` como refresh
- Nunca remover os timers de long press ou dead zone dos dials
- Nunca alterar as chaves dos globals sem mapear todos os lugares que as leem
- Nunca unificar as chaves `trackingMode_${IP}` e `trackingModeTelycam_${IP}` — são diferentes porque NEOiD e Telycam têm modos distintos

### NÃO simplificar sem entender impacto

- `SendTrackingActive` envia 3 requisições para NEOiD propositalmente — diferentes firmwares respondem a APIs diferentes. Não reduzir para uma.
- `toggleBacklight` para NEOiD envia 2 chamadas CGI com pares de valores diferentes (`2/3` e `0/1`) propositalmente — cobertura de variantes de firmware. Não reduzir para uma.
- `panTiltSpeed.slowest` é `'06'` (string) na NEOiD propositalmente — o zero à esquerda é necessário na formatação da URL CGI e nos bytes VISCA. Na Telycam é `6` (number) porque vai em JSON. Não "corrigir" essa diferença.
- Telycam usa VISCA UDP para movimentos diagonais porque a API JSON não suporta diagonais — não migrar para HTTP.

### SEMPRE explicar antes de refatorar

Antes de qualquer mudança estrutural, descreva:
1. O que exatamente vai mudar
2. Qual comportamento pode ser afetado
3. Como testar que o comportamento foi preservado

---

## 4. Diretrizes de refatoração

### Repetição aceitável de reduzir

O padrão de leitura de globals + guard de `cameraIP` aparece em todos os handlers. Pode ser extraído em um helper desde que:
- O helper retorne os dados necessários e não execute side effects
- O comportamento de fallback (setTitle com nome da câmera ou "No camera") seja preservado

### Repetição que NÃO deve ser removida cegamente

- Os blocos `if(isTelycam) { ... } else { ... }` em cada ação são distintos para cada câmera. O comportamento bifurca com frequência — abstrair só faz sentido quando os dois ramos fazem exatamente a mesma operação semântica.
- Os blocos de `onWillAppear` e `onDidReceiveSettings` geralmente contêm a mesma lógica visual. Podem ser extraídos em um método privado `updateVisual()` dentro da própria classe, mas **não compartilhar entre classes diferentes**.

### Organização interna das classes

Ordem sugerida dentro de cada action:
1. Propriedades e tipos privados
2. Métodos privados auxiliares (`updateVisual`, `getGlobals`, etc.)
3. `onWillAppear`
4. `onDidReceiveSettings`
5. `onKeyDown` / `onDialRotate`
6. `onKeyUp` / `onDialDown`

---

## 5. Como responder

### Antes de qualquer mudança

1. Identificar qual(is) arquivo(s) serão afetados
2. Verificar se a lógica que vai ser tocada tem dependências em outros botões (especialmente tudo que envolve globals)
3. Descrever a mudança e aguardar confirmação se houver risco

### Trabalhar em partes pequenas

- Uma ação por vez
- Nunca refatorar múltiplas actions no mesmo commit sem confirmar cada uma
- Mudanças na API (`api-neoid.ts`, `api-telycam.ts`) afetam todas as actions — tratar com cuidado extra

### Ao encontrar comportamento que parece errado

Perguntar antes de "corrigir". Exemplos de coisas que parecem erradas mas são intencionais:
- Múltiplas requisições para o mesmo comando
- Dois objetos instanciados da mesma classe
- `getSettings()` chamado sem usar o retorno
- String com zero à esquerda em valores numéricos de velocidade

---

## 6. Histórico de migrações de SDK

### SDK 1.x → 2.0.0 (branch `fix/sdk-compatibility`)

**Problema 1 — `LogLevel` removido do pacote principal**
No SDK 1.x era um enum (`LogLevel.TRACE`). No SDK 2.0.0 virou um tipo string em `@elgato/utils/logging`.
- Correção em `src/plugin.ts`: removido `LogLevel` do import, `setLevel(LogLevel.TRACE)` → `setLevel("trace")`.

**Problema 2 — `PropertyInspector` removido do pacote principal**
Estava importado (sem uso) em 3 arquivos. Solução: removido do import.
- `src/actions/dials/focus-dials.ts`
- `src/actions/dials/zoom-dials.ts`
- `src/actions/ptz-focus.ts`

Todos os outros tipos usados no projeto (`SingletonAction`, `KeyDownEvent`, `KeyUpEvent`, `DialRotateEvent`, `WillAppearEvent`, `DidReceiveSettingsEvent`, `PropertyInspectorDidAppearEvent`, etc.) continuam disponíveis no SDK 2.0.0.

---

## 7. Pontos com incerteza conhecida

### `onDialRotate` em `PTZControls`

Existe um handler `onDialRotate` em `src/actions/ptz-controls.ts` que trata rotação de encoder para foco. É código experimental/legado que sobrou de uma versão anterior. Não remove funcionalidade ativa — botões de controle direcional não são encoders.

### ~~Referências ao `TarckingDial` em `plugin.ts`~~ — resolvido

Referências ao arquivo deletado `tracking-dials.ts` já foram removidas de `plugin.ts`.

### `checkCameraConnection` com `mode: 'no-cors'`

A função usa `{ mode: 'no-cors' }` e depois `return res.ok`. No browser, respostas `no-cors` são opacas e `res.ok` é sempre `false`. No Node.js (onde o plugin roda), CORS não é imposto e o fetch funciona normalmente, então `res.ok` reflete o status HTTP real. O comportamento está correto no contexto do plugin, mas a opção `no-cors` é tecnicamente desnecessária aqui.
