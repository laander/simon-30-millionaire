# Simon Wants to Be a Millionaire

A one-screen party game for Simon's 30th birthday. It includes 15 questions,
touch and keyboard controls, responsive layouts, a money ladder, original
in-browser music cues, and optional support for licensed audio files.

## Change the questions

Edit `app/game.ts`. Each question has one money value, one prompt, four answer
choices, and a zero-based `correctIndex` (`0` is A, `1` is B, and so on).
Keep exactly 15 questions and leave the last amount as `$1,000,000`.

## Add audio files

Place licensed audio files in `public/audio`, then set their paths in the
`audio` object in `app/game.ts`:

```ts
audio: {
  intro: "/audio/intro.mp3",
  question: "/audio/question-loop.mp3",
  lockIn: "/audio/lock-in.mp3",
  correct: "/audio/correct.mp3",
  wrong: "/audio/wrong.mp3",
  victory: "/audio/victory.mp3",
}
```

Any missing file, invalid path, or blocked playback automatically falls back to
the game's original Web Audio cue. Sound can also be switched off at any time.

## Run locally

```bash
npm install
npm run dev
```

Use `npm test` for the production build and automated game checks.
