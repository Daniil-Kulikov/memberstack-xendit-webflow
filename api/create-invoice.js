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

  console.log("📦 Creating invoice for:", {
    memberstackId,
    plan,
    email: email || "No email provided",
  });

  // 💸 Plan pricing in PHP (₱), in centavos (PHP x 100)
  const planPrices = {
    silver: 59900,   // ₱599.00
    gold: 79900,     // ₱799.00
    platinum: 99900, // ₱999.00
  };

  const amount = planPrices[plan.toLowerCase()];
  if (!amount) {
    return res.status(400).json({ error: "Invalid plan selected" });
  }

  try {
    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.XENDIT_SECRET_KEY}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: `memberstack-${memberstackId}-${Date.now()}`,
        amount,
        currency: "PHP", // ✅ SET TO PHP
        description: `Payment for ${plan} package`,
        customer: {
          reference_id: memberstackId,
          email: email || undefined,
        },
        success_redirect_url: "https://crewstagingsite.webflow.io/success",
        failure_redirect_url: "https://crewstagingsite.webflow.io/failed",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Xendit error:", data);
      return res.status(response.status).json({ error: "Xendit error", details: data });
    }

    return res.status(200).json({ invoice_url: data.invoice_url });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
