# CLAUDE.md — NEOiD PTZ Deck

Plugin Stream Deck para controle de câmeras PTZ via rede local. NEOiD usa CGI/HTTP + VISCA fallback; Telycam usa JSON API + VISCA fallback.
Node.js 20 | SDK `@elgato/streamdeck` v2.0.0 | TypeScript | Rollup+Terser → `bin/plugin.js` | Entrada: `src/plugin.ts`

---

## 1. Arquitetura de estado

**Global Settings é o barramento de estado.** Toda action lê câmera e configuração a partir dos globals — nenhuma guarda IP localmente.

| Chave global | Tipo | Descrição |
|---|---|---|
| `cameraIP` | string \| false | IP ativo (`false` = sem câmera) |
| `camera` | string | Nome da câmera |
| `isTelycam` | boolean | Tipo de câmera |
| `keyTelycam` | number | Session key Telycam |
| `panMode` / `zoomMode` / `focusMode` | SpeedType | Velocidades por canal |
| `isBacklight` / `isOsd` | boolean | Estados toggle |
| `cameraIPControls` | string | IP dos botões Camera IP Default |
| `trackingMode_${IP}` | string | Modo de tracking NEOiD (por câmera) |
| `trackingModeTelycam_${IP}` | string | Modo de tracking Telycam (por câmera) |
| `trackingActive_${IP}` | boolean | Tracking ativo (por câmera) |
| `presetImage${N}${IP}` | string (base64) | Snapshot do preset N (por câmera) |

**Regra crítica**: todo `setGlobalSettings` deve usar `{...globals, chave: valor}` — o SDK substitui o objeto inteiro.
Chaves com `_${IP}` são geradas por `utils/global-keys.ts` e suportam múltiplas câmeras no mesmo perfil.

---

## 2. Padrões estabelecidos

**`resolveCamera(globals)`** — retorna `CameraContext { cameraIP, api: CameraAPI }` com o adapter correto (NEOiD ou Telycam). Exceção: `ptz-controls` e `preset` em `isDefault=true` instanciam `APINeoid`/`APITelycam` diretamente via `settings.cameraIPControls` e `settings.cameraType`, sem passar por `resolveCamera`.

**`updateVisual()`** — método privado por classe que centraliza renderização; `onWillAppear` e `onDidReceiveSettings` delegam para ele. Nunca compartilhar entre classes distintas — cada uma tem lógica visual própria.

**`noCameraGuard(ev.action, globals)`** — exibe "No camera" e retorna `true` se `globals.cameraIP` for falsy. Não se aplica a botões `isDefault=true`.

---

## 3. Mecanismo de broadcast (cross-button)

O SDK não tem notificação cross-button nativa. O padrão do plugin:

```
mudança de estado → setGlobalSettings → getSettings() em cada action → onDidReceiveSettings → re-render
```

`getSettings()` chamado sem usar o retorno é re-render intencional — não remover.

`ActionRegistry` mantém referências às instâncias registradas. `PTZRegister.broadcastCameraChange()` chama `ActionRegistry.broadcastGetSettings()`, que itera todas as instâncias e dispara `getSettings()`. `PTZSpeed` deliberadamente **não está** no `ActionRegistry` — velocidade é agnóstica à câmera.

---

## 4. Mecanismos críticos — não quebrar

**Stop-on-release** (`PTZControls`, `PTZZoom`, `PTZFocus`): `onKeyDown` → move, `onKeyUp` → para. Inverter ou remover trava a câmera em movimento.

**Long press com `longPress` flag** (`PTZTracking` 900ms, `PTZPreset` 1100ms): o timer seta `longPress=true` e executa a ação longa; `onKeyUp` só executa a curta se `longPress===false`. Remover a flag causa dupla execução.

**Timer antes do await em `PTZPreset.onKeyDown`**: `pressTimer` é criado antes do `checkCameraConnection`. Se a conexão falhar, o timer é cancelado e `longPress=true` é forçado — impede que `onKeyUp` execute a ação curta após falha.

**Dead zone 200ms nos dials** (`FocusDial`, `ZoomDial`): não existe evento "parei de girar". Cada tick cancela o timer anterior e cria um novo de 200ms; sem tick novo → envia stop. Remover trava a câmera.

