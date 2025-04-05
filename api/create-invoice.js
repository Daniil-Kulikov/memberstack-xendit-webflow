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

  console.log("🧾 Creating invoice for:", {
    memberstackId,
    plan,
    email: email || "No email provided",
  });

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
    const xenditRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.XENDIT_API_KEY + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: `${memberstackId}-${Date.now()}`,
        payer_email: email,
        description: `Crew Package: ${plan}`,
        amount,
        success_redirect_url: `https://crewstagingsite.webflow.io/memberstack/profile?plan=${plan}`,
      }),
    });

    const invoice = await xenditRes.json();

    if (!xenditRes.ok) {
      return res.status(400).json({ error: "Xendit error", details: invoice });
    }

    // 🔐 Assign plan in Memberstack
    const planMap = {
      silver: "pln_silver-package-4xes0nt7",
      gold: "pln_gold-package-m0ew0nki",
      platinum: "pln_platinum-package-syfk0xac",
    };

    const memberstackPlanId = planMap[plan.toLowerCase()];
    if (memberstackPlanId) {
      try {
        const assign = await fetch(`https://admin.memberstack.com/members/${memberstackId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.MEMBERSTACK_API_KEY}`,
          },
          body: JSON.stringify({
            planId: memberstackPlanId,
          }),
        });

        if (assign.ok) {
          console.log("✅ Plan assigned in Memberstack");
        } else {
          const err = await assign.json();
          console.error("❌ Failed to assign plan:", err);
        }
      } catch (err) {
        console.error("❌ Memberstack API error:", err);
      }
    }

    return res.status(200).json({ invoice_url: invoice.invoice_url });
  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
