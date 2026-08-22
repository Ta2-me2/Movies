use std::fs;
use std::path::PathBuf;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

/// Everything the user creates lives here, deliberately outside the app
/// bundle and not keyed to the bundle identifier: deleting or replacing
/// Movie.app must never take the library with it.
const LIBRARY_FOLDER: &str = "Movie";

/// Where earlier builds kept their data, so an existing library can be moved
/// across instead of silently starting empty.
const LEGACY_FOLDER: &str = "com.kinoteka.app";

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

/// The library folder, created on demand.
fn library_dir() -> PathBuf {
    let dir = support_root()
        .map(|root| root.join(LIBRARY_FOLDER))
        .unwrap_or_else(|| PathBuf::from(LIBRARY_FOLDER));
    let _ = fs::create_dir_all(&dir);
    dir
}

/// Moves a pre-rename library into place, once. A rename rather than a copy,
/// so gigabytes of trailers do not get duplicated.
fn migrate_legacy_library() {
    let Some(root) = support_root() else { return };
    let (old, new) = (root.join(LEGACY_FOLDER), root.join(LIBRARY_FOLDER));
    if old.is_dir() && !new.exists() {
        if fs::rename(&old, &new).is_err() {
            // Different volume or a partial move — leave the original alone
            // rather than risk losing it.
            let _ = fs::create_dir_all(&new);
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

    // An existing library is moved into the new folder before anything opens it.
    migrate_legacy_library();

    // The database lives in the library folder rather than the identifier-based
    // one the plugin would pick, so the connection string is absolute. It is
    // leaked because the plugin wants a 'static key, and it is handed to the
    // web side verbatim so both agree on the same database.
    let db_conn: &'static str = Box::leak(
        format!("sqlite:{}", library_dir().join("library.db").display()).into_boxed_str(),
    );

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db_conn, migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .manage(DbUrl(db_conn))
        .invoke_handler(tauri::generate_handler![
            db_url,
            library_path,
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
        .setup(|app| {
            // Posters and trailers now sit outside the identifier-based folder
            // that the static asset scope covers, so allow the library here.
            let _ = app.asset_protocol_scope().allow_directory(library_dir(), true);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
