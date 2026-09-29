# Game audio

The files in this directory are mapped in `app/game.ts`. The three long question
tracks cover the lowest three, middle three, and highest four ladder steps respectively.
`lifeline.mp3` temporarily interrupts and then returns to the current soundtrack.
The app falls back to its built-in soundtrack if any configured file cannot play.
