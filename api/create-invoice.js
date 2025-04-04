export default async function handler(req, res) {
  // ✅ CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { memberstackId, plan, email } = req.body;

  if (!memberstackId || !plan) {
    return res.status(400).json({ error: "Missing memberstackId or plan" });
  }

  console.log("📦 Mock: Creating fake invoice for:", {
    memberstackId,
    plan,
    email: email || "No email provided",
  });

  // 💸 Fake price logic (for visual confirmation)
  const planPrices = {
    silver: 59900,
    gold: 79900,
    platinum: 99900,
  };

  const amount = planPrices[plan.toLowerCase()];
  if (!amount) {
    return res.status(400).json({ error: "Invalid plan selected" });
  }

  // ✅ Return mocked invoice_url
  return res.status(200).json({
    invoice_url: `https://example.com/fake-invoice?plan=${plan}&id=${memberstackId}`,
    fake: true,
  });
}
