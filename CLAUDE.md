# CLAUDE.md — NEOiD PTZ Deck

## 1. Contexto do projeto

Plugin para Elgato Stream Deck que controla câmeras PTZ via rede local. Suporta **NEOiD** (CGI HTTP + fallback VISCA/HTTP) e **Telycam** (JSON API + fallback VISCA/UDP).

- Runtime: Node.js 20 | SDK: `@elgato/streamdeck` v2.0.0 | Linguagem: TypeScript
- Build: Rollup + Terser → `com.neoid.ptzneoid.sdPlugin/bin/plugin.js`
- Ponto de entrada: `src/plugin.ts`

---

## 2. Estrutura de arquivos

```
src/
├── plugin.ts              — registra as 9 actions e configura listeners globais
├── types.ts               — GlobalSettings, SpeedType
├── constants.ts           — PTZ_DIRECTIONS, zoomFocusSpeed (re-exportados pelas APIs)
├── api/
│   ├── api-neoid.ts       — comandos HTTP/VISCA para câmeras NEOiD
│   └── api-telycam.ts     — comandos HTTP/VISCA para câmeras Telycam
├── actions/
│   ├── ptz-controls.ts    — pan/tilt (8 direções + home), suporta Camera IP Default
│   ├── ptz-zoom.ts        — zoom in/out
│   ├── ptz-focus.ts       — foco manual (in/out/auto)
│   ├── ptz-tracking.ts    — ciclo de modos de tracking + toggle ativo
│   ├── ptz-register.ts    — registro/conexão de câmera e broadcast de mudança
│   ├── speed.ts           — seletor de velocidade (pan/zoom/foco)
│   ├── preset.ts          — presets (salvar/chamar), suporta Camera IP Default
│   ├── backlight.ts       — toggle de backlight
│   ├── osd.ts             — navegação de menu OSD
│   └── dials/
│       ├── focus-dials.ts — foco por dial rotativo
│       └── zoom-dials.ts  — zoom por dial rotativo
└── utils/
    ├── camera-api.ts           — adapter pattern: CameraAPI, resolveCamera, NeoidAdapter, TelycamAdapter
    ├── action-registry.ts      — registro central de instances para broadcast
    ├── global-keys.ts          — helpers para chaves dinâmicas dos globals
    ├── no-camera-guard.ts      — guard: exibe "No camera" se cameraIP ausente
    ├── checkCameraConnection.ts — ping HTTP com timeout
    ├── login-telycam.ts        — autenticação Telycam
    ├── snapshot.ts             — captura snapshot e converte para base64
    ├── send-visca-udp.ts       — envia VISCA via UDP
    └── send-visca-tcp.ts       — envia VISCA via TCP (mantido: referenciado em comentários de api-neoid.ts)
```

---

## 3. Arquitetura de estado

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
| `cameraIPControls` | string | IP usado pelos botões "Camera IP Default" |
| `trackingMode_${IP}` | string | Modo de tracking NEOiD (por câmera) |
| `trackingModeTelycam_${IP}` | string | Modo de tracking Telycam (por câmera) |
| `trackingActive_${IP}` | boolean | Tracking ativo/inativo (por câmera) |
| `presetImage${N}${IP}` | string (base64) | Snapshot do preset N (por câmera) |

As chaves com `_${IP}` são intencionais — suportam múltiplas câmeras no mesmo perfil. Geradas pelos helpers em `utils/global-keys.ts`. Todo `setGlobalSettings` deve usar `{...globals, chave: valor}` — o SDK substitui o objeto inteiro.

---

## 4. Padrões estabelecidos

### `resolveCamera(globals)` — adapter unificado
A maioria das actions obtém a API via `resolveCamera(globals)` de `utils/camera-api.ts`, que retorna `CameraContext { cameraIP, api: CameraAPI }`. O adapter abstrai as diferenças de protocolo NEOiD/Telycam. **Exceção**: `ptz-controls` e `preset` no modo `isDefault=true` instanciam `APINeoid` diretamente com o IP próprio (`cameraIPControls`), sem passar por `resolveCamera`.

