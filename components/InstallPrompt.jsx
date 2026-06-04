import React, { useEffect, useState } from "react";

function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone;

    if (isStandalone) {
      return undefined;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  if (!visible || !promptEvent) {
    return null;
  }

  return (
    <div className="install-prompt" role="dialog" aria-live="polite">
      <div className="install-prompt-copy">
        <strong>Add to home screen</strong>
        <span>Use it like a phone app and keep the full desktop site too.</span>
      </div>
      <div className="install-prompt-actions">
        <button
          type="button"
          onClick={async () => {
            promptEvent.prompt();
            const choice = await promptEvent.userChoice;
            if (choice?.outcome) {
              setVisible(false);
              setPromptEvent(null);
            }
          }}
        >
          Install
        </button>
        <button
          type="button"
          className="install-prompt-dismiss"
          onClick={() => setVisible(false)}
        >
          Later
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
