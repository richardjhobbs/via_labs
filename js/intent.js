// js/intent.js
(function () {
  "use strict";

  // REQUIRED: set these for your project
  const SUPABASE_URL = "https://gcxyoujubqclenrhhill.supabase.co";
  const SUPABASE_ANON_KEY = "Ysb_publishable_9A6RBeU9ogFMHPULhJPHpQ_SFkkKdtL";

  // Your table name from the schema export
  const TABLE = "intents";

  async function submitIntent(payload) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Supabase insert failed: ${res.status} ${text}`);
    }

    return true;
  }

  window.submitIntent = submitIntent;
})();
