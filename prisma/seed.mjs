import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

// Same adapter setup as src/lib/db.ts so `npm run db:seed` can target either a
// local file (DATABASE_URL) or a remote Turso DB (TURSO_* env vars).
// Run from the project root: `file:` resolves relative to CWD for libSQL.
const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter: new PrismaLibSQL(libsql) });

const PALETTE = ["#8b7bff", "#ff6b8b", "#ffb648", "#37d39b", "#4bb8ff"];

async function main() {
  // Idempotent-ish: wipe existing demo data so re-seeding is clean.
  await prisma.vote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.sentiment.deleteMany();
  await prisma.member.deleteMany();
  await prisma.group.deleteMany();

  const group = await prisma.group.create({ data: { name: "The Circle" } });

  const memberData = [
    { name: "Arjun" },
    { name: "Mila" },
    { name: "Dev" },
    { name: "Sana" },
  ];
  const members = [];
  for (const m of memberData) {
    members.push(
      await prisma.member.create({ data: { groupId: group.id, name: m.name } }),
    );
  }
  const byName = Object.fromEntries(members.map((m) => [m.name, m]));

  const sentimentData = [
    { label: "Cringe", emoji: "🫣" },
    { label: "Baddie", emoji: "💅" },
    { label: "Fool of the Week", emoji: "🤡" },
  ];
  const sentiments = [];
  for (let i = 0; i < sentimentData.length; i++) {
    sentiments.push(
      await prisma.sentiment.create({
        data: {
          groupId: group.id,
          label: sentimentData[i].label,
          emoji: sentimentData[i].emoji,
          color: PALETTE[i % PALETTE.length],
        },
      }),
    );
  }
  const sBy = Object.fromEntries(sentiments.map((s) => [s.label, s]));

  // Helper to create a poll with all members as options + a set of votes.
  // votes: { voter: "Arjun", pick: "Dev" }[]
  async function makePoll({ question, sentiment, createdBy, anonymous = false, showLiveResults = true, status = "open", optionNames = null, votes = [] }) {
    const optNames = optionNames ?? members.map((m) => m.name);
    const poll = await prisma.poll.create({
      data: {
        groupId: group.id,
        question,
        sentimentId: sBy[sentiment].id,
        createdById: createdBy ? byName[createdBy].id : null,
        anonymous,
        showLiveResults,
        status,
        options: {
          create: optNames.map((n) => ({ memberId: byName[n].id })),
        },
      },
      include: { options: true },
    });
    const optByMember = Object.fromEntries(
      poll.options.map((o) => [o.memberId, o.id]),
    );
    for (const v of votes) {
      await prisma.vote.create({
        data: {
          pollId: poll.id,
          optionId: optByMember[byName[v.pick].id],
          voterMemberId: byName[v.voter].id,
        },
      });
    }
    return poll;
  }

  // --- Cringe: two polls so cross-poll aggregation is visible ---
  await makePoll({
    question: "Who's most likely to cry at a wedding?",
    sentiment: "Cringe",
    createdBy: "Mila",
    votes: [
      { voter: "Arjun", pick: "Dev" },
      { voter: "Mila", pick: "Dev" },
      { voter: "Dev", pick: "Arjun" },
      { voter: "Sana", pick: "Dev" },
    ],
  });

  await makePoll({
    question: "Whose last text was pure cringe?",
    sentiment: "Cringe",
    createdBy: "Sana",
    status: "closed",
    votes: [
      { voter: "Arjun", pick: "Dev" },
      { voter: "Mila", pick: "Sana" },
      { voter: "Dev", pick: "Dev" },
      { voter: "Sana", pick: "Arjun" },
    ],
  });

  // --- Baddie ---
  await makePoll({
    question: "Who's the certified baddie of the group?",
    sentiment: "Baddie",
    createdBy: "Dev",
    anonymous: true,
    votes: [
      { voter: "Arjun", pick: "Mila" },
      { voter: "Mila", pick: "Mila" },
      { voter: "Dev", pick: "Sana" },
      { voter: "Sana", pick: "Mila" },
    ],
  });

  // --- Fool of the Week ---
  await makePoll({
    question: "Fool of the week goes to…?",
    sentiment: "Fool of the Week",
    createdBy: "Arjun",
    showLiveResults: false,
    votes: [
      { voter: "Arjun", pick: "Arjun" },
      { voter: "Mila", pick: "Arjun" },
      { voter: "Dev", pick: "Sana" },
    ],
  });

  const counts = {
    members: members.length,
    sentiments: sentiments.length,
    polls: await prisma.poll.count(),
    votes: await prisma.vote.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
