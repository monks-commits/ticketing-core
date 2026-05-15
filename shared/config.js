window.VA_CONFIG = null;

async function loadVAConfig(){

  if (window.VA_CONFIG) {
    return window.VA_CONFIG;
  }

  try {

    const res = await fetch(
      "../data/config/client.config.json",
      { cache:"no-store" }
    );

    if (!res.ok) {
      throw new Error("CONFIG LOAD ERROR");
    }

    const json = await res.json();

    window.VA_CONFIG = json;

    console.log("VA CONFIG:", json);

    return json;

  } catch(err) {

    console.error("CONFIG ERROR:", err);

    return null;
  }
}