### `updateVisual()` — helper de render por classe
`speed`, `ptz-focus`, `ptz-zoom`, `ptz-controls`, `preset` e os dials têm um método privado `updateVisual()` (ou `updateButton()` nos dials) que centraliza a atualização visual. `onWillAppear` e `onDidReceiveSettings` delegam para ele. **Nunca compartilhar entre classes distintas** — cada uma tem lógica visual própria.

### `noCameraGuard(ev.action, globals)` — guard de câmera ausente
Retorna `true` e exibe "No camera" se `globals.cameraIP` for falsy. Chamada no início dos handlers que dependem da câmera global. Não se aplica a botões com `isDefault=true`.

### `globalKeys` — chaves dinâmicas por IP
```typescript
globalKeys.trackingMode(ip)        // "trackingMode_{ip}"
globalKeys.trackingModeTelycam(ip) // "trackingModeTelycam_{ip}"
globalKeys.trackingActive(ip)      // "trackingActive_{ip}"
globalKeys.presetImage(n, ip)      // "presetImage{n}{ip}"
```

---

## 5. Mecanismos críticos — não quebrar

### `getSettings()` como broadcast de re-render
Chamar `actionInstance.getSettings()` dispara `onDidReceiveSettings` na instância, fazendo o botão reler os globals e atualizar seu visual. **Este é o único mecanismo de notificação cross-button.** O código que parece "buscar settings sem usar o retorno" está forçando um re-render em cascata — não remover.

### `ActionRegistry` — broadcast para todas as actions
`plugin.ts` instancia cada action uma vez, registra no SDK e no `ActionRegistry`. Quando a câmera muda (`PTZRegister.broadcastCameraChange()`), `ActionRegistry.broadcastGetSettings()` itera as instâncias e chama `.actions.forEach(a => a.getSettings())` em cada uma. `PTZTracking` é passado diretamente ao construtor de `PTZRegister` para chamar `fetchCameraTracking()` com tipagem. Não remover o `ActionRegistry.register()` sem verificar se a action precisa participar do broadcast.

### Stop-on-release para movimentos contínuos
`PTZControls`, `PTZZoom` e `PTZFocus`: `onKeyDown` → move, `onKeyUp` → para. Inverter ou remover deixa a câmera travada em movimento.

### Long press com flag `longPress`
`PTZTracking` (900ms) e `PTZPreset` (1100ms): o timer no `onKeyDown` dispara a ação longa e seta `longPress = true`. O `onKeyUp` só executa a ação curta se `longPress === false`. Remover a flag causa dupla execução (ação curta + longa no mesmo press).

### Ordering do timer em `PTZPreset.onKeyDown`
O `pressTimer` é configurado **antes** do `await checkCameraConnection`. Se a conexão falhar, o timer é cancelado manualmente e `longPress` é forçado a `true` — garantindo que `onKeyUp` não execute a ação curta. Se o timer fosse criado após o await, haveria janela de execução indevida.

### Dead zone de 200ms para dials
`FocusDial` e `ZoomDial` não têm evento "parei de girar". Cada tick cancela o timer anterior e cria um novo de 200ms. Sem novo tick → envia stop. Este timer é o que impede a câmera de ficar travada.

### Cache de fetch de tracking — `invalidateTrackingFetchCache`
`ptz-tracking.ts` mantém `lastFetchTime` por IP com cooldown de 2 segundos — evita fetches duplicados quando múltiplas instâncias aparecem ao mesmo tempo. `plugin.ts` chama `invalidateTrackingFetchCache()` no wake-up do sistema e na reconexão do device, forçando fetch fresco na próxima aparição.

---

## 6. Feature: Camera IP Default

`ptz-controls` e `preset` suportam modo alternativo via `isDefault: boolean` nas settings do botão.

