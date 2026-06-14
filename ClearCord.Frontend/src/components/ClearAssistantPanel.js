import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { getPreferredSpeechVoice } from "../utils/speech";

function getRecognitionCtor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function mapRecognitionError(error, t) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return t("assistant.micDenied");
    case "no-speech":
      return t("assistant.noSpeech");
    case "audio-capture":
      return t("assistant.audioCaptureFailed");
    case "network":
      return t("assistant.networkFailed");
    case "language-not-supported":
      return t("assistant.languageNotSupported");
    case "aborted":
      return t("assistant.listeningStopped");
    default:
      return t("assistant.recognitionFailed");
  }
}

function createEntry(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text
  };
}

function normalizeSpeechText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsWakePhrase(transcript, assistantName) {
  const normalizedTranscript = normalizeSpeechText(transcript);
  const normalizedAssistantName = normalizeSpeechText(assistantName);
  if (!normalizedTranscript || !normalizedAssistantName) {
    return false;
  }

  const wakePhrases = [`hey ${normalizedAssistantName}`, normalizedAssistantName];
  return wakePhrases.some((phrase) =>
    normalizedTranscript === phrase ||
    normalizedTranscript.startsWith(`${phrase} `) ||
    normalizedTranscript.includes(` ${phrase} `) ||
    normalizedTranscript.endsWith(` ${phrase}`)
  );
}

function speakText(text, language, onStart, onEnd) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !("SpeechSynthesisUtterance" in window) ||
    !text?.trim()
  ) {
    return false;
  }

  const utterance = new window.SpeechSynthesisUtterance(text.trim());
  const preferredVoice = getPreferredSpeechVoice(language);

  if (preferredVoice) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang;
  } else {
    utterance.lang = language === "vi" ? "vi-VN" : "en-US";
  }

  utterance.rate = language === "vi" ? 0.92 : 1;
  utterance.pitch = 1;
  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

