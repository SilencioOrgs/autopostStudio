async function main() {
  try {
    const res = await fetch("http://localhost:3000/api/board");
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("JSON:", json);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
main();
