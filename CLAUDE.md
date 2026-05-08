# CLAUDE.md — NEOiD PTZ Deck

## 1. Contexto do projeto

Plugin para Elgato Stream Deck que controla câmeras PTZ via rede local. Suporta **NEOiD** (CGI HTTP + fallback VISCA/HTTP) e **Telycam** (JSON API + fallback VISCA/UDP).

- Runtime: Node.js 20 | SDK: `@elgato/streamdeck` v2.0.0 | Linguagem: TypeScript
- Build: Rollup + Terser → `com.neoid.ptzneoid.sdPlugin/bin/plugin.js`
- Ponto de entrada: `src/plugin.ts`

---

## 2. Arquitetura de estado

**Global Settings é o barramento de estado.** Nenhuma action conhece o IP da câmera por conta própria — todas leem dos globals.

| Chave global | Tipo | Descrição |
|---|---|---|
| `cameraIP` | string \| false | IP da câmera ativa (`false` = sem câmera) |
| `camera` | string | Nome/título da câmera |
| `isTelycam` | boolean | Tipo de câmera |
| `keyTelycam` | number | Session key da Telycam |
| `panMode` | SpeedType | Velocidade de pan/tilt |
| `zoomMode` | SpeedType | Velocidade de zoom |
| `focusMode` | SpeedType | Velocidade de foco |
| `isBacklight` | boolean | Estado do backlight |
| `isOsd` | boolean | Estado do menu OSD |
| `trackingMode_${IP}` | string | Modo de tracking NEOiD (por câmera) |
| `trackingModeTelycam_${IP}` | string | Modo de tracking Telycam (por câmera) |
| `trackingActive_${IP}` | boolean | Tracking ativo/inativo (por câmera) |
| `presetImage${N}${IP}` | string (base64) | Snapshot do preset N (por câmera) |

**As chaves com `_${IP}` são intencionais** — permitem múltiplas câmeras no mesmo perfil sem conflito.

---

## 3. Mecanismos críticos — não quebrar

### `getSettings()` como broadcast de re-render
Chamar `actionInstance.getSettings()` dispara `onDidReceiveSettings` na instância, fazendo o botão reler os globals e atualizar seu visual. **Este é o único mecanismo de notificação cross-button.** O código que parece "buscar settings sem usar o retorno" está forçando um re-render em cascata — não remover.

### Duas instâncias de cada classe em `plugin.ts`
O SDK não oferece registro global por tipo de action. Para iterar botões ativos de uma action, `PTZRegister` precisa de uma referência à instância da classe. Por isso cada action é instanciada duas vezes: uma para `registerAction()`, outra injetada no construtor do `PTZRegister`. O `.actions` do SDK é compartilhado por UUID, então ambas enxergam os mesmos botões. **Não "simplificar" isso.**

### Stop-on-release para movimentos contínuos
`PTZControls`, `PTZZoom` e `PTZFocus`: `onKeyDown` → move, `onKeyUp` → para. Remover ou inverter essa ordem deixa a câmera travada em movimento.

### Long press com flag `longPress`
`PTZTracking` (900ms) e `PTZPreset` (1100ms): o timer no `onKeyDown` dispara a ação longa e seta `longPress = true`. O `onKeyUp` só executa a ação curta se `longPress === false`. **Remover a flag causa dupla execução** (ação curta + longa no mesmo press).

### Dead zone de 200ms para dials
`FocusDial` e `ZoomDial` não têm evento "parei de girar". Cada tick cancela o timer anterior e cria um novo de 200ms. Sem novo tick → envia stop. **Este timer é o que impede a câmera de ficar travada.**

---

## 4. Regras obrigatórias

### NÃO alterar sem mapear impacto completo
- Nunca alterar chaves dos globals sem rastrear todos os leitores
- Nunca unificar `trackingMode_${IP}` e `trackingModeTelycam_${IP}` — modos NEOiD e Telycam são semanticamente diferentes
- Todo `setGlobalSettings` deve usar `{...globals, novaChave: valor}` — o SDK substitui o objeto inteiro

### NÃO simplificar estas lógicas (são intencionais)
- `SendTrackingActive` envia 3 requisições — firmwares NEOiD diferentes respondem a APIs diferentes
- `toggleBacklight` NEOiD envia 2 chamadas com pares `2/3` e `0/1` — cobertura de variantes de firmware
- `panTiltSpeed.slowest` é `'06'` (string) na NEOiD — zero à esquerda necessário para CGI e bytes VISCA. Na Telycam é `6` (number) porque vai em JSON. Não "corrigir" essa diferença
- Telycam usa VISCA UDP para movimentos diagonais — a API JSON da Telycam não suporta diagonais
- `mfocus` é enviado antes de `focusin`/`focusout` — alguns firmwares ignoram foco manual sem mudar o modo antes
- `SendTrackingMode` e `fetchCameraTracking` usam dois endpoints (`write_path` + `postfulltrack` / GET + POST) — cobertura de firmware antigo e novo
- `key: null` no login Telycam é obrigatório — a API exige o campo presente mesmo antes da autenticação

### NÃO abstrair cegamente
- Blocos `if(isTelycam) { ... } else { ... }` divergem por câmera — abstrair só faz sentido quando os dois ramos fazem exatamente a mesma operação semântica
- `onWillAppear` e `onDidReceiveSettings` podem ser extraídos em `updateVisual()` privado **dentro da mesma classe**, mas nunca compartilhado entre classes diferentes

### SEMPRE antes de qualquer mudança estrutural
1. Identificar todos os arquivos afetados
2. Verificar dependências via globals (especialmente `cameraIP`, `isTelycam`, `keyTelycam`)
3. Descrever a mudança e aguardar confirmação se houver risco
4. Uma action por vez — nunca refatorar múltiplas no mesmo commit sem confirmar cada uma
5. Mudanças em `api-neoid.ts` ou `api-telycam.ts` afetam todas as actions

### Coisas que parecem erradas mas são intencionais
- Múltiplas requisições para o mesmo comando → cobertura de firmware
- Dois objetos da mesma classe em `plugin.ts` → necessário para iterar `.actions`
- `getSettings()` chamado sem usar o retorno → é o mecanismo de re-render
- String com zero à esquerda em valores de velocidade → formatação VISCA/CGI

---

## 5. Incerteza conhecida

`checkCameraConnection` usa `{ mode: 'no-cors' }` e retorna `res.ok`. No browser isso sempre retornaria `false` (resposta opaca), mas o plugin roda em Node.js onde CORS não é imposto — o comportamento está correto neste runtime. A opção `no-cors` é tecnicamente desnecessária, mas não causa dano.

# Git Rules

- Nunca trabalhar na main
- 1 branch = 1 objetivo
- Commits pequenos
- Não misturar refactor + fix
- Nunca push automático