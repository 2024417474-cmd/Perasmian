
/* =========================================
   CONFIGURATION
========================================= */

const ACCESS_CODE = "FUTURE";
const MAX_ATTEMPTS = 2;

const screens = {
  access: document.getElementById("accessScreen"),
  scanning: document.getElementById("scanningScreen"),
  granted: document.getElementById("grantedScreen"),
  warning: document.getElementById("warningScreen"),
  blackout: document.getElementById("blackoutScreen"),
  countdown: document.getElementById("countdownScreen"),
  gate: document.getElementById("gateScreen"),
  official: document.getElementById("officialScreen"),
  montage: document.getElementById("montageScreen")
};

const accessForm = document.getElementById("accessForm");
const accessCode = document.getElementById("accessCode");
const letterCount = document.getElementById("letterCount");
const inputStatus = document.getElementById("inputStatus");

const musicButton = document.getElementById("musicButton");
const musicLabel = document.getElementById("musicLabel");

const music1 = document.getElementById("music1");
const music2 = document.getElementById("music2");
const music3 = document.getElementById("music3");

const retryButton = document.getElementById("retryButton");
const resetButton = document.getElementById("resetButton");

const scanProgressFill = document.getElementById("scanProgressFill");
const scanPercentage = document.getElementById("scanPercentage");
const scanMessage = document.getElementById("scanMessage");

const countdownNumber = document.getElementById("countdownNumber");

const montageButton = document.getElementById("montageButton");
const montageVideo = document.getElementById("montageVideo");
const backButton = document.getElementById("backButton");

const particleLayer = document.getElementById("particleLayer");
const officialParticles = document.getElementById("officialParticles");
const thumbLayer = document.getElementById("thumbLayer");
const starLayer = document.getElementById("starLayer");

let failedAttempts = 0;
let musicEnabled = false;
let currentMusic = null;

let scanInterval = null;
let countdownInterval = null;
let gateTimeout = null;
let accessLocked = false;
let ceremonyStarted = false;

let audioContext = null;


/* =========================================
   SCREEN MANAGEMENT
========================================= */

function showScreen(screenToShow) {
  Object.values(screens).forEach((screen) => {
    screen.classList.remove("active");
  });

  screenToShow.classList.add("active");
}


/* =========================================
   MUSIC MANAGEMENT
========================================= */

function stopAllMusic() {
  [music1, music2, music3].forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });

  currentMusic = null;
}

function updateMusicButton() {
  musicLabel.textContent = musicEnabled ? "MUSIC: ON" : "MUSIC: OFF";
  musicButton.classList.toggle("is-playing", musicEnabled);
}

async function playTrack(audio) {
  stopAllMusic();

  if (!musicEnabled) {
    return;
  }

  currentMusic = audio;

  try {
    await audio.play();
  } catch (error) {
    console.warn("Audio playback was blocked:", error);
  }
}

musicButton.addEventListener("click", async () => {
  musicEnabled = !musicEnabled;
  updateMusicButton();

  if (!musicEnabled) {
    [music1, music2, music3].forEach((audio) => audio.pause());
    return;
  }

  if (currentMusic) {
    try {
      await currentMusic.play();
    } catch (error) {
      console.warn("Audio playback was blocked:", error);
    }
  } else if (screens.official.classList.contains("active")) {
    playTrack(music3);
  } else if (ceremonyStarted) {
    playTrack(music2);
  } else {
    playTrack(music1);
  }
});


/* =========================================
   SOUND EFFECTS
========================================= */

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTypingSound() {
  const context = getAudioContext();

  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(650, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(280, context.currentTime + 0.045);

  gain.gain.setValueAtTime(0.045, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.055);
}

function playErrorSound() {
  const context = getAudioContext();

  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(180, context.currentTime);
  oscillator.frequency.setValueAtTime(95, context.currentTime + 0.4);

  gain.gain.setValueAtTime(0.16, context.currentTime);
  gain.gain.setValueAtTime(0.16, context.currentTime + 0.65);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.9);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.95);
}

function speakWarning() {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const warning = new SpeechSynthesisUtterance("PASSWORD ANDA SALAH");

  warning.lang = "ms-MY";
  warning.rate = 0.78;
  warning.pitch = 0.7;
  warning.volume = 1;

  window.speechSynthesis.speak(warning);
}

function speakCountdown(number) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(String(number));

  speech.lang = "ms-MY";
  speech.rate = 0.85;
  speech.pitch = 1;
  speech.volume = 1;

  window.speechSynthesis.speak(speech);
}


/* =========================================
   ACCESS CODE INPUT
========================================= */

// Only alphabetic characters are accepted.
// The input is automatically converted to uppercase.
// The maximum length is six characters.