**Cache de tracking** (`invalidateTrackingFetchCache`): cooldown de 2s por IP evita fetches duplicados quando múltiplas instâncias do botão de tracking aparecem juntas. Invalidado no wake-up e na reconexão de device via `plugin.ts`.

---

## 5. Camera IP Default

`ptz-controls` e `preset` têm `isDefault: boolean` + `cameraType?: "neoid"|"telycam"` nas settings, operando independente da câmera ativa no global.

| | `isDefault=false` | `isDefault=true` |
|---|---|---|
| IP | `globals.cameraIP` via `resolveCamera()` | `settings.cameraIPControls` |
| Fallback IP | — | `globals.cameraIPControls ?? "192.168.100.88"` |
| API | adapter unificado | `new APINeoid/APITelycam` diretamente |
| Guard câmera | `noCameraGuard` | não se aplica |

- **Telycam Default**: VISCA direto com `key: 0`, sem autenticação, sem ping prévio.
- **NEOiD Default**: `checkCameraConnection` antes de cada comando; exibe "No camera" se falhar.
- **Inicialização**: `onDidReceiveSettings` e `onPropertyInspectorDidAppear` preenchem `cameraIPControls` a partir dos globals se o campo estiver vazio.
- **Sincronização**: `ptz-controls` persiste `cameraIPControls` nos globals após cada movimento para que botões Default adicionados depois já apareçam com o IP correto.
- **Debounce 1500ms no `preset`**: `onDidReceiveSettings` debounce em `updateVisual(checkConnectivity=true)` para evitar pings excessivos durante edição.
- **Sem snapshot em Default**: preset Default só envia o comando; nunca captura/armazena snapshot.

---

## 6. Tally PGM/PVW (Select Camera)

Após conexão NEOiD bem-sucedida, `scheduleTallyFeedback` consulta `/cgi-bin/param.cgi?get_tally_status`:
- `tally=program` → imagem vermelha por 4s | `tally=preview` → verde | sem resposta → sem imagem
- Telycam não tem tally — o método só é chamado no branch NEOiD de `onKeyDown`.

**`tallyInfoMap`** (`actionId → { timer, restoreImage }`): bloqueia o broadcast de sobrescrever a imagem enquanto o tally está ativo.

- Guard em `onDidReceiveSettings`: se `tallyInfoMap.has(ev.action.id)`, o update visual inteiro é ignorado. Remover o guard faz o broadcast apagar a imagem de tally imediatamente.
- `clearAllTallyDisplays()`: chamado no início de todo `onKeyDown` para cancelar timers e restaurar imagens antes de nova seleção.
- Race condition: `scheduleTallyFeedback` verifica `tallyInfoMap.has(actionId)` após o fetch async — se `clearAllTallyDisplays()` rodou durante o fetch, o tally não é exibido.

---

## 7. Não simplificar (firmware e protocolo)

- `SendTrackingActive` envia 3 requests — firmwares NEOiD diferentes respondem a APIs diferentes.
- `toggleBacklight` NEOiD envia pares `2/3` e `0/1` — cobre variantes de firmware.
- `panTiltSpeed.slowest` é `'06'` (string) na NEOiD e `6` (number) na Telycam — formatos de protocolo distintos.
- Telycam usa VISCA UDP para diagonais — a JSON API não suporta movimentos diagonais.
- `mfocus` é enviado antes de `focusin`/`focusout` — alguns firmwares ignoram foco manual sem troca de modo.
- `SendTrackingMode` + `fetchCameraTracking` usam dois endpoints — cobre firmware antigo e novo.
- `key: null` no login Telycam — a API exige o campo presente antes de autenticar.
- Nunca unificar `trackingMode_${IP}` e `trackingModeTelycam_${IP}` — os modos são semanticamente incompatíveis entre câmeras.
- Blocos `if(isTelycam)` divergem por câmera — abstrair só faz sentido quando os dois ramos executam a mesma operação semântica.

---

## 8. Regras de desenvolvimento

- Antes de qualquer mudança estrutural: identificar todos os leitores de globals afetados; checar dependências em `cameraIP`, `isTelycam`, `keyTelycam`; uma action por vez.
- Mudanças em `api-neoid.ts`/`api-telycam.ts` afetam todas as actions (via adapter e instâncias diretas).
- `checkCameraConnection` usa `{ mode: 'no-cors' }` e retorna `res.ok` — correto em Node.js (CORS não é imposto), mas retornaria sempre `false` no browser.
