async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const event = req.body;

    if (event.status !== "PAID") {
      return res.status(200).json({ message: "Ignored non-paid event" });
    }

    const externalId = event.external_id;

    // Очікуваний формат: memberstack-mem_xxx-plan
    const match = externalId.match(/^memberstack-(mem_[\w]+)-(\w+)$/);

    if (!match) {
      console.error("❌ Invalid external_id format:", externalId);
      return res.status(400).json({ error: "Invalid external_id format" });
    }

    const memberstackId = match[1];
    const plan = match[2];

    console.log("💥 Payment confirmed for:", { memberstackId, plan });

    // Викликаємо assign-plan
    const response = await fetch(`${req.headers.origin}/api/assign-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ memberstackId, plan }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Plan assignment failed:", data);
      return res.status(500).json({ error: "Plan assignment failed", details: data });
    }

    return res.status(200).json({ message: "Payment processed and plan assigned" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = handler;
