# NEOiD PTZ Deck

Plugin para **Elgato Stream Deck** que controla câmeras PTZ profissionais via rede local — sem necessidade de joystick físico ou software dedicado.

---

## Câmeras suportadas

- **NEOiD** — CGI/HTTP com fallback VISCA
- **Telycam** — JSON API com fallback VISCA

---

## Actions

| Action | Descrição |
|---|---|
| **Selecionar Câmera** | Registra a câmera pelo IP. Todos os outros botões passam a usá-la automaticamente |
| **Controle Direcional** | Pan/Tilt em 8 direções + home. Pressione e segure → move; solte → para |
| **Zoom** | Zoom in/out contínuo com controle de velocidade |
| **Foco** | Foco manual (in/out) e automático |
| **Velocidade** | Alterna entre 5 níveis de velocidade para pan/tilt, zoom e foco |
| **Preset** | Clique curto = recall; pressão longa (1,1 s) = salva a posição atual |
| **Tracking** | Clique curto = alterna modo; pressão longa (0,9 s) = ativa/desativa |
| **Backlight** | Ativa/desativa o backlight da câmera |
| **OSD** | Abre, navega e fecha o menu on-screen da câmera |
| **Zoom Dial** | Zoom via encoder rotatório (Stream Deck+) |
| **Focus Dial** | Foco via encoder; clique no encoder = foco automático (Stream Deck+) |

---

## Como usar

### 1. Registrar a câmera

Arraste a action **Selecionar Câmera** para um botão. No painel de propriedades:

- Digite o **IP da câmera** na rede local (ex: `192.168.1.100`)
- Selecione o tipo: **NEOiD** ou **Telycam**
- Se Telycam, preencha usuário e senha
- Pressione o botão — o plugin testa a conexão e registra a câmera

A partir daí, todos os outros botões reconhecem a câmera automaticamente.

### 2. Adicionar controles

Arraste as outras actions para os botões e configure cada uma no painel de propriedades à direita. Cada action exibe apenas as opções relevantes para ela.

### 3. Encoders (Stream Deck+)

- **Girar** → executa o comando continuamente enquanto está em rotação
- **Parar de girar** → interrompe automaticamente após 200 ms
- **Pressionar o encoder de Foco** → ativa o foco automático

---

## Desenvolvimento

### Pré-requisitos

- [Node.js](https://nodejs.org/) v20+
- [Stream Deck app](https://www.elgato.com/downloads) instalado
- Stream Deck CLI instalada globalmente:

```bash
npm install -g @elgato/cli
```

### Setup

```bash
git clone <url-do-repositorio>
cd ptzneoid
npm install
```

### Desenvolvimento local

```bash
# Vincula a pasta do plugin ao Stream Deck (uma vez)
streamdeck link com.neoid.ptzneoid.sdPlugin

# Compila e reinicia o plugin a cada alteração em src/
npm run watch
```

### Build de produção

```bash
npm run build
```

Gera `com.neoid.ptzneoid.sdPlugin/bin/plugin.js`.

### Empacotar para distribuição

```bash
streamdeck pack com.neoid.ptzneoid.sdPlugin
```

Gera `com.neoid.ptzneoid.streamDeckPlugin` — instala com dois cliques no Stream Deck app.
