function scoreSpeechVoice(voice, language) {
  const voiceName = voice.name.toLowerCase();
  const voiceLang = voice.lang.toLowerCase();

  if (language === "vi") {
    let score = 0;

    if (voiceLang === "vi-vn") {
      score += 100;
    } else if (voiceLang.startsWith("vi")) {
      score += 80;
    }

    if (voiceName.includes("vietnam") || voiceName.includes("viet")) {
      score += 20;
    }

    if (voiceName.includes("google") || voiceName.includes("microsoft")) {
      score += 10;
    }

    return score;
  }

  let score = voiceLang === "en-us" ? 80 : 0;
  if (voiceLang.startsWith("en")) {
    score += 40;
  }

  if (voiceName.includes("google") || voiceName.includes("microsoft")) {
    score += 10;
  }

  return score;
}

export function getPreferredSpeechVoice(language) {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  const rankedVoices = voices
    .map((voice) => ({ voice, score: scoreSpeechVoice(voice, language) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  return rankedVoices[0]?.voice ?? null;
}
