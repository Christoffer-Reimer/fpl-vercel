export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { endpoint } = req.query;
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint parameter" });

  const allowedPatterns = [
    /^bootstrap-static\/$/,
    /^entry\/\d+\/$/,
    /^entry\/\d+\/event\/\d+\/picks\/$/,
    /^entry\/\d+\/history\/$/,
    /^element-summary\/\d+\/$/,
  ];

  const isAllowed = allowedPatterns.some(p => p.test(endpoint));
  if (!isAllowed) return res.status(403).json({ error: "Endpoint not allowed" });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let fplRes;
    try {
      fplRes = await fetch(
        `https://fantasy.premierleague.com/api/${endpoint}`,
        {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-GB,en;q=0.9",
            "Referer": "https://fantasy.premierleague.com/",
            "Origin": "https://fantasy.premierleague.com",
          },
        }
      );
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        return res.status(504).json({ error: "FPL API timed out after 12 seconds" });
      }
      throw fetchErr;
    }
    clearTimeout(timeout);

    if (!fplRes.ok) return res.status(fplRes.status).json({ error: `FPL API returned ${fplRes.status}` });

    const data = await fplRes.json();

    // Bootstrap cached 1 hour, element summaries 30 mins, team data 5 mins
    const isBootstrap = endpoint === "bootstrap-static/";
    const isElement = endpoint.startsWith("element-summary/");
    const maxAge = isBootstrap ? 3600 : isElement ? 1800 : 300;

    res.setHeader("Cache-Control", `s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
