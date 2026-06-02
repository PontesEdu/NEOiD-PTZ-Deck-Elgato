(function () {
  const SUPPORTED = ['en', 'de', 'es', 'fr', 'ja', 'ko', 'zh_CN', 'zh_TW'];

  const LOCALES = {
    en: {
      "select.description": "Register a camera by IP and optional name. If offline, <strong>No camera</strong> is shown. Always select the target camera before using other actions.",
      "select.pgm.note": "After selecting, briefly shows <strong>PGM</strong> or <strong>PVW</strong> if tally is active (NEOiD only).",
      "select.telycam.note": "⚠️ With <strong>NEOiD By Telycam</strong> enabled, enter credentials — required for all Telycam actions.",

      "controls.description": "Choose a direction and press to move the camera. Hold to move continuously; release to stop.",
      "controls.ipDefault.description": "Enable <strong>Camera IP Default</strong> to target a specific IP, overriding the active camera selection. Use <strong>Camera Type</strong> to select NEOiD or Telycam.",

      "speed.description": "Cycles speed for the selected type (Slowest → Slow → Normal → Fast → Fastest, then repeats).",

      "zoom.description": "Hold to zoom in or out continuously; release to stop.",

      "focus.description": "Hold to adjust focus continuously; release to stop. <strong>Auto Focus</strong> triggers a one-shot autofocus.",

      "tracking.description": "Short press: cycle modes. Long press (≈1 s): activate selected mode. Short press while active: deactivate.<br><br>NEOiD modes: Presenter, Zone, Auto Frame.<br>Telycam modes: Tracking, Head Framing, Body Framing.",
      "tracking.webui.note": "⚠️ Zone, Auto Frame, Head Framing and Body Framing modes require prior setup in the camera's web interface to work correctly.",

      "backlight.description": "Toggles backlight compensation on/off. Use when a bright background causes the subject to appear dark.",

      "preset.description": "Short press: recall preset. Long press (≈1 s): save current position as preset. For NEOiD cameras, enable <strong>Image</strong> to attach a snapshot thumbnail to the button.",
      "preset.ipDefault.description": "Enable <strong>Camera IP Default</strong> to target a specific IP, bypassing the Select Camera action. Use <strong>Camera Type</strong> to select NEOiD or Telycam.",
      "preset.telycam.note": "⚠️ Telycam cameras do not support snapshot images — the Image option is hidden automatically.",

      "osd.description": "Controls the camera on-screen menu. Use <strong>PTZ Controls</strong> to navigate after OSD is open. <strong>OSD Enter</strong> confirms, <strong>OSD Back</strong> returns.",

      "focusDial.description": "Rotate the dial to adjust focus.",
      "zoomDial.description": "Rotate the dial to adjust zoom.",

    },

    pt_BR: {
      "select.description": "Cadastre uma câmera por IP e nome opcional. Se offline, <strong>No camera</strong> é exibido. Selecione sempre a câmera desejada antes de usar outras ações.",
      "select.pgm.note": "Ao selecionar, exibe brevemente <strong>PGM</strong> ou <strong>PVW</strong> se o tally estiver ativo (apenas NEOiD).",
      "select.telycam.note": "⚠️ Com <strong>NEOiD By Telycam</strong> ativado, informe credenciais — obrigatório para todas as ações Telycam.",

      "controls.description": "Escolha uma direção e pressione para mover a câmera. Segure para mover continuamente; solte para parar.",
      "controls.ipDefault.description": "Ative <strong>Camera IP Default</strong> para controlar um IP específico, ignorando a câmera ativa. Use <strong>Camera Type</strong> para selecionar NEOiD ou Telycam.",

      "speed.description": "Alterna a velocidade para o tipo selecionado (Mínima → Lenta → Normal → Rápida → Máxima, em ciclo).",

      "zoom.description": "Segure para dar zoom in ou out continuamente; solte para parar.",

      "focus.description": "Segure para ajustar o foco continuamente; solte para parar. <strong>Auto Focus</strong> aciona o foco automático instantaneamente.",

      "tracking.description": "Toque rápido: alterna modos. Pressão longa (≈1 s): ativa o modo selecionado. Toque rápido com ativo: desativa.<br><br>Modos NEOiD: Presenter, Zone, Auto Frame.<br>Modos Telycam: Tracking, Head Framing, Body Framing.",
      "tracking.webui.note": "⚠️ Os modos Zone, Auto Frame, Head Framing e Body Framing precisam ser configurados previamente na interface web da câmera para funcionar corretamente.",

      "backlight.description": "Ativa ou desativa a compensação de retroiluminação. Use quando o fundo claro escurece o objeto em cena.",

      "preset.description": "Toque rápido: chama o preset. Pressão longa (≈1 s): salva a posição atual. Para câmeras NEOiD, ative <strong>Image</strong> para exibir uma miniatura no botão.",
      "preset.ipDefault.description": "Ative <strong>Camera IP Default</strong> para controlar um IP específico, ignorando a ação Select Camera. Use <strong>Camera Type</strong> para selecionar NEOiD ou Telycam.",
      "preset.telycam.note": "⚠️ Câmeras Telycam não suportam snapshot — a opção Image é ocultada automaticamente.",

      "osd.description": "Controla o menu da câmera na tela. Use <strong>PTZ Controls</strong> para navegar após abrir o OSD. <strong>OSD Enter</strong> confirma, <strong>OSD Back</strong> retorna.",

      "focusDial.description": "Gire o dial para ajustar o foco.",
      "zoomDial.description": "Gire o dial para ajustar o zoom.",

    }
  };

  function detectLang(sdLang) {
    if (sdLang && SUPPORTED.includes(sdLang)) return sdLang;
    const nav = (navigator.language || 'en').replace('-', '_');
    if (nav.startsWith('pt')) return 'pt_BR';
    const short = nav.split('_')[0];
    return SUPPORTED.includes(short) ? short : 'en';
  }

  function apply(lang) {
    const strings = LOCALES[lang] || LOCALES['en'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (strings[key] !== undefined) el.innerHTML = strings[key];
    });
  }

  window.initI18n = function (sdLang) {
    apply(detectLang(sdLang));
  };

  // Apply immediately when DOM is ready — no dependency on the connected event
  document.addEventListener('DOMContentLoaded', () => apply(detectLang(null)));
})();