| Aspecto | `isDefault=false` (padrão) | `isDefault=true` |
|---|---|---|
| IP de controle | `globals.cameraIP` via `resolveCamera()` | `settings.cameraIPControls` |
| Fallback de IP | — | `globals.cameraIPControls ?? "192.168.100.88"` |
| API de câmera | `resolveCamera(globals)` | `new APINeoid({ IP: cameraIPControls })` |
| Guard `noCameraGuard` | Sim | Não se aplica |
| Suporte Telycam | Sim | Não — sempre NEOiD |

**Inicialização**: `onDidReceiveSettings` e `onPropertyInspectorDidAppear` preenchem `cameraIPControls` dos globals se o campo estiver vazio.

**Sincronização pós-movimento**: `ptz-controls` salva `cameraIPControls` nos globals após movimento bem-sucedido, para que outros botões Default se alinhem ao mesmo IP.

**Debounce de 1500ms no `preset` (modo Default)**: `onDidReceiveSettings` aplica debounce antes de `updateVisual(checkConnectivity=true)` para evitar pings excessivos durante edição das configurações.

**Preset sem snapshot em modo Default**: O snapshot de preset não é capturado/armazenado em botões Default — apenas o comando de salvar é enviado à câmera.

---

## 7. Regras obrigatórias

### NÃO alterar sem mapear impacto completo
- Nunca alterar chaves dos globals sem rastrear todos os leitores
- Nunca unificar `trackingMode_${IP}` e `trackingModeTelycam_${IP}` — modos NEOiD e Telycam são semanticamente diferentes
- Mudanças em `api-neoid.ts` ou `api-telycam.ts` afetam todas as actions (via adapter ou instâncias diretas)

### NÃO simplificar estas lógicas (são intencionais)
- `SendTrackingActive` envia 3 requisições — firmwares NEOiD diferentes respondem a APIs diferentes
- `toggleBacklight` NEOiD envia 2 chamadas com pares `2/3` e `0/1` — cobertura de variantes de firmware
- `panTiltSpeed.slowest` é `'06'` (string) na NEOiD e `6` (number) na Telycam — formatos de protocolo diferentes
- Telycam usa VISCA UDP para movimentos diagonais — a API JSON não suporta diagonais
- `mfocus` é enviado antes de `focusin`/`focusout` — alguns firmwares ignoram foco manual sem mudar o modo
- `SendTrackingMode` e `fetchCameraTracking` usam dois endpoints — cobertura de firmware antigo e novo
- `key: null` no login Telycam é obrigatório — a API exige o campo presente antes da autenticação

### NÃO abstrair cegamente
- Blocos `if(isTelycam) { ... } else { ... }` divergem por câmera — abstrair só faz sentido quando os dois ramos fazem exatamente a mesma operação semântica
- `updateVisual()` pode ser extraído **dentro da mesma classe**, nunca compartilhado entre classes diferentes

### SEMPRE antes de qualquer mudança estrutural
1. Identificar todos os arquivos afetados
2. Verificar dependências via globals (especialmente `cameraIP`, `isTelycam`, `keyTelycam`)
3. Uma action por vez — nunca refatorar múltiplas actions no mesmo commit sem confirmar cada uma

### Coisas que parecem erradas mas são intencionais
- Múltiplas requisições para o mesmo comando → cobertura de firmware
- `ActionRegistry.register()` em `plugin.ts` → necessário para broadcast de re-render
- `getSettings()` chamado sem usar o retorno → mecanismo de re-render
- String com zero à esquerda em velocidades NEOiD → formatação VISCA/CGI obrigatória
- Timer antes do await em `preset.onKeyDown` → garante que `onKeyUp` não execute em caso de falha de conexão

---

## 8. Incerteza conhecida

`checkCameraConnection` usa `{ mode: 'no-cors' }` e retorna `res.ok`. No browser isso sempre retornaria `false` (resposta opaca), mas o plugin roda em Node.js onde CORS não é imposto — o comportamento está correto neste runtime.

---

# Git Rules

- Nunca trabalhar na main
- 1 branch = 1 objetivo
- Commits pequenos
- Não misturar refactor + fix
- Nunca push automático