accessCode.addEventListener("input", () => {
  const previousLength = accessCode.dataset.previousLength || "0";

  const cleanValue = accessCode.value
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 6);

  accessCode.value = cleanValue;

  letterCount.textContent = `${cleanValue.length} / 6 LETTERS`;

  if (cleanValue.length === 6) {
    inputStatus.textContent = "CODE READY";
  } else if (cleanValue.length > 0) {
    inputStatus.textContent = "ENTERING CODE...";
  } else {
    inputStatus.textContent = "WAITING FOR INPUT";
  }

  if (cleanValue.length > Number(previousLength)) {
    playTypingSound();
  }

  accessCode.dataset.previousLength = String(cleanValue.length);
});

// Block non-letter keys before they appear in the input.

accessCode.addEventListener("keydown", (event) => {
  const allowedKeys = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "Tab",
    "Home",
    "End",
    "Enter"
  ];

  if (
    allowedKeys.includes(event.key) ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return;
  }

  if (!/^[a-zA-Z]$/.test(event.key)) {
    event.preventDefault();
  }
});

// Prevent non-letter text from being pasted.

accessCode.addEventListener("paste", (event) => {
  event.preventDefault();

  const pastedText = event.clipboardData
    .getData("text")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  const remaining = 6 - accessCode.value.length;
  const insertion = pastedText.slice(0, remaining);

  accessCode.value = (accessCode.value + insertion).slice(0, 6);

  accessCode.dispatchEvent(new Event("input"));
});


/* =========================================
   ACCESS VERIFICATION
========================================= */

accessForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (accessLocked || ceremonyStarted) return;

  const enteredCode = accessCode.value.trim();

  if (enteredCode.length !== 6) {
    inputStatus.textContent = "ENTER ALL 6 LETTERS";
    return;
  }

  accessLocked = true;

  if (enteredCode === ACCESS_CODE) {
    startScanning();
  } else {
    handleWrongPassword();
  }
});


/* =========================================
   WRONG PASSWORD SYSTEM
========================================= */

function handleWrongPassword() {
  failedAttempts += 1;

  stopAllMusic();
  window.speechSynthesis?.cancel();

  if (failedAttempts >= MAX_ATTEMPTS) {
    showBlackout();
    return;
  }

  showScreen(screens.warning);

  playErrorSound();

  // Voice warning is triggered after the warning screen appears.
  setTimeout(() => {
    speakWarning();
  }, 250);

  accessCode.value = "";
  letterCount.textContent = "0 / 6 LETTERS";
  inputStatus.textContent = "ACCESS DENIED";
}

retryButton.addEventListener("click", () => {
  if (failedAttempts >= MAX_ATTEMPTS) {
    showBlackout();
    return;
  }

  showScreen(screens.access);

  accessCode.value = "";
  accessCode.dataset.previousLength = "0";

  letterCount.textContent = "0 / 6 LETTERS";
  inputStatus.textContent = "WAITING FOR INPUT";

  accessLocked = false;
  accessCode.focus();
});

function showBlackout() {
  stopAllMusic();

  window.speechSynthesis?.cancel();

  showScreen(screens.blackout);
}


/* =========================================
   RESET SYSTEM
========================================= */

resetButton.addEventListener("click", () => {
  clearInterval(scanInterval);
  clearInterval(countdownInterval);
  clearTimeout(gateTimeout);

  stopAllMusic();

  window.speechSynthesis?.cancel();

  failedAttempts = 0;
  accessLocked = false;
  ceremonyStarted = false;

  screens.gate.classList.remove("opening");

  accessCode.value = "";
  accessCode.dataset.previousLength = "0";

  letterCount.textContent = "0 / 6 LETTERS";
  inputStatus.textContent = "WAITING FOR INPUT";

  scanProgressFill.style.width = "0%";
  scanPercentage.textContent = "0%";

  musicEnabled = false;
  updateMusicButton();

  showScreen(screens.access);
  accessCode.focus();
});


/* =========================================
   SCANNING ANIMATION
========================================= */

function startScanning() {
  showScreen(screens.scanning);

  scanProgressFill.style.width = "0%";
  scanPercentage.textContent = "0%";
  scanMessage.textContent = "VERIFYING IDENTIFICATION...";

  let progress = 0;

  scanInterval = setInterval(() => {
    progress += 2;

    if (progress > 100) {
      progress = 100;
    }

    scanProgressFill.style.width = `${progress}%`;
    scanPercentage.textContent = `${progress}%`;

    if (progress === 35) {
      scanMessage.textContent = "CHECKING ACCESS CODE...";
    }

    if (progress === 70) {
      scanMessage.textContent = "AUTHENTICATING USER...";
    }

    if (progress >= 100) {
      clearInterval(scanInterval);
      scanInterval = null;

      setTimeout(showAccessGranted, 350);
    }
  }, 50);
}


