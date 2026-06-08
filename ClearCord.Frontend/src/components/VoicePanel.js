import { useEffect, useMemo, useRef, useState } from "react";
import { directApi, toAssetUrl, voiceApi } from "../services/api";
import { chatSignalR } from "../services/signalr";
import { useI18n } from "../i18n";

const RTC_CONFIGURATION = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

function MediaTile({ title, subtitle, stream, avatarUrl, isLocal }) {
  const mediaRef = useRef(null);
  const hasVideo = stream?.getVideoTracks?.().length > 0;
  const hasAudio = stream?.getAudioTracks?.().length > 0;

  useEffect(() => {
    if (!mediaRef.current) {
      return;
    }

    mediaRef.current.srcObject = stream ?? null;
  }, [stream]);

  return (
    <article className={`media-tile ${isLocal ? "local" : ""}`}>
      <div className="media-stage">
        {stream ? (
          <>
            {hasVideo ? (
              <video ref={mediaRef} autoPlay playsInline muted={isLocal} />
            ) : (
              <div className="media-placeholder">
                {avatarUrl ? <img src={toAssetUrl(avatarUrl)} alt={title} className="avatar-image" /> : <span>{title?.[0]?.toUpperCase() || "U"}</span>}
              </div>
            )}
            {hasAudio && !hasVideo && <audio ref={mediaRef} autoPlay muted={isLocal} />}
          </>
        ) : (
          <div className="media-placeholder">
            {avatarUrl ? <img src={toAssetUrl(avatarUrl)} alt={title} className="avatar-image" /> : <span>{title?.[0]?.toUpperCase() || "U"}</span>}
          </div>
        )}
      </div>
      <div className="media-copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </article>
  );
}

