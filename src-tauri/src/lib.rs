use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};

/// Everything the user creates lives here, deliberately outside the app
/// bundle and not keyed to the bundle identifier: deleting or replacing
/// Movies.app must never take the libraries with it.
///
/// The folder is a *store*: one subfolder per library, each holding its own
/// database, posters and trailers. Only one is open at a time.
const STORE_FOLDER: &str = "Movies";

/// The library an installation starts with, and the name the pre-store layout
/// is carried into.
const DEFAULT_LIBRARY: &str = "My Library";

/// Marks a folder in the store as a library before it has a database.
///
/// A library normally announces itself by holding `library.db`, but one that
/// was just created holds nothing at all — and an older version of the app,
/// run against this store, drops `posters` and `trailers` beside the
/// libraries rather than inside one. Without something to tell them apart,
/// those would be listed as libraries of their own.
const LIBRARY_MARKER: &str = ".movies-library";

/// Folders earlier builds kept their data in, newest first, so an existing
/// library is carried across instead of silently starting empty.
const LEGACY_FOLDERS: [&str; 2] = ["Movie", "com.kinoteka.app"];

/// The auxiliary windows, addressed by label everywhere — the menu, the
/// commands and the capability file all name the same two strings, so none of
/// them can quietly drift apart.
const ABOUT_WINDOW: &str = "about";
const SETTINGS_WINDOW: &str = "settings";

/// Identifier of the About item in the application menu.
const ABOUT_MENU_ID: &str = "about";

fn support_root() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        return std::env::var_os("HOME")
            .map(|home| PathBuf::from(home).join("Library").join("Application Support"));
    }
    #[cfg(not(target_os = "macos"))]
    {
        return dirs_next_fallback();
    }
}

#[cfg(not(target_os = "macos"))]
fn dirs_next_fallback() -> Option<PathBuf> {
    std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")))
}

/// The store: the folder every library lives inside. Created on demand.
fn store_dir() -> PathBuf {
    let dir = support_root()
        .map(|root| root.join(STORE_FOLDER))
        .unwrap_or_else(|| PathBuf::from(STORE_FOLDER));
    let _ = fs::create_dir_all(&dir);
    dir
}

/// Which library is open, read once.
///
/// Once is enough because opening another one relaunches the application:
/// the database connection, its migrations and the asset scope are all fixed
/// at startup, and re-pointing them underneath a running window is the kind
/// of thing that half-works. The relaunch is what Photos does with its
/// libraries, and for the same reason.
static CURRENT_LIBRARY: OnceLock<String> = OnceLock::new();

fn current_library() -> &'static str {
    CURRENT_LIBRARY.get_or_init(|| {
        let name = read_preferences().library;
        let dir = store_dir().join(&name);
        // A library named in preferences but no longer on disk would leave the
        // application pointing at nothing, so it falls back to the default.
        if sanitize_library_name(&name).is_some() && (dir.is_dir() || !any_library_exists()) {
            name
        } else {
            first_library().unwrap_or_else(|| DEFAULT_LIBRARY.to_string())
        }
    })
}

/// The open library's folder, created on demand.
fn library_dir() -> PathBuf {
    let dir = store_dir().join(current_library());
    let _ = fs::create_dir_all(&dir);
    dir
}

/// A library name has to survive three things: being a folder name, being
/// unable to point anywhere but inside the store, and being pasted into the
/// database connection string the SQL plugin is handed. The last one is why
/// `?`, `#` and `%` are out along with the path separators.
fn sanitize_library_name(raw: &str) -> Option<String> {
    const FORBIDDEN: [char; 8] = ['/', '\\', ':', '?', '#', '%', '"', '\0'];
    let name = raw.trim();
    if name.is_empty()
        || name.len() > 80
        || name.starts_with('.')
        || name.contains(FORBIDDEN)
        || name.chars().any(char::is_control)
    {
        return None;
    }
    Some(name.to_string())
}

/// Whether a folder in the store is one of ours: it holds a database, or it
/// was created by us and has not been used yet.
fn is_library_dir(dir: &Path) -> bool {
    dir.join("library.db").is_file() || dir.join(LIBRARY_MARKER).is_file()
}

/// Every library in the store, alphabetically. Hidden folders are skipped,
/// which is what keeps a half-unpacked import out of the list.
fn library_names() -> Vec<String> {
    let store = store_dir();
    let mut names: Vec<String> = fs::read_dir(&store)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|entry| entry.path().is_dir() && is_library_dir(&entry.path()))
        .filter_map(|entry| entry.file_name().into_string().ok())
        .filter(|name| !name.starts_with('.'))
        .collect();
    names.sort_by_key(|name| name.to_lowercase());
    names
}

fn any_library_exists() -> bool {
    !library_names().is_empty()
}

fn first_library() -> Option<String> {
    library_names().into_iter().next()
}

/// Carries a pre-store library — database, posters and trailers sitting loose
/// in the store folder — into a library of its own, once.
///
/// Renames, never copies: a library runs to gigabytes of trailers, and a
/// half-finished copy would be worse than no migration at all.
fn migrate_flat_library() {
    let store = store_dir();
    if !store.join("library.db").is_file() {
        return;
    }
    let dest = store.join(DEFAULT_LIBRARY);
    if dest.join("library.db").is_file() {
        // Already carried across; whatever is loose in the store is not ours
        // to move on top of it.
        return;
    }
    if fs::create_dir_all(&dest).is_err() {
        return;
    }
    for name in [
        "library.db",
        "library.db-shm",
        "library.db-wal",
        "posters",
        "trailers",
    ] {
        let from = store.join(name);
        if from.exists() {
            let _ = fs::rename(&from, dest.join(name));
        }
    }
}

/// Moves a pre-rename library into place, once. A rename rather than a copy,
/// so gigabytes of trailers do not get duplicated.
fn migrate_legacy_library() {
    let Some(root) = support_root() else { return };
    let new = root.join(STORE_FOLDER);
    if new.exists() {
        return;
    }
    for legacy in LEGACY_FOLDERS {
        let old = root.join(legacy);
        if old.is_dir() {
            // A rename rather than a copy, so gigabytes of trailers are not
            // duplicated. On failure the original is left untouched.
            let _ = fs::rename(&old, &new);
            return;
        }
    }
}

/// Absolute path of the library folder, for building asset URLs on the web side.
#[tauri::command]
fn library_path() -> String {
    library_dir().to_string_lossy().into_owned()
}

/// Grants the asset protocol access to a movie file the user picked.
///
/// Movie files are referenced where they already live rather than copied, so
/// each one has to be allowed explicitly — the alternative would be opening
/// the whole disk to the web layer.
#[tauri::command]
fn allow_movie_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    if !PathBuf::from(&path).is_file() {
        return Err(format!("File not found: {path}"));
    }
    app.asset_protocol_scope()
        .allow_file(&path)
        .map_err(|e| e.to_string())
}

/// Same, for every movie already in the library at startup.
#[tauri::command]
fn allow_movie_files(app: tauri::AppHandle, paths: Vec<String>) {
    let scope = app.asset_protocol_scope();
    for path in paths {
        let _ = scope.allow_file(&path);
    }
}

/// Whether a referenced movie file is still where the library expects it.
#[tauri::command]
fn movie_file_exists(path: String) -> bool {
    PathBuf::from(path).is_file()
}

fn media_dir(sub: &str) -> Result<PathBuf, String> {
    let dir = library_dir().join(sub);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Copies a chosen file into the library and returns the stored file name.
fn save_media(src_path: &str, sub: &str, default_ext: &str) -> Result<String, String> {
    let src = PathBuf::from(src_path);
    if !src.is_file() {
        return Err(format!("File not found: {src_path}"));
    }
    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or(default_ext)
        .to_lowercase();
    let name = format!("{}.{}", uuid::Uuid::new_v4(), ext);
    let dest = media_dir(sub)?.join(&name);
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(name)
}

fn delete_media(file_name: &str, sub: &str) -> Result<(), String> {
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err("Invalid file name".into());
    }
    let path = media_dir(sub)?.join(file_name);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Preferences
//
// Appearance and app icon live here rather than in the library database: they
// are read before anything is on screen, and the answer decides what the very
// first frame looks like.
// ---------------------------------------------------------------------------

/// What the interface follows — the system, or a fixed appearance.
#[derive(Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum ThemeChoice {
    #[default]
    System,
    Light,
    Dark,
}

/// Which of the two app icons the application wears.
#[derive(Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum IconChoice {
    #[default]
    Dark,
    Light,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(default)]
