import { inTauri } from "./db";

/** Where releases are published. */
export const REPO = "Ta2-me2/Movies";
export const REPO_URL = `https://github.com/${REPO}`;

export interface UpdateInfo {
  version: string;
  url: string;
}

/** `v1.2.0` / `1.2.0` → [1, 2, 0]. Anything unparsable becomes 0. */
function parseVersion(raw: string): number[] {
  return raw
    .trim()
    .replace(/^v/i, "")
    .split(/[.\-+]/)
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);
}

/** True when `candidate` is a later release than `current`. */
export function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/**
 * Asks GitHub for the newest release and reports it only when it is actually
 * newer than what is running.
 *
 * Everything here fails quietly: being offline, hitting the API rate limit or
 * publishing no releases yet are all ordinary situations, and none of them
 * should put an error in front of someone who just opened their library.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!inTauri) return null;
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    const current = await getVersion();

    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;

    const release = (await response.json()) as {
      tag_name?: string;
      html_url?: string;
      draft?: boolean;
      prerelease?: boolean;
    };
    if (!release.tag_name || release.draft || release.prerelease) return null;
    if (!isNewer(release.tag_name, current)) return null;

    return {
      version: release.tag_name.replace(/^v/i, ""),
      url: release.html_url ?? `${REPO_URL}/releases/latest`,
    };
  } catch {
    return null;
  }
}

/** Opens a link in the user's browser. */
export async function openExternal(url: string): Promise<void> {
  if (!inTauri) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}
