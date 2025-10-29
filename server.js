const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 3000;
const pollsFile = path.join(__dirname, "polls.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Ensure polls.json exists
if (!fs.existsSync(pollsFile)) {
  fs.writeFileSync(pollsFile, JSON.stringify({}, null, 2));
}

// Helpers
const readPolls = () => JSON.parse(fs.readFileSync(pollsFile, "utf8"));
const savePolls = (polls) =>
  fs.writeFileSync(pollsFile, JSON.stringify(polls, null, 2));

// ✅ Create Poll
app.post("/api/create", (req, res) => {
  const { owner, candidates, duration } = req.body;
  if (!owner || !candidates || candidates.length < 1)
    return res.status(400).json({ error: "Invalid data" });

  const polls = readPolls();
  const id = Math.floor(1000 + Math.random() * 9000).toString();
  const endAt = Date.now() + duration * 60 * 1000;

  polls[id] = {
    owner,
    candidates,
    votes: Object.fromEntries(candidates.map((c) => [c, 0])),
    voters: [],
    duration,
    createdAt: Date.now(),
    endAt,
    ended: false,
  };

  savePolls(polls);
  console.log(`🆕 Poll created by ${owner} (ID: ${id})`);
  res.json({ message: "Poll created successfully!", id });
});

// 📥 Get Poll
app.get("/api/poll/:id", (req, res) => {
  const polls = readPolls();
  const poll = polls[req.params.id];
  if (!poll) return res.json({ error: "Poll not found" });

  // Check if poll expired
  if (Date.now() > poll.endAt) {
    poll.ended = true;
    savePolls(polls);
  }

  res.json(poll);
});

// 🗳️ Vote
app.post("/api/vote/:id", (req, res) => {
  const { candidate, username } = req.body;
  const polls = readPolls();
  const poll = polls[req.params.id];
  if (!poll) return res.json({ error: "Poll not found" });
  if (poll.ended || Date.now() > poll.endAt)
    return res.json({ error: "Poll has ended" });

  if (poll.voters.includes(username))
    return res.json({ error: "You’ve already voted in this poll." });

  if (!poll.votes.hasOwnProperty(candidate))
    return res.json({ error: "Invalid candidate" });

  poll.votes[candidate]++;
  poll.voters.push(username);
  savePolls(polls);

  console.log(`✅ ${username} voted for '${candidate}' in poll ${req.params.id}`);
  res.json({ message: "Vote counted successfully!" });
});

// 🏁 End poll early
app.post("/api/end/:id", (req, res) => {
  const polls = readPolls();
  const poll = polls[req.params.id];
  if (!poll) return res.json({ error: "Poll not found" });
  poll.ended = true;
  savePolls(polls);
  res.json({ message: "Poll ended successfully!" });
});

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
