import bgm1 from './assets/bgm/bgm_1.mp3';
import bgm2 from './assets/bgm/bgm_2.mp3';
import bgm3 from './assets/bgm/bgm_3.mp3';
import bgm4 from './assets/bgm/bgm_4.mp3';

const bgmTracks = [bgm1, bgm2, bgm3, bgm4];

let audio = null;
let currentTrackIndex = -1;

const ensureAudio = () => {
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
  }

  return audio;
};

export const getCurrentBgmIndex = () => currentTrackIndex;

export const isBgmPaused = () => {
  if (!audio) {
    return true;
  }

  return audio.paused;
};

export const playBgmByIndex = async (index) => {
  if (index < 0 || index >= bgmTracks.length) {
    return currentTrackIndex;
  }

  const player = ensureAudio();

  if (currentTrackIndex !== index) {
    player.src = bgmTracks[index];
    player.load();
  }

  currentTrackIndex = index;
  await player.play();
  return currentTrackIndex;
};

export const ensureBgmStarted = async () => {
  const indexToPlay = currentTrackIndex >= 0 ? currentTrackIndex : 0;
  return playBgmByIndex(indexToPlay);
};

export const playNextBgm = async () => {
  const nextIndex = (currentTrackIndex + 1 + bgmTracks.length) % bgmTracks.length;
  return playBgmByIndex(nextIndex);
};
