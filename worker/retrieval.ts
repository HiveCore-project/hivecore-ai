import { parseDocument, DomUtils } from "htmlparser2";
import robotsParser from "robots-parser";
import { LIMITS, permittedUrl, type Source } from "../shared/research";

export type Fetcher = typeof fetch;
export class ResearchError extends Error {}
export async function boundedText(
  response: Response,
  cap: number,
): Promise<string> {
  if (!response.body) throw new ResearchError("Empty source response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > cap)
        throw new ResearchError("Source exceeded the retrieval size limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
export function extractArticle(html: string) {
  const doc = parseDocument(html);
  const title = DomUtils.getElementsByTagName("title", doc.children)[0];
  const root =
    DomUtils.findOne(
      (el) =>
        el.attribs.id === "mw-content-text" ||
        el.attribs.class?.split(" ").includes("mw-parser-output"),
      doc.children,
    ) || DomUtils.getElementsByTagName("body", doc.children)[0];
  if (!root)
    throw new ResearchError("The source did not contain a readable article.");
  for (const el of DomUtils.findAll(
    (el) =>
      [
        "script",
        "style",
        "nav",
        "footer",
        "aside",
        "form",
        "noscript",
      ].includes(el.name),
    root.children,
  ))
    DomUtils.removeElement(el);
  const paragraphs = DomUtils.getElementsByTagName("p", root.children)
    .map((el) => DomUtils.textContent(el).replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const allText = paragraphs.join("\n");
  let text = allText.slice(0, LIMITS.sourceChars);
  // Prefer complete sentences inside the fixed cap. All roles receive exactly
  // this retained text; there is no additional per-role truncation.
  if (allText.length > LIMITS.sourceChars) {
    const last = [...text.matchAll(/[.!?](?:\[\d+\])*(?=\s|$)/g)].at(-1);
    const end = last ? last.index! + last[0].length : -1;
    if (end >= 100) text = text.slice(0, end);
    else if (text.lastIndexOf(" ") > 100)
      text = text.slice(0, text.lastIndexOf(" "));
  }
  if (text.length < 100)
    throw new ResearchError(
      "The source did not contain enough readable article text.",
    );
  const links = DomUtils.getElementsByTagName("a", root.children).flatMap(
    (el) => {
      try {
        return [
          permittedUrl(
            new URL(el.attribs.href || "", "https://en.wikipedia.org").href,
          ),
        ];
      } catch {
        return [];
      }
    },
  );
  return {
    title: (title ? DomUtils.textContent(title) : "Wikipedia article").slice(
      0,
      200,
    ),
    text,
    links: [...new Set(links)],
  };
}
export async function retrieveSources(options: {
  missionId: string;
  title: string;
  objective: string;
  urls: string[];
  userAgent: string;
  signal: AbortSignal;
  fetcher?: Fetcher;
  onSource: (source: Source) => Promise<void>;
  onEvent: (message: string) => Promise<void>;
}): Promise<Source[]> {
  const { signal, userAgent } = options;
  const fetcher = options.fetcher || fetch;
  async function get(url: string, cap: number, html = false) {
    const timeout = AbortSignal.timeout(LIMITS.fetchMs);
    const combined = AbortSignal.any([signal, timeout]);
    const response = await fetcher(url, {
      redirect: "manual",
      signal: combined,
      headers: {
        "User-Agent": userAgent,
        Accept: html ? "text/html" : "text/plain",
      },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ResearchError(
        `Source request stopped (HTTP ${response.status}); redirects and retries are disabled.`,
      );
    }
    if (
      !response.headers
        .get("Content-Type")
        ?.toLowerCase()
        .includes(html ? "text/html" : "text/plain")
    ) {
      await response.body?.cancel();
      throw new ResearchError(
        html
          ? "Only HTML article sources are supported."
          : "robots.txt must be a plain-text policy.",
      );
    }
    return boundedText(response, cap);
  }
  const robotsUrl = "https://en.wikipedia.org/robots.txt";
  // Fail closed on missing, oversized, denied, or unavailable robots policy.
  const policy = robotsParser(robotsUrl, await get(robotsUrl, 100000));
  const delay = Math.max(1000, (policy.getCrawlDelay("HIVECORE") || 0) * 1000);
  if (!Number.isFinite(delay) || delay > 10000)
    throw new ResearchError(
      "Site crawl delay exceeds the mission time budget.",
    );
  const queue = options.urls.length
    ? [...options.urls]
    : [
        permittedUrl(
          `https://en.wikipedia.org/wiki/${encodeURIComponent(options.title.trim().replace(/\s+/g, "_"))}`,
        ),
      ];
  const sources: Source[] = [];
  const visited = new Set<string>();
  const words = options.objective.toLowerCase().match(/[a-z]{4,}/g) || [];
  for (let attempt = 0; queue.length && attempt < LIMITS.sources; attempt++) {
    signal.throwIfAborted();
    const url = permittedUrl(queue.shift()!);
    visited.add(url);
    if (policy.isAllowed(url, "HIVECORE") !== true)
      throw new ResearchError(
        "Source retrieval is disallowed or unspecified by robots.txt.",
      );
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        signal.removeEventListener("abort", abort);
        resolve();
      };
      const timer = setTimeout(done, delay);
      const abort = () => {
        clearTimeout(timer);
        reject(new ResearchError("Mission retrieval cancelled."));
      };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
    const article = extractArticle(await get(url, LIMITS.pageBytes, true));
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(article.text),
    );
    const source: Source = {
      id: crypto.randomUUID(),
      mission_id: options.missionId,
      url,
      title: article.title,
      excerpt: article.text,
      retrieved_at: new Date().toISOString(),
      content_hash: Array.from(new Uint8Array(hash), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join(""),
    };
    sources.push(source);
    await options.onSource(source);
    await options.onEvent(`Retrieved source ${sources.length}: ${url}`);
    if (options.urls.length === 0) {
      const candidates = article.links.filter(
        (link) => !visited.has(link) && !queue.includes(link),
      );
      const score = (link: string) =>
        words.filter((word) =>
          decodeURIComponent(link).toLowerCase().includes(word),
        ).length;
      queue.push(
        ...candidates
          .filter((link) => score(link) > 0)
          .sort((a, b) => score(b) - score(a))
          .slice(0, LIMITS.sources - sources.length - queue.length),
      );
    }
  }
  if (!sources.length)
    throw new ResearchError("No permitted evidence was retrieved.");
  return sources;
}
