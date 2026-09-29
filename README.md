# Simon Wants to Be a Millionaire

A one-screen party game in the style of *Who Wants to Be a Millionaire*, made
for Simon's 30th birthday. It has a money ladder, three lifelines, show music,
and works on a TV, laptop, tablet, or phone.

## Make your own version

You don't need to know how to code. An AI coding agent does all the work.

1. Install an AI coding agent, for example the
   [Claude desktop app](https://claude.ai/download) (use its **Code** tab),
   [Codex](https://openai.com/codex/), or [Cursor](https://cursor.com).
2. Give it this message:

   > Make my own version of the party game at
   > https://github.com/laander/simon-30-millionaire. Follow the "Agent guide"
   > in its README. I'm not technical, so ask me questions in plain language and
   > do all the work for me.

3. Answer its questions. It helps to have these ready:
   - Who is in the hot seat, and what's the occasion?
   - Your questions, each with four answers and the right one marked.
     (The agent can help write funny wrong answers.)
   - A logo image, if you have one. The agent can help you make one.

## Agent guide

You are helping someone make their own variant of this game: new questions,
names, logo, and music. **They are not technical.** The game is in Danish.

- Talk in plain language, in their language. No jargon, file paths, or code in
  your messages.
- Do all the work yourself. Never ask them to edit files or run commands.
- Ask a few questions at a time, not a long form.
- Keep the game's look and rules unless they ask for a change.
- Ask before anything that creates accounts, costs money, or publishes online.
- Never push to `laander/simon-30-millionaire`.

### 1. Get a copy and install

1. If you're not already inside a copy of this repo, clone it:
   `git clone https://github.com/laander/simon-30-millionaire.git`
2. Run `git remote rename origin upstream` so nothing is pushed back here.
3. Make sure Node.js 22.13 or newer is installed (`node --version`). On a Mac
   without it, install it with `brew install node` or the installer from
   [nodejs.org](https://nodejs.org).
4. Run `npm install`.

### 2. Interview them

Collect the following. Suggest sensible defaults so they can just say "yes".

1. **Contestant and occasion**, such as "Emma's 40th birthday".
2. **Questions.** 1 to 15 questions (13 to 15 feels like the real show). Each
   needs four answers and one correct answer. Let them paste questions in any
   format; you tidy them up. Offer to write wrong answers, and keep their
   jokes and tone. Easiest questions come first.
3. **Prize ladder.** Amounts from the first to the last question. By default,
   keep the current ladder in kroner. Mark 2 to 3 steps as milestones, always
   including the last one.
4. **Subtitle and celebration message**, shown on the intro screen and after
   the final correct answer.
5. **Logo.** See [Logo](#logo) below.
6. **Music.** Keep the included show music, or switch to built-in sounds.
   See [Music](#music) below.

### 3. Apply the changes

1. Put everything into `app/content.ts`. It holds all content and every word
   on screen. The comments in the file explain each field.
   - Keep the Danish buttons and labels in `text` as they are, except
     `text.restartDialogBody` and `text.announceWinner`. Those mention the
     contestant and prize amounts, so rewrite them.
   - Only translate `text` and change `language` if they ask for another
     language.
2. Add the new logo to `public/`, point `logo` at it, and delete
   `public/simon-millionaire-logo.jpeg`.
3. Rename the project:
   - `name` and `description` in `package.json`
   - `app` in `fly.toml`. It must be unique on Fly.io, e.g. `emma-40-millionaire`.
   - The title and intro of this README
4. Check for leftovers: `grep -rni "simon" app public package.json fly.toml`
   should find nothing.

### 4. Check your work

1. Run `npm test` and `npm run lint`. Both must pass. The content tests show
   exactly what's wrong in `app/content.ts`, a missing logo, or missing audio.
2. Run `npm run dev` and open the address it prints. Play through it: start,
   intro, answer a question wrong and right, use a lifeline, and jump to the
   last question from the ladder to see the celebration. Check that the logo
   looks right in the circle on the question screen.
3. If you can take screenshots, show them the result.

A styling test in `tests/styles.test.mjs` may fail if you changed the look on
purpose. Update that test to match. Don't change content tests to hide a problem.

### 5. Show them how to play

- Run `npm run dev` and open the address in a browser. Plug the laptop into a
  TV and make the browser full screen.
- Tap an answer once to select it and again to lock it in. Keys `A`–`D` or
  `1`–`4` work too.
- A wrong answer turns red and the contestant tries again. Nobody gets kicked
  out.
- Each lifeline works once per game. The host acts it out.
- The host can tap any step on the money ladder to jump to that question.

### 6. Put it online (optional)

Only do this if they want to play from another device. Ask first: Fly.io needs
an account with a payment card.

1. Install the Fly tool: `brew install flyctl` (or
   `curl -L https://fly.io/install.sh | sh`).
2. Run `fly auth login`. It opens a browser where they sign up or sign in.
3. Run `fly apps create <app name from fly.toml>`, then `fly deploy`.
4. Give them the link: `https://<app name>.fly.dev`.

The server stops when nobody uses it and starts on the next visit, so the
first load takes a few seconds. The site is hidden from search engines.
`primary_region` in `fly.toml` is Stockholm; change it to one near them
(`fly platform regions`).

### 7. Save their work

Commit the changes. If they have a GitHub account and want a backup, create a
private repo for them with `gh repo create <name> --private --source . --push`.

## Logo

The logo is a wide image, about 2:1, with a round emblem in the middle. The
intro screen shows the whole image. The question screen crops the middle into
a circle, so the emblem must fill the full height and be centred.

If they don't have one, pick one of these:

- **They make one** with an image tool like ChatGPT, using this prompt:
  "Logo in the style of Who Wants to Be a Millionaire. A round dark-blue and
  gold emblem with the text '[NAVN] VIL VÆRE' around the edge and
  'MILLIONÆR' across the middle, centred on a wide dark-blue and purple
  starry background. 2:1 format."
- **You make one** as an SVG, if you can't generate images: a dark-blue
  circle with a gold ring and their text, centred on a 1600×800 starry
  background. Save it as `public/logo.svg`.

## Music

`audio` in `app/content.ts` maps each moment in the show to a file in
`public/audio`. Remove a line to use the game's built-in synthesized sound for
that moment, or use `audio: {}` for built-in sounds throughout. A file that
fails to play also falls back to the built-in sound.

| Cue | When it plays |
| --- | --- |
| `intro` | Intro screen with the logo |
| `letsPlay` | Before the first question |
| `questionLow` | Background music for roughly the first 30% of questions |
| `questionMid` | Background music for roughly the next 30% |
| `questionHigh` | Background music for the remaining questions |
| `lifeline` | When a lifeline is used; then the music resumes |
| `lockIn` | After an answer is selected |
| `correct` | Correct answer |
| `wrong` | Wrong answer |
| `victory` | Celebration screen |

The included files are the TV show's copyrighted music. Keep the game private
and don't use it for anything commercial.

## Where things live

| Path | What it is |
| --- | --- |
| `app/content.ts` | Questions, ladder, logo path, music, and all on-screen text |
| `public/` | Logo image and `audio/` files |
| `app/page.tsx` | The screens |
| `app/globals.css` | Look and colours. The main colours are at the top. |
| `app/game.ts` | Game rules and content checks |
| `app/audio.ts` | Music playback and built-in sounds |
| `tests/` | Automated checks, run with `npm test` |
| `Dockerfile`, `fly.toml` | Hosting on Fly.io |

`db/`, `drizzle/`, `examples/`, `worker/`, and `.openai/` are left over from
the starter template. The game doesn't use them.

## Commands

```bash
npm install   # install dependencies
npm run dev   # run locally
npm test      # production build and automated checks
npm run lint  # code style checks
fly deploy    # deploy to Fly.io
```
