---
tags: ['ai', 'pi']
summary: "If you just need bash, why do you need codemode?"
---

# What is Codemode

More than a year ago I wrote a few posts here that recommended people not to
load custom tools into their context (or
[MCP](https://en.wikipedia.org/wiki/Model_Context_Protocol) servers) but to just
use more scripts.  Most importantly I wrote that [Code Is All You
Need](/2025/7/3/tools/) and I wrote about that [MCP needs
code](/2025/8/18/code-mcps/).  With Pi 1.0 we now added MCP support via Codemode
which in some ways is a long time coming, but then also maybe somewhat
surprising to some.  So I want to share some updated thoughts on this blog on
what this all means.

## What Are Tools

When a harness like Pi provides tools for an LLM to call, it does so by
supplying some tool definitions which then translate into some token structure
on the server side.  Whether a model is encouraged to call a tool is the result
of the reinforcement learning process.  Something [I wrote about
before](/2026/7/4/better-models-worse-tools/) if you want to learn more.

One of the reasons we strongly lean towards CLI and bash is because it allows
easy composition of calls, and because the model also learns how the file system
works when it's trained.  So when it invokes a tool like `echo foo >
/tmp/test.txt` the model also learns that after that tool call, there is now a
file called `test.txt` in `/tmp`.

However bash has one fundamental limitation which is that it can only compose
programs that run.  And there are some things, which are not programs, but
native tools to the LLM and they sort of have to be.

The most obvious example here is `read` or `view_image`. If a multimodal model
needs to read an image, it cannot use `cat` for that because the harness needs
to inject the actual image payload into the protocol of the LLM.

Another quite vivid example are sub agents.  In order to spawn and orchestrate
sub agents, it's tricky to avoid tools that are provided by the harness.  While
in theory the agent could provide a CLI tool that talks to the outer harness
via environment variables and Unix sockets, it's a rather crude process.  It
however has another issue, and that is where the code runs.

## Brains vs Hands

To better understand that, it's important to think a bit more about where all the
bits and pieces run.  There really usually are two different systems involved.
The first is the brain, the harness: it runs on one machine. It's trusted.  The
second is *often* the same machine, but it's really where the tools are
executing: the hands.  In Pi we now call this the execution environment, but you
can think of it as the target of all the operations.

Crucially what is important for us, is that there is a dividing line between the
harness brain and the target environment that runs bash and executes the tools.

And splitting this in half has some really important consequences.  For a start
it means that they are running on different file systems and they have different
levels of trust.  If you for instance use a sandboxing solution [like
Gondolin](https://earendil-works.github.io/gondolin/) your bash stuff will be
sandboxed just fine, but the harness itself will not be.

## Orchestrating The Harness

Which brings us to what Codemode really does: it's a way for the LLM to express
and orchestrate complex operations on the harness side, but not the execution
environment side. Codemode runs in the harness, in its own sandbox.  In case of
Pi it's running in QuickJS within a WASM runtime with intentional limitations:
no network, no file system, no timers, limited RAM.  The only way is to call
more tools.  You could also imagine that Codemode could run Scheme or some other
language as well.

If you are not familiar with Codemode, it's basically just a way to issue
tool calls from within some language, in our case JavaScript.  That allows you
to compose those calls without necessarily going through the LLM's context.
Credit for naming goes to our friends at Cloudflare [who coined
it](https://blog.cloudflare.com/code-mode/).

For instance if you issue a bash call as a regular tool call in the LLM, then
we only throw the trailing 2000 lines into the context and if the agent wants
more, it needs to look at the overflow file itself.  If however the agent issues
that invocation via Codemode, then the Codemode side gets larger outputs
sent structurally.

Most importantly, because Codemode is JavaScript the agent can express
concurrent operations and basic workflows.  A common way in which you see agents
now use this, is to first probe at 5-10 items from some tool response to see
what it looks like, and to then write a Codemode script that processes the next
n items.

Codemode also allows you to throw state into the transcript!  That means that
one Codemode invocation can stash away data, that the next call in the session
can load again.  And remember: this is on the harness host, not the sandbox.

In case of Pi, Codemode also allows you to issue calls that naturally do not
make any sense in Pi's traditional interface.  For instance if you want to
generate images with an image model or you want to classify some text with a
one shot classifier model, those Pi APIs are exposed via Codemode, but not via
regular tools where they would just waste context.

## What It Looks Like

So now that we talked a bunch about it, it's probably worth being a bit more
explicit about it.  Let's walk ourselves through some invocations of Codemode
of recent Pi sessions of mine.  Note that none of this code is human written.
It's from real sessions of Pi, just re-indented for your viewing pleasure.  The
agent starts using Codemode automatically either because it's a task where the
model already naturally picks up that tool, or because a user asked it to.

Note that Codemode is by default only enabled in Pi when MCP is enabled, but you
can turn it on with `"defaultTools": ["+codemode"]` in the settings.  Just ask
Pi to enable it for you.

### Generating Images

Let's start simple with image generation.  Image generation is a feature that Pi
supports in the AI SDK core, but it's not a tool that the agent can use.  In the
past the only way to use image models has been to write a bespoke extension or
to have the agent run node itself and use the internal image APIs.  However
because we expose quite a few of the internal model APIs within Codemode, it
means that the agent can use it:

```javascript
const [painter] = await models.getAvailableOfType("image");
const result = await models.generateImages(painter, {
  input: [{ type: "text", text: "A cute little puppy sitting on a grassy " +
    "lawn, soft natural light, photorealistic" }],
});
if (result.stopReason !== "stop") return result.errorMessage;

for (const block of result.output) {
  if (block.type === "image") image(block);
  else text(block.text);
}
```

Note that the call to `image()` sends the image back as image content to the
LLM.  On the harness side it feeds it directly into both the agent, as well as
onto disk as a temporary artifact in case the agent wants to be able to pass
that image back to bash.

### Classifying Things

Similar things apply to classifier models such as [Jev](https://typesafe.ai/).
They also do not fit well into the workflows of an agent through the typical
tools.  But rather than making a bespoke tool available, Codemode just allows
the agent to reach into the AI SDK and invoke those directly.  Here you can see
how Jev is used to mass process GitHub issues for a quick sentiment analysis:

```javascript
const jev = await models.getModelOfType("classifier", "typesafe", "jev-latest");
const r = await tools.bash({
  command: "gh issue list --state open --limit 100 " +
    "--json number,title,body,comments",
});
const issues = JSON.parse(r.output);

const results = await Promise.all(issues.map(async (issue) => {
  const res = await models.classify(jev, {
    state: {
      title: issue.title,
      body: (issue.body || "").slice(0, 4000),
      comments: issue.comments.slice(-5).map(c => c.body.slice(0, 800)),
    },
    questions: {
      sentiment: {
        type: "choice",
        instructions: "What is the overall sentiment of the author towards pi?",
        criteria: {
          positive: "Appreciative, happy, constructive praise",
          neutral: "Matter-of-fact report or request without emotion",
          negative: "Frustrated, annoyed, upset, or angry",
        },
      },
      frustration: {
        type: "score",
        instructions: "How frustrated is the reporter?",
        criteria: ["not at all", "mildly", "clearly frustrated", "very angry"],
      },
      kind: {
        type: "choice",
        instructions: "What kind of issue is this?",
        criteria: {
          bug: "Bug report or regression",
          feature: "Feature request or enhancement",
          question: "Question or support request",
          other: "Docs, discussion, meta, spam",
        },
      },
    },
  });
  if (res.stopReason !== "stop") {
    return { n: issue.number, title: issue.title, error: res.errorMessage };
  }
  return { n: issue.number, title: issue.title, ...res.answers };
}));

store("sentiment_results", results);
return results
  .filter(r => !r.error)
  .sort((a, b) => b.frustration.score - a.frustration.score)
  .slice(0, 12)
  .map(r => `#${r.n} ${r.frustration.score.toFixed(2)} [${r.kind.choice}] ${r.title}`);
```

Note how in that above example we also call `store()` which dumps the result of
that execution into the session transcript.  A future invocation of Codemode can
thus read back that result if it wants to.

The `Promise.all` here is fine, because Pi limits the total number of concurrent
tool executions itself to four and maintains a queue for the rest.

A more adventurous example is to use Jev to drive a game engine for debugging
purposes:

<details><summary>Codemode with Jev for Game Debugging</summary>

Here it knows about my `tankctl` command and it built itself quickly a minimal
harness around it to drive a game loop to assist a user with debugging a
problem. Note how it built a 30 step loop in which each step goes back to both
the game engine to get a text dump of what's going on, and then to Jev to
determine what to do next:

```javascript
const jev = await models.getModelOfType("classifier", "typesafe", "jev-latest");
const tank = async (cmd) =>
  (await tools.bash({ command: `tools/tankctl "${cmd}"` })).output;
await tank("start --map assets/maps/night_arena.map");

const questions = {
  action: {
    type: "choice",
    instructions: "You control the tank '@' in a top-down tank game. " +
      "Choose the best next action.",
    criteria: {
      attack: "an enemy has line of sight to you and you can fire at it",
      approach: "no enemy has line of sight; drive toward the nearest enemy",
      dodge: "an enemy shot is heading at you and will hit soon",
      powerup: "a powerup is close and no enemy threatens you",
    },
  },
};

function commandFor(choice, st) {
  const p = st.player;
  const enemy = st.enemies.filter(e => !e.dead)
    .sort((a, b) => (b.los - a.los) || (a.dist - b.dist))[0];
  if (choice === "attack" && enemy) {
    return `fire_at tank ${enemy.id}; frames 30 until clear,damage,kill`;
  }
  if (choice === "dodge") {
    // move perpendicular to the closest incoming shot
    const s = st.projectiles.filter(s => !s.yours)
      .sort((a, b) => a.eta - b.eta)[0];
    const dir = s && Math.abs(s.vel[0]) > Math.abs(s.vel[1])
      ? (p.pos[1] > s.pos[1] ? "+down" : "+up")
      : (p.pos[0] > (s ? s.pos[0] : 0) ? "+right" : "+left");
    return `input ${dir}; frames 20 until damage; input stop`;
  }
  const powerup = st.powerups.filter(u => u.available)
    .sort((a, b) => a.dist - b.dist)[0];
  if (choice === "powerup" && powerup) {
    return `goto ${powerup.pos[0]} ${powerup.pos[1]} 180`;
  }
  return enemy ? `goto ${enemy.pos[0]} ${enemy.pos[1]} 90` : null;
}

const log = [];
for (let step = 0; step < 30; step++) {
  const st = JSON.parse(await tank("state"));
  if (st.state !== "playing") break;
  const threats = st.projectiles
    .filter(s => !s.yours && s.miss_dist < 1.5 && s.eta < 1.5)
    .map(s => `incoming shot dist ${s.dist} eta ${s.eta}s`)
    .join("\n") || "no incoming shots";
  const r = await models.classify(jev, {
    state: { map: await tank("view 8"), threats, hp: st.player.hp },
    questions,
  });
  if (r.stopReason !== "stop") {
    log.push(`#${step} classifier error: ${r.errorMessage}`);
    break;
  }
  const choice = r.answers.action.choice;
  const cmd = commandFor(choice, st);
  if (!cmd) break;
  log.push(`#${step} hp=${st.player.hp} ${choice} -> ${await tank(cmd)}`);
}
return log.join("\n");
```

</details>

### Calling MCP Servers

Lastly, Codemode obviously is great for calling MCP servers.  And because we
do not actually expose any of the MCP tools to the LLM, the agent first uses
provided APIs to issue a tool search within Codemode to discover what it might
be able to do with the connected servers. This form of progressive discovery
makes the whole MCP business work well enough for a lot of use cases today.

Here for instance you can see the agent reach for the Sentry MCP straight away,
even without discovering the tools, presumably because it has learned during the
RL process already about what the Sentry MCP looks like.  But it learns from
what we inject into the system prompt, that the Sentry server is available to
begin with.  It's not completely guessing here.

```javascript
const orgs = await tools.mcp__sentry__find_organizations({});
const { organizations } = orgs.structuredContent;
const results = await Promise.allSettled(organizations.map(org =>
  tools.mcp__sentry__find_projects({
    organizationSlug: org.slug,
    regionUrl: org.regionUrl,
  })
));
return organizations.map((org, i) => {
  const r = results[i];
  if (r.status !== "fulfilled") return { org: org.slug, error: String(r.reason) };
  if (r.value.isError) return { org: org.slug, error: r.value.content };
  return {
    org: org.slug,
    projects: r.value.structuredContent.projects.map(p => p.slug),
  };
});
```

## Modern MCP Is A Fight

I really don't want to talk too much about MCP here, but MCP is in fact a
protocol that greatly benefits from Codemode.  The problem in parts is that MCP
in practice often targets harnesses that do not (yet?) use Codemode.  But the
tide is shifting.  In the meantime, a temporary crutch has been to do what
Cloudflare did, and do Codemode within the MCP server.  But now we have Codemode
in Codemode which is pretty bad.  It means double JSON escaping, easy for
smaller models to get confused by and the inner code cannot call the outer
tools.  So if you for instance use the Cloudflare MCP servers in Pi, the agent
needs to write JavaScript and funnel it through more JavaScript. This is really
not optimal, but it's also understandable that this is happening:

```javascript
const accRes = await tools.mcp__cloudflare__execute({
  code: `async () => {
    const r = await cloudflare.request({ method: "GET", path: "/accounts" });
    return r.result.map(a => ({ id: a.id, name: a.name }));
  }`,
});
const accounts = JSON.parse(accRes.content.map(c => c.text).join(""));

const out = [];
for (const account of accounts) {
  const r = await tools.mcp__cloudflare__execute({
    account_id: account.id,
    code: `async () => {
      const r = await cloudflare.request({
        method: "GET",
        path: \`/accounts/\${accountId}/workers/scripts\`,
      });
      return r.result.map(s => ({ id: s.id, modified: s.modified_on }));
    }`,
  });
  out.push({ account: account.name, workers: r.content.map(c => c.text).join("") });
}
return out;
```

## MCP Desires

So to end things off: how well does Codemode work with MCP today?  Well … not
amazingly well.  That's because MCP servers are not really targeting harnesses
that use Codemode yet (though at this point I think most harnesses support it).

For this to work well some recommendations:

* **Structured content:** Codemode wants calls to return some nicely
  formatted JSON.  So that needs to come back from the server, and many don't
  do that yet.  The `outputSchema` system in MCP is great for that.
* **Consistent results:** an interesting failure case is when an MCP server
  does not return consistent data.  For instance because it tries to token
  optimize things depending on how many items are in the result set.  This can
  cause an initial probe with 5 items to succeed, but then fail when the server
  returns the maximum batch size.
* **Large binary data:** today MCP does not yet support large binary data
  so quite a few use cases that are really interesting do not work well at all
  yet.  You end up with all kinds of weird workarounds such as pre-signed URLs
  to allow file uploads then to happen through non MCP channels.
* **Composable tool search:** the MCP server might know better than the MCP
  client which tool is appropriate for a task.  But there is no good mechanism
  today that allows a harness to fan out tool searches across multiple MCP
  servers.  It's all emergent behavior and it does not scale well to multiple
  active servers.

## Future of Codemode

So where does this leave us?  Is this a reversal of what I wrote a year ago
where I encouraged CLIs?  I don't think so.  In fact, the MCP ecosystem from my
perspective picked up on exactly what we pointed out a year ago works: code.
But Codemode goes beyond MCP in that it can act as a capable mechanism within
the harness to express more freedom for the agent.

There are however also some things that we still need to figure out.  For one,
durability with Codemode is trickier.  We might have to adopt some ideas from
durable workflow engines here to snapshot invocations.  Or maybe, something like
Starlark is a better composition language than JavaScript given its
deterministic nature.

Images, binary data and just the inability of this pattern to work with smaller
models is also something that needs to be fleshed out.  So it's for sure not a
perfect solution yet, but it's quite a useful pattern that I expect us to
leverage more.

