import { LANGUAGE_OPTIONS, useI18n } from "../i18n";

function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className={`language-switcher ${compact ? "compact" : ""}`}>
      {!compact && <span>{t("common.language")}</span>}
      <select
        className="language-select"
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        aria-label={t("common.language")}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSwitcher;
