import { useMemo, useState } from "react";
import { authApi } from "../services/api";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n";

function AuthTabButton({ id, activeTab, onSelect, children }) {
  return (
    <button
      type="button"
      className={`auth-tab-button ${activeTab === id ? "active" : ""}`}
      onClick={() => onSelect(id)}
    >
      {children}
    </button>
  );
}

function Login({ inviteCode, onLogin, onRegister }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("signin");
  const [signInForm, setSignInForm] = useState({
    emailOrUserName: "",
    password: ""
  });
  const [registerForm, setRegisterForm] = useState({
    userName: "",
    displayName: "",
    email: "",
    password: ""
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetForm, setResetForm] = useState({
    userId: "",
    token: "",
    newPassword: ""
  });
  const [forgotResult, setForgotResult] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inviteMessage = useMemo(() => {
    if (!inviteCode) {
      return null;
    }

    return t("auth.inviteMessage", { inviteCode });
  }, [inviteCode, t]);

  async function submitWithFeedback(action) {
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await action();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetFeedback() {
    setError("");
    setSuccessMessage("");
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="login-language-bar">
          <LanguageSwitcher />
        </div>
        <p className="eyebrow">{t("auth.heroEyebrow")}</p>
        <h1>ClearCord</h1>
        <p>{t("auth.heroDescription")}</p>

        <div className="login-feature-list">
          <span className="mini-pill">{t("auth.featureRealtime")}</span>
          <span className="mini-pill">{t("auth.featureCommunities")}</span>
          <span className="mini-pill">{t("auth.featureCalls")}</span>
        </div>

        <div className="login-hero-grid">
          <div className="login-hero-card">
            <span>{t("auth.signalrLabel")}</span>
            <strong>{t("auth.signalrValue")}</strong>
          </div>

          <div className="login-hero-card">
            <span>{t("auth.readyLabel")}</span>
            <strong>{t("auth.readyValue")}</strong>
          </div>
        </div>

        {inviteMessage && <div className="info-banner">{inviteMessage}</div>}
      </section>

      <section className="login-card-shell">
        <div className="login-card">
          <div className="auth-tabs">
            <AuthTabButton id="signin" activeTab={activeTab} onSelect={(tab) => {
              resetFeedback();
              setActiveTab(tab);
            }}>
              {t("auth.signInTab")}
            </AuthTabButton>
            <AuthTabButton id="register" activeTab={activeTab} onSelect={(tab) => {
              resetFeedback();
              setActiveTab(tab);
            }}>
              {t("auth.registerTab")}
            </AuthTabButton>
            <AuthTabButton id="forgot" activeTab={activeTab} onSelect={(tab) => {
              resetFeedback();
              setActiveTab(tab);
            }}>
              {t("auth.resetTab")}
            </AuthTabButton>
          </div>

          {activeTab === "signin" && (
            <form
              className="auth-stack"
              onSubmit={(event) => {
                event.preventDefault();
                submitWithFeedback(() => onLogin(signInForm));
              }}
            >
              <div>
                <p className="eyebrow">{t("auth.signInEyebrow")}</p>
                <h2>{t("auth.signInTitle")}</h2>
              </div>

              <label>
                {t("auth.emailOrUsername")}
                <input
                  type="text"
                  value={signInForm.emailOrUserName}
                  onChange={(event) =>
                    setSignInForm((current) => ({
                      ...current,
                      emailOrUserName: event.target.value
                    }))
                  }
                  placeholder="alex@example.com"
                  autoComplete="username"
                  required
                />
              </label>

              <label>
                {t("auth.password")}
                <input
                  type="password"
                  value={signInForm.password}
                  onChange={(event) =>
                    setSignInForm((current) => ({
                      ...current,
                      password: event.target.value
                    }))
                  }
                  placeholder="Password123"
                  autoComplete="current-password"
                  required
                />
              </label>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? t("auth.signingIn") : t("auth.signInTab")}
              </button>

              <button
                type="button"
                className="link-button"
                onClick={() => {
                  resetFeedback();
                  setActiveTab("forgot");
                }}
              >
                {t("auth.forgotPassword")}
              </button>
            </form>
          )}

          {activeTab === "register" && (
            <form
              className="auth-stack"
              onSubmit={(event) => {
                event.preventDefault();
                submitWithFeedback(() => onRegister(registerForm));
              }}
            >
              <div>
                <p className="eyebrow">{t("auth.registerEyebrow")}</p>
                <h2>{t("auth.registerTitle")}</h2>
              </div>

              <label>
                {t("auth.userName")}
                <input
                  type="text"
                  value={registerForm.userName}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      userName: event.target.value
                    }))
                  }
                  placeholder="khanhvi"
                  autoComplete="username"
                  pattern="[A-Za-z0-9._@+-]+"
                  title="Use letters, numbers, and .-_@+ only"
                  required
                />
              </label>

              <p className="helper-copy">
                {t("auth.usernameHelper")}
              </p>

              <label>
                {t("auth.displayName")}
                <input
                  type="text"
                  value={registerForm.displayName}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      displayName: event.target.value
                    }))
                  }
                  placeholder="Alex Clear"
                  required
                />
              </label>

              <label>
                {t("auth.email")}
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      email: event.target.value
                    }))
                  }
                  placeholder="alex@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                {t("auth.password")}
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      password: event.target.value
                    }))
                  }
                  placeholder="Password123"
                  autoComplete="new-password"
                  required
                />
              </label>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
              </button>
            </form>
          )}

          {activeTab === "forgot" && (
            <div className="auth-stack">
              <div>
                <p className="eyebrow">{t("auth.resetEyebrow")}</p>
                <h2>{t("auth.resetTitle")}</h2>
              </div>

              <form
                className="auth-inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitWithFeedback(async () => {
                    const result = await authApi.forgotPassword({
                      email: forgotEmail
                    });

                    setForgotResult(result);
                    setResetForm((current) => ({
                      ...current,
                      userId: result.userId || current.userId,
                      token: result.resetToken || current.token
                    }));
                    setSuccessMessage(result.message);
                  });
                }}
              >
                <label>
                  {t("auth.accountEmail")}
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    placeholder="alex@example.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting ? t("auth.generatingToken") : t("auth.generateToken")}
                </button>
              </form>

              {successMessage && <p className="form-success">{successMessage}</p>}
              {error && <p className="form-error">{error}</p>}

              {forgotResult && (
                <div className="token-card">
                  <div>
                    <strong>{t("auth.userId")}</strong>
                    <code>{forgotResult.userId || t("auth.hiddenWhenNotFound")}</code>
                  </div>
                  <div>
                    <strong>{t("auth.resetToken")}</strong>
                    <code>{forgotResult.resetToken || t("auth.hiddenWhenNotFound")}</code>
                  </div>
                </div>
              )}

              <form
                className="auth-inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitWithFeedback(async () => {
                    await authApi.resetPassword(resetForm);
                    setSuccessMessage(t("auth.passwordResetComplete"));
                    setActiveTab("signin");
                    setSignInForm((current) => ({
                      ...current,
                      emailOrUserName: forgotEmail || current.emailOrUserName
                    }));
                  });
                }}
              >
                <label>
                  {t("auth.userId")}
                  <input
                    type="text"
                    value={resetForm.userId}
                    onChange={(event) =>
                      setResetForm((current) => ({
                        ...current,
                        userId: event.target.value
                      }))
                    }
                    placeholder={t("auth.pasteReturnedUserId")}
                    required
                  />
                </label>

                <label>
                  {t("auth.resetToken")}
                  <textarea
                    value={resetForm.token}
                    onChange={(event) =>
                      setResetForm((current) => ({
                        ...current,
                        token: event.target.value
                      }))
                    }
                    placeholder={t("auth.pasteReturnedToken")}
                    rows={3}
                    required
                  />
                </label>

                <label>
                  {t("auth.newPassword")}
                  <input
                    type="password"
                    value={resetForm.newPassword}
                    onChange={(event) =>
                      setResetForm((current) => ({
                        ...current,
                        newPassword: event.target.value
                      }))
                    }
                    placeholder="NewPassword123"
                    autoComplete="new-password"
                    required
                  />
                </label>

                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting ? t("auth.resettingPassword") : t("auth.resetPassword")}
                </button>
              </form>
            </div>
          )}

          {successMessage && activeTab !== "forgot" && <p className="form-success">{successMessage}</p>}

          <p className="login-footnote">
            {t("auth.jwtFootnote")}
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
