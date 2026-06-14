import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";

function ClearSettingsMenu({
  isClearEnabled,
  notificationVolume,
  onClearEnabledChange,
  onNotificationVolumeChange
}) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="server-rail-settings" ref={rootRef}>
      <button
        type="button"
        className={`server-tile server-tile-settings ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        title={t("sidebar.settings")}
        aria-label={t("sidebar.settings")}
        aria-expanded={isOpen}
      >
        <span className="material-symbols-outlined">settings</span>
      </button>

      {isOpen && (
        <section className="server-settings-popover">
          <header className="server-settings-popover-header">
            <div>
              <p className="eyebrow">{t("settings.eyebrow")}</p>
              <h3>{t("settings.title")}</h3>
            </div>
          </header>

          <div className="server-settings-group">
            <div className="server-settings-copy">
              <strong>{t("settings.clearToggle")}</strong>
              <p>{t("settings.clearToggleHint")}</p>
            </div>
            <button
              type="button"
              className={`settings-switch ${isClearEnabled ? "active" : ""}`}
              onClick={() => onClearEnabledChange(!isClearEnabled)}
              aria-pressed={isClearEnabled}
            >
              <span className="settings-switch-track">
                <span className="settings-switch-thumb" />
              </span>
            </button>
          </div>
          <div className="server-settings-group volume">
            <div className="server-settings-copy">
              <strong>{t("settings.notificationVolume")}</strong>
              <p>{t("settings.notificationVolumeHint", { percent: Math.round(notificationVolume * 100) })}</p>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(notificationVolume * 100)}
              onChange={(event) => onNotificationVolumeChange(Number(event.target.value) / 100)}
              aria-label={t("settings.notificationVolume")}
              className="settings-volume-slider"
            />
          </div>
        </section>
      )}
    </div>
  );
}

export default ClearSettingsMenu;