/* =========================================
   ACCESS GRANTED
========================================= */

function showAccessGranted() {
  showScreen(screens.granted);

  setTimeout(() => {
    beginCountdownSequence();
  }, 1800);
}


/* =========================================
   COUNTDOWN SEQUENCE - 16 SECONDS
========================================= */

function beginCountdownSequence() {
  ceremonyStarted = true;

  showScreen(screens.countdown);

  // Stop music 1 and start music 2.
  if (musicEnabled) {
    playTrack(music2);
  } else {
    stopAllMusic();
  }

  const countdownNumbers = [5, 4, 3, 2, 1];

  const totalCountdownTime = 16000;
  const intervalTime = totalCountdownTime / countdownNumbers.length;

  let index = 0;

  function displayNextNumber() {
    if (index >= countdownNumbers.length) {
      clearInterval(countdownInterval);
      countdownInterval = null;

      window.speechSynthesis?.cancel();

      openGate();
      return;
    }

    const number = countdownNumbers[index];

    countdownNumber.textContent = number;
    speakCountdown(number);

    index += 1;
  }

  displayNextNumber();

  countdownInterval = setInterval(
    displayNextNumber,
    intervalTime
  );
}


/* =========================================
   GATE OPENING - 6 SECONDS
========================================= */

function openGate() {
  showScreen(screens.gate);

  screens.gate.classList.remove("opening");

  // Restart CSS animation from the beginning.
  void screens.gate.offsetWidth;

  screens.gate.classList.add("opening");

  gateTimeout = setTimeout(() => {
    showOfficialScreen();
  }, 6000);
}


/* =========================================
   OFFICIAL OPENING SCREEN
========================================= */

function showOfficialScreen() {
  showScreen(screens.official);

  createParticles(officialParticles, 85);
  createThumbsUp();
  createStars();

  // Stop music 2 and start music 3.
  if (musicEnabled) {
    playTrack(music3);
  } else {
    stopAllMusic();
  }
}


/* =========================================
   PARTICLES
========================================= */

function createParticles(container, amount) {
  container.innerHTML = "";

  for (let i = 0; i < amount; i += 1) {
    const particle = document.createElement("span");

    particle.className = "particle";
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;

    particle.style.setProperty(
      "--duration",
      `${5 + Math.random() * 9}s`
    );

    particle.style.setProperty(
      "--delay",
      `${Math.random() * -12}s`
    );

    container.appendChild(particle);
  }
}


/* =========================================
   THUMBS-UP DECORATION - 20 ICONS
========================================= */

function createThumbsUp() {
  thumbLayer.innerHTML = "";

  for (let i = 0; i < 20; i += 1) {
    const thumb = document.createElement("span");

    thumb.className = "thumb";
    thumb.textContent = "👍";

    thumb.style.left = `${5 + Math.random() * 90}%`;
    thumb.style.top = `${12 + Math.random() * 75}%`;

    thumb.style.setProperty(
      "--duration",
      `${4 + Math.random() * 5}s`
    );

    thumb.style.setProperty(
      "--delay",
      `${Math.random() * -8}s`
    );

    thumbLayer.appendChild(thumb);
  }
}


/* =========================================
   GOLD STARS - 28 STARS
========================================= */

function createStars() {
  starLayer.innerHTML = "";

  for (let i = 0; i < 28; i += 1) {
    const star = document.createElement("span");

    star.className = "star";
    star.textContent = "✦";

    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.fontSize = `${8 + Math.random() * 13}px`;

    star.style.setProperty(
      "--duration",
      `${1.5 + Math.random() * 3}s`
    );

    star.style.setProperty(
      "--delay",
      `${Math.random() * -4}s`
    );

    starLayer.appendChild(star);
  }
}


/* =========================================
   MONTAGE VIDEO
========================================= */

montageButton.addEventListener("click", async () => {
  showScreen(screens.montage);

  // Music 3 stops only when montage is opened.
  if (currentMusic) {
    currentMusic.pause();
  }

  montageVideo.currentTime = 0;

  try {
    await montageVideo.play();

    if (montageVideo.requestFullscreen) {
      await montageVideo.requestFullscreen();
    }
  } catch (error) {
    console.warn("Montage playback could not start automatically:", error);
  }
});

function returnFromMontage() {
  montageVideo.pause();
  montageVideo.currentTime = 0;

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  showScreen(screens.official);

  // Resume music 3 when returning to the official screen.
  if (musicEnabled) {
    playTrack(music3);
  }
}

backButton.addEventListener("click", returnFromMontage);

montageVideo.addEventListener("ended", returnFromMontage);


/* =========================================
   INITIAL SETUP
========================================= */

createParticles(particleLayer, 55);

updateMusicButton();

accessCode.dataset.previousLength = "0";
accessCode.focus();
