import { LANGUAGE_OPTIONS, useI18n } from "../i18n";

function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, t } = useI18n();

  if (compact) {
    return (
      <div className="language-toggle" role="group" aria-label={t("common.language")}>
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`language-toggle-btn ${language === option.value ? "active" : ""}`}
            onClick={() => setLanguage(option.value)}
            title={option.label}
            aria-label={option.label}
            aria-pressed={language === option.value}
          >
            {option.value.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className="language-switcher">
      <span>{t("common.language")}</span>
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
