let audioContext = null;
let lastPlaybackAt = 0;
let audioUnlocked = false;
const audioElementCache = new Map();
const audioDataUrlCache = new Map();

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

function clampVolume(volume) {
  if (Number.isNaN(volume)) {
    return 1;
  }

  return Math.max(0, Math.min(1, volume));
}

function scheduleTone(context, startTime, frequency, duration, gainValue) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.04);
}

function getToneSequence(kind, volume) {
  if (kind === "call") {
    return [
      { offset: 0, frequency: 740, duration: 0.22, gain: 0.12 * volume },
      { offset: 0.28, frequency: 880, duration: 0.22, gain: 0.12 * volume },
      { offset: 0.92, frequency: 740, duration: 0.22, gain: 0.12 * volume },
      { offset: 1.2, frequency: 880, duration: 0.22, gain: 0.12 * volume }
    ];
  }

  return [
    { offset: 0, frequency: 880, duration: 0.16, gain: 0.11 * volume },
    { offset: 0.18, frequency: 1175, duration: 0.16, gain: 0.09 * volume }
  ];
}

function createWavDataUrl(sequence, cacheKey) {
  if (audioDataUrlCache.has(cacheKey)) {
    return audioDataUrlCache.get(cacheKey);
  }

  const sampleRate = 22050;
  const totalDuration = sequence.reduce(
    (maxDuration, tone) => Math.max(maxDuration, tone.offset + tone.duration),
    0
  ) + 0.14;
  const frameCount = Math.ceil(totalDuration * sampleRate);
  const samples = new Float32Array(frameCount);

  sequence.forEach(({ offset, frequency, duration, gain }) => {
    const startFrame = Math.floor(offset * sampleRate);
    const endFrame = Math.min(frameCount, Math.floor((offset + duration) * sampleRate));

    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const elapsed = (frame - startFrame) / sampleRate;
      const fadeIn = Math.min(1, elapsed / 0.018);
      const fadeOut = Math.min(1, (duration - elapsed) / 0.04);
      const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
      samples[frame] += Math.sin(2 * Math.PI * frequency * elapsed) * gain * envelope;
    }
  });

  const pcmBytes = new Uint8Array(44 + frameCount * 2);
  const view = new DataView(pcmBytes.buffer);
  const writeText = (offset, text) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + frameCount * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, frameCount * 2, true);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const clampedSample = Math.max(-1, Math.min(1, samples[frame]));
    view.setInt16(44 + frame * 2, clampedSample * 32767, true);
  }

  let binary = "";
  pcmBytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  const dataUrl = `data:audio/wav;base64,${window.btoa(binary)}`;
  audioDataUrlCache.set(cacheKey, dataUrl);
  return dataUrl;
}

function getFallbackAudio(kind, volume) {
  if (typeof window === "undefined" || typeof window.Audio === "undefined") {
    return null;
  }

  const safeVolume = clampVolume(volume);
  const cacheKey = `${kind}-${Math.round(safeVolume * 100)}`;

  if (!audioElementCache.has(cacheKey)) {
    const audio = new window.Audio(createWavDataUrl(getToneSequence(kind, safeVolume), cacheKey));
    audio.preload = "auto";
    audioElementCache.set(cacheKey, audio);
  }

  const audio = audioElementCache.get(cacheKey);
  audio.volume = safeVolume;
  audio.currentTime = 0;
  return audio;
}

async function playFallbackAudio(kind, volume) {
  const audio = getFallbackAudio(kind, volume);
  if (!audio) {
    return false;
  }

  try {
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

function unlockAudioOutputs() {
  audioUnlocked = true;
  const context = getAudioContext();

  if (context && context.state !== "running") {
    context.resume().catch(() => {});
  }

  audioElementCache.forEach((audio) => {
    audio.load();
  });
}

export function primeNotificationAudio() {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("pointerdown", unlockAudioOutputs, { passive: true });
  window.addEventListener("mousedown", unlockAudioOutputs);
  window.addEventListener("touchstart", unlockAudioOutputs, { passive: true });
  window.addEventListener("keydown", unlockAudioOutputs);

  return () => {
    window.removeEventListener("pointerdown", unlockAudioOutputs);
    window.removeEventListener("mousedown", unlockAudioOutputs);
    window.removeEventListener("touchstart", unlockAudioOutputs);
    window.removeEventListener("keydown", unlockAudioOutputs);
  };
}

export function isCallNotification(notification) {
  const title = notification?.title?.toLowerCase?.() ?? "";
  const content = notification?.content?.toLowerCase?.() ?? "";
  const relatedEntityType = notification?.relatedEntityType?.toLowerCase?.() ?? "";

  return relatedEntityType === "directconversation" && (title.includes("call") || content.includes("join the call"));
}

export async function playNotificationChime(kind = "message", volume = 1) {
  const safeVolume = clampVolume(volume);
  if (safeVolume <= 0) {
    return false;
  }

  const now = Date.now();
  const minimumInterval = kind === "call" ? 900 : 250;
  if (now - lastPlaybackAt < minimumInterval) {
    return false;
  }

  const context = getAudioContext();
  if (context) {
    try {
      if (context.state !== "running" && audioUnlocked) {
        await context.resume();
      }
    } catch {
      // Fall through to the HTML audio fallback below.
    }

    if (context.state === "running") {
      lastPlaybackAt = now;
      const sequence = getToneSequence(kind, safeVolume);
      const startTime = context.currentTime + 0.02;

      sequence.forEach(({ offset, frequency, duration, gain }) => {
        scheduleTone(context, startTime + offset, frequency, duration, gain);
      });

      return true;
    }
  }

  const played = await playFallbackAudio(kind, safeVolume);
  if (played) {
    lastPlaybackAt = now;
    return true;
  }

  return false;
}
