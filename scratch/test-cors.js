async function checkCors() {
  try {
    const res = await fetch("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", {
      method: "HEAD",
      headers: {
        "Origin": "http://localhost:3000"
      }
    });
    console.log("Status:", res.status);
    console.log("Headers:");
    for (const [k, v] of res.headers.entries()) {
      console.log(`  ${k}: ${v}`);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
checkCors();
