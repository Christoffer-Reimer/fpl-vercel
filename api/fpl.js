export default async function handler(req, res) {
  // Allow all origins
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { endpoint } = req.query;
  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint parameter" });
  }

  const allowed = [
    "bootstrap-static/",
  ];

  if (!allowed.includes(endpoint)) {
    return res.status(403).json({ error: "Endpoint not allowed" });
  }

  try {
    const fplRes = await fetch(
      `https://fantasy.premierleague.com/api/${endpoint}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-GB,en;q=0.9",
          "Referer": "https://fantasy.premierleague.com/",
          "Origin": "https://fantasy.premierleague.com",
        },
      }
    );

    if (!fplRes.ok) {
      return res.status(fplRes.status).json({ error: `FPL API returned ${fplRes.status}` });
    }

    const data = await fplRes.json();

    // Cache for 1 hour
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
