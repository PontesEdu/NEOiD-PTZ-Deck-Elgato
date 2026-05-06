# NEOiD PTZ Deck

Plugin para o **Elgato Stream Deck** que permite controlar câmeras PTZ (Pan, Tilt, Zoom) profissionais diretamente pelos botões dos stream deck da elgato.

Suporta câmeras **NEOiD**, com comunicação via rede local (IP).

---

## O que o plugin faz

Câmeras PTZ são câmeras motorizadas que conseguem se mover horizontalmente (pan), verticalmente (tilt) e fazer zoom — tudo remotamente. Normalmente, para controlá-las é necessário um joystick físico dedicado ou um software específico.

Este plugin elimina essa necessidade: ao instalar o NEOiD PTZ Deck no Stream Deck, cada botão do dispositivo passa a executar um comando direto na câmera via rede. Isso permite, por exemplo:

- Mover a câmera para uma posição salva com um único toque (preset)
- Controlar o zoom e o foco com os encoders rotatórios
- Ativar o rastreamento automático de pessoas
- Ajustar o backlight e o menu OSD da câmera

---

## Funcionalidades

- **Registro de câmera** — Configura o IP da câmera uma única vez e compartilha com todos os botões
- **Controle direcional (Pan/Tilt)** — Move a câmera nas 8 direções (cima, baixo, esquerda, direita e diagonais) e para no centro
- **Zoom** — Aproxima e afasta com controle de velocidade
- **Foco** — Foco manual (aproximar/afastar) e foco automático
- **Velocidade ajustável** — 5 níveis de velocidade para Pan/Tilt, Zoom e Foco (slowest → slow → normal → fast → fastest)
- **Presets** — Recall (clique curto) e salvamento (pressão longa) de posições, com captura de snapshot associada
- **Tracking** — Rastreamento automático com 3 modos: Tracking, Zona/Região e AutoFrame/Head Framing
- **Backlight** — Ativa e desativa o backlight da câmera
- **OSD (On-Screen Display)** — Abre e navega pelo menu da câmera
- **Encoders rotatórios (Dials)** — Controla Zoom, Foco e Tracking através dos encoders giratórios do Stream Deck+

---

## Como o plugin funciona

### Visão geral da arquitetura

```
Usuário pressiona botão
        │
        ▼
Stream Deck App (software Elgato)
        │  comunica via WebSocket
        ▼
Plugin Node.js (plugin.js)
        │  usa @elgato/streamdeck SDK
        ▼
Ação correspondente (ex: ptz-controls.ts)
        │  busca IP da câmera nas configurações globais
        ▼
Módulo de API (api-neoid.ts ou api-telycam.ts)
        │  envia requisição HTTP / VISCA
        ▼
Câmera PTZ na rede local
```

### Fluxo de uso típico

1. O usuário instala o plugin no Stream Deck
2. Arrasta a ação **Selecionar Câmera** para um botão e digita o IP da câmera
3. O plugin testa a conexão, faz login (se necessário) e salva as informações globalmente
4. Todos os outros botões (controles, zoom, presets, etc.) passam a usar automaticamente essa câmera
5. A partir daí, cada botão pressionado envia um comando direto para a câmera via HTTP

### Como o estado é compartilhado entre botões

O plugin usa o sistema de **configurações globais** do Stream Deck SDK para compartilhar dados entre todas as ações. Isso significa que ao registrar uma câmera, o IP é salvo uma única vez e todos os botões passam a usá-lo automaticamente, sem precisar configurar cada um individualmente.

Além disso, estados como velocidade, modo de tracking e presets são armazenados globalmente com chaves únicas por câmera (ex: `panMode`, `trackingMode_192.168.1.100`), garantindo que múltiplas câmeras possam coexistir sem conflito.

### Comunicação com as câmeras

O plugin suporta dois protocolos principais:

**CGI/HTTP** (câmeras NEOiD):
- Comandos enviados como requisições HTTP GET/POST para endpoints CGI da câmera
- Exemplo: `GET /cgi-bin/ptzctrl.cgi?ptzcmd&ptzleft&12&12` move a câmera para a esquerda na velocidade 12

**VISCA** (protocolo padrão de câmeras PTZ):
- Usado como fallback nas câmeras NEOiD e como protocolo principal em alguns comandos da Telycam
- Comandos em hexadecimal enviados via TCP (porta 5678) ou UDP (porta 52381)
- Exemplo: o comando de foco automático vira uma sequência de bytes como `[0x81, 0x01, 0x04, 0x38, 0x02, 0xFF]`

**JSON API** (câmeras Telycam):
- Autenticação com usuário/senha, retorna uma session key
- Comandos enviados como JSON via POST
- Exemplo: `{"image.zoom": {"direction": "in", "speed": 4}}`

---

## Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| TypeScript | Linguagem principal do plugin |
| Node.js 20 | Runtime de execução |
| @elgato/streamdeck SDK | Comunicação com o Stream Deck |
| Rollup | Bundler — empacota tudo em um único arquivo JS |
| Terser | Minificação do bundle em produção |

---

## Estrutura de pastas

