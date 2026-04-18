import { useEffect, useMemo, useRef, useState } from "react";
import { toAssetUrl, voiceApi } from "../services/api";
import { chatSignalR } from "../services/signalr";

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
  currentChannel
}) {
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
  const previousChannelIdRef = useRef(currentChannel?.id ?? null);
  const isJoinedRef = useRef(false);

  useEffect(() => {
    channelIdRef.current = currentChannel?.id ?? null;
  }, [currentChannel?.id]);

  useEffect(() => {
    isJoinedRef.current = isJoined;
  }, [isJoined]);

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
        const nextParticipants = await voiceApi.getParticipants(currentChannel.id);
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
      setParticipants(payload);
    });

    const unsubscribeSignals = chatSignalR.onWebRtcSignal((signal) => {
      if (signal.channelId !== channelIdRef.current) {
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
      leaveVoiceChannel();
    }
  }, [currentChannel?.id]);

  useEffect(() => {
    return () => {
      leaveVoiceChannel();
    };
  }, []);

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
        video: true
      });

      screenStreamRef.current = screenStream;
      videoTrack = screenStream.getVideoTracks()[0] ?? null;

      if (videoTrack) {
        videoTrack.onended = () => {
          handleToggleScreenShare(false);
        };
      }
    } else if (nextCameraEnabled) {
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

    for (const connection of peerConnectionsRef.current.values()) {
      const senders = connection.getSenders();
      const audioSender = senders.find((sender) => sender.track?.kind === "audio");
      const videoSender = senders.find((sender) => sender.track?.kind === "video");

      if (audioSender && audioTrack) {
        await audioSender.replaceTrack(audioTrack);
      } else if (!audioSender && audioTrack) {
        connection.addTrack(audioTrack, stream);
      }

      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack);
      } else if (!videoSender && videoTrack) {
        connection.addTrack(videoTrack, stream);
      }

      if (audioSender && !audioTrack) {
        await audioSender.replaceTrack(null);
      }

      if (videoSender && !videoTrack) {
        await videoSender.replaceTrack(null);
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

      chatSignalR.sendWebRtcSignal({
        channelId: channelIdRef.current,
        targetUserId,
        type: "IceCandidate",
        payload: JSON.stringify(event.candidate)
      });
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
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    await chatSignalR.sendWebRtcSignal({
      channelId: channelIdRef.current,
      targetUserId,
      type: "Offer",
      payload: JSON.stringify(offer)
    });
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

        await chatSignalR.sendWebRtcSignal({
          channelId: channelIdRef.current,
          targetUserId: signal.sourceUserId,
          type: "Answer",
          payload: JSON.stringify(answer)
        });

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

      const nextParticipants = await chatSignalR.joinVoiceChannel(currentChannel.id, {
        isMuted,
        isCameraEnabled,
        isScreenSharing
      });

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
          await chatSignalR.sendWebRtcSignal({
            channelId: channelIdRef.current,
            targetUserId: userId,
            type: "Hangup",
            payload: "{}"
          });
        }

        await chatSignalR.leaveVoiceChannel(channelIdRef.current);
      }
    } catch (requestError) {
      console.warn("Failed to leave voice channel cleanly.", requestError);
    } finally {
      clearPeerConnections();
      cleanupLocalMedia();
      setRemoteStreams({});
      setIsJoined(false);
    }
  }

  async function handleToggleMute() {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    if (isJoined) {
      await chatSignalR.updateVoiceState(currentChannel.id, {
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
        await chatSignalR.updateVoiceState(currentChannel.id, {
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
        await chatSignalR.updateVoiceState(currentChannel.id, {
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
    return (
      <section className="feature-panel">
        <div className="empty-panel">
          <p>Select a voice channel to open the call workspace.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="feature-panel">
      <div className="feature-panel-header">
        <div>
          <p className="eyebrow">Voice + Video</p>
          <h2>Peer-to-peer call workspace for {currentChannel.name}</h2>
        </div>

        <div className="inline-actions">
          {!isJoined ? (
            <button type="button" className="primary-button" onClick={joinVoiceChannel} disabled={isBusy}>
              {isBusy ? "Joining..." : "Join call"}
            </button>
          ) : (
            <button type="button" className="ghost-button danger" onClick={leaveVoiceChannel}>
              Leave call
            </button>
          )}
        </div>
      </div>

      <div className="voice-toolbar">
        <button type="button" className={`ghost-button ${isMuted ? "danger" : ""}`} onClick={handleToggleMute} disabled={isBusy}>
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button type="button" className={`ghost-button ${isCameraEnabled ? "active" : ""}`} onClick={handleToggleCamera} disabled={isBusy}>
          {isCameraEnabled ? "Turn camera off" : "Turn camera on"}
        </button>
        <button type="button" className={`ghost-button ${isScreenSharing ? "active" : ""}`} onClick={() => handleToggleScreenShare()} disabled={isBusy}>
          {isScreenSharing ? "Stop share" : "Share screen"}
        </button>
        <span className="mini-pill">{participants.length} participants</span>
      </div>

      <div className="media-grid">
        <MediaTile
          title={`${currentUser.displayName} (you)`}
          subtitle={`${isMuted ? "Muted" : "Mic live"}${isScreenSharing ? " - Sharing screen" : isCameraEnabled ? " - Camera on" : ""}`}
          stream={localStream}
          avatarUrl={currentUser.avatarUrl}
          isLocal
        />

        {remoteTiles.map((participant) => (
          <MediaTile
            key={participant.userId}
            title={participant.displayName}
            subtitle={`${participant.isMuted ? "Muted" : "Mic live"}${participant.isScreenSharing ? " - Sharing screen" : participant.isCameraEnabled ? " - Camera on" : ""}`}
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
