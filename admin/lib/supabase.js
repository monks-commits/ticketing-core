const SUPABASE_URL = "https://fhusjlkneckbvnrdhbil.supabase.co";
const SUPABASE_ANON_KEY = "ТВОЙ_КЛЮЧ";

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY
    }
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("SUPABASE ERROR:", text);
    throw new Error(text);
  }

  return res.json();
}
