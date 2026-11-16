// Classifies posts with Jev for the artwork's hidden facets (see ART.md).
//
// This is a codemode script: it runs inside a p2 agent session, which is where
// the classifier is reachable (ask the agent to "run scripts/art-classify.js
// in codemode").  It reads the questions from generator/art_facets.json and
// writes the raw answers to /tmp/art-facets-raw.json; `scripts/art-facets`
// then puts them into the posts' frontmatter.
//
// Posts that already have `facets:` are skipped unless ALL is true.
const ALL = false;
const spec = JSON.parse(await tools.read({ path: "generator/art_facets.json" }));
const model = await models.getModelOfType("classifier", spec.model[0], spec.model[1]);
// the pages (about, projects, ...) too: they need a frontmatter first, for
// scripts/art-facets to write into (an `art: {tags: [...]}` block, say)
const SOURCES = "blog/posts/*/*.md blog/*.md";
const listing = await tools.bash({
  command: ALL ? `ls ${SOURCES}` : `grep -L '^facets:' ${SOURCES} || true`,
});
const files = listing.output.trim().split("\n").filter(Boolean);
const wanted = Object.keys(spec.questions).length;

async function classify(file) {
  const source = (await tools.bash({ command: `cat '${file}'` })).output;
  const body = source.replace(/^---[\s\S]*?\n---\n/, "");
  const title = (body.match(/^# (.+)$/m) || [])[1] || "";
  let error = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await models.classify(model, {
        state: { title, post: body.slice(0, 40000) },
        questions: spec.questions,
      });
      if (result.answers && Object.keys(result.answers).length === wanted) {
        return { file, title, answers: result.answers };
      }
      error = result.errorMessage || result.stopReason;
    } catch (e) {
      error = String(e);
    }
  }
  return { file, title, error };
}

const results = [];
for (let i = 0; i < files.length; i += 24) {
  results.push(...(await Promise.all(files.slice(i, i + 24).map(classify))));
}
await tools.write({ path: "/tmp/art-facets-raw.json", content: JSON.stringify(results) });
return {
  classified: results.filter((r) => r.answers).length,
  failed: results.filter((r) => !r.answers).map((r) => `${r.file}: ${r.error}`),
};
