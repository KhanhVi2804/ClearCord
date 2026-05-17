import { useI18n } from "../i18n";

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  bare = false
}) {
  const { t } = useI18n();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-card ${wide ? "modal-wide" : ""}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {bare ? (
          <div className="modal-bare-header">
            <button type="button" className="ghost-button compact" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        ) : (
          <div className="modal-header">
            <div>
              {subtitle ? <p className="eyebrow">{subtitle}</p> : null}
              <h2>{title}</h2>
            </div>
            <button type="button" className="ghost-button" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default ModalShell;
