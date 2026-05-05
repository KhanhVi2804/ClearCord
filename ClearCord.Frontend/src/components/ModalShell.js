import { useI18n } from "../i18n";

function ModalShell({
  title,
  subtitle,
  onClose,
  children
}) {
  const { t } = useI18n();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">{subtitle}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default ModalShell;
