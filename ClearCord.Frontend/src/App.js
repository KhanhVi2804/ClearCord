import { useEffect, useMemo, useState } from "react";
import Login from "./pages/Login";
import ChatPage from "./pages/ChatPage";
import {
  authApi,
  clearSession,
  getStoredToken,
  getStoredUser,
  persistSession,
  updateStoredUser,
  userApi
} from "./services/api";
import { chatSignalR } from "./services/signalr";

function getInviteCodeFromPath(pathname) {
  const match = pathname.match(/^\/invite\/([^/]+)$/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function navigateTo(pathname) {
  if (window.location.pathname === pathname) {
    return;
  }

  window.history.pushState({}, "", pathname);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const [token, setToken] = useState(() => getStoredToken());
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(getStoredToken()));

  const pendingInviteCode = useMemo(
    () => getInviteCodeFromPath(pathname),
    [pathname]
  );

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = async () => {
      clearSession();
      await chatSignalR.stop();
      setToken(null);
      setCurrentUser(null);
      setIsBootstrapping(false);
    };

    window.addEventListener("clearcord:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("clearcord:unauthorized", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const user = await userApi.getCurrentUser();
        if (!isMounted) {
          return;
        }

        setCurrentUser(user);
        updateStoredUser(user);
      } catch {
        if (!isMounted) {
          return;
        }

        clearSession();
        setToken(null);
        setCurrentUser(null);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function completeAuth(authResponse) {
    persistSession(authResponse);
    setToken(authResponse.accessToken);
    setCurrentUser(authResponse.user);
  }

  async function handleLogin(credentials) {
    const authResponse = await authApi.login(credentials);
    await completeAuth(authResponse);
  }

  async function handleRegister(payload) {
    const authResponse = await authApi.register(payload);
    await completeAuth(authResponse);
  }

  async function handleLogout() {
    try {
      if (getStoredToken()) {
        await authApi.logout();
      }
    } catch (error) {
      console.warn("Logout request failed, clearing session locally.", error);
    } finally {
      clearSession();
      await chatSignalR.stop();
      setToken(null);
      setCurrentUser(null);
      setIsBootstrapping(false);
      navigateTo("/");
    }
  }

  function handleCurrentUserChange(user) {
    setCurrentUser(user);
    updateStoredUser(user);
  }

  function handleInviteConsumed() {
    navigateTo("/");
  }

  if (isBootstrapping) {
    return (
      <div className="splash-screen">
        <div className="splash-card">
          <p className="eyebrow">ClearCord</p>
          <h1>Connecting your workspace...</h1>
          <p>Refreshing your session and preparing the chat client.</p>
        </div>
      </div>
    );
  }

  if (!token || !currentUser) {
    return (
      <Login
        inviteCode={pendingInviteCode}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <ChatPage
      currentUser={currentUser}
      inviteCode={pendingInviteCode}
      onCurrentUserChange={handleCurrentUserChange}
      onInviteConsumed={handleInviteConsumed}
      onLogout={handleLogout}
    />
  );
}

export default App;
