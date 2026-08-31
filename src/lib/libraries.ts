import { invoke, isTauri } from "@tauri-apps/api/core";

/**
 * The store of libraries.
 *
 * `~/Library/Application Support/Movies` holds one folder per library, each
 * with its own database, posters and trailers. One is open at a time; opening
 * another relaunches the application into it, which is the only way the
 * database connection, its migrations and the asset scope can all agree about
 * which library they are looking at.
 */

export interface LibraryInfo {
  name: string;
  path: string;
  movies: number;
  posters: number;
  trailers: number;
  bytes: number;
  /** Milliseconds since the epoch, or null when the filesystem will not say. */
  updated: number | null;
  current: boolean;
}

export function listLibraries(): Promise<LibraryInfo[]> {
  if (!isTauri()) return Promise.resolve([]);
  return invoke<LibraryInfo[]>("list_libraries");
}

export function createLibrary(name: string): Promise<string> {
  return invoke<string>("create_library", { name });
}

export function renameLibrary(from: string, to: string): Promise<string> {
  return invoke<string>("rename_library", { from, to });
}

export function deleteLibrary(name: string): Promise<void> {
  return invoke("delete_library", { name });
}

/** Relaunches the application into another library; never returns normally. */
export function openLibrary(name: string): Promise<void> {
  return invoke("open_library", { name });
}

export function revealLibrary(name: string): Promise<void> {
  return invoke("reveal_library", { name });
}

/**
 * Writes a library to a zip the user chooses. Returns false when they change
 * their mind at the save panel.
 */
export async function exportLibrary(
  name: string,
  onProgress?: (percent: number) => void,
  onBegin?: () => void,
): Promise<boolean> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const dest = await save({
    defaultPath: `${name} ${new Date().toISOString().slice(0, 10)}.zip`,
    filters: [{ name: "Zip Archive", extensions: ["zip"] }],
  });
  if (!dest) return false;

  // Only now is there anything to be busy about: until the panel is dismissed
  // the user has not asked for the work, and saying it is under way is a lie.
  onBegin?.();
  const stop = await watchProgress("library-export-progress", onProgress);
  try {
    await invoke("export_library", { name, dest });
  } finally {
    stop();
  }
  return true;
}

/**
 * Reads a zip back in as a library of its own and returns its name, or null
 * when the user picks nothing.
 */
export async function importLibrary(
  onProgress?: (percent: number) => void,
  onBegin?: () => void,
): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const picked = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Zip Archive", extensions: ["zip"] }],
  });
  if (!picked || typeof picked !== "string") return null;

  onBegin?.();
  const stop = await watchProgress("library-import-progress", onProgress);
  try {
    return await invoke<string>("import_library", { archive: picked });
  } finally {
    stop();
  }
}

async function watchProgress(
  event: string,
  onProgress?: (percent: number) => void,
): Promise<() => void> {
  if (!onProgress) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<number>(event, (message) => onProgress(message.payload));
  return unlisten;
}

/** Sizes the way the Finder writes them. */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} bytes`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatUpdated(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "22 movies · 1.3 GB", with the singular written properly. */
export function describeContents(info: LibraryInfo): string {
  const films = `${info.movies} ${info.movies === 1 ? "movie" : "movies"}`;
  return `${films} · ${formatBytes(info.bytes)}`;
}
