const { streamDeckClient } = SDPIComponents;

streamDeckClient.on('connected', (jsn) => {
  const sdLang = jsn?.application?.language ?? null;
  if (window.initI18n) window.initI18n(sdLang);
});

function setupConditionalField(checkboxId, divId, settingKey) {
  const div      = document.getElementById(divId);
  const checkbox = document.getElementById(checkboxId);
  if (!div || !checkbox) return;

  function updateUI(value) {
    div.style.display = value ? 'block' : 'none';
  }

  const innerInput = checkbox.shadowRoot?.querySelector('input[type="checkbox"]');
  if (innerInput) {
    innerInput.addEventListener('change', async () => {
      const { settings } = await SDPIComponents.streamDeckClient.getSettings();
      settings[settingKey] = innerInput.checked;
      await SDPIComponents.streamDeckClient.send('setSettings', settings);
      updateUI(innerInput.checked);
    });
  }

  SDPIComponents.streamDeckClient.didReceiveSettings.subscribe(({ payload }) => {
    updateUI(!!payload.settings[settingKey]);
  });

  (async () => {
    const { settings } = await SDPIComponents.streamDeckClient.getSettings();
    updateUI(!!settings[settingKey]);
  })();
}
