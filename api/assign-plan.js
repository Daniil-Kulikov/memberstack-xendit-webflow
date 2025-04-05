export default async function handler(req, res) {
  // ✅ CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { memberstackId, plan } = req.body;

  if (!memberstackId || !plan) {
    return res.status(400).json({ error: "Missing memberstackId or plan" });
  }

  // 🎯 Map readable plan name to Memberstack planId
  const planMap = {
    silver: "pln_silver-package-4xes0nt7",
    gold: "pln_gold-package-m0ew0nki",
    platinum: "pln_platinum-package-syfk0xac",
  };

  const planId = planMap[plan.toLowerCase()];
  if (!planId) {
    return res.status(400).json({ error: "Invalid plan name", plan });
  }

  try {
    const response = await fetch(`https://admin.memberstack.com/members/${memberstackId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.MEMBERSTACK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ planId: [planId] }), // 👈 array format
    });

    const data = await response.json();

    // 🧾 Log full response from Memberstack API
    console.log("📨 Memberstack API response:", data);
    console.log("🛠 Assigning plan:", { memberstackId, plan, planId });

    if (!response.ok) {
      console.error("❌ Failed to update member:", data);
      return res.status(response.status).json({ error: "Failed to update member", details: data });
    }

    return res.status(200).json({ success: true, updated: data });
  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
