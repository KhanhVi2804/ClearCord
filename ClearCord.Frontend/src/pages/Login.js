import { useMemo, useState } from "react";
import { authApi } from "../services/api";

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

    return `You are opening invite code ${inviteCode}. Sign in or create an account and ClearCord will join the server automatically.`;
  }, [inviteCode]);

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
        <p className="eyebrow">Realtime Workspace</p>
        <h1>ClearCord</h1>
        <p>
          A Discord-style client wired for ASP.NET Core APIs, SignalR channel groups, persisted
          messages, notifications, and WebRTC voice/video signaling.
        </p>

        <div className="login-hero-grid">
          <div className="login-hero-card">
            <span>SignalR Hub</span>
            <strong>/hubs/chat</strong>
          </div>

          <div className="login-hero-card">
            <span>Visual Studio Ready</span>
            <strong>Backend serves the React app directly</strong>
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
              Sign in
            </AuthTabButton>
            <AuthTabButton id="register" activeTab={activeTab} onSelect={(tab) => {
              resetFeedback();
              setActiveTab(tab);
            }}>
              Register
            </AuthTabButton>
            <AuthTabButton id="forgot" activeTab={activeTab} onSelect={(tab) => {
              resetFeedback();
              setActiveTab(tab);
            }}>
              Reset access
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
                <p className="eyebrow">Sign in</p>
                <h2>Connect to your workspace</h2>
              </div>

              <label>
                Email or username
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
                Password
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
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>

              <button
                type="button"
                className="link-button"
                onClick={() => {
                  resetFeedback();
                  setActiveTab("forgot");
                }}
              >
                Forgot your password?
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
                <p className="eyebrow">Register</p>
                <h2>Create a new ClearCord account</h2>
              </div>

              <label>
                Username
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
                Username should not contain spaces or accented characters. Put your Vietnamese name
                in Display name instead.
              </p>

              <label>
                Display name
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
                Email
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
                Password
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
                {isSubmitting ? "Creating..." : "Create account"}
              </button>
            </form>
          )}

          {activeTab === "forgot" && (
            <div className="auth-stack">
              <div>
                <p className="eyebrow">Reset access</p>
                <h2>Generate a password reset token</h2>
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
                  Account email
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
                  {isSubmitting ? "Generating..." : "Generate token"}
                </button>
              </form>

              {successMessage && <p className="form-success">{successMessage}</p>}
              {error && <p className="form-error">{error}</p>}

              {forgotResult && (
                <div className="token-card">
                  <div>
                    <strong>User ID</strong>
                    <code>{forgotResult.userId || "Hidden when email is not found"}</code>
                  </div>
                  <div>
                    <strong>Reset token</strong>
                    <code>{forgotResult.resetToken || "Hidden when email is not found"}</code>
                  </div>
                </div>
              )}

              <form
                className="auth-inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitWithFeedback(async () => {
                    await authApi.resetPassword(resetForm);
                    setSuccessMessage("Password reset complete. You can now sign in.");
                    setActiveTab("signin");
                    setSignInForm((current) => ({
                      ...current,
                      emailOrUserName: forgotEmail || current.emailOrUserName
                    }));
                  });
                }}
              >
                <label>
                  User ID
                  <input
                    type="text"
                    value={resetForm.userId}
                    onChange={(event) =>
                      setResetForm((current) => ({
                        ...current,
                        userId: event.target.value
                      }))
                    }
                    placeholder="Paste the returned user ID"
                    required
                  />
                </label>

                <label>
                  Reset token
                  <textarea
                    value={resetForm.token}
                    onChange={(event) =>
                      setResetForm((current) => ({
                        ...current,
                        token: event.target.value
                      }))
                    }
                    placeholder="Paste the returned token"
                    rows={3}
                    required
                  />
                </label>

                <label>
                  New password
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
                  {isSubmitting ? "Resetting..." : "Reset password"}
                </button>
              </form>
            </div>
          )}

          {successMessage && activeTab !== "forgot" && <p className="form-success">{successMessage}</p>}

          <p className="login-footnote">
            JWT is stored in localStorage, attached to Axios requests, and reused automatically for
            SignalR connections once you enter the workspace.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
