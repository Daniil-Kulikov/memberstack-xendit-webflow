const WEBFLOW_TOKEN = process.env.WEBFLOW_API_KEY;
const COLLECTION_ID = "67f6b015ffad1a9c412671ee";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { memberstackId, plan, email } = req.body;

  if (!memberstackId || !plan) {
    return res.status(400).json({ error: "Missing memberstackId or plan" });
  }

  console.log("📦 Creating invoice for:", { memberstackId, plan, email: email || "No email" });

  try {
    // 🧠 Step 1: Fetch plan info from Webflow CMS
    const cmsResponse = await fetch(`https://api.webflow.com/collections/${COLLECTION_ID}/items?live=true`, {
      headers: {
        Authorization: `Bearer ${WEBFLOW_TOKEN}`,
        "accept-version": "1.0.0",
      },
    });

    const cmsData = await cmsResponse.json();
    const found = cmsData.items.find((item) => item.slug.toLowerCase() === plan.toLowerCase());

    if (!found) {
      console.error("❌ Plan not found in CMS:", plan);
      return res.status(400).json({ error: "Plan not found in Webflow CMS" });
    }

    const amount = found.price * 100; // 💸 price → must be in centavos
    console.log("✅ Plan found in CMS:", { name: found.name, price: amount });

    // 🧾 Step 2: Create invoice in Xendit
    const xenditSecretKey = process.env.XENDIT_API_KEY;
    const encodedKey = Buffer.from(`${xenditSecretKey}:`).toString("base64");

    const xenditResponse = await fetch("https://api.xendit.co/v2/invoices", {
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
        success_redirect_url: "https://crewstagingsite.webflow.io/memberstack/dashboard",
        failure_redirect_url: "https://crewstagingsite.webflow.io/failed",
      }),
    });

    const invoiceData = await xenditResponse.json();

    if (!xenditResponse.ok) {
      console.error("❌ Xendit error:", invoiceData);
      return res.status(xenditResponse.status).json({ error: "Xendit error", details: invoiceData });
    }

    // 🔁 Optional: Assign plan immediately
    try {
      await fetch(`${req.headers.origin}/api/assign-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberstackId, plan }),
      });
      console.log("✅ Plan assignment request sent");
    } catch (err) {
      console.warn("⚠️ Assign plan failed (but not critical):", err.message);
    }

    return res.status(200).json({ invoice_url: invoiceData.invoice_url });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
