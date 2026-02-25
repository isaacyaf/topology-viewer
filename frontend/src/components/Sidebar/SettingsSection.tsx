import type { Locale, Theme, ViewMode } from "../../types";

interface SettingsSectionProps {
  locale: Locale;
  theme: Theme;
  viewMode: ViewMode;
  onLocaleChange: (locale: Locale) => void;
  onThemeChange: (theme: Theme) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function SettingsSection({
  locale,
  theme,
  viewMode,
  onLocaleChange,
  onThemeChange,
  onViewModeChange,
}: SettingsSectionProps) {
  const t = (en: string, zhTW: string) => (locale === "zh-TW" ? zhTW : en);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="field">
        <label>{t("View Mode", "檢視模式")}</label>
        <select
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value as ViewMode)}
        >
          <option value="edit">{t("Edit", "編輯")}</option>
          <option value="present">{t("Present", "展示")}</option>
        </select>
      </div>

      <div className="field">
        <label>{t("Language", "語言")}</label>
        <select
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value as Locale)}
        >
          <option value="en">English</option>
          <option value="zh-TW">繁體中文</option>
        </select>
      </div>

      <div className="field">
        <label>{t("Theme", "主題")}</label>
        <select
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as Theme)}
        >
          <option value="light">☀️ {t("Light", "淺色")}</option>
          <option value="dark">🌙 {t("Dark", "深色")}</option>
        </select>
      </div>
    </div>
  );
}
