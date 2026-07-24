const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

export function getSecureVimeoUrl(videoUrl) {
  const url = new URL(videoUrl);

  if (url.protocol !== "https:" || !VIMEO_HOSTS.has(url.hostname)) {
    throw new Error("Lesson video must use an HTTPS Vimeo URL");
  }

  if (url.hostname === "player.vimeo.com") {
    if (!/^\/video\/\d+\/?$/.test(url.pathname)) {
      throw new Error("Invalid Vimeo player URL");
    }
    return url.toString();
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const videoId = parts.find((part) => /^\d+$/.test(part));

  if (!videoId) {
    throw new Error("Vimeo URL is missing a numeric video ID");
  }

  const playerUrl = new URL(`https://player.vimeo.com/video/${videoId}`);
  const videoIndex = parts.indexOf(videoId);
  const unlistedHash = parts[videoIndex + 1];

  if (unlistedHash) {
    playerUrl.searchParams.set("h", unlistedHash);
  }

  return playerUrl.toString();
}
