# Movie

A personal movie library for macOS, built to look and feel like the Apple TV app.

It is **not** a streaming client. Nothing is fetched from the internet and there
are no accounts: the app stores cards for films you have watched — poster, your
own rating, genres, a trailer, notes — and, if you want, plays the film itself.

## Features

- **Home** — a hero carousel of your highest-rated films (above 7.0) playing
  their trailers, then rows for *My Top*, *Recently Added* and one row per
  genre. Row titles open the full deck.
- **Trailer and movie playback** — every film can have a trailer; films that
  also have a movie file get a split *Trailer* button whose chevron reveals
  *Play Movie*. Playback is fullscreen, with a resume point kept for the
  session.
- **All Movies** — sort by rating or date added, filter by rating band
  (`9` means 9.0–9.9, `10` means exactly 10.0) and by genre.
- **Search** — the whole library as a deck, narrowing as you type. `Cmd+F`
  focuses it from anywhere.
- **Genres** — a managed list: pick existing ones, add new, or delete a genre
  everywhere at once.
- **Native macOS interface** — a translucent sidebar that collapses, the system
  accent colour, and materials rather than flat panels.

## Where your data lives

Everything you create is kept in a single folder, outside the application:

```
~/Library/Application Support/Movie/
├── library.db      your films, ratings, genres and notes
├── posters/        poster images, copied in
└── trailers/       trailer videos, copied in
```

Deleting or replacing `Movie.app` never touches this folder. Posters and
trailers are **copied** into the library, so they keep working if you delete
the originals. Full movie files are **referenced where they are** instead of
copied — they are far too large to duplicate — so moving or deleting one will
break its playback, and the app will tell you so.

## Installing

Download `Movie_1.0.0_aarch64.dmg` from the
[latest release](https://github.com/Ta2-me2/Movies/releases/latest), open it and
drag **Movie** into Applications. Apple Silicon only.

The app is not signed with an Apple Developer certificate, so on first launch
macOS will say it cannot verify the developer. To open it anyway:

**right-click Movie in Applications → Open → Open.**

You only need to do this once. The app checks GitHub for newer releases on
launch and shows a quiet note in the sidebar when one is out.

## Building

Requires [Node.js](https://nodejs.org) and [Rust](https://rustup.rs).

```bash
npm install
npm run tauri dev     # run in development
npm run tauri build   # produce Movie.app and a .dmg
```

Output lands in `src-tauri/target/release/bundle/`.

## Built with

[Tauri 2](https://tauri.app) · React · TypeScript · Tailwind CSS · SQLite

## Author

Made by **Ta2** — [github.com/Ta2-me2](https://github.com/Ta2-me2)

## Licence

MIT — see [LICENSE](LICENSE).