struct Preferences {
    theme: ThemeChoice,
    icon: IconChoice,
    /// Name of the open library, as a folder name inside the store.
    library: String,
}

// Written out rather than derived: an empty library name is not a default,
// it is a bug, and `derive(Default)` would hand out exactly that.
impl Default for Preferences {
    fn default() -> Self {
        Self {
            theme: ThemeChoice::default(),
            icon: IconChoice::default(),
            library: DEFAULT_LIBRARY.to_string(),
        }
    }
}

struct Prefs(Mutex<Preferences>);

/// Preferences belong to the application, not to any one library, so they
/// live in the store beside the libraries rather than inside one of them.
fn preferences_path() -> PathBuf {
    store_dir().join("preferences.json")
}

/// Anything unreadable or unparsable falls back to the defaults — a preferences
/// file is never worth an error in front of someone opening their library.
fn read_preferences() -> Preferences {
    fs::read_to_string(preferences_path())
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

fn write_preferences(prefs: &Preferences) {
    if let Ok(raw) = serde_json::to_string_pretty(prefs) {
        let _ = fs::write(preferences_path(), raw);
    }
}

/// The colour a window is painted before its page has drawn anything.
///
/// It has to agree with `--bg` and `--panel-bg` in the stylesheet, or a window
/// flashes the wrong shade for the instant between opening and rendering.
fn window_background(label: &str, dark: bool) -> tauri::window::Color {
    use tauri::window::Color;
    let panel = label == ABOUT_WINDOW || label == SETTINGS_WINDOW;
    match (panel, dark) {
        (true, true) => Color(0x1e, 0x1e, 0x20, 0xff),
        (true, false) => Color(0xec, 0xec, 0xec, 0xff),
        (false, true) => Color(0x0f, 0x0f, 0x0f, 0xff),
        (false, false) => Color(0xff, 0xff, 0xff, 0xff),
    }
}

/// Whether the application is currently in a dark appearance.
fn is_dark(app: &tauri::AppHandle) -> bool {
    app.webview_windows()
        .values()
        .next()
        .and_then(|window| window.theme().ok())
        .map(|theme| theme == tauri::Theme::Dark)
        .unwrap_or(true)
}

/// Puts the whole application into the chosen appearance.
///
/// On macOS this is one setting for the process, which is exactly what is
/// wanted here: every window — the ones open now and the ones not built yet —
/// is in the same appearance, so none of them can ever come up in the wrong
/// one. `System` hands the choice back to macOS, live.
///
/// The stylesheet needs no telling: the appearance is what `prefers-color-
/// scheme` reports, so the page follows the window rather than the two being
/// kept in step by hand.
fn apply_theme(app: &tauri::AppHandle, choice: ThemeChoice) {
    let theme = match choice {
        ThemeChoice::System => None,
        ThemeChoice::Light => Some(tauri::Theme::Light),
        ThemeChoice::Dark => Some(tauri::Theme::Dark),
    };
    for (label, window) in app.webview_windows() {
        let _ = window.set_theme(theme);
        let dark = window
            .theme()
            .map(|t| t == tauri::Theme::Dark)
            .unwrap_or(true);
        let _ = window.set_background_color(Some(window_background(&label, dark)));
    }
}

/// Swaps the icon the running application shows in the Dock and the app
/// switcher.
///
/// Finder keeps showing the one in the bundle — macOS has no alternate app
/// icons the way iOS does — so the bundle carries the dark one and this only
/// changes what the running process draws.
#[cfg(target_os = "macos")]
fn apply_app_icon(choice: IconChoice) {
    use objc2::{AnyThread, MainThreadMarker};
    use objc2_app_kit::{NSApplication, NSImage};
    use objc2_foundation::NSData;

    const DARK: &[u8] = include_bytes!("../icons/app-icon-dark.png");
    const LIGHT: &[u8] = include_bytes!("../icons/app-icon-light.png");

    let Some(mtm) = MainThreadMarker::new() else {
        return;
    };
    let bytes = match choice {
        IconChoice::Dark => DARK,
        IconChoice::Light => LIGHT,
    };
    let data = NSData::with_bytes(bytes);
    let Some(image) = NSImage::initWithData(NSImage::alloc(), &data) else {
        return;
    };
    // SAFETY: on the main thread, with an image AppKit retains for itself.
    unsafe { NSApplication::sharedApplication(mtm).setApplicationIconImage(Some(&image)) };
}

#[cfg(not(target_os = "macos"))]
fn apply_app_icon(_choice: IconChoice) {}

#[tauri::command]
fn preferences(state: tauri::State<'_, Prefs>) -> Preferences {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
fn set_theme(app: tauri::AppHandle, state: tauri::State<'_, Prefs>, theme: ThemeChoice) {
    {
        let mut prefs = state.0.lock().unwrap();
        prefs.theme = theme;
        write_preferences(&prefs);
    }
    apply_theme(&app, theme);
}

#[tauri::command]
fn set_app_icon(state: tauri::State<'_, Prefs>, icon: IconChoice) {
    {
        let mut prefs = state.0.lock().unwrap();
        prefs.icon = icon;
        write_preferences(&prefs);
    }
    apply_app_icon(icon);
}

// ---------------------------------------------------------------------------
// Libraries
//
// The store holds any number of them; one is open. Everything here works on
// folders inside the store and refuses to look anywhere else.
// ---------------------------------------------------------------------------

/// What the Libraries list shows about one library.
#[derive(Serialize)]
struct LibraryInfo {
    name: String,
    path: String,
    movies: u32,
    posters: u32,
    trailers: u32,
    bytes: u64,
    /// Milliseconds since the epoch, or None when the filesystem will not say.
    updated: Option<f64>,
    current: bool,
}

/// Resolves a name to a folder inside the store, or refuses.
fn library_path_for(name: &str) -> Result<PathBuf, String> {
    let name = sanitize_library_name(name).ok_or("That is not a usable library name.")?;
    Ok(store_dir().join(name))
}

fn count_files(dir: &Path) -> u32 {
    fs::read_dir(dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|entry| entry.path().is_file())
        .count() as u32
}

/// Total size of a folder, following it all the way down.
fn dir_size(dir: &Path) -> u64 {
    let mut total = 0;
    let Ok(entries) = fs::read_dir(dir) else {
        return 0;
    };
    for entry in entries.flatten() {
        let Ok(meta) = entry.metadata() else { continue };
        if meta.is_dir() {
            total += dir_size(&entry.path());
        } else {
            total += meta.len();
        }
    }
    total
}

fn modified_millis(path: &Path) -> Option<f64> {
    let modified = fs::metadata(path).ok()?.modified().ok()?;
    let since = modified.duration_since(std::time::UNIX_EPOCH).ok()?;
    Some(since.as_millis() as f64)
}

/// How many films a library holds, read straight from its database.
///
/// Opened read-only and closed again: this is a listing, and a listing has no
/// business being able to write to a library that is not even open.
async fn count_movies(db: &Path) -> u32 {
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

    // Built from the path rather than a URL string: a library name is a folder
    // name, and folder names are not URL-safe.
    let options = SqliteConnectOptions::new()
        .filename(db)
        .read_only(true)
        .create_if_missing(false);
    let Ok(pool) = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
    else {
        return 0;
    };
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM movies")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);
    pool.close().await;
    count.max(0) as u32
}

async fn describe_library(name: &str) -> LibraryInfo {
    let dir = store_dir().join(name);
    LibraryInfo {
        movies: count_movies(&dir.join("library.db")).await,
        posters: count_files(&dir.join("posters")),
        trailers: count_files(&dir.join("trailers")),
        bytes: dir_size(&dir),
        // The database's date is when the library last changed; a library with
        // no database yet falls back to when its folder was made.
        updated: modified_millis(&dir.join("library.db")).or_else(|| modified_millis(&dir)),
        current: name == current_library(),
        path: dir.to_string_lossy().into_owned(),
        name: name.to_string(),
    }
}

#[tauri::command]
async fn list_libraries() -> Vec<LibraryInfo> {
    let mut out = Vec::new();
    for name in library_names() {
        out.push(describe_library(&name).await);
    }
    // A library the preferences point at but that holds no database yet — a
    // fresh installation, before the first film — still has to be listed, or
    // the sheet comes up empty on a working application.
    if !out.iter().any(|info| info.current) {
        out.push(describe_library(current_library()).await);
        out.sort_by_key(|info| info.name.to_lowercase());
    }
    out
}

#[tauri::command]
fn current_library_info() -> String {
    current_library().to_string()
}

/// A name that is free, by adding " 2", " 3" … until it is.
fn unique_library_name(wanted: &str) -> String {
    let base = sanitize_library_name(wanted).unwrap_or_else(|| DEFAULT_LIBRARY.to_string());
    if !store_dir().join(&base).exists() {
        return base;
    }
    for n in 2..1000 {
        let candidate = format!("{base} {n}");
        if !store_dir().join(&candidate).exists() {
            return candidate;
        }
    }
    format!("{base} {}", uuid::Uuid::new_v4())
}

#[tauri::command]
fn create_library(name: String) -> Result<String, String> {
    let name = unique_library_name(&name);
    let dir = library_path_for(&name)?;
    fs::create_dir_all(dir.join("posters")).map_err(|e| e.to_string())?;
    fs::create_dir_all(dir.join("trailers")).map_err(|e| e.to_string())?;
    // Says "this is a library" until the database exists to say it instead.
    fs::write(dir.join(LIBRARY_MARKER), b"").map_err(|e| e.to_string())?;
    // The database itself is created, and migrated, when the library is opened.
    Ok(name)
}

#[tauri::command]
fn rename_library(from: String, to: String) -> Result<String, String> {
    let source = library_path_for(&from)?;
    if !source.is_dir() {
        return Err(format!("There is no library called “{from}”."));
    }
    let wanted = sanitize_library_name(&to).ok_or("That is not a usable library name.")?;
    if wanted == from {
        return Ok(from);
    }
    if store_dir().join(&wanted).exists() {
        return Err(format!("A library called “{wanted}” already exists."));
    }
    fs::rename(&source, store_dir().join(&wanted)).map_err(|e| e.to_string())?;
    // Renaming the open library moves the ground under this process, so the
    // preference follows it before anything else looks.
    if from == current_library() {
        let mut prefs = read_preferences();
        prefs.library = wanted.clone();
        write_preferences(&prefs);
    }
    Ok(wanted)
}

#[tauri::command]
fn delete_library(name: String) -> Result<(), String> {
    if name == current_library() {
        return Err("This library is open. Open another one first.".into());
    }
    let dir = library_path_for(&name)?;
    if !dir.join("library.db").is_file() && !dir.is_dir() {
        return Err(format!("There is no library called “{name}”."));
    }
    fs::remove_dir_all(&dir).map_err(|e| e.to_string())
}

/// Opens another library, by relaunching into it.
#[tauri::command]
fn open_library(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let dir = library_path_for(&name)?;
    if !dir.is_dir() {
        return Err(format!("There is no library called “{name}”."));
    }
    let mut prefs = read_preferences();
    prefs.library = sanitize_library_name(&name).ok_or("That is not a usable library name.")?;
    write_preferences(&prefs);
    app.restart();
}

/// Shows a library's folder in the Finder.
#[tauri::command]
fn reveal_library(name: String) -> Result<(), String> {
    let dir = library_path_for(&name)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// --------------------------- Backup and restore ----------------------------

/// Reports how far a long copy has got, as a whole percentage.
fn emit_progress(app: &tauri::AppHandle, event: &str, done: u64, total: u64) {
    let percent = if total == 0 {
        0
    } else {
        ((done.min(total) as f64 / total as f64) * 100.0).round() as u32
    };
    let _ = app.emit(event, percent);
}

/// Writes a library to a zip file.
///
/// `ditto` does the work: it is what the Finder's own Compress uses, it
/// handles a folder of gigabytes without loading any of it into memory, and it
/// is already on every Mac. While it runs, the growing archive is measured
/// against the folder it came from, which is enough to move a progress bar
/// honestly.
#[tauri::command]
async fn export_library(app: tauri::AppHandle, name: String, dest: String) -> Result<(), String> {
    let dir = library_path_for(&name)?;
    if !dir.is_dir() {
        return Err(format!("There is no library called “{name}”."));
    }
    let dest = PathBuf::from(dest);
    let total = dir_size(&dir).max(1);

    let mut child = std::process::Command::new("ditto")
        .args(["-c", "-k", "--sequesterRsrc", "--keepParent"])
        .arg(&dir)
        .arg(&dest)
        .spawn()
        .map_err(|e| e.to_string())?;

    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => {
                if !status.success() {
                    let _ = fs::remove_file(&dest);
                    return Err("The backup could not be written.".into());
                }
                emit_progress(&app, "library-export-progress", total, total);
                return Ok(());
            }
            None => {
                let written = fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);
                emit_progress(&app, "library-export-progress", written, total);
                tokio::time::sleep(std::time::Duration::from_millis(250)).await;
            }
        }
    }
}