```
ptzneoid/
│
├── src/                            # Código-fonte TypeScript
│   │
│   ├── plugin.ts                   # Ponto de entrada do plugin
│   │                               # Registra todas as ações e conecta ao Stream Deck
│   │
│   ├── actions/                    # Uma classe por ação do Stream Deck
│   │   ├── ptz-register.ts         # Registra a câmera (IP, tipo, login)
│   │   ├── ptz-controls.ts         # Controle direcional: 8 direções + home
│   │   ├── ptz-zoom.ts             # Zoom in / zoom out
│   │   ├── ptz-focus.ts            # Foco in / out / automático
│   │   ├── ptz-tracking.ts         # Rastreamento automático (3 modos)
│   │   ├── ptz-speed.ts            # Cicla entre os 5 níveis de velocidade
│   │   ├── preset.ts               # Recall e save de presets (curto/longo)
│   │   ├── backlight.ts            # Toggle do backlight da câmera
│   │   ├── osd.ts                  # Navegação no menu OSD da câmera
│   │   │
│   │   └── dials/                  # Ações para encoders rotatórios (Stream Deck+)
│   │       ├── zoom-dials.ts       # Zoom via rotação do encoder
│   │       ├── focus-dials.ts      # Foco via rotação + clique = auto-focus
│   │       └── tracking-dials.ts   # Alternância de modos de tracking
│   │
│   ├── api/                        # Módulos de comunicação com as câmeras
│   │   ├── api-neoid.ts            # API para câmeras NEOiD (CGI HTTP + VISCA fallback)
│   │   └── api-telycam.ts          # API para câmeras Telycam (JSON + VISCA UDP)
│   │
│   └── utils/                      # Funções utilitárias reutilizáveis
│       ├── checkCameraConnection.ts # Testa se a câmera está acessível na rede
│       ├── login-telycam.ts        # Realiza autenticação nas câmeras Telycam
│       ├── ptz-api-base.ts         # Funções base compartilhadas entre APIs
│       ├── ptz-api-post-image-value.ts # Envio de valores de imagem (backlight, etc.)
│       ├── send-visca-tcp.ts       # Envia comandos VISCA via TCP (porta 5678)
│       ├── send-visca-udp.ts       # Envia comandos VISCA via UDP (porta 52381)
│       └── snapshot.ts             # Captura screenshot da câmera para presets
│
├── com.neoid.ptzneoid.sdPlugin/    # Pasta raiz do plugin instalável no Stream Deck
│   │                               # Esta pasta é o que o Stream Deck reconhece como plugin
│   │
│   ├── manifest.json               # Definição oficial do plugin
│   │                               # Lista todas as ações, ícones, versão e requisitos
│   │
│   ├── bin/                        # Código compilado — gerado automaticamente pelo build
│   │   ├── plugin.js               # Bundle final (todo o src/ compilado em um arquivo)
│   │   ├── plugin.js.map           # Source map para debug
│   │   └── package.json            # Indica ao Node.js que o arquivo usa ES Modules
│   │
│   ├── ui/                         # Interfaces de configuração de cada ação
│   │   │                           # Exibidas no painel de propriedades do Stream Deck
│   │   ├── select-ptz.html         # Tela de configuração do registro de câmera
│   │   ├── ptz-controls.html       # Configuração dos controles direcionais
│   │   ├── speed.html              # Configuração de velocidade
│   │   ├── zoom.html               # Configuração de zoom
│   │   ├── focus.html              # Configuração de foco
│   │   ├── preset.html             # Configuração de presets
│   │   ├── tracking.html           # Configuração de tracking
│   │   ├── backlight.html          # Configuração de backlight
│   │   ├── osd.html                # Configuração do OSD
│   │   ├── ptz-settings.js         # Lógica JavaScript compartilhada pelas UIs
│   │   ├── styles.css              # Estilos das interfaces de configuração
│   │   ├── sdpi-components.js      # Componentes oficiais do Stream Deck Property Inspector
│   │   │
│   │   └── dials/                  # Interfaces de configuração dos encoders
│   │       ├── zoom-dial.html
│   │       ├── focus-dial.html
│   │       └── tracking-dial.html
│   │
│   ├── imgs/                       # Ícones e imagens do plugin
│   │   ├── plugin/                 # Ícone geral do plugin
│   │   └── actions/                # Ícones por ação
│   │       ├── controls/           # Setas direcionais (up, down, left, right, diagonais, home)
│   │       ├── zoom/               # Ícones de zoom in e zoom out
│   │       ├── focus/              # Ícones de foco in, out e automático
│   │       ├── tracking/           # Ícones de tracking ativo e inativo
│   │       ├── preset/             # Ícone de preset
│   │       ├── backlight/          # Ícone de backlight
│   │       └── osd/                # Ícone do OSD
│   │
│   └── logs/                       # Logs de execução gerados pelo Stream Deck
│
├── rollup.config.mjs               # Configuração do processo de build
├── package.json                    # Dependências e scripts do projeto
├── tsconfig.json                   # Configuração do TypeScript
└── .gitignore                      # Arquivos ignorados pelo Git
```

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) v20 ou superior
- [Stream Deck](https://www.elgato.com/downloads) app instalado (versão compatível com plugins Node.js)
- [Stream Deck CLI](https://docs.elgato.com/sdk/plugins/getting-started) instalada globalmente:

```bash
npm install -g @elgato/cli
```

---

## Instalação das dependências

Clone o repositório e instale as dependências:

```bash
git clone <url-do-repositorio>
cd ptzneoid
npm install
```

---

## Como rodar em ambiente de desenvolvimento

O modo `watch` compila o TypeScript automaticamente a cada alteração e reinicia o plugin no Stream Deck, sem precisar reinstalar manualmente.

**1. Habilite o modo de desenvolvedor no Stream Deck:**

Abra o app do Stream Deck → Preferências → marque **Developer Mode**.

**2. Instale o plugin em modo de desenvolvimento:**

```bash
streamdeck link com.neoid.ptzneoid.sdPlugin
```

Esse comando cria um link simbólico da pasta do plugin para o diretório de plugins do Stream Deck, de forma que qualquer mudança compilada seja refletida imediatamente.

**3. Inicie o modo watch:**

```bash
npm run watch
```

A partir desse momento, qualquer alteração em `src/` será compilada e o plugin será reiniciado automaticamente no Stream Deck.

---

## Como buildar para produção

```bash
npm run build
```

Esse comando:
1. Compila todo o TypeScript da pasta `src/`
2. Empacota tudo em um único arquivo `bin/plugin.js` (via Rollup)
3. Minifica o bundle final (via Terser)

O resultado fica em `com.neoid.ptzneoid.sdPlugin/bin/plugin.js`.

---

## Como instalar o plugin no Stream Deck

### Opção 1 — Arquivo `.streamDeckPlugin` (distribuição)

1. Empacote o plugin com o CLI:

```bash
streamdeck pack com.neoid.ptzneoid.sdPlugin
```

2. Um arquivo `com.neoid.ptzneoid.streamDeckPlugin` será gerado
3. Dê dois cliques no arquivo para instalar automaticamente via Stream Deck app

### Opção 2 — Link direto (desenvolvimento)

Como descrito na seção anterior, use `streamdeck link` para vincular a pasta diretamente sem precisar empcotar.

---

## Como usar o plugin

### 1. Configurar a câmera

Arraste a ação **Selecionar Câmera** para um botão do Stream Deck. No painel de propriedades que aparece à direita:

- Digite o **IP da câmera** na rede local (ex: `192.168.1.100`)
- Selecione o **tipo de câmera** (NEOiD ou Telycam)
- Se for Telycam, preencha usuário e senha
- Pressione o botão — o plugin testa a conexão e registra a câmera

A partir desse momento, todos os outros botões já sabem qual câmera usar.

### 2. Adicionar controles

Arraste qualquer outra ação para os botões restantes:

| Ação | Como usar |
|---|---|
| Controle Direcional | Pressione e segure para mover; solte para parar |
| Zoom | Pressione e segure para aproximar/afastar |
| Foco | Pressione para ajustar o foco; use "Auto" para foco automático |
| Velocidade | Pressione para ciclar entre os 5 níveis (o título do botão muda) |
| Preset | Clique curto = recall; pressione por 1,1s ou mais = salva |
| Tracking | Clique curto = muda o modo; pressione por 0,9s ou mais = ativa/desativa |
| Backlight | Um clique ativa ou desativa |
| OSD | Abre/fecha o menu da câmera |

### 3. Usar os encoders (Stream Deck+)

Os encoders rotatórios controlam Zoom, Foco e Tracking de forma analógica:

- **Girar** → executa o comando continuamente enquanto está em rotação
- **Parar de girar** → interrompe o comando automaticamente após 200ms
- **Pressionar o encoder de Foco** → aciona o foco automático

---

## Velocidades disponíveis

Cada tipo de controle tem 5 níveis de velocidade, acessíveis pela ação **Velocidade**:

| Nível | Pan/Tilt | Zoom / Foco |
|---|---|---|
| Slowest | 6 | 1 |
| Slow | 9 | 3 |
| Normal | 12 | 4 |
| Fast | 16 | 6 |
| Fastest | 23 | 7 |

---

## Modos de Tracking

| Modo | NEOiD | Telycam |
|---|---|---|
| Rastreamento de pessoa | `tracking` | `0` |
| Rastreamento por zona/região | `region` | `1` (Head Framing) |
| Enquadramento automático | `autoframe` | `2` (Body Framing) |

---

<!-- ## Possíveis melhorias futuras

- Suporte a outros fabricantes de câmeras PTZ (Sony, Panasonic, etc.)
- Controle de múltiplas câmeras simultaneamente por perfis
- Interface de configuração mais rica, com preview ao vivo da câmera
- Suporte a macros: sequências de comandos executadas com um único toque
- Exportação e importação de configurações de presets
- Feedback visual no botão com thumbnail atualizado da câmera em tempo real
- Suporte a autenticação via token para câmeras com segurança reforçada -->
