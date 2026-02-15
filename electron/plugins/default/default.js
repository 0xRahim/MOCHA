/**
 * Default AniDB plugin
 * Runs in MAIN process
 * Uses Electron Chromium to fetch HTML
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { getHtml } = require('../../scraper/service');
const { XMLParser } = require("fast-xml-parser");



/* ---------------- CONSTANTS ---------------- */
const BASE = 'https://anidb.net';
const HOME_HERO_URL =
  'https://anidb.net/latest/anime/release/?do.update=1&epp=50&movie=1&res.hd=1&res.hdready=1&res.sd=1&res.unknown=1&source.bd=1&source.dvd=1&source.hdtv=1&source.other=1&source.unknown=1&source.www=1&tvseries=1';

const HOME_YOU_MAY_LIKE_URL = 'https://anidb.net/anime/season'
const EXPLORE_ITEMS = "https://anidb.net/anime?h=1&noalias=1&orderby.name=0.1&view=list"
const SEARCH_ITEMS = "https://anidb.net/anime/??do.search=1&adb.search="
const SHOW_URL = "https://anidb.net/anime/"
const DOWNLOAD_SOURCE = "https://feed.animetosho.org/rss2?aid="
/* ---------------- HTML PARSER ---------------- */

// @ HERO CARD PARSER
function parse_hero(html) {
  const $ = cheerio.load(html);
  const results = [];

  $('td.name.anime > a[href^="/anime/"]').each((_, el) => {
    const a = $(el);
    const href = a.attr('href');
    if (!href) return;

    const url = new URL(href, BASE).href;
    const id = href.split('/').filter(Boolean).pop();
    const title = (a.attr('title') || a.text() || '').trim();

    const td = a.closest('td');
    const tr = td.closest('tr');
    const rowspan = parseInt(td.attr('rowspan') || '1', 10);

    const blockRows = [tr];
    let next = tr.next();
    for (let i = 1; i < rowspan && next?.length; i++) {
      blockRows.push(next);
      next = next.next();
    }

    const episodeSet = new Set();
    blockRows.forEach(row => {
      $(row)
        .find('td.episode abbr')
        .each((__, ep) => {
          const text = $(ep).text().trim();
          if (text) episodeSet.add(text);
        });
    });

    results.push({
      id,
      url,
      title,
      episodesCount: episodeSet.size,
    });
  });

  return results;
}

// @ YOU MAY LIKE CARD PARSER
function parse_you_may_like(html) {
  const $ = cheerio.load(html);

  const results = [];

  // Each anime block is a div with classes like "g_bubble box ..." and id="a12345"
  // Selectors chosen from the saved.html structure.
  $('div.g_bubble.box, div.g_odd.g_bubble.box').each((i, el) => {
    const $el = $(el);

    // anime id (the wrapper div has id like "a18093")
    const rawId = $el.attr('id') || '';
    const animeId = rawId.replace(/^a/, '') || null;

    // cover image
    // sample path: <div class="thumb image"> ... <img src="https://...jpg-thumb.jpg" .../>
    let cover = $el.find('.thumb.image img').attr('src') || null;
    // If src is relative, convert to absolute if needed (left as-is here)

    // title
    const title = $el.find('.wrap.name a').first().text().trim() || null;

    // rating value (if present). Example structure:
    // <div class="votes rating"> ... <span class="value">7.05</span> <span class="count">(46)</span></span>
    let ratingText = $el.find('.votes.rating .value').first().text().trim() || null;
    let rating = ratingText ? parseFloat(ratingText) : null;

    // rating count (number of votes), optional
    let countText = $el.find('.votes.rating .count').first().text().trim() || null;
    let ratingCount = null;
    if (countText) {
      ratingCount = parseInt(countText.replace(/[(),]/g, ''), 10);
      if (Number.isNaN(ratingCount)) ratingCount = null;
    }

    results.push({
      animeId: animeId || null,
      title,
      cover,
      rating,
      ratingCount
    });
  });

  return results;
}

