<div align="center">
  <img src="https://github.com/user-attachments/assets/6d546271-796a-4612-8383-d148837c60b1" width="128" alt="Movies app icon" />

  # Movies

  **Your personal movie library for macOS.**

  A beautiful, private place for the films you love — inspired by the Apple TV experience.

  [Download](https://github.com/Ta2-me2/Movies/releases/latest) · [Build from source](#building) · [Report an issue](https://github.com/Ta2-me2/Movies/issues)
</div>

---

## About

Movies is not a streaming client. It does not fetch content from the internet and has no accounts.

Keep cards for films you have watched: posters, personal ratings, genres, trailers, notes — and optionally the movie file itself.

> Built for Apple Silicon Macs.

---

## Features

### Home

A cinematic home screen with a hero carousel for your highest-rated films, complete with trailers. Browse *My Top*, *Recently Added*, and individual genre rows; open any row to see its full collection.

<p align="center">
  <img src="https://github.com/user-attachments/assets/cc0c5ac7-79c1-44c6-89bd-f3e0f7d4b237" width="90%" alt="Movies home screen" />
</p>

### Trailer and movie playback

Every film can include a trailer. When you attach a movie file, the Trailer button reveals **Play Movie**. Playback opens fullscreen and remembers your position for the current session.

<p align="center">
  <img src="https://github.com/user-attachments/assets/aa828618-6c4c-443c-a53c-47713bf9ab3a" width="90%" alt="Movie playback" />
</p>

### All Movies

Browse your complete library, sort it by rating or date added, and filter by genre or rating range. For example, `9` shows films rated 9.0–9.9, while `10` shows only perfect scores.

<p align="center">
  <img src="https://github.com/user-attachments/assets/81709b5f-703c-4b94-93a0-2cc1eb0faa67" width="90%" alt="All Movies screen" />
</p>

### Search

Search through the entire library as you type. Press `⌘F` from anywhere to focus search instantly.

<p align="center">
  <img src="https://github.com/user-attachments/assets/5c58b866-48c9-4769-9e82-0b8fb3533810" width="90%" alt="Search screen" />
</p>

### Genres

Manage a shared genre list: select existing genres, create new ones, or remove a genre everywhere at once.

<p align="center">
  <img src="https://github.com/user-attachments/assets/4e8a3724-fcba-4813-b9e3-f98ed387fa8d" width="90%" alt="Genre management" />
</p>

### Appearance

Light and dark themes, or follow the system. Whichever you pick, the whole app wears it — every window, including ones you have not opened yet. The app icon comes in two variants; pick either from Settings.


### Native macOS feel

- Translucent, collapsible sidebar
- Light and dark appearance, or follow macOS
- System accent colour support
- Native materials instead of flat panels
- Fullscreen video playback

---

## Your data

Everything stays in one folder outside the app. That folder holds your libraries — one subfolder each:

```text
~/Library/Application Support/Movies/
├── preferences.json    Appearance, app icon, which library is open
└── My Library/
    ├── library.db      Films, ratings, genres, and notes
    ├── posters/        Poster images copied into the library
    └── trailers/       Trailer videos copied into the library
```

Deleting or replacing `Movies.app` never touches this folder.

Posters and trailers are copied into the library, so they keep working even if you delete the originals. Movie files are referenced in their original location to avoid duplicating large files; moving or deleting one will prevent playback.

### Backups and libraries

**Settings ▸ Your Library** shows where the open library is and what is in it:

- **Export Library…** writes the whole folder to a zip. That zip is the backup — the database, every poster and every trailer, byte for byte. Movie files are not in it, because they were never copied into the library in the first place.
- **Restore from Backup…** reads such a zip back in, always as a *new* library beside the others and never over the top of one.
- **Libraries…** lists every library you have. One is open at a time; you can create, rename, reveal, back up and delete them. Opening another relaunches the app into it and leaves the one you came from exactly as it was.


---

## Installation

1. Download `Movies_1.1.0_aarch64.dmg` from the [latest release](https://github.com/Ta2-me2/Movies/releases/latest).
2. Open the disk image and drag **Movies** to **Applications**.
3. On first launch, macOS may say it cannot verify the developer. Right-click the app, choose **Open**, then confirm **Open**.

You only need to do this once.

> The app checks GitHub for updates on launch and shows a quiet note in the sidebar when a new release is available.

---

## Building

### Requirements

- [Node.js](https://nodejs.org)
- [Rust](https://rustup.rs)
- macOS on Apple Silicon

```bash
npm install
npm run tauri dev     # Run in development
npm run tauri build   # Build Movies.app and a .dmg
```

Build artifacts are placed in:

```text
src-tauri/target/release/bundle/
```

---

## Built with

[Tauri 2](https://tauri.app) · React · TypeScript · Tailwind CSS · SQLite

---

<div align="center">
  Made with care by <a href="https://github.com/Ta2-me2">Ta2</a>

  MIT License — see <a href="LICENSE">LICENSE</a>.
</div>