function VoicePanel({
  currentUser,
  currentChannel,
  autoJoin = false,
  compact = false,
  hidden = false,
  onClose,
  onParticipantsChange
}) {
  const { t } = useI18n();
  const [participants, setParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState("");
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const screenStreamRef = useRef(null);
  const channelIdRef = useRef(currentChannel?.id ?? null);
  const isDirectRef = useRef(Boolean(currentChannel?.isDirect));
  const previousChannelIdRef = useRef(currentChannel?.id ?? null);
  const isJoinedRef = useRef(false);
  const autoJoinChannelIdRef = useRef(null);

  useEffect(() => {
    channelIdRef.current = currentChannel?.id ?? null;
    isDirectRef.current = Boolean(currentChannel?.isDirect);
  }, [currentChannel?.id, currentChannel?.isDirect]);

  useEffect(() => {
    isJoinedRef.current = isJoined;
  }, [isJoined]);

  useEffect(() => {
    onParticipantsChange?.(participants, currentChannel);
  }, [currentChannel, onParticipantsChange, participants]);

  const remoteTiles = useMemo(
    () =>
      participants
        .filter((participant) => participant.userId !== currentUser.id)
        .map((participant) => ({
          ...participant,
          stream: remoteStreams[participant.userId] ?? null
        })),
    [currentUser.id, participants, remoteStreams]
  );

  useEffect(() => {
    if (!currentChannel) {
      return undefined;
    }

    let isMounted = true;

    async function loadParticipants() {
      try {
        const nextParticipants = currentChannel.isDirect
          ? await directApi.getVoiceParticipants(currentChannel.id)
          : await voiceApi.getParticipants(currentChannel.id);
        if (isMounted) {
          setParticipants(nextParticipants);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message);
        }
      }
    }

    loadParticipants();

    return () => {
      isMounted = false;
    };
  }, [currentChannel]);

  useEffect(() => {
    const unsubscribeParticipants = chatSignalR.onVoiceParticipantsUpdated((payload) => {
      const matchesTarget = isDirectRef.current
        ? payload.directConversationId === channelIdRef.current
        : payload.channelId === channelIdRef.current;

      if (matchesTarget || (!payload.channelId && !payload.directConversationId)) {
        setParticipants(payload.participants ?? payload);
      }
    });

    const unsubscribeSignals = chatSignalR.onWebRtcSignal((signal) => {
      const matchesTarget = isDirectRef.current
        ? signal.directConversationId === channelIdRef.current
        : signal.channelId === channelIdRef.current;

      if (!matchesTarget) {
        return;
      }

      handleWebRtcSignal(signal);
    });

    return () => {
      unsubscribeParticipants();
      unsubscribeSignals();
    };
  }, []);

  useEffect(() => {
    const previousChannelId = previousChannelIdRef.current;
    previousChannelIdRef.current = currentChannel?.id ?? null;

    if (previousChannelId && previousChannelId !== currentChannel?.id) {
      autoJoinChannelIdRef.current = null;
      leaveVoiceChannel();
    }
  }, [currentChannel?.id]);

  useEffect(() => {
    return () => {
      leaveVoiceChannel();
      onParticipantsChange?.([], currentChannel);
    };
  }, []);

  useEffect(() => {
    if (!autoJoin || !currentChannel || autoJoinChannelIdRef.current === currentChannel.id) {
      return;
    }

    autoJoinChannelIdRef.current = currentChannel.id;
    joinVoiceChannel();
  }, [autoJoin, currentChannel?.id]);

  useEffect(() => {
    if (!isJoined) {
      clearPeerConnections();
      setRemoteStreams({});
      return;
    }

    syncPeerConnections(participants);
  }, [isJoined, participants]);

  async function syncLocalStreamOptions(nextState) {
    const nextMuted = nextState.isMuted ?? isMuted;
    const nextCameraEnabled = nextState.isCameraEnabled ?? isCameraEnabled;
    const nextScreenSharing = nextState.isScreenSharing ?? isScreenSharing;

    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });

    const audioTrack = audioStream.getAudioTracks()[0];
    audioTrack.enabled = !nextMuted;

    let videoTrack = null;

    if (nextScreenSharing) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      screenStreamRef.current = screenStream;
      videoTrack = screenStream.getVideoTracks()[0] ?? null;

      if (videoTrack) {
        videoTrack.onended = () => {
          handleToggleScreenShare(false);
        };
      }
    } else {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (!nextScreenSharing && nextCameraEnabled) {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
      });
      videoTrack = cameraStream.getVideoTracks()[0] ?? null;
    }

    const nextStream = new MediaStream(
      [audioTrack, videoTrack].filter(Boolean)
    );

    const previousStream = localStreamRef.current;
    localStreamRef.current = nextStream;
    setLocalStream(nextStream);

    await syncTracksAcrossPeers(nextStream);

    if (previousStream) {
      previousStream.getTracks().forEach((track) => track.stop());
    }
  }

  async function syncTracksAcrossPeers(stream) {
    const audioTrack = stream.getAudioTracks()[0] ?? null;
    const videoTrack = stream.getVideoTracks()[0] ?? null;

    for (const [targetUserId, connection] of peerConnectionsRef.current.entries()) {
      let shouldRenegotiate = false;
      const senders = connection.getSenders();
      const audioSender = senders.find((sender) => sender.track?.kind === "audio");
      const videoSender = senders.find((sender) => sender.track?.kind === "video");

      if (audioSender && audioTrack) {
        await audioSender.replaceTrack(audioTrack);
      } else if (!audioSender && audioTrack) {
        connection.addTrack(audioTrack, stream);
        shouldRenegotiate = true;
      }

      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack);
      } else if (!videoSender && videoTrack) {
        connection.addTrack(videoTrack, stream);
        shouldRenegotiate = true;
      }

      if (audioSender && !audioTrack) {
        await audioSender.replaceTrack(null);
      }

      if (videoSender && !videoTrack) {
        await videoSender.replaceTrack(null);
      }

      if (shouldRenegotiate) {
        await renegotiatePeerConnection(targetUserId, connection);
      }
    }
  }

  function clearPeerConnections() {
    for (const connection of peerConnectionsRef.current.values()) {
      connection.close();
    }

    peerConnectionsRef.current.clear();
  }

  function cleanupLocalMedia() {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStream(null);
  }

  function removeRemoteStream(userId) {
    setRemoteStreams((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
  }

  async function sendWebRtcSignal(targetUserId, type, payload) {
    if (!channelIdRef.current) {
      return;
    }

    if (isDirectRef.current) {
      await chatSignalR.sendDirectWebRtcSignal({
        directConversationId: channelIdRef.current,
        targetUserId,
        type,
        payload
      });
      return;
    }

    await chatSignalR.sendWebRtcSignal({
      channelId: channelIdRef.current,
      targetUserId,
      type,
      payload
    });
  }

  async function updateCurrentVoiceState(nextState) {
    if (!currentChannel) {
      return [];
    }

    return currentChannel.isDirect
      ? chatSignalR.updateDirectVoiceState(currentChannel.id, nextState)
      : chatSignalR.updateVoiceState(currentChannel.id, nextState);
  }

  function ensurePeerConnection(targetUserId) {
    if (peerConnectionsRef.current.has(targetUserId)) {
      return peerConnectionsRef.current.get(targetUserId);
    }

    const connection = new RTCPeerConnection(RTC_CONFIGURATION);

    localStreamRef.current?.getTracks().forEach((track) => {
      connection.addTrack(track, localStreamRef.current);
    });

    connection.onicecandidate = (event) => {
      if (!event.candidate || !channelIdRef.current) {
        return;
      }

      sendWebRtcSignal(targetUserId, "IceCandidate", JSON.stringify(event.candidate));
    };

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) {
        return;
      }

      setRemoteStreams((current) => ({
        ...current,
        [targetUserId]: stream
      }));
    };

    connection.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(connection.connectionState)) {
        connection.close();
        peerConnectionsRef.current.delete(targetUserId);
        removeRemoteStream(targetUserId);
      }
    };

    peerConnectionsRef.current.set(targetUserId, connection);
    return connection;
  }

  async function createOfferFor(targetUserId) {
    const connection = ensurePeerConnection(targetUserId);
    await renegotiatePeerConnection(targetUserId, connection);
  }

  async function renegotiatePeerConnection(targetUserId, connection) {
    if (connection.signalingState !== "stable") {
      return;
    }

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    await sendWebRtcSignal(targetUserId, "Offer", JSON.stringify(offer));
  }

  function shouldCreateOffer(remoteUserId) {
    return currentUser.id.localeCompare(remoteUserId) > 0;
  }

  function syncPeerConnections(nextParticipants) {
    const remoteParticipants = nextParticipants.filter(
      (participant) => participant.userId !== currentUser.id
    );

    const activeUserIds = new Set(remoteParticipants.map((participant) => participant.userId));

    for (const [userId, connection] of peerConnectionsRef.current.entries()) {
      if (!activeUserIds.has(userId)) {
        connection.close();
        peerConnectionsRef.current.delete(userId);
        removeRemoteStream(userId);
      }
    }

    remoteParticipants.forEach((participant) => {
      if (!peerConnectionsRef.current.has(participant.userId) && shouldCreateOffer(participant.userId)) {
        createOfferFor(participant.userId).catch((requestError) => {
          setError(requestError.message);
        });
      }
    });
  }

  async function handleWebRtcSignal(signal) {
    try {
      const connection = ensurePeerConnection(signal.sourceUserId);

      if (signal.type === "Offer") {
        const offer = JSON.parse(signal.payload);
        await connection.setRemoteDescription(offer);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        await sendWebRtcSignal(signal.sourceUserId, "Answer", JSON.stringify(answer));

        return;
      }

      if (signal.type === "Answer") {
        await connection.setRemoteDescription(JSON.parse(signal.payload));
        return;
      }

      if (signal.type === "IceCandidate") {
        const candidate = JSON.parse(signal.payload);
        await connection.addIceCandidate(candidate);
        return;
      }

      if (signal.type === "Hangup") {
        connection.close();
        peerConnectionsRef.current.delete(signal.sourceUserId);
        removeRemoteStream(signal.sourceUserId);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function joinVoiceChannel() {
    if (!currentChannel) {
      return;
    }

    setError("");
    setIsBusy(true);

    try {
      await chatSignalR.start();
      await syncLocalStreamOptions({
        isMuted,
        isCameraEnabled,
        isScreenSharing
      });

      const voiceState = {
        isMuted,
        isCameraEnabled,
        isScreenSharing
      };
      const nextParticipants = currentChannel.isDirect
        ? await chatSignalR.joinDirectVoice(currentChannel.id, voiceState)
        : await chatSignalR.joinVoiceChannel(currentChannel.id, voiceState);

      setParticipants(nextParticipants);
      setIsJoined(true);
    } catch (requestError) {
      cleanupLocalMedia();
      setError(requestError.message);
    } finally {
      setIsBusy(false);
    }
  }

  async function leaveVoiceChannel() {
    try {
      if (channelIdRef.current && isJoinedRef.current) {
        for (const userId of peerConnectionsRef.current.keys()) {
          await sendWebRtcSignal(userId, "Hangup", "{}");
        }

        if (isDirectRef.current) {
          await chatSignalR.leaveDirectVoice(channelIdRef.current);
        } else {
          await chatSignalR.leaveVoiceChannel(channelIdRef.current);
        }
      }
    } catch (requestError) {
      console.warn("Failed to leave voice channel cleanly.", requestError);
    } finally {
      clearPeerConnections();
      cleanupLocalMedia();
      setRemoteStreams({});
      setParticipants([]);
      setIsJoined(false);
    }
  }

  async function handleLeaveAndClose() {
    await leaveVoiceChannel();
    onClose?.();
  }

  async function handleToggleMute() {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    if (isJoined) {
      await updateCurrentVoiceState({
        isMuted: nextMuted,
        isCameraEnabled,
        isScreenSharing
      });
    }
  }

  async function handleToggleCamera() {
    const nextCameraEnabled = !isCameraEnabled;
    setIsCameraEnabled(nextCameraEnabled);
    setIsBusy(true);

    try {
      await syncLocalStreamOptions({
        isMuted,
        isCameraEnabled: nextCameraEnabled,
        isScreenSharing
      });

      if (isJoined) {
        await updateCurrentVoiceState({
          isMuted,
          isCameraEnabled: nextCameraEnabled,
          isScreenSharing
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggleScreenShare(forceValue) {
    const nextScreenSharing = typeof forceValue === "boolean" ? forceValue : !isScreenSharing;
    setIsScreenSharing(nextScreenSharing);
    setIsBusy(true);

    try {
      await syncLocalStreamOptions({
        isMuted,
        isCameraEnabled,
        isScreenSharing: nextScreenSharing
      });

      if (isJoined) {
        await updateCurrentVoiceState({
          isMuted,
          isCameraEnabled,
          isScreenSharing: nextScreenSharing
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsBusy(false);
    }
  }

  if (!currentChannel) {
    return compact ? null : (
      <section className="feature-panel">
        <div className="empty-panel">
          <p>{t("voice.empty")}</p>
        </div>
      </section>
    );
  }

  if (hidden) {
    return (
      <section className="voice-hidden-media" aria-hidden="true">
        {remoteTiles.map((participant) => (
          <MediaTile
            key={participant.userId}
            title={participant.displayName}
            subtitle=""
            stream={participant.stream}
            avatarUrl={participant.avatarUrl}
          />
        ))}
      </section>
    );
  }

  if (compact) {
    return (
      <section className="voice-compact-panel">
        <div className="voice-compact-copy">
          <span className="material-symbols-outlined">volume_up</span>
          <div>
            <strong>{currentChannel.name}</strong>
            <p>
              {error || (isBusy ? t("voice.joining") : t("voice.participants", { count: participants.length }))}
            </p>
          </div>
        </div>

        <div className="voice-compact-actions">
          {!isJoined && (
            <button type="button" onClick={joinVoiceChannel} disabled={isBusy} title={t("voice.joinCall")}>
              <span className="material-symbols-outlined">call</span>
            </button>
          )}
          <button type="button" onClick={handleToggleMute} disabled={isBusy || !isJoined} title={isMuted ? t("voice.unmute") : t("voice.mute")}>
            <span className="material-symbols-outlined">{isMuted ? "mic_off" : "mic"}</span>
          </button>
          <button type="button" onClick={handleToggleCamera} disabled={isBusy || !isJoined} title={isCameraEnabled ? t("voice.turnCameraOff") : t("voice.turnCameraOn")}>
            <span className="material-symbols-outlined">{isCameraEnabled ? "videocam" : "videocam_off"}</span>
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              handleLeaveAndClose();
            }}
            title={t("voice.leaveCall")}
          >
            <span className="material-symbols-outlined">call_end</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <p className="eyebrow">{t("voice.eyebrow")}</p>
          <h2>{t("voice.title", { channel: currentChannel.name })}</h2>
        </div>

        <div className="inline-actions">
          {!isJoined ? (
            <button type="button" className="primary-button" onClick={joinVoiceChannel} disabled={isBusy}>
              {isBusy ? t("voice.joining") : t("voice.joinCall")}
            </button>
          ) : (
            <button type="button" className="ghost-button danger" onClick={handleLeaveAndClose}>
              {t("voice.leaveCall")}
            </button>
          )}
        </div>
      </div>

      <div className="voice-toolbar">
        <button type="button" className={`ghost-button ${isMuted ? "danger" : ""}`} onClick={handleToggleMute} disabled={isBusy}>
          {isMuted ? t("voice.unmute") : t("voice.mute")}
        </button>
        <button type="button" className={`ghost-button ${isCameraEnabled ? "active" : ""}`} onClick={handleToggleCamera} disabled={isBusy}>
          {isCameraEnabled ? t("voice.turnCameraOff") : t("voice.turnCameraOn")}
        </button>
        <button type="button" className={`ghost-button ${isScreenSharing ? "active" : ""}`} onClick={() => handleToggleScreenShare()} disabled={isBusy}>
          {isScreenSharing ? t("voice.stopShare") : t("voice.shareScreen")}
        </button>
        <span className="mini-pill">{t("voice.participants", { count: participants.length })}</span>
      </div>

      <div className="media-grid">
        <MediaTile
          title={t("voice.you", { name: currentUser.displayName })}
          subtitle={`${isMuted ? t("voice.muted") : t("voice.micLive")}${isScreenSharing ? ` - ${t("voice.sharingScreen")}` : isCameraEnabled ? ` - ${t("voice.cameraOn")}` : ""}`}
          stream={localStream}
          avatarUrl={currentUser.avatarUrl}
          isLocal
        />

        {remoteTiles.map((participant) => (
          <MediaTile
            key={participant.userId}
            title={participant.displayName}
            subtitle={`${participant.isMuted ? t("voice.muted") : t("voice.micLive")}${participant.isScreenSharing ? ` - ${t("voice.sharingScreen")}` : participant.isCameraEnabled ? ` - ${t("voice.cameraOn")}` : ""}`}
            stream={participant.stream}
            avatarUrl={participant.avatarUrl}
          />
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

export default VoicePanel;
