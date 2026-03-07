module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    console.log("BODY:", JSON.stringify(req.body));
    console.log("API KEY:", process.env.ANTHROPIC_API_KEY ? "présente" : "MANQUANTE");
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    console.log("RESPONSE:", JSON.stringify(data));
    return res.status(response.status).json(data);
  } catch (err) {
    console.log("ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
