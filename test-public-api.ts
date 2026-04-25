async function test() {
  try {
    const res = await fetch("https://ais-dev-5k33rejm3yboszzg2cuaff-12926964599.us-west1.run.app/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "teste" })
    });
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log("Text:", text);
  } catch (e) {
    console.error(e);
  }
}
test();
