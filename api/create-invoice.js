async function handler(req, res) {
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
    silver: 59900,
    gold: 79900,
    platinum: 99900,
  };

  const amount = planPrices[plan.toLowerCase()];
  if (!amount) {
    return res.status(400).json({ error: "Invalid plan selected" });
  }

  try {
    const xenditSecretKey = process.env.XENDIT_API_KEY;

    // 🧪 DEBUG LOG: Перевірка чи є ключ
    if (!xenditSecretKey) {
      console.error("🚨 XENDIT_API_KEY is MISSING in process.env");
      return res.status(500).json({ error: "Missing Xendit API key" });
    } else {
      console.log("🔐 XENDIT_API_KEY starts with:", xenditSecretKey.slice(0, 12));
    }

    const encodedKey = Buffer.from(`${xenditSecretKey}:`).toString("base64");

    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: `memberstack-${memberstackId}-${plan.toLowerCase()}`,
        amount,
        currency: "PHP",
        description: `Payment for ${plan} package`,
        customer: {
          reference_id: memberstackId,
          email: email || undefined,
        },
        success_redirect_url: "https://crewstagingsite.webflow.io/memberstack/profile",
        failure_redirect_url: "https://crewstagingsite.webflow.io/failed",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Xendit error:", data);
      return res.status(response.status).json({ error: "Xendit error", details: data });
    }

    // ✅ Assign plan via Memberstack API
    try {
      await fetch(`${req.headers.origin}/api/assign-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberstackId,
          plan,
        }),
      });
      console.log("✅ Plan assignment request sent");
    } catch (assignErr) {
      console.error("❌ Failed to call assign-plan:", assignErr);
    }

    return res.status(200).json({ invoice_url: data.invoice_url });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

// ✅ CommonJS експорт
module.exports = handler;