// @ explore items parser
function parse_explore_items(html) {
  const $ = cheerio.load(html);
  const results = [];

  $("#animelist tbody tr").each((_, row) => {
    const $row = $(row);

    // Row id is like: id="a8699"
    const rawId = $row.attr("id");
    if (!rawId) return;

    const animeId = rawId.replace(/^a/, "");

    const titleAnchor = $row.find("td.name.main.anime a");
    const title = titleAnchor.text().trim();

    const coverImg = $row.find("td.thumb img");
    // Attempt to normalize the cover URL:
    let cover = coverImg.attr("src") || coverImg.attr("data-src") || null;
    if (cover) {
      // common AniDB thumbnail pattern: ".../12345.jpg-thumb.jpg"
      // remove the "-thumb" token if present
      cover = cover.replace("-thumb", "");
      // remove any duplicate ".jpg.jpg" (defensive)
      cover = cover.replace(/\.jpg\.jpg$/, ".jpg").replace(/\.png\.png$/, ".png");
    }

    const ratingText = $row.find("td.rating.weighted").text().trim();
    const ratingMatch = ratingText.match(/([\d.]+)/);
    const rating = ratingMatch ? Number(ratingMatch[1]) : null;

    // NEW: parse the type (e.g. "TV Series", "Movie", "OVA", "Web", "Other")
    const typeText = $row.find("td.type").text().trim() || null;

    results.push({
      animeId,
      title,
      cover,
      rating,
      type: typeText,
    });
  });

  return results;
}

function parse_search_items(html) {
  const $ = cheerio.load(html);

  // The table rows for results live under: table#animelist tbody tr
  const rows = $('#animelist tbody tr');

  const items = [];

  rows.each((i, el) => {
    const $tr = $(el);

    // Anime id: tr id looks like "a3" or "a11524" -> strip leading 'a'
    const trId = $tr.attr('id') || '';
    const animeIdMatch = trId.match(/^a(\d+)$/);
    const animeId = animeIdMatch ? animeIdMatch[1] : null;

    // Cover: prefer <source srcset> (full image) otherwise <img src>
    const $imageTd = $tr.find('td.thumb.anime');
    let cover = null;
    const sourceSrcset = $imageTd.find('picture source').first().attr('srcset');
    const imgSrc = $imageTd.find('picture img').first().attr('src');

    // often srcset contains full size; img src often is a small thumb. Pick srcset if present.
    if (sourceSrcset) cover = sourceSrcset.trim();
    else if (imgSrc) cover = imgSrc.trim();
    cover = cover && (cover.startsWith('http://') || cover.startsWith('https://') ? cover : new URL(cover, BASE).toString());


    // Title: <td class="name main anime"> <a href="/anime/3">Title</a>
    const $titleLink = $tr.find('td.name.main.anime > a').first();
    const title = $titleLink.text().trim() || null;

    // Rating: the weighted rating sits in <td class="rating weighted">5.79 (1705)
    // We'll extract the numeric rating (or null if N/A)
    const ratingText = $tr.find('td.rating.weighted').text().trim();
    let rating = null;
    if (ratingText && !/N\/A/i.test(ratingText)) {
      const m = ratingText.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (m) rating = parseFloat(m[1]);
    }

    // push object
    items.push({
      animeId,
      title,
      cover,
      rating
    });
  });

  return items;
}


