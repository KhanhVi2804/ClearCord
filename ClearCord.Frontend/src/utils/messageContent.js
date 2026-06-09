export const GIF_MESSAGE_PREFIX = "__CLEARCORD_GIF__:";

const TRUSTED_GIF_HOSTS = [
  "giphy.com",
  "media.giphy.com",
  "tenor.com",
  "media.tenor.com",
  "c.tenor.com"
];

export function makeGifMessage(url) {
  return `${GIF_MESSAGE_PREFIX}${url}`;
}

export function getGifUrlFromContent(content = "") {
  if (!content.startsWith(GIF_MESSAGE_PREFIX)) {
    return "";
  }

  const rawUrl = content.slice(GIF_MESSAGE_PREFIX.length).trim();

  try {
    const parsedUrl = new URL(rawUrl);
    const host = parsedUrl.hostname.toLowerCase();
    const isTrustedHost = TRUSTED_GIF_HOSTS.some(
      (trustedHost) => host === trustedHost || host.endsWith(`.${trustedHost}`)
    );

    if (parsedUrl.protocol !== "https:" || !isTrustedHost) {
      return "";
    }

    return parsedUrl.toString();
  } catch {
    return "";
  }
}
