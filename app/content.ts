import type { GameConfig } from "./game.ts";

// Everything that makes this edition of the game unique lives in this file:
// the questions, the money ladder, the logo, the music, and every word shown
// on screen. Change this file (plus the logo and audio in `public/`) to make
// your own variant. See "Make your own version" in README.md.

export const content: GameConfig = {
  // Language code for the page, e.g. "en", "da", "de", "sv".
  language: "da",
  title: "Simon Wants to Be a Millionaire",
  // Shown under the logo on the intro screen and in the browser tab title.
  subtitle: "30-års fødselsdagsudgave",
  // Used when the link is shared or bookmarked.
  description: "Simon indtager den varme stol i en særlig fødselsdagsudgave af Millionaire.",

  // A wide image (about 2:1) with a round emblem in the middle. The intro
  // shows the whole image; the game screen crops the centre into a circle.
  logo: "/simon-millionaire-logo.jpeg",

  // Listed from the first (cheapest) to the last (grand prize) question.
  // `correct` is the letter of the right answer. `milestone: true` highlights
  // the step on the money ladder.
  questions: [
    {
      amount: "100 kr.",
      prompt: "Hvad gemmer man traditionelt i risalamanden juleaften?",
      answers: ["En mønt", "Nissens sokker", "En hel mandel", "Sidste års brunede kartofler"],
      correct: "C",
    },
    {
      amount: "200 kr.",
      prompt: "Hvad siger man i Danmark, når man hæver glasset?",
      answers: ["Skål!", "Prost!", "Kanpai!", "Hvem betaler?"],
      correct: "A",
    },
    {
      amount: "500 kr.",
      prompt: "Hvor mange ben har en edderkop?",
      answers: ["Seks", "Ti", "Tolv", "Otte"],
      correct: "D",
    },
    {
      amount: "1.000 kr.",
      milestone: true,
      prompt: "Hvilken farve får man, når man blander blå og gul?",
      answers: ["Lilla", "Grøn", "Orange", "Pink"],
      correct: "B",
    },
    {
      amount: "2.000 kr.",
      prompt: "Hvor mange spillere har et fodboldhold på banen ad gangen?",
      answers: ["Ni", "Ti", "Elleve", "Tolv"],
      correct: "C",
    },
    {
      amount: "5.000 kr.",
      prompt: "Hvem skrev eventyret “Den grimme ælling”?",
      answers: ["H.C. Andersen", "Brødrene Grimm", "Karen Blixen", "Astrid Lindgren"],
      correct: "A",
    },
    {
      amount: "10.000 kr.",
      prompt: "I hvilken by blev LEGO grundlagt?",
      answers: ["Odense", "Billund", "Herning", "Legoland"],
      correct: "B",
    },
    {
      amount: "25.000 kr.",
      prompt: "Hvad er hovedstaden i Australien?",
      answers: ["Sydney", "Melbourne", "Perth", "Canberra"],
      correct: "D",
    },
    {
      amount: "50.000 kr.",
      milestone: true,
      prompt: "Hvilket år vandt Danmarks herrelandshold EM i fodbold?",
      answers: ["1984", "1988", "1992", "1996"],
      correct: "C",
    },
    {
      amount: "100.000 kr.",
      prompt: "Hvilket grundstof har den kemiske betegnelse Au?",
      answers: ["Sølv", "Guld", "Argon", "Aluminium"],
      correct: "B",
    },
    {
      amount: "250.000 kr.",
      prompt: "Hvad hedder Danmarks længste å?",
      answers: ["Gudenå", "Skjern Å", "Storå", "Suså"],
      correct: "A",
    },
    {
      amount: "500.000 kr.",
      prompt: "Hvor mange knogler har et voksent menneske?",
      answers: ["186", "196", "206", "216"],
      correct: "C",
    },
    {
      amount: "1.000.000 kr.",
      milestone: true,
      prompt: "Hvad er Danmarks højeste naturlige punkt?",
      answers: ["Himmelbjerget", "Ejer Bavnehøj", "Yding Skovhøj", "Møllehøj"],
      correct: "D",
    },
  ],

  // Shown after the final question is answered correctly, together with the
  // amount of the last question.
  celebration: {
    kicker: "Endeligt svar",
    headline: "Tillykke med de 30 år, Simon!",
    message: "Du er vores fødselsdagsmillionær.",
  },

  // Files in `public/audio`. Remove a line (or the file) to use the built-in
  // synthesized sound for that moment instead.
  audio: {
    intro: "/audio/main-theme.mp3",
    letsPlay: "/audio/let-s-play.mp3",
    questionLow: "/audio/100-1000-music.mp3",
    questionMid: "/audio/2000-32000.mp3",
    questionHigh: "/audio/5000000-music.mp3",
    lifeline: "/audio/lifeline.mp3",
    lockIn: "/audio/final-answer.mp3",
    correct: "/audio/correct-answer.mp3",
    wrong: "/audio/commerical-break.mp3",
    victory: "/audio/main-theme.mp3",
  },

  // Buttons, labels, and screen reader announcements. Only change these to
  // translate the game or adjust its tone.
  text: {
    startShow: "Start showet",
    introLabel: "Introduktion til spillet",
    introContinue: "Sæt i gang",
    gameLabel: "Millionaire-spillet",
    soundOn: "Lyd til",
    soundOff: "Lyd fra",
    turnSoundOn: "Slå lyden til",
    turnSoundOff: "Slå lyden fra",
    restart: "Start forfra",
    restartLabel: "Start spillet forfra",
    lifelines: "Livliner",
    fiftyFifty: "50:50",
    askAudience: "Spørg publikum",
    phoneFriend: "Spørg en ven",
    useLifeline: (name) => `Brug ${name}`,
    lifelineUsed: (name) => `${name} brugt`,
    lifelineUsedLabel: (name) => `${name} er blevet brugt`,
    ladder: "Stigen",
    ladderLabel: "Penge-stigen",
    jumpToQuestion: (number, amount) => `Gå til spørgsmål ${number}, ${amount}`,
    questionProgress: (number, total) => `Spørgsmål ${number} af ${total}`,
    questionProgressLabel: (number, total, amount) => `Spørgsmål ${number} af ${total}, værdi ${amount}`,
    answersLabel: "Svarmuligheder",
    answerSelected: "Tryk igen",
    answerCorrect: "Korrekt",
    answerIncorrect: "Forkert",
    answerEliminated: (letter) => `${letter}: Fjernet af 50:50`,
    continue: "Fortsæt",
    playAgain: "Spil igen",
    restartDialogEyebrow: "Forlad den varme stol?",
    restartDialogTitle: "Vil du starte hele spillet forfra?",
    restartDialogBody: "Simons fremskridt nulstilles til spørgsmålet om 100 kr.",
    restartDialogCancel: "Spil videre",
    restartDialogConfirm: "Start forfra",
    announceSelected: (letter) => `${letter} er valgt. Vælg det igen for at gøre det til dit endelige svar.`,
    announceCorrect: "Korrekt svar. Vælg Fortsæt, når I er klar.",
    announceIncorrect: "Forkert svar. Vælg en anden svarmulighed.",
    announceWinner: "Simon har vundet en million kroner!",
  },
};