// PARSE SHOW PAGE
function parse_anime_page(html, sourceUrl) {
  const $ = cheerio.load(html);

  // ID and URL
  let id = null;
  try {
    const canonical = $('link[rel="canonical"]').attr('href') || sourceUrl;
    id = canonical && canonical.match(/\/anime\/(\d+)/)?.[1] || null;
  } catch (e) {
    id = null;
  }
  const url = id ? `${BASE}/anime/${id}` : null;

  // Banner image (og:image or main poster)
  const bannerImage =
    $('meta[property="og:image"]').attr('content') ||
    $('div.image img[itemprop="image"]').attr('src') ||
    null;

  // Official English title: prefer the 'official' row that has the english flag icon
  let officialTitleEnglish = null;
  const englishOfficialRow = $('tr.official').filter((i, el) => {
    return $(el).find('.i_audio_en').length > 0;
  }).first();
  if (englishOfficialRow && englishOfficialRow.length) {
    officialTitleEnglish = englishOfficialRow.find('label').first().text().trim() || null;
  }
  if (!officialTitleEnglish) {
    officialTitleEnglish = $('tr.official label[itemprop="alternateName"]').first().text().trim() || null;
    if (!officialTitleEnglish) {
      // fallback to any official label
      officialTitleEnglish = $('tr.official label').first().text().trim() || null;
    }
  }

  // Description (some pages have itemprop description or a g_section.desc)
  const description =
    $('[itemprop="description"]').text().trim() ||
    $('div.g_section.desc').text().trim() ||
    $('div.g_section.desc[itemprop="description"]').text().trim() ||
    null;

  // Type (text of the Type row)
  let type = null;
  const rawTypeText = $('tr.type td.value').text().trim();

  if (rawTypeText) {
    // Example: "TV Series, 13 episodes ..."
    type = rawTypeText.split(',')[0].trim();
  }

  // Episodes count: prefer itemprop numberOfEpisodes, else try other fallbacks
  let episodesCount = null;
  const epMicro = $('tr.type td.value').find('span[itemprop="numberOfEpisodes"]').first().text().trim();
  if (epMicro) {
    const n = parseInt(epMicro, 10);
    if (!isNaN(n)) episodesCount = n;
  }
  // fallback: an epno lastep in release tables (if present)
  if (episodesCount === null) {
    const epnoLastep = $('td.epno.lastep').first().text().trim();
    const m = epnoLastep.match(/\d+/);
    if (m) episodesCount = Number(m[0]);
  }

  // Year (startDate itemprop)
  const startDate = $('tr.year [itemprop="startDate"]').attr('content') ||
    $('tr.year td.value').text().trim().split('until')[0]?.trim() ||
    null;
  const year = startDate ? (startDate.split('-')[0] || null) : null;

  // Tags
  const tags = [];
  $('tr.tags span.tagname').each((i, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  // Rating value and count
  let ratingValue = null;
  let ratingCount = null;
  const rv = $('tr.rating [itemprop="ratingValue"]').first().text().trim() ||
    $('tr.g_odd.rating .value[itemprop="ratingValue"]').first().text().trim() ||
    $('[data-label="Rating"] .value').first().text().trim();
  if (rv && !isNaN(Number(rv))) ratingValue = Number(rv);

  const rc = $('tr.rating [itemprop="ratingCount"]').attr('content') ||
    $('tr.rating .count').first().text().replace(/[()]/g, '').trim() ||
    $('[data-label="Rating"] .count').first().text().replace(/[()]/g, '').trim();
  if (rc && !isNaN(Number(rc))) ratingCount = Number(rc);

  // Episodes array from table#eplist
  const episodes = [];
  $('#eplist tbody tr').each((i, row) => {
    const $row = $(row);

    // skip header-like rows (th) or rows without episode markup
    if ($row.find('th').length) return;

    // episode number (td.id.eid -> a -> abbr[itemprop="episodeNumber"] OR td.epno)
    let number = null;
    const epNumText =
      $row.find('td.id.eid abbr[itemprop="episodeNumber"]').first().text().trim() ||
      $row.find('td.epno abbr').first().text().trim() ||
      $row.find('td.id.eid').first().text().trim();

    if (epNumText) {
      const m = epNumText.match(/\d+/);
      if (m) number = Number(m[0]);
    }

    // title (td.title label[itemprop="name"] or td.title)
    let title = $row.find('td.title label[itemprop="name"]').first().text().trim() ||
      $row.find('td.title').text().trim() || null;

    // duration (optional)
    const duration = $row.find('td.duration').first().text().trim() || null;

    // air date (content attr preferred)
    const airDate = $row.find('td.date.airdate').attr('content') ||
      $row.find('td.date.airdate').text().trim() ||
      null;

    if (number !== null) {
      episodes.push({
        number,
        title: title ? title.replace(/\s+/g, ' ').trim() : null,
        duration,
        airDate
      });
    }
  });

  // Deduplicate and sort episodes by number
  const map = new Map();
  for (const ep of episodes) {
    if (!map.has(ep.number)) map.set(ep.number, ep);
  }
  const episodesSorted = Array.from(map.values()).sort((a, b) => a.number - b.number);

  return {
    id,
    url,
    bannerImage,
    officialTitleEnglish,
    description,
    type,
    episodesCount: episodesCount !== null ? episodesCount : episodesSorted.length,
    year,
    tags,
    rating: { value: ratingValue, count: ratingCount },
    episodes: episodesSorted
  };
}

/*---------------------DOWNLOAD SOURCE PARSER----------------------------*/

function toArray(maybe) {
  if (maybe === undefined || maybe === null) return [];
  return Array.isArray(maybe) ? maybe : [maybe];
}

// Try multiple heuristics to extract episode number from title/text
function extractEpisodeNumber(title = "") {
  const t = String(title).trim();

  const patterns = [
    /S?\d+\s*E(\d{1,4})/i,                 // S01E12 or 01E12
    /(?:Episode|Ep|EP|ep|Eps|E)\.?\s*#?\s*(\d{1,4})/i, // Episode 12 / Ep. 12 / Ep 12
    /(?:Episode|Ep|EP|ep)\s+(\d{1,4})/i,
    /(?:#|No\.?|№)\s?(\d{1,4})\b/i,        // #12 or No.12
    /\b(\d{1,4})\b(?!.*min|.*sec)/i,       // plain number (last-resort)
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (m && m[1]) return Number(m[1]);
  }
  // fallback: try to find something like " - 12" at end
  const trailing = t.match(/-\s*(\d{1,4})\s*$/);
  if (trailing) return Number(trailing[1]);

  return null;
}

function extractLinksFromDescription(desc = "") {
  // desc may contain HTML. We'll look for magnet:... and .torrent links
  const magnets = [];
  const torrents = [];

  if (!desc) return { magnets, torrents };

  // magnet: links
  const magRe = /magnet:\?[^"'<> \t\r\n]+/gi;
  let m;
  while ((m = magRe.exec(desc))) magnets.push(m[0]);

  // .torrent links
  const torRe = /https?:\/\/[^"'<> \t\r\n]+\.torrent\b/gi;
  while ((m = torRe.exec(desc))) torrents.push(m[0]);

  return { magnets, torrents };
}

function normalizeEnclosure(item) {
  // enclosure can be object or array. fast-xml-parser attributes use attributeNamePrefix setting
  // We'll accept either item.enclosure['@_url'] or item.enclosure.url etc.
  if (!item.enclosure) return null;
  // if enclosure is string or object
  if (typeof item.enclosure === "string") return item.enclosure;
  if (typeof item.enclosure === "object") {
    // fast-xml-parser sometimes returns: { "@_url": "...", "@_type": "..." }
    const keys = Object.keys(item.enclosure);
    if (item.enclosure["@_url"]) return item.enclosure["@_url"];
    if (item.enclosure.url) return item.enclosure.url;
    // fallback: look for first string field
    for (const k of keys) {
      if (typeof item.enclosure[k] === "string" && item.enclosure[k].startsWith("http")) return item.enclosure[k];
    }
  }
  return null;
}

async function parse_download_source(xml) {
  // Helper: try to extract XML inside an HTML <pre> (format.html case)
  function unwrapPreIfNeeded(raw) {
    if (!raw || typeof raw !== "string") return raw;
    // If it looks like already an XML string, return as-is
    if (raw.includes("<rss") || raw.includes("<?xml")) return raw;

    // Try to parse as HTML and get textContent of <pre>
    try {
      if (typeof DOMParser !== "undefined") {
        const dp = new DOMParser();
        const doc = dp.parseFromString(raw, "text/html");
        const pre = doc.querySelector("pre");
        if (pre && pre.textContent && pre.textContent.trim()) {
          return pre.textContent.trim();
        }
      }
    } catch (e) {
      // fallthrough to regex fallback
    }

    // Fallback: regex to pull content between <pre>...</pre> and decode entities
    const m = raw.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    let content = m ? m[1] : raw;

    // Basic HTML entity decode for common entities
    content = content
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // numeric entities (e.g. &#10;)
      .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));

    return content;
  }

  // Helper: extract all href links (magnet and http(s))
  function extractAllLinks(html) {
    const links = [];
    if (!html) return links;
    // find href="..." or href='...'
    const re = /href=(?:"|')([^"']+)(?:"|')/gi;
    let m;
    while ((m = re.exec(html))) {
      if (m[1]) links.push(m[1]);
    }
    return links;
  }

  // unwrap possible HTML wrapper
  const xmlStr = unwrapPreIfNeeded(xml);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_", // so attributes appear as @_<name>
    allowBooleanAttributes: true,
    parseTagValue: true,
    trimValues: true,
  });

  const j = parser.parse(xmlStr);

  // RSS structure generally: j.rss.channel.item
  const itemsRaw = (j && j.rss && j.rss.channel && j.rss.channel.item) || [];
  const items = toArray(itemsRaw);

  const out = items.map((item) => {
    const title = item.title ?? "";
    const pubDate = item.pubDate ?? item["dc:date"] ?? null;

    // Enclosure handling (can be single object or array)
    const enclosures = toArray(item.enclosure || []).map((enc) => {
      // XMLParser with attribute prefix stores url as @_url (or sometimes url)
      return enc?.["@_url"] || enc?.url || null;
    }).filter(Boolean);

    // also an <enclosure url="..." /> may appear as a string depending on parser
    // fallback: if item["@_url"] present (unlikely), include it
    if (item["@_url"]) enclosures.push(item["@_url"]);

    // Primary enclosure url (first torrent .torrent if present)
    const enclosureUrl = normalizeEnclosure(item) || (enclosures.length ? enclosures[0] : null);

    // guid might be magnet or a permalink
    let guid = null;
    if (item.guid) {
      if (typeof item.guid === "string") guid = item.guid;
      else if (typeof item.guid === "object") {
        // guid may be { "#text": "...", "@_isPermaLink": "true" } or similar
        guid = item.guid["#text"] || item.guid["#text"] || item.guid["@_isPermaLink"] || null;
        // also sometimes XMLParser returns guid['#text'] or guid['@_isPermaLink'] separately
        if (!guid && item.guid["@_isPermaLink"]) guid = item.guid["#text"] || null;
      }
    }

    // description may contain HTML and links (CDATAs). Keep raw for regexes
    const description = item.description ?? item["content:encoded"] ?? "";

    // try to extract magnets/torrents using your existing helper
    const { magnets: descMagnets = [], torrents: descTorrents = [] } =
      typeof extractLinksFromDescription === "function"
        ? extractLinksFromDescription(description)
        : { magnets: [], torrents: [] };

    // fallback: extract hrefs and classify
    const hrefs = extractAllLinks(description);
    const extraMagnets = hrefs.filter(h => typeof h === "string" && h.startsWith("magnet:"));
    const extraTorrents = hrefs.filter(h => typeof h === "string" && /\.torrent($|\?)/i.test(h));

    // Collect magnet links: from guid (if magnet), from description
    const magnets = new Set();
    if (guid && String(guid).startsWith("magnet:")) magnets.add(guid);
    descMagnets.forEach(m => m && magnets.add(m));
    extraMagnets.forEach(m => m && magnets.add(m));

    // Collect torrent URLs: enclosure if .torrent or description .torrent links or href torrent links
    const torrents = new Set();
    if (enclosureUrl && /\.torrent($|\?)/i.test(enclosureUrl)) torrents.add(enclosureUrl);
    descTorrents.forEach(t => t && torrents.add(t));
    extraTorrents.forEach(t => t && torrents.add(t));
    // item.link sometimes points to a .torrent
    if (item.link && typeof item.link === "string" && item.link.endsWith(".torrent")) torrents.add(item.link);

    // Also collect all http/https download links mentioned in description for convenience
    const downloadLinks = new Set();
    hrefs.forEach(h => {
      if (typeof h === "string" && /^https?:\/\//i.test(h)) downloadLinks.add(h);
    });
    // include enclosure urls and item.link
    enclosures.forEach(u => downloadLinks.add(u));
    if (item.link && typeof item.link === "string") downloadLinks.add(item.link);

    // Try to parse "Total Size" if present in description HTML: e.g. <strong>Total Size</strong>: 282.2 MB
    let totalSize = null;
    try {
      const match = String(description).match(/<strong>\s*Total\s+Size\s*<\/strong>\s*:\s*([^<\n\r]+)/i)
        || String(description).match(/Total\s+Size\s*:\s*([^<\n\r]+)/i);
      if (match && match[1]) totalSize = match[1].trim();
    } catch (e) {
      totalSize = null;
    }

    // Source site (item.source may be an object with text and attribute @_url)
    let sourceName = null;
    let sourceUrl = null;
    if (item.source) {
      if (typeof item.source === "string") sourceName = item.source;
      else if (typeof item.source === "object") {
        sourceName = item.source["#text"] || item.source["text"] || null;
        sourceUrl = item.source["@_url"] || item.source.url || null;
      }
    }

    // Episode number best-effort (from title)
    const episodeNumber = extractEpisodeNumber(title);

    // normalize date to ISO (if possible)
    let pubDateISO = null;
    if (pubDate) {
      const d = new Date(pubDate);
      if (!isNaN(d.getTime())) pubDateISO = d.toISOString();
    }

    return {
      title,
      episode: episodeNumber,
      torrents: Array.from(torrents), // deduped
      magnets: Array.from(magnets),
      pubDateRaw: pubDate,
      pubDateISO,
      source: {
        name: sourceName,
        url: sourceUrl,
      },
      totalSize,
      downloadLinks: Array.from(downloadLinks),
      // for debugging / completeness, include the original description snippet and enclosures
      _meta: {
        enclosureUrls: enclosures.length ? enclosures : null,
        descriptionSnippet: description ? String(description).slice(0, 300) : null,
      },
    };
  });

  return out;
}


/* ---------------- PUBLIC API ---------------- */

// @ /home/hero-card
async function loadHeroData() {
  console.log('[default] Fetching AniDB latest releases');

  const html = await getHtml(HOME_HERO_URL);
  const items = parse_hero(html);


  // Optional: persist JSON (safe in main process)
  const outPath = path.resolve(process.cwd(), 'anidb_latest.json');
  fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');

  return items;
}

// @ /home/you-may-like
async function loadYouMayLikeData() {
  console.log('[default] Fetching AniDB You May Like');

  const html = await getHtml(HOME_YOU_MAY_LIKE_URL);
  const items = parse_you_may_like(html);
  return items
}


// @ /explore
async function loadExploreData(page) {
  console.log('[default] Fetching AniDB Explore items');

  const html = await getHtml(`${EXPLORE_ITEMS}&page=${page}`);
  const items = parse_explore_items(html);

  console.log(`[default] Found ${items.length} entries`);

  return items;
}

// @/search
async function loadSearchData(query) {
  console.log("[default] Fetching AniDB search results")
  const html = await getHtml(`${SEARCH_ITEMS}${query}`);
  const items = parse_search_items(html);
  return items;
}

// @/show?
async function loadShowData(id) {
  console.log("[default] Fetching AniDB show data")
  const html = await getHtml(`${SHOW_URL}${id}`);
  const data = parse_anime_page(html, `${SHOW_URL}/${id}`);
  console.log(data)
  return data;
}


// @download source fetch
// safe sleep helper
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function loadDownloadSource(animeId, startPage = 1) {
  const download_pages = [];
  let page = Number(startPage) || 1;
  const MAX_PAGES = 200; // safety guard to prevent infinite loops
  const REQUEST_DELAY_MS = 150; // small delay between requests (tune if needed)

  console.log("[default] Fetching AniDB download source for animeId=", animeId);

  while (true) {
    if (page > MAX_PAGES) {
      console.warn(`[default] Reached max page limit (${MAX_PAGES}), stopping.`);
      break;
    }

    let xml;
    try {
      xml = await getHtml(`${DOWNLOAD_SOURCE}${animeId}&page=${page}`);
      if (!xml || typeof xml !== "string") {
        console.log(`[default] No HTML returned for page ${page}, stopping.`);
        break;
      }
    } catch (err) {
      console.error(`[default] getHtml failed on page ${page}:`, err);
      break;
    }

    console.log(`[default] Fetched page ${page} (length=${xml.length})`);

    // Quick textual checks for obvious "no results" markers (site-specific — keep or change as needed)
    if (/no torrents found|no results|nothing found|no items|page not found/i.test(xml)) {
      console.log(`[default] Server returned no-results marker on page ${page}, stopping.`);
      break;
    }

    // Try to parse the page and decide based on parsed items
    let parsed;
    try {
      parsed = await parse_download_source(xml); // your existing parser returns array of items
    } catch (err) {
      console.error(`[default] parse_download_source failed on page ${page}:`, err);
      // if parser fails, it's safer to stop than to loop forever
      break;
    }

    // parsed should be an array; some sites may wrap results inside nested arrays:
    const items = Array.isArray(parsed) ? parsed : [];

    // Count "useful" items: those that contain at least one .torrent or magnet link
    const usefulCount = items.reduce((acc, it) => {
      const hasTorrents = Array.isArray(it?.torrents) && it.torrents.length > 0;
      const hasMagnets = Array.isArray(it?.magnets) && it.magnets.length > 0;
      return acc + (hasTorrents || hasMagnets ? 1 : 0);
    }, 0);

    console.log(`[default] page ${page} => parsed ${items.length} items, ${usefulCount} useful`);

    if (items.length === 0 || usefulCount === 0) {
      // No parsed items or none contain download links: treat as last page
      console.log(`[default] No useful items on page ${page}, stopping.`);
      break;
    }

    // keep the parsed items (push the array so caller can see per-page arrays)
    download_pages.push(items);

    // Best-effort: try to detect a "next page" link in the HTML (site-specific)
    // This looks for href that includes page=<page+1> somewhere in the HTML
    const nextPageRegex = new RegExp(`page=${page + 1}`, "i");
    const hasNextLink = nextPageRegex.test(xml);

    if (!hasNextLink) {
      console.log(`[default] No next-page link found in HTML for page ${page} — assuming last page.`);
      break;
    }

    // otherwise continue to next page
    page++;
    // be polite
    await sleep(REQUEST_DELAY_MS);
  }

  console.log("[default] Completed fetch, pages:", download_pages.length);
  return download_pages;
}



module.exports = {
  loadHeroData,
  loadYouMayLikeData,
  loadExploreData,
  loadSearchData,
  loadShowData,
  loadDownloadSource
};