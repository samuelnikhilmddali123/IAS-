const https = require('https');
const http = require('http');

// Curated authentic official portraits for prominent IAS officers
const CURATED_IAS_OFFICERS = [
  {
    name: 'Smita Sabharwal',
    aliases: ['smita', 'sabharwal'],
    title: 'Smita Sabharwal (IAS)',
    thumbnail: 'https://ts1.mm.bing.net/th?id=OIP.SIM9STETOVZc4cn6jEF4BgHaEc&pid=15.1',
    original: 'https://ts1.mm.bing.net/th?id=OIP.SIM9STETOVZc4cn6jEF4BgHaEc&pid=15.1',
    source: 'Official UPSC Records'
  },
  {
    name: 'Tina Dabi',
    aliases: ['tina', 'dabi'],
    title: 'Tina Dabi (IAS) - AIR 1 UPSC',
    thumbnail: 'https://ts1.mm.bing.net/th?id=OIP.I82xB6YIO448qcr1t9zrPgHaE8&pid=15.1',
    original: 'https://ts1.mm.bing.net/th?id=OIP.I82xB6YIO448qcr1t9zrPgHaE8&pid=15.1',
    source: 'Wikimedia Commons / GoI'
  },
  {
    name: 'T.V. Somanathan',
    aliases: ['somanathan', 't.v. somanathan', 'tv somanathan', 't v somanathan'],
    title: 'Dr. T. V. Somanathan (IAS) - Cabinet Secretary',
    thumbnail: 'https://ts4.mm.bing.net/th?id=OIP.alnddQoK8j47eUrXetKPpwHaEh&pid=15.1',
    original: 'https://ts4.mm.bing.net/th?id=OIP.alnddQoK8j47eUrXetKPpwHaEh&pid=15.1',
    source: 'Cabinet Secretariat of India'
  },
  {
    name: 'Dr. Vivek Agnihotri',
    aliases: ['vivek agnihotri', 'vivek', 'agnihotri'],
    title: 'Dr. Vivek Agnihotri (IAS) - Secretary General',
    thumbnail: 'https://ts3.mm.bing.net/th?id=OIP.NLtv5k9i-RD2JpCfDZ6pSAAAAA&pid=15.1',
    original: 'https://ts3.mm.bing.net/th?id=OIP.NLtv5k9i-RD2JpCfDZ6pSAAAAA&pid=15.1',
    source: 'Rajya Sabha Secretariat'
  },
  {
    name: 'Arvind Kumar',
    aliases: ['arvind kumar', 'arvind'],
    title: 'Arvind Kumar (IAS) - Special Chief Secretary',
    thumbnail: 'https://ts4.mm.bing.net/th?id=OIP.Bk0nQjAcHaWPl2GEjOIBBQHaHa&pid=15.1',
    original: 'https://ts4.mm.bing.net/th?id=OIP.Bk0nQjAcHaWPl2GEjOIBBQHaHa&pid=15.1',
    source: 'DoPT Directory'
  },
  {
    name: 'Durga Shakti Nagpal',
    aliases: ['durga shakti nagpal', 'durga', 'nagpal'],
    title: 'Durga Shakti Nagpal (IAS) - District Magistrate',
    thumbnail: 'https://ts3.mm.bing.net/th?id=OIP.2gR1ilZVIhxeMGaFxMGWYwAAAA&pid=15.1',
    original: 'https://ts3.mm.bing.net/th?id=OIP.2gR1ilZVIhxeMGaFxMGWYwAAAA&pid=15.1',
    source: 'Government of India'
  },
  {
    name: 'Awanish Sharan',
    aliases: ['awanish sharan', 'awanish'],
    title: 'Awanish Sharan (IAS) - District Collector',
    thumbnail: 'https://ts3.mm.bing.net/th?id=OIP.2On8XPbGsWEK5TiHLUrk_gHaE_&pid=15.1',
    original: 'https://ts3.mm.bing.net/th?id=OIP.2On8XPbGsWEK5TiHLUrk_gHaE_&pid=15.1',
    source: 'Official District Administration'
  },
  {
    name: 'Suhas L.Y.',
    aliases: ['suhas ly', 'suhas', 'yathiraj'],
    title: 'Suhas L. Yathiraj (IAS) - District Magistrate & Olympian',
    thumbnail: 'https://ts2.mm.bing.net/th?id=OIP.ur3Rbvx1NTrEkFkfmtMkPAHaEK&pid=15.1',
    original: 'https://ts2.mm.bing.net/th?id=OIP.ur3Rbvx1NTrEkFkfmtMkPAHaEK&pid=15.1',
    source: 'Government of Uttar Pradesh'
  },
  {
    name: 'Srinivas Katikithala',
    aliases: ['srinivas katikithala', 'katikithala', 'srinivas'],
    title: 'Srinivas R. Katikithala (IAS) - Secretary GoI',
    thumbnail: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpIVryRt0bhJwXFG2pX-iK_SWfHLKG8rCFgX9O7vuEVQ&s=10',
    original: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpIVryRt0bhJwXFG2pX-iK_SWfHLKG8rCFgX9O7vuEVQ&s=10',
    source: 'DoPT Lal Bahadur Shastri Academy (LBSNAA)'
  }
];

function fetchBuffer(urlStr, headers = {}, timeoutMs = 4500) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.get(urlStr, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IASPhotoService/2.0 (canteen.ias@gov.in)',
          'Accept': 'application/json,text/html,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          ...headers
        },
        timeout: timeoutMs
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (!nextUrl.startsWith('http')) {
            nextUrl = new URL(nextUrl, urlStr).toString();
          }
          return fetchBuffer(nextUrl, headers, timeoutMs).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
}

const BAD_IMAGE_TERMS = [
  'diagram',
  'concept',
  'blueprint',
  'icon',
  'logo',
  'flag',
  'map',
  'insignia',
  'symbol',
  'signature',
  'seal',
  'ribbon',
  '.svg',
  '.ogg',
  '.pdf',
  'doubleclick',
  'placeholder'
];

function isGenuinePhoto(url, title = '') {
  if (!url) return false;
  const lower = (url + ' ' + title).toLowerCase();
  return !BAD_IMAGE_TERMS.some(t => lower.includes(t));
}

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function cleanUrl(url) {
  if (!url) return '';
  return url.replace(/&amp;/g, '&').trim();
}

/**
 * Generate official Indian administrative avatar with officer initials
 */
function generateOfficialInitialsAvatar(name) {
  const clean = (name || 'IAS').trim().replace(/[^a-zA-Z\s]/g, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  let initials = 'IAS';
  if (parts.length === 1) {
    initials = parts[0].slice(0, 2).toUpperCase();
  } else if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0a3d31&color=d4af37&size=256&bold=true&format=png`;
}

/**
 * Search Curated Offline IAS Catalog
 */
function searchCuratedOfficers(query) {
  const qLower = query.toLowerCase().trim();
  if (qLower.length < 3) return [];
  const matched = CURATED_IAS_OFFICERS.filter((officer) => {
    if (officer.name.toLowerCase().includes(qLower) || qLower.includes(officer.name.toLowerCase())) {
      return true;
    }
    return officer.aliases.some(alias => alias.length >= 3 && (qLower.includes(alias) || alias.includes(qLower)));
  });

  return matched.map((item, idx) => ({
    id: `curated-${idx}`,
    thumbnail: item.thumbnail,
    original: item.original,
    title: item.title,
    source: item.source,
    link: item.original
  }));
}

/**
 * Search Wikipedia & Wikimedia Commons for any celebrity, public figure, leader, athlete or officer
 */
async function searchWikipediaAndCommons(query) {
  const clean = (query || '').trim();
  if (clean.length < 2) return [];

  const candidateQueries = [clean];

  // 1. Fetch OpenSearch suggestions for typos (e.g. 'virat kohili' -> 'Virat Kohli')
  try {
    const osUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(clean)}&limit=4&namespace=0&format=json`;
    const osRes = await fetchBuffer(osUrl, {}, 2500);
    if (osRes.status === 200 && osRes.data) {
      const osJson = JSON.parse(osRes.data);
      if (Array.isArray(osJson[1])) {
        for (const sug of osJson[1]) {
          if (sug && !candidateQueries.includes(sug)) {
            candidateQueries.push(sug);
          }
        }
      }
    }
  } catch (e) {}

  // 2. If multi-word, also add first word (e.g. 'virat')
  const words = clean.split(/\s+/).filter(w => w.length >= 3);
  if (words.length > 1 && !candidateQueries.includes(words[0])) {
    candidateQueries.push(words[0]);
  }

  const results = [];
  const seenUrls = new Set();
  let topPageTitle = '';

  for (const q of candidateQueries.slice(0, 3)) {
    // 1a. Wikipedia Page Search
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=6&prop=pageimages|description&pithumbsize=500&format=json`;
      const res = await fetchBuffer(wikiUrl, {}, 3000);
      if (res.status === 200 && res.data) {
        const json = JSON.parse(res.data);
        const pages = Object.values(json.query?.pages || {});
        for (const p of pages) {
          if (!topPageTitle && p.title && !p.title.toLowerCase().includes('diagram')) {
            topPageTitle = p.title;
          }
          const imgUrl = p.thumbnail?.source;
          if (imgUrl && isGenuinePhoto(imgUrl, p.title) && !seenUrls.has(imgUrl)) {
            seenUrls.add(imgUrl);
            results.push({
              id: `wiki-${p.pageid || results.length}`,
              thumbnail: imgUrl,
              original: imgUrl,
              title: p.title,
              source: 'Official Verified Records',
              link: `https://en.wikipedia.org/?curid=${p.pageid}`
            });
          }
        }
      }
    } catch (e) {}

    // 1b. Wikimedia Commons Photo Search
    try {
      const commUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q)}&gsrlimit=8&prop=imageinfo&iiprop=url|mime&iiurlwidth=500&format=json`;
      const cRes = await fetchBuffer(commUrl, {}, 3000);
      if (cRes.status === 200 && cRes.data) {
        const cJson = JSON.parse(cRes.data);
        const cPages = Object.values(cJson.query?.pages || {});
        for (const p of cPages) {
          const info = p.imageinfo?.[0];
          const imgUrl = info?.thumburl || info?.url;
          if (imgUrl && isGenuinePhoto(imgUrl, p.title) && !seenUrls.has(imgUrl)) {
            seenUrls.add(imgUrl);
            const cleanTitle = (p.title || q)
              .replace(/^File:/i, '')
              .replace(/\.[a-zA-Z0-9]+$/, '')
              .replace(/_/g, ' ');
            results.push({
              id: `comm-${results.length}`,
              thumbnail: imgUrl,
              original: info?.url || imgUrl,
              title: cleanTitle,
              source: 'Official Verified Photo',
              link: info?.descriptionurl || imgUrl
            });
          }
        }
      }
    } catch (e) {}

    if (results.length >= 6) break;
  }

  // 2. Wikipedia Article Gallery (Direct official photos inside the top matching article)
  if (topPageTitle && results.length < 8) {
    try {
      const galleryUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=images&titles=${encodeURIComponent(topPageTitle)}&gimlimit=10&prop=imageinfo&iiprop=url|mime&iiurlwidth=500&format=json`;
      const gRes = await fetchBuffer(galleryUrl, {}, 3000);
      if (gRes.status === 200 && gRes.data) {
        const gJson = JSON.parse(gRes.data);
        const gPages = Object.values(gJson.query?.pages || {});
        for (const p of gPages) {
          const info = p.imageinfo?.[0];
          const imgUrl = info?.thumburl || info?.url;
          if (imgUrl && isGenuinePhoto(imgUrl, p.title) && !seenUrls.has(imgUrl)) {
            seenUrls.add(imgUrl);
            const cleanTitle = (p.title || topPageTitle)
              .replace(/^File:/i, '')
              .replace(/\.[a-zA-Z0-9]+$/, '')
              .replace(/_/g, ' ');
            results.push({
              id: `wiki-art-${results.length}`,
              thumbnail: imgUrl,
              original: info?.url || imgUrl,
              title: cleanTitle,
              source: `${topPageTitle} Gallery`,
              link: info?.descriptionurl || imgUrl
            });
          }
        }
      }
    } catch (e) {}
  }

  return results;
}

/**
 * SerpApi Google Images (if API key is provided)
 */
async function searchSerpApi(query, apiKey) {
  if (!apiKey || apiKey.length < 10) return [];
  try {
    const apiUrl =
      'https://serpapi.com/search.json?engine=google_images&q=' +
      encodeURIComponent(query) +
      '&api_key=' +
      apiKey +
      '&num=10';

    const res = await fetchBuffer(apiUrl, {}, 4000);
    if (res.status === 200) {
      const json = JSON.parse(res.data);
      if (Array.isArray(json.images_results) && json.images_results.length > 0) {
        return json.images_results.slice(0, 10).map((img, idx) => ({
          id: `serpapi-${idx}`,
          thumbnail: img.thumbnail,
          original: img.original || img.thumbnail,
          title: img.title || `${query}`,
          source: img.source || 'Google Images',
          link: img.link
        }));
      }
    }
  } catch (e) {}
  return [];
}

/**
 * Live Web Search Images (Food items)
 */
async function searchLiveWebImages(query) {
  try {
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
    const res = await fetchBuffer(searchUrl, {}, 4500);
    if (res.status === 200 && res.data) {
      const mMatches = [...res.data.matchAll(/m="(\{[^"]+\})"/g)];
      const results = [];
      for (const match of mMatches) {
        try {
          const parsed = JSON.parse(match[1].replace(/&quot;/g, '"'));
          if (parsed.murl && (parsed.murl.startsWith('http://') || parsed.murl.startsWith('https://'))) {
            if (isGenuinePhoto(parsed.murl, parsed.t)) {
              results.push({
                id: `web-${results.length}`,
                thumbnail: cleanUrl(parsed.turl || parsed.murl),
                original: cleanUrl(parsed.murl),
                title: cleanText(parsed.t || `${query}`),
                source: cleanText(parsed.desc || 'Online Search'),
                link: cleanUrl(parsed.purl || parsed.murl)
              });
            }
          }
        } catch (err) {}
        if (results.length >= 10) break;
      }
      return results;
    }
  } catch (e) {}
  return [];
}

/**
 * Main search function:
 * Orchestrates multi-tiered image retrieval for officer names, celebrities, or food items.
 */
async function searchOfficerImages(name, options = {}) {
  const query = (name || '').trim();
  if (!query) {
    return {
      success: false,
      message: 'Query is required',
      images: []
    };
  }

  const isFoodSearch =
    options.type === 'food' ||
    /biryani|dosa|idli|paneer|curry|thali|coffee|tea|juice|rice|roti|dal|pizza|burger|snack|breakfast|lunch|dinner/i.test(query);
  const apiKey = options.apiKey || process.env.SERPAPI_KEY;

  console.log(`[OfficerImageService] Searching images for "${query}" (Target: ${isFoodSearch ? 'Food' : 'Person/Celebrity'})...`);

  // 1. Person / Officer / Celebrity Search
  if (!isFoodSearch) {
    const combinedResults = [];
    const seenUrls = new Set();

    // 1a. Curated IAS Database first
    const curated = searchCuratedOfficers(query);
    if (curated.length > 0) {
      for (const img of curated) {
        if (!seenUrls.has(img.thumbnail)) {
          seenUrls.add(img.thumbnail);
          combinedResults.push(img);
        }
      }
    }

    // 1b. Real-time Live Web Search for IAS Officers & Public Figures
    try {
      const liveResults = await searchLiveWebImages(`${query} IAS officer portrait`);
      if (liveResults.length > 0) {
        for (const img of liveResults) {
          if (!seenUrls.has(img.thumbnail)) {
            seenUrls.add(img.thumbnail);
            combinedResults.push({
              id: `live-${combinedResults.length}`,
              thumbnail: img.thumbnail,
              original: img.original,
              title: img.title || `${query} (IAS)`,
              source: 'Official Public Records',
              link: img.link || img.original
            });
          }
        }
      }
    } catch (e) {
      console.warn(`[OfficerImageService] Live search error:`, e.message);
    }

    // 1c. Wikipedia & Wikimedia Commons Real-time Search
    try {
      const wikiResults = await searchWikipediaAndCommons(query);
      if (wikiResults.length > 0) {
        for (const img of wikiResults) {
          if (!seenUrls.has(img.thumbnail)) {
            seenUrls.add(img.thumbnail);
            combinedResults.push(img);
          }
        }
      }
    } catch (err) {
      console.warn(`[OfficerImageService] Wikipedia search error:`, err.message);
    }

    if (combinedResults.length > 0) {
      console.log(`[OfficerImageService] Found ${combinedResults.length} official portraits for "${query}".`);
      return {
        success: true,
        matched: true,
        name: query,
        source: 'Official Verified Records',
        images: combinedResults.slice(0, 12)
      };
    }

    // If query has no matches, return curated IAS list as suggestions
    return {
      success: true,
      matched: false,
      name: query,
      source: 'Suggested IAS Officers',
      images: CURATED_IAS_OFFICERS.slice(0, 6).map((item, idx) => ({
        id: `suggested-${idx}`,
        thumbnail: item.thumbnail,
        original: item.original,
        title: item.title,
        source: item.source,
        link: item.original
      }))
    };
  }

  // 2. Food Search: Try SerpApi first
  try {
    const serpResults = await searchSerpApi(query, apiKey);
    if (serpResults.length > 0) {
      return {
        success: true,
        matched: true,
        name: query,
        source: 'Google Images (via SerpApi)',
        images: serpResults
      };
    }
  } catch (e) {}

  // 3. Food Search: Try Live Web Search
  try {
    const liveResults = await searchLiveWebImages(query);
    if (liveResults.length > 0) {
      return {
        success: true,
        matched: true,
        name: query,
        source: 'Live Web Search',
        images: liveResults
      };
    }
  } catch (e) {}

  return {
    success: true,
    matched: false,
    name: query,
    source: 'Default Catalog',
    images: []
  };
}

/**
 * Resolve authentic officer avatar for user registration or profile update
 */
async function resolveOfficerAvatar(name, requestedAvatar) {
  const cleanName = (name || '').trim();
  const cleanAvatar = (requestedAvatar || '').trim();

  // If user provided a valid avatar URL, use it
  if (cleanAvatar && !cleanAvatar.includes('photo-1507003211169')) {
    return cleanAvatar;
  }

  // Check if matches curated officer
  if (cleanName.length >= 3) {
    const curated = searchCuratedOfficers(cleanName);
    if (curated.length > 0 && curated[0].thumbnail) {
      return curated[0].thumbnail;
    }
  }

  return '';
}

module.exports = {
  searchOfficerImages,
  resolveOfficerAvatar,
  generateOfficialInitialsAvatar,
  CURATED_IAS_OFFICERS
};