function ClearAssistantPanel({
  currentContextLabel,
  isOpen,
  isClearEnabled,
  onOpenChange,
  onAssistRequest,
  onFinalizeDraftMessage
}) {
  const { t, language } = useI18n();
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [draft, setDraft] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [statusError, setStatusError] = useState("");
  const [entries, setEntries] = useState([]);
  const [listenPhase, setListenPhase] = useState("idle");
  const [messageDraftSession, setMessageDraftSession] = useState(null);
  const recognitionRef = useRef(null);
  const shouldSubmitOnEndRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const heardSpeechRef = useRef(false);
  const messageDraftSessionRef = useRef(null);
  const hasMicrophoneAccessRef = useRef(false);
  const wakeDetectedRef = useRef(false);
  const listeningModeRef = useRef("idle");
  const lastRecognitionErrorRef = useRef("");
  const backgroundWakeModeRef = useRef(false);
  const handsFreePausedRef = useRef(false);
  const noSpeechTimerRef = useRef(null);
  const draftAutoSubmitTimerRef = useRef(null);
  const autoWakeRetryTimerRef = useRef(null);
  const autoFinalizingDraftRef = useRef(false);
  const recognitionCtor = useMemo(() => getRecognitionCtor(), []);

  const canRecognizeSpeech = Boolean(recognitionCtor);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const isVoiceSessionActive =
    isListening ||
    isSpeaking ||
    listenPhase === "wake-pending" ||
    listenPhase === "draft-pending" ||
    listenPhase === "recipient-pending" ||
    listenPhase === "shortcut-pending";
  const voiceButtonDisabled = isThinking || !canRecognizeSpeech;

  useEffect(() => {
    messageDraftSessionRef.current = messageDraftSession;
  }, [messageDraftSession]);

  useEffect(() => {
    return () => {
      if (noSpeechTimerRef.current) {
        window.clearTimeout(noSpeechTimerRef.current);
      }

      if (draftAutoSubmitTimerRef.current) {
        window.clearTimeout(draftAutoSubmitTimerRef.current);
      }

      if (autoWakeRetryTimerRef.current) {
        window.clearTimeout(autoWakeRetryTimerRef.current);
      }

      recognitionRef.current?.abort?.();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    function handleShortcut(event) {
      if (!event.ctrlKey || event.code !== "Space") {
        return;
      }

      event.preventDefault();
      handsFreePausedRef.current = false;
      onOpenChange?.(true);

      if (isVoiceSessionActive) {
        if (backgroundWakeModeRef.current && listeningModeRef.current === "wake") {
          stopListening(false);
          startShortcutCommandFlow();
          return;
        }

        stopListening(true);
        return;
      }

      startShortcutCommandFlow();
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [isVoiceSessionActive, onOpenChange]);

  useEffect(() => {
    if (!isClearEnabled) {
      handsFreePausedRef.current = true;
      if (backgroundWakeModeRef.current && listeningModeRef.current === "wake") {
        stopListening(true);
      }
      return undefined;
    }

    handsFreePausedRef.current = false;

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        return;
      }

      armWakeListener();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    armWakeListener();
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isClearEnabled, isListening, isThinking, isSpeaking, listenPhase, recognitionCtor]);

  function setDraftSession(session) {
    messageDraftSessionRef.current = session;
    setMessageDraftSession(session);
  }

  function clearDraftAutoSubmitTimer() {
    if (draftAutoSubmitTimerRef.current) {
      window.clearTimeout(draftAutoSubmitTimerRef.current);
      draftAutoSubmitTimerRef.current = null;
    }
  }

  function scheduleDraftAutoSubmit(session) {
    clearDraftAutoSubmitTimer();
    draftAutoSubmitTimerRef.current = window.setTimeout(() => {
      const finalSession = messageDraftSessionRef.current ?? session;
      const content = finalSession?.content?.trim() ?? "";

      draftAutoSubmitTimerRef.current = null;
      if (!content) {
        setStatusError(t("assistant.draftNoContent"));
        return;
      }

      autoFinalizingDraftRef.current = true;
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
      listeningModeRef.current = "idle";
      shouldSubmitOnEndRef.current = false;
      setIsListening(false);
      setListenPhase("idle");
      setLiveTranscript(content);

      finalizeDraftMessage(finalSession, content)
        .catch((error) => {
          setStatusError(error.message);
        })
        .finally(() => {
          autoFinalizingDraftRef.current = false;
        });
    }, 3000);
  }

  function createDraftSessionFromResponse(response) {
    if (response.action?.type === "composeDirectMessage" && response.action.targetUserId) {
      return {
        kind: "direct",
        targetUserId: response.action.targetUserId,
        targetDisplayName: response.action.targetDisplayName ?? response.action.targetUserId,
        contextId: response.action.conversationId ?? null,
        content: ""
      };
    }

    if (response.action?.type === "composeChannelMessage" && response.action.conversationId) {
      return {
        kind: "channel",
        targetDisplayName: response.action.targetDisplayName ?? t("assistant.title"),
        contextId: response.action.conversationId,
        content: ""
      };
    }

    return null;
  }

  function buildRecipientPrompt(transcript) {
    return language === "vi"
      ? `gửi tin nhắn cho ${transcript}`
      : `send a message to ${transcript}`;
  }

  async function submitPrompt(prompt, options = {}) {
    const { entryText } = options;
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || isThinking) {
      return;
    }

    setStatusError("");
    setIsThinking(true);
    setEntries((current) => [...current.slice(-5), createEntry("user", entryText ?? normalizedPrompt)]);
    setLiveTranscript(entryText ?? normalizedPrompt);

    try {
      const response = await onAssistRequest(normalizedPrompt);
      setEntries((current) => [...current.slice(-5), createEntry("assistant", response.message)]);

      if (response.mode === "compose-message-target-needed") {
        setListenPhase("recipient-pending");
        speakAssistantReply(response.message, () => {
          setListenPhase("idle");
          setLiveTranscript("");
          startListening("recipient").catch(() => {
            setStatusError(t("assistant.recognitionFailed"));
            setIsListening(false);
            setListenPhase("idle");
          });
        });
      } else {
        const nextSession = createDraftSessionFromResponse(response);
        if (nextSession) {
          setDraftSession(nextSession);
          setListenPhase("draft-pending");
          speakAssistantReply(response.message, () => {
            setListenPhase("idle");
            setLiveTranscript("");
            startListening("draft").catch(() => {
              setStatusError(t("assistant.recognitionFailed"));
              setIsListening(false);
              setListenPhase("idle");
            });
          });
        } else {
          speakAssistantReply(response.message, () => {
            setLiveTranscript("");
            scheduleWakeListenerRestart();
          });
        }
      }

      setDraft("");
      onOpenChange?.(true);
      return response;
    } catch (error) {
      setStatusError(error.message);
      throw error;
    } finally {
      setIsThinking(false);
    }
  }

  function scheduleWakeListenerRestart(delay = 650) {
    if (autoWakeRetryTimerRef.current) {
      window.clearTimeout(autoWakeRetryTimerRef.current);
    }

    autoWakeRetryTimerRef.current = window.setTimeout(() => {
      autoWakeRetryTimerRef.current = null;
      armWakeListener();
    }, delay);
  }

  function armWakeListener() {
    if (
      !isClearEnabled ||
      handsFreePausedRef.current ||
      !recognitionCtor ||
      !window.isSecureContext ||
      recognitionRef.current ||
      isListening ||
      isThinking ||
      isSpeaking ||
      listenPhase !== "idle" ||
      messageDraftSessionRef.current
    ) {
      return;
    }

    startListening("wake", { background: true, suppressErrors: true }).catch(() => {});
  }

  function stopListening(pauseHandsFree = false) {
    if (noSpeechTimerRef.current) {
      window.clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }

    clearDraftAutoSubmitTimer();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (autoWakeRetryTimerRef.current) {
      window.clearTimeout(autoWakeRetryTimerRef.current);
      autoWakeRetryTimerRef.current = null;
    }

    handsFreePausedRef.current = pauseHandsFree;
    shouldSubmitOnEndRef.current = false;
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    listeningModeRef.current = "idle";
    backgroundWakeModeRef.current = false;
    wakeDetectedRef.current = false;
    setDraftSession(null);
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    heardSpeechRef.current = false;
    lastRecognitionErrorRef.current = "aborted";
    autoFinalizingDraftRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);
    setListenPhase("idle");
    setLiveTranscript("");
  }

  async function ensureMicrophoneAccess() {
    if (hasMicrophoneAccessRef.current) {
      return true;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      hasMicrophoneAccessRef.current = true;
      return true;
    } catch (error) {
      const permissionErrorName = error?.name?.toLowerCase?.() ?? "";
      if (permissionErrorName.includes("notallowed") || permissionErrorName.includes("permission")) {
        setStatusError(t("assistant.micDenied"));
        hasMicrophoneAccessRef.current = false;
        return false;
      }

      setStatusError(t("assistant.audioCaptureFailed"));
      hasMicrophoneAccessRef.current = false;
      return false;
    }
  }

  function speakAssistantReply(text, onComplete) {
    let completed = false;
    let fallbackTimer = null;

    const finish = () => {
      if (completed) {
        return;
      }

      completed = true;
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }

      setIsSpeaking(false);
      onComplete?.();
    };

    if (!canSpeak) {
      finish();
      return false;
    }

    fallbackTimer = window.setTimeout(
      finish,
      Math.max(1800, Math.min(6000, text.trim().length * 55))
    );

    const started = speakText(
      text,
      language,
      () => setIsSpeaking(true),
      finish
    );

    if (!started) {
      finish();
    }

    return started;
  }

  function startCommandListeningAfterWake() {
    onOpenChange?.(true);
    setListenPhase("wake-pending");
    setLiveTranscript("");

    const acknowledgement = t("assistant.wakeAcknowledgement");
    setEntries((current) => [...current.slice(-5), createEntry("assistant", acknowledgement)]);

    speakAssistantReply(acknowledgement, () => {
      setListenPhase("idle");
      startListening("command").catch(() => {
        setStatusError(t("assistant.recognitionFailed"));
        setIsListening(false);
        setListenPhase("idle");
      });
    });
  }

  function startShortcutCommandFlow() {
    onOpenChange?.(true);
    setListenPhase("shortcut-pending");
    setStatusError("");
    setLiveTranscript("");

    const acknowledgement = t("assistant.shortcutAcknowledgement");
    setEntries((current) => [...current.slice(-5), createEntry("assistant", acknowledgement)]);

    speakAssistantReply(acknowledgement, () => {
      setListenPhase("idle");
      startListening("command").catch(() => {
        setStatusError(t("assistant.recognitionFailed"));
        setIsListening(false);
        setListenPhase("idle");
      });
    });
  }

  async function finalizeDraftMessage(session, content) {
    setDraftSession(null);

    if (onFinalizeDraftMessage) {
      setStatusError("");
      setIsThinking(true);
      setEntries((current) => [...current.slice(-5), createEntry("user", content)]);
      setLiveTranscript(content);

      try {
        const response = await onFinalizeDraftMessage(session, content);
        setEntries((current) => [...current.slice(-5), createEntry("assistant", response.message)]);
        speakAssistantReply(response.message, () => {
          setLiveTranscript("");
          scheduleWakeListenerRestart();
        });
        setLiveTranscript("");
        return;
      } catch (error) {
        setStatusError(error.message);
        throw error;
      } finally {
        setIsThinking(false);
      }
    }

    const prompt =
      language === "vi"
        ? `nhắn cho ${session.targetDisplayName}: ${content}`
        : `send a message to ${session.targetDisplayName}: ${content}`;

    await submitPrompt(prompt, { entryText: content });
  }

  async function startListening(mode = "wake", options = {}) {
    const { background = false, suppressErrors = false } = options;

    if (!recognitionCtor) {
      if (!suppressErrors) {
        setStatusError(t("assistant.recognitionUnsupported"));
        onOpenChange?.(true);
      }
      return;
    }

    if (!window.isSecureContext) {
      if (!suppressErrors) {
        setStatusError(t("assistant.secureContextRequired"));
        onOpenChange?.(true);
      }
      return;
    }

    const hasMicrophoneAccess = await ensureMicrophoneAccess();
    if (!hasMicrophoneAccess) {
      if (!suppressErrors) {
        onOpenChange?.(true);
      }
      return;
    }

    setStatusError("");
    setLiveTranscript(mode === "draft" ? messageDraftSessionRef.current?.content ?? "" : "");
    setListenPhase(mode);
    listeningModeRef.current = mode;
    backgroundWakeModeRef.current = background && mode === "wake";
    wakeDetectedRef.current = false;
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    heardSpeechRef.current = false;
    shouldSubmitOnEndRef.current = mode === "command";
    lastRecognitionErrorRef.current = "";

    if (noSpeechTimerRef.current) {
      window.clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }

    const recognition = new recognitionCtor();
    recognition.lang = language === "vi" ? "vi-VN" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!backgroundWakeModeRef.current) {
        onOpenChange?.(true);
      }
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = finalTranscriptRef.current;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript ?? "";
        if (transcript.trim()) {
          heardSpeechRef.current = true;
        }

        if (event.results[index].isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else {
          interimTranscript += transcript;
        }
      }

      finalTranscriptRef.current = finalTranscript.trim();
      interimTranscriptRef.current = interimTranscript.trim();
      setStatusError("");
      if (!backgroundWakeModeRef.current || mode !== "wake") {
        setLiveTranscript(`${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim());
      }

      if (mode === "draft" && `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim()) {
        clearDraftAutoSubmitTimer();
      }

      if (
        mode === "wake" &&
        containsWakePhrase(`${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim(), t("assistant.title"))
      ) {
        wakeDetectedRef.current = true;
        shouldSubmitOnEndRef.current = false;
        recognition.stop();
      }
    };

    recognition.onerror = (event) => {
      lastRecognitionErrorRef.current = event.error ?? "unknown";

      if (event.error === "aborted") {
        return;
      }

      if (mode === "wake" && event.error === "no-speech") {
        return;
      }

      if (event.error === "no-speech" && heardSpeechRef.current) {
        return;
      }

      if (!suppressErrors) {
        setStatusError(mapRecognitionError(event.error, t));
      }
      setIsListening(false);
    };

    recognition.onend = async () => {
      const completedMode = listeningModeRef.current;
      const finalTranscript = finalTranscriptRef.current.trim();
      const interimTranscript = interimTranscriptRef.current.trim();
      const transcriptToSubmit = finalTranscript || interimTranscript;
      const shouldSubmit = shouldSubmitOnEndRef.current;

      recognitionRef.current = null;
      listeningModeRef.current = "idle";
      backgroundWakeModeRef.current = false;
      shouldSubmitOnEndRef.current = false;
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      setIsListening(false);
      setListenPhase("idle");

      if (completedMode === "wake") {
        if (wakeDetectedRef.current) {
          wakeDetectedRef.current = false;
          setStatusError("");
          startCommandListeningAfterWake();
          return;
        }

        if (!transcriptToSubmit && !lastRecognitionErrorRef.current && !heardSpeechRef.current) {
          scheduleWakeListenerRestart(250);
          return;
        }

        if (transcriptToSubmit) {
          setStatusError(t("assistant.wakePhraseRequired"));
          scheduleWakeListenerRestart();
        }

        heardSpeechRef.current = false;
        return;
      }

      if (completedMode === "draft") {
        if (autoFinalizingDraftRef.current) {
          heardSpeechRef.current = false;
          return;
        }

        const currentDraftSession = messageDraftSessionRef.current;

        if (!currentDraftSession) {
          heardSpeechRef.current = false;
          return;
        }

        if (transcriptToSubmit) {
          const updatedDraftSession = {
            ...currentDraftSession,
            content: `${currentDraftSession.content} ${transcriptToSubmit}`.trim()
          };

          setDraftSession(updatedDraftSession);
          setStatusError("");
          setLiveTranscript(updatedDraftSession.content);
          scheduleDraftAutoSubmit(updatedDraftSession);
          heardSpeechRef.current = false;
          startListening("draft").catch(() => {
            setStatusError(t("assistant.recognitionFailed"));
            setIsListening(false);
            setListenPhase("idle");
          });
          return;
        }

        if (currentDraftSession.content && draftAutoSubmitTimerRef.current) {
          heardSpeechRef.current = false;
          startListening("draft").catch(() => {
            setStatusError(t("assistant.recognitionFailed"));
            setIsListening(false);
            setListenPhase("idle");
          });
          return;
        }

        if (!lastRecognitionErrorRef.current && !heardSpeechRef.current) {
          noSpeechTimerRef.current = window.setTimeout(() => {
            setStatusError(t("assistant.noSpeech"));
            noSpeechTimerRef.current = null;
          }, 900);
        }

        heardSpeechRef.current = false;
        return;
      }

      if (completedMode === "recipient") {
        if (transcriptToSubmit) {
          setStatusError("");
          try {
            await submitPrompt(buildRecipientPrompt(transcriptToSubmit), { entryText: transcriptToSubmit });
          } catch {
            setListenPhase("recipient-pending");
            speakAssistantReply(
              t("assistant.recipientNotFound", { name: transcriptToSubmit }),
              () => {
                setListenPhase("idle");
                startListening("recipient").catch(() => {
                  setStatusError(t("assistant.recognitionFailed"));
                  setIsListening(false);
                  setListenPhase("idle");
                });
              }
            );
          }
          heardSpeechRef.current = false;
          return;
        }

        if (!lastRecognitionErrorRef.current && !heardSpeechRef.current) {
          noSpeechTimerRef.current = window.setTimeout(() => {
            setStatusError(t("assistant.noSpeech"));
            noSpeechTimerRef.current = null;
          }, 900);
        }

        heardSpeechRef.current = false;
        return;
      }

      if (shouldSubmit && transcriptToSubmit) {
        setStatusError("");
        await submitPrompt(transcriptToSubmit);
        return;
      }

      if (!transcriptToSubmit && !lastRecognitionErrorRef.current && !heardSpeechRef.current) {
        scheduleWakeListenerRestart(250);
      }

      heardSpeechRef.current = false;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      listeningModeRef.current = "idle";
      backgroundWakeModeRef.current = false;
      shouldSubmitOnEndRef.current = false;
      finalTranscriptRef.current = "";
      lastRecognitionErrorRef.current = error?.name?.toLowerCase?.() ?? "unknown";
      setIsListening(false);
      setListenPhase("idle");
      if (!suppressErrors) {
        setStatusError(mapRecognitionError(lastRecognitionErrorRef.current, t));
        onOpenChange?.(true);
      }
    }
  }

  function handleVoiceButtonClick() {
    if (isVoiceSessionActive) {
      if (backgroundWakeModeRef.current && listeningModeRef.current === "wake") {
        stopListening(false);
        onOpenChange?.(true);
        startShortcutCommandFlow();
        return;
      }

      stopListening(true);
      return;
    }

    handsFreePausedRef.current = false;
    onOpenChange?.(true);
    startShortcutCommandFlow();
  }

  function handleManualSubmit(event) {
    event.preventDefault();
    submitPrompt(draft).catch(() => {});
  }

  function getStatusLabel() {
    if (statusError) {
      return statusError;
    }

    if (listenPhase === "wake-pending") {
      return t("assistant.statusWakeDetected");
    }

    if (listenPhase === "draft-pending") {
      return t("assistant.statusDraftPreparing");
    }

    if (listenPhase === "recipient-pending") {
      return t("assistant.statusRecipientPreparing");
    }

    if (listenPhase === "shortcut-pending") {
      return t("assistant.statusShortcutPreparing");
    }

    if (isListening) {
      if (listenPhase === "command") {
        return t("assistant.statusCommandListening");
      }

      if (listenPhase === "recipient") {
        return t("assistant.statusRecipientListening");
      }

      if (listenPhase === "draft") {
        return t("assistant.statusDraftListening", { name: messageDraftSession?.targetDisplayName ?? t("assistant.title") });
      }

      return t("assistant.statusWakeListening");
    }

    if (isThinking) {
      return t("assistant.statusThinking");
    }

    if (isSpeaking) {
      return t("assistant.statusSpeaking");
    }

    return isClearEnabled
      ? t("assistant.statusIdle")
      : t("assistant.statusIdleShortcutOnly");
  }

  return null;
}

export default ClearAssistantPanel;