/// Reads a zip back into a library of its own.
///
/// Never over the top of an existing one: a restore that quietly replaced a
/// library would be the one operation in the application capable of losing
/// everything. It lands beside them, and the user opens it if they want it.
#[tauri::command]
async fn import_library(app: tauri::AppHandle, archive: String) -> Result<String, String> {
    let archive = PathBuf::from(archive);
    if !archive.is_file() {
        return Err("That file is not there any more.".into());
    }
    let total = fs::metadata(&archive).map(|m| m.len()).unwrap_or(1).max(1);

    // Unpacked somewhere out of the way first, so a bad archive cannot leave
    // half a library sitting in the store looking like a real one.
    let staging = store_dir().join(format!(".import-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&staging).map_err(|e| e.to_string())?;

    let mut child = std::process::Command::new("ditto")
        .args(["-x", "-k"])
        .arg(&archive)
        .arg(&staging)
        .spawn()
        .map_err(|e| e.to_string())?;

    let outcome = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status.success(),
            Ok(None) => {
                emit_progress(&app, "library-import-progress", dir_size(&staging), total);
                tokio::time::sleep(std::time::Duration::from_millis(250)).await;
            }
            Err(_) => break false,
        }
    };

    let finish = |result: Result<String, String>| {
        let _ = fs::remove_dir_all(&staging);
        result
    };

    if !outcome {
        return finish(Err("That archive could not be read.".into()));
    }

    // A backup of a library is that library's folder, so the archive holds one
    // directory with a database in it. Anything else is not one of ours.
    let Some(unpacked) = find_library_root(&staging) else {
        return finish(Err(
            "That archive does not contain a Movies library.".to_string()
        ));
    };

    let wanted = unpacked
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(DEFAULT_LIBRARY);
    let name = unique_library_name(wanted);
    match fs::rename(&unpacked, store_dir().join(&name)) {
        Ok(()) => finish(Ok(name)),
        Err(error) => finish(Err(error.to_string())),
    }
}

