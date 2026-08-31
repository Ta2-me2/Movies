<div align="center">
  <img src="https://github.com/user-attachments/assets/540be716-7ad0-4743-8669-701d6b5dbdaf" width="128" alt="Movies app icon" />

  # Movies

  **Your personal movie library for macOS.**

  A beautiful, private place for the films you love — inspired by the Apple TV experience.

  [Download](https://github.com/Ta2-me2/Movies/releases/latest) · [Build from source](#building) · [Report an issue](https://github.com/Ta2-me2/Movies/issues)
</div>

---

## About

Movies is not a streaming client. It does not fetch content from the internet and has no accounts.

Keep a private collection of films you have watched: posters, personal ratings, genres, trailers, notes, and — if you want — the movie file itself.

> Built for Apple Silicon Macs.

---

## Features

### Home

A cinematic home screen with a hero carousel for your highest-rated films, complete with trailers. Browse *My Top*, *Recently Added*, and genre rows; open any row to see the full collection.

<p align="center">
  <img src="https://github.com/user-attachments/assets/bc58973d-1efa-4ec2-9a98-c6c49926ad13" width="92%" alt="Movies home screen" />
</p>



### Trailer and movie playback

Every film can include a trailer. When you attach a movie file, the Trailer button reveals **Play Movie**. Playback opens fullscreen and remembers your position for the current session.

<p align="center">
  <img src="https://github.com/user-attachments/assets/27cf87cb-6d48-4844-b0b6-b699afd778f5" width="92%" alt="Movie playback" />
</p>

### All Movies

Browse your complete library, sort it by rating or date added, and filter by genre or rating range. For example, `9` shows films rated 9.0–9.9, while `10` shows only perfect scores.

<p align="center">
  <img src="https://github.com/user-attachments/assets/86cc14df-abc5-4699-ac00-5598db315043" width="92%" alt="All Movies screen" />
</p>

### Search

Search through the entire library as you type. Press `⌘F` from anywhere to focus search instantly.

<p align="center">
  <img src="https://github.com/user-attachments/assets/eb7d35d3-4b95-46d8-8304-b920ef700c82" width="92%" alt="Search screen" />
</p>

### Genres

Manage a shared genre list: select existing genres, create new ones, or remove a genre everywhere at once.

<p align="center">
  <img src="https://github.com/user-attachments/assets/4e8a3724-fcba-4813-b9e3-f98ed387fa8d" width="92%" alt="Genre management" />
</p>

### Appearance

Choose a light theme, dark theme, or follow macOS. Your choice applies across the whole app — including windows you have not opened yet.

Settings and About now open in their own windows, available from the gear beside the sidebar control or from the macOS menu bar. The app icon also has light and dark variants, which you can choose in Settings.

<p align="center">
  <img src="https://github.com/user-attachments/assets/95491e3a-a18c-4e81-ad15-e1788c751e2f" width="440" alt="Appearance settings" />
</p>

### Native macOS feel

- Translucent, collapsible sidebar
- System accent colour support
- Native materials instead of flat panels
- Fullscreen video playback
- Menu bar integration

---

## Your data

Everything stays in one folder outside the app. It contains your preferences and one folder for each library:

```text
~/Library/Application Support/Movies/
├── preferences.json    Appearance, app icon, and the active library
└── My Library/
    ├── library.db      Films, ratings, genres, and notes
    ├── posters/        Poster images copied into the library
    └── trailers/       Trailer videos copied into the library
```

Deleting or replacing `Movies.app` never touches this folder.

Posters and trailers are copied into the library, so they keep working if you delete the originals. Movie files are referenced in their original location to avoid duplicating large files; moving or deleting one will prevent playback.

### Backups and libraries

**Settings ▸ Your Library** shows the location and contents of the active library.

- **Export Library…** saves the complete library folder as a ZIP archive: its database, posters, and trailers. Movie files are not included because they are referenced, not copied into the library.
- **Restore from Backup…** imports that archive as a **new** library alongside the existing ones. It never overwrites a library.
- **Libraries…** lists every library you have. You can create, rename, reveal, back up, or delete libraries. Opening another library relaunches the app into it, leaving the previous one unchanged.

---

## Installation

1. Download `Movies_1.1.0_aarch64.dmg` from the [latest release](https://github.com/Ta2-me2/Movies/releases/latest).
2. Open the disk image and drag **Movies** to **Applications**.
3. On first launch, macOS may say it cannot verify the developer. Right-click the app, choose **Open**, then confirm **Open**.

You only need to do this once.

> Movies checks GitHub for updates on launch and shows a quiet note in the sidebar when a new release is available.

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
