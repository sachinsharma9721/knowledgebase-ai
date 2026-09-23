const url1 = "https://pxsiujygbfirlphnflyq.supabase.co/rest/v1/";
const url2 = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-mpnet-base-v2";
const url3 = "https://api.groq.com/openai/v1/models";

async function testFetch(name, url) {
  try {
    const res = await fetch(url);
    console.log(`${name}: SUCCESS (${res.status})`);
  } catch (err) {
    console.error(`${name}: FAILED - ${err.message}`);
  }
}

async function run() {
  await testFetch("Supabase", url1);
  await testFetch("HuggingFace", url2);
  await testFetch("Groq", url3);
}

run();