/// The folder inside an unpacked archive that is a library: the root itself,
/// or the single directory it contains.
fn find_library_root(staging: &Path) -> Option<PathBuf> {
    if staging.join("library.db").is_file() {
        return Some(staging.to_path_buf());
    }
    fs::read_dir(staging)
        .ok()?
        .flatten()
        .map(|entry| entry.path())
        .find(|path| path.join("library.db").is_file())
}

/// The database connection string, so the web side opens the very same file
/// the migrations ran against.
struct DbUrl(&'static str);

#[tauri::command]
fn db_url(url: tauri::State<'_, DbUrl>) -> String {
    url.0.to_string()
}

/// Hands the web page a real user activation.
///
/// This WKWebView refuses to start ANY media on its own — verified against a
/// tiny, muted, audio-less, fully visible clip, and with
/// `mediaTypesRequiringUserActionForPlayback` confirmed to be `.none` on the
/// live view. WebKit simply wants a genuine user event before it will play
/// anything, which is why clicking anywhere has always "fixed" the hero.
///
/// So we post one synthetic key event for F16 — a key nothing in the app is
/// bound to — into our own window. WebKit records the gesture, and playback is
/// allowed from then on; the user sees nothing.
#[cfg(target_os = "macos")]
#[tauri::command]
fn grant_user_gesture(window: tauri::WebviewWindow) -> Result<(), String> {
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSApplication, NSEvent, NSEventModifierFlags, NSEventType};
    use objc2_foundation::{NSPoint, NSString};

    const F16_KEYCODE: u16 = 106;

    let mtm = MainThreadMarker::new().ok_or("must run on the main thread")?;
    let win_number = window.ns_window().map_err(|e| e.to_string())? as isize;
    let app = NSApplication::sharedApplication(mtm);
    let chars = NSString::from_str("\u{F713}"); // NSF16FunctionKey

    for (kind, at_start) in [(NSEventType::KeyDown, true), (NSEventType::KeyUp, false)] {
        let event =
            NSEvent::keyEventWithType_location_modifierFlags_timestamp_windowNumber_context_characters_charactersIgnoringModifiers_isARepeat_keyCode(
                kind,
                NSPoint::new(0.0, 0.0),
                NSEventModifierFlags::empty(),
                0.0,
                win_number,
                None,
                &chars,
                &chars,
                false,
                F16_KEYCODE,
            )
            .ok_or("could not synthesize key event")?;
        app.postEvent_atStart(&event, at_start);
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn grant_user_gesture(_window: tauri::WebviewWindow) -> Result<(), String> {
    Ok(())
}

/// The user's accent colour from System Settings, as an "r, g, b" string.
///
/// CSS in this WebView understands none of the system-accent keywords
/// (`AccentColor`, `-apple-system-blue`, …), so the interface asks AppKit for
/// the real one and uses it the way a native app would. Returns None when the
/// colour cannot be converted, and the stylesheet keeps its systemBlue default.
#[cfg(target_os = "macos")]
#[tauri::command]
fn accent_color() -> Option<String> {
    use objc2_app_kit::{NSColor, NSColorSpace};

    // controlAccentColor is dynamic and has no documented colour space, so it
    // has to be converted before its components can be read.
    let color = NSColor::controlAccentColor();
    let srgb = color.colorUsingColorSpace(&NSColorSpace::sRGBColorSpace())?;
    let (r, g, b) = (
        srgb.redComponent(),
        srgb.greenComponent(),
        srgb.blueComponent(),
    );
    let byte = |c: f64| (c.clamp(0.0, 1.0) * 255.0).round() as u8;
    Some(format!("{}, {}, {}", byte(r), byte(g), byte(b)))
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn accent_color() -> Option<String> {
    None
}

#[tauri::command]
fn save_poster(src_path: String) -> Result<String, String> {
    save_media(&src_path, "posters", "jpg")
}

#[tauri::command]
fn delete_poster(file_name: String) -> Result<(), String> {
    delete_media(&file_name, "posters")
}

#[tauri::command]
fn save_trailer(src_path: String) -> Result<String, String> {
    save_media(&src_path, "trailers", "mp4")
}

#[tauri::command]
fn delete_trailer(file_name: String) -> Result<(), String> {
    delete_media(&file_name, "trailers")
}

/// Opens one of the auxiliary windows, or raises it when it is already on
/// screen — asking for About twice must bring the first panel forward rather
/// than stack a second one behind it.
///
/// Both are built hidden. The page measures itself, sizes the window to its
/// own content and only then shows it, so neither ever appears at a guessed
/// height and then jumps.
fn open_panel(app: &tauri::AppHandle, label: &str) -> tauri::Result<()> {
    use tauri::webview::WebviewWindowBuilder;
    use tauri::{LogicalPosition, TitleBarStyle, WebviewUrl};

    if let Some(window) = app.get_webview_window(label) {
        let _ = window.unminimize();
        window.show()?;
        window.set_focus()?;
        return Ok(());
    }

    let builder = if label == ABOUT_WINDOW {
        // An About panel has no title bar at all — only the traffic lights,
        // floating over the content.
        WebviewWindowBuilder::new(app, ABOUT_WINDOW, WebviewUrl::App("about.html".into()))
            .title("About Movies")
            .inner_size(380.0, 345.0)
            .title_bar_style(TitleBarStyle::Overlay)
            .hidden_title(true)
            .traffic_light_position(LogicalPosition::new(13.0, 13.0))
            .minimizable(false)
    } else {
        WebviewWindowBuilder::new(app, SETTINGS_WINDOW, WebviewUrl::App("settings.html".into()))
            .title("Settings")
            .inner_size(520.0, 170.0)
    };

    // No theme is set here on purpose: the appearance belongs to the whole
    // application, so a panel built now already comes up in the one the user
    // chose. Only the pre-paint background has to be spelled out.
    builder
        .resizable(false)
        .maximizable(false)
        .visible(false)
        .center()
        .background_color(window_background(label, is_dark(app)))
        .build()?;
    Ok(())
}

#[tauri::command]
fn open_about(app: tauri::AppHandle) -> Result<(), String> {
    open_panel(&app, ABOUT_WINDOW).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_settings(app: tauri::AppHandle) -> Result<(), String> {
    open_panel(&app, SETTINGS_WINDOW).map_err(|e| e.to_string())
}

/// Points the About item at our own window.
///
/// Only that single item is swapped — the rest of the menu, Edit with its
/// clipboard shortcuts in particular, is left exactly as Tauri built it.
/// `PredefinedMenuItem::about` would open AppKit's stock panel, which lists a
/// bundle identifier and a copyright line; the window it is replaced with says
/// what the application is for and who wrote it instead.
fn install_app_menu(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, MenuItemKind};

    let handle = app.handle();
    let menu = Menu::default(handle)?;

    let items = menu.items()?;
    let Some(MenuItemKind::Submenu(app_menu)) = items.first() else {
        return Ok(());
    };

    let about = MenuItem::with_id(handle, ABOUT_MENU_ID, "About Movies", true, None::<&str>)?;
    let app_items = app_menu.items()?;
    if let Some(MenuItemKind::Predefined(existing)) = app_items.first() {
        app_menu.remove(existing)?;
    }
    app_menu.insert(&about, 0)?;

    app.set_menu(menu)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_movies",
            sql: "CREATE TABLE IF NOT EXISTS movies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                year INTEGER,
                genres TEXT NOT NULL DEFAULT '[]',
                rating REAL NOT NULL DEFAULT 0,
                poster_path TEXT,
                trailer_url TEXT,
                description TEXT,
                note TEXT,
                date_added TEXT NOT NULL,
                date_watched TEXT
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_trailer_path",
            sql: "ALTER TABLE movies ADD COLUMN trailer_path TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_genres",
            sql: "CREATE TABLE IF NOT EXISTS genres (name TEXT PRIMARY KEY);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_movie_path",
            sql: "ALTER TABLE movies ADD COLUMN movie_path TEXT;",
            kind: MigrationKind::Up,
        },
    ];

    // Both migrations run before anything asks where the library is: first the
    // pre-rename folder is carried across, then a library that predates the
    // store is given a folder of its own inside it.
    migrate_legacy_library();
    migrate_flat_library();

    // The database lives in the library folder rather than the identifier-based
    // one the plugin would pick, so the connection string is absolute. It is
    // leaked because the plugin wants a 'static key, and it is handed to the
    // web side verbatim so both agree on the same database.
    let db_conn: &'static str = Box::leak(
        format!("sqlite:{}", library_dir().join("library.db").display()).into_boxed_str(),
    );

    // Read before any window exists, because the answer decides what the first
    // frame looks like.
    let prefs = read_preferences();
    // The setup and run closures only need the two appearance choices, and
    // taking copies of them leaves the record itself free to be managed.
    let (theme, icon) = (prefs.theme, prefs.icon);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db_conn, migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(DbUrl(db_conn))
        .manage(Prefs(Mutex::new(prefs)))
        .on_menu_event(|app, event| {
            if event.id() == ABOUT_MENU_ID {
                if let Err(error) = open_panel(app, ABOUT_WINDOW) {
                    eprintln!("could not open the About window: {error}");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            db_url,
            library_path,
            open_about,
            open_settings,
            preferences,
            set_theme,
            set_app_icon,
            list_libraries,
            current_library_info,
            create_library,
            rename_library,
            delete_library,
            open_library,
            reveal_library,
            export_library,
            import_library,
            allow_movie_file,
            allow_movie_files,
            movie_file_exists,
            grant_user_gesture,
            accent_color,
            save_poster,
            delete_poster,
            save_trailer,
            delete_trailer
        ])
        .setup(move |app| {
            // Posters and trailers now sit outside the identifier-based folder
            // that the static asset scope covers, so allow the library here.
            let _ = app.asset_protocol_scope().allow_directory(library_dir(), true);
            if let Err(error) = install_app_menu(app) {
                // A stock About panel is a perfectly acceptable fallback.
                eprintln!("could not customise the About item: {error}");
            }

            // The main window is built hidden by the configuration and shown
            // here, once it is wearing the appearance the user asked for. The
            // alternative is a window that opens in the system's appearance
            // and changes a frame later, in full view.
            apply_theme(app.handle(), theme);
            apply_app_icon(icon);
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
                // Relaunching into another library would otherwise leave the
                // new process sitting behind whatever the user was looking at.
                let _ = main.set_focus();
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(move |_app, event| {
            // An icon set while the application is still launching does not
            // always survive it, so it is set once more when launch is done.
            if matches!(event, tauri::RunEvent::Ready) {
                apply_app_icon(icon);
            }
        });
}
