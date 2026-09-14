import { PrismaClient, type TemplateType } from "@prisma/client";

const prisma = new PrismaClient();

// Seed content ONLY — no fake submissions are created. Every response on
// these challenges still has to come from a real visitor; this just makes
// sure the feed/browse grid isn't empty on day one.

type Item = { mediaUrl?: string; textContent?: string };

async function makeCreator(anonToken: string, displayName: string) {
  return prisma.user.upsert({
    where: { anonToken },
    update: { displayName },
    create: { anonToken, displayName, credits: 1000 },
  });
}

async function makeChallenge(opts: {
  creatorId: string;
  templateType: TemplateType;
  category: "FUN" | "PRETRAINING";
  prompt: string;
  config: unknown;
  timeLimitSeconds: number;
  targetResponsesPerItem: number;
  items: Item[];
}) {
  return prisma.challenge.create({
    data: {
      creatorId: opts.creatorId,
      templateType: opts.templateType,
      category: opts.category,
      prompt: opts.prompt,
      config: JSON.stringify(opts.config),
      timeLimitSeconds: opts.timeLimitSeconds,
      targetResponsesPerItem: opts.targetResponsesPerItem,
      items: { create: opts.items.map((item, order) => ({ order, ...item })) },
    },
  });
}

function picsum(seed: string, w = 500, h = 400) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

async function main() {
  const skeptic = await makeCreator("seed-skeptic", "skeptical_sam");
  const foodie = await makeCreator("seed-foodie", "mild_foodie");
  const birder = await makeCreator("seed-birder", "pigeon_watch");
  const labwork = await makeCreator("seed-labwork", "dataset_person");
  const chaos = await makeCreator("seed-chaos", "agent_of_chaos");
  const vibes = await makeCreator("seed-vibes", "vibe_keeper");

  let count = 0;
  async function add(...args: Parameters<typeof makeChallenge>) {
    await makeChallenge(...args);
    count++;
  }

  // ---- FUN / LABELING ----
  await add({
    creatorId: chaos.id,
    templateType: "LABELING",
    category: "FUN",
    prompt: "Is this a good pun?",
    config: { options: ["Yes", "No", "Unclear"] },
    timeLimitSeconds: 15,
    targetResponsesPerItem: 8,
    items: [
      { textContent: "I used to be a banker, but I lost interest." },
      { textContent: "Time flies like an arrow; fruit flies like a banana." },
      { textContent: "I'm reading a book about anti-gravity. It's impossible to put down." },
    ],
  });

  await add({
    creatorId: skeptic.id,
    templateType: "LABELING",
    category: "FUN",
    prompt: "Believable excuse for being late, or straight-up lying?",
    config: { options: ["Believable", "Lying", "Somehow both"] },
    timeLimitSeconds: 15,
    targetResponsesPerItem: 6,
    items: [
      { textContent: "My cat unplugged my alarm clock to sit in the warm spot." },
      { textContent: "I got stuck helping a goose cross the road for ten minutes." },
      { textContent: "My GPS routed me through a cornfield maze and I trusted it." },
    ],
  });

  await add({
    creatorId: foodie.id,
    templateType: "LABELING",
    category: "FUN",
    prompt: "Would you actually eat this fusion food?",
    config: { options: ["Yes, immediately", "Only if dared", "Absolutely not"] },
    timeLimitSeconds: 15,
    targetResponsesPerItem: 6,
    items: [
      { textContent: "Peanut butter and kimchi sandwich" },
      { textContent: "Pineapple pizza with extra anchovies" },
      { textContent: "Mint chocolate chip ramen" },
    ],
  });

  await add({
    creatorId: chaos.id,
    templateType: "LABELING",
    category: "FUN",
    prompt: "Real Pokémon or did we just make it up?",
    config: { options: ["Real", "Fake"] },
    timeLimitSeconds: 10,
    targetResponsesPerItem: 8,
    items: [
      { textContent: "Slowpoke" },
      { textContent: "Grumblecrust" },
      { textContent: "Wobbuffet" },
      { textContent: "Sog Toad" },
    ],
  });

  // ---- FUN / BOUNDING_BOX ----
  await add({
    creatorId: birder.id,
    templateType: "BOUNDING_BOX",
    category: "FUN",
    prompt: "Cats in weird places",
    config: { targetLabel: "the cat" },
    timeLimitSeconds: 30,
    targetResponsesPerItem: 6,
    items: [{ mediaUrl: picsum("cat1") }, { mediaUrl: picsum("cat2", 480, 360) }],
  });

  await add({
    creatorId: birder.id,
    templateType: "BOUNDING_BOX",
    category: "FUN",
    prompt: "Circle the most suspicious-looking pigeon",
    config: { targetLabel: "the suspicious pigeon" },
    timeLimitSeconds: 30,
    targetResponsesPerItem: 5,
    items: [{ mediaUrl: picsum("pigeon1") }, { mediaUrl: picsum("pigeon2", 480, 360) }],
  });

  await add({
    creatorId: chaos.id,
    templateType: "BOUNDING_BOX",
    category: "FUN",
    prompt: "Box the one object that doesn't belong in this scene",
    config: { targetLabel: "the odd one out" },
    timeLimitSeconds: 30,
    targetResponsesPerItem: 5,
    items: [{ mediaUrl: picsum("oddball1") }, { mediaUrl: picsum("oddball2", 480, 360) }],
  });

  // ---- PRETRAINING / LABELING ----
  await add({
    creatorId: labwork.id,
    templateType: "LABELING",
    category: "PRETRAINING",
    prompt: "What's the primary object in this image?",
    config: { options: null },
    timeLimitSeconds: 20,
    targetResponsesPerItem: 8,
    items: [{ mediaUrl: picsum("bear1") }, { mediaUrl: picsum("bear2") }],
  });

  await add({
    creatorId: labwork.id,
    templateType: "LABELING",
    category: "PRETRAINING",
    prompt: "Is there a person visible in this image?",
    config: { options: ["Yes", "No", "Can't tell"] },
    timeLimitSeconds: 15,
    targetResponsesPerItem: 8,
    items: [{ mediaUrl: picsum("street1") }, { mediaUrl: picsum("street2", 480, 360) }],
  });

  await add({
    creatorId: labwork.id,
    templateType: "LABELING",
    category: "PRETRAINING",
    prompt: "What time of day does this look like?",
    config: { options: ["Morning", "Afternoon", "Evening", "Night", "Unclear"] },
    timeLimitSeconds: 15,
    targetResponsesPerItem: 6,
    items: [{ mediaUrl: picsum("timeofday1") }, { mediaUrl: picsum("timeofday2", 480, 360) }],
  });

  // ---- FUN / POINT ----
  await add({
    creatorId: birder.id,
    templateType: "POINT",
    category: "FUN",
    prompt: "Tap the exact moment this scene became a bad idea",
    config: { targetLabel: "the questionable decision" },
    timeLimitSeconds: 20,
    targetResponsesPerItem: 6,
    items: [{ mediaUrl: picsum("badidea1") }, { mediaUrl: picsum("badidea2", 480, 360) }],
  });

  // ---- FUN / FREEFORM_DRAWING ----
  await add({
    creatorId: chaos.id,
    templateType: "FREEFORM_DRAWING",
    category: "FUN",
    prompt: "Draw it",
    config: {},
    timeLimitSeconds: 30,
    targetResponsesPerItem: 6,
    items: [
      { textContent: "a house using only staircases" },
      { textContent: "a cat wearing a tiny hat" },
      { textContent: "your idea of a Tuesday" },
    ],
  });

  // ---- FUN / VIDEO_RECORDING ----
  await add({
    creatorId: foodie.id,
    templateType: "VIDEO_RECORDING",
    category: "FUN",
    prompt: "Record it",
    config: { maxDurationSeconds: 4 },
    timeLimitSeconds: 60,
    targetResponsesPerItem: 5,
    items: [{ textContent: "show us something on your desk you can't explain" }],
  });

  // ---- PRETRAINING / BOUNDING_BOX ----
  await add({
    creatorId: labwork.id,
    templateType: "BOUNDING_BOX",
    category: "PRETRAINING",
    prompt: "Draw a box around the main subject",
    config: { targetLabel: "the main subject" },
    timeLimitSeconds: 30,
    targetResponsesPerItem: 8,
    items: [{ mediaUrl: picsum("subject1") }, { mediaUrl: picsum("subject2", 480, 360) }],
  });

  // ---- FUN / LABELING (more) ----
  await add({
    creatorId: vibes.id,
    templateType: "LABELING",
    category: "FUN",
    prompt: "Yes or no: is this a crime against snacks?",
    config: { options: ["Yes", "No"] },
    timeLimitSeconds: 10,
    targetResponsesPerItem: 8,
    items: [
      { textContent: "Ketchup on scrambled eggs" },
      { textContent: "Ranch on pizza" },
      { textContent: "Ice cubes in wine" },
    ],
  });

  // ---- PRETRAINING / LABELING (more) ----
  await add({
    creatorId: labwork.id,
    templateType: "LABELING",
    category: "PRETRAINING",
    prompt: "What's the dominant color in this image?",
    config: { options: null },
    timeLimitSeconds: 15,
    targetResponsesPerItem: 6,
    items: [{ mediaUrl: picsum("sunset1") }, { mediaUrl: picsum("sunset2", 480, 360) }],
  });

  await add({
    creatorId: labwork.id,
    templateType: "LABELING",
    category: "PRETRAINING",
    prompt: "Indoors or outdoors?",
    config: { options: ["Indoors", "Outdoors", "Unclear"] },
    timeLimitSeconds: 10,
    targetResponsesPerItem: 6,
    items: [{ mediaUrl: picsum("indoor1") }, { mediaUrl: picsum("outdoor1", 480, 360) }],
  });

  // ---- FUN / BOUNDING_BOX (more) ----
  await add({
    creatorId: vibes.id,
    templateType: "BOUNDING_BOX",
    category: "FUN",
    prompt: "Box the best hiding spot in this scene",
    config: { targetLabel: "the best hiding spot" },
    timeLimitSeconds: 30,
    targetResponsesPerItem: 5,
    items: [{ mediaUrl: picsum("hideandseek1") }, { mediaUrl: picsum("hideandseek2", 480, 360) }],
  });

  // ---- FUN / POINT (more) ----
  await add({
    creatorId: chaos.id,
    templateType: "POINT",
    category: "FUN",
    prompt: "Tap where you'd photobomb this picture",
    config: { targetLabel: "your photobomb spot" },
    timeLimitSeconds: 20,
    targetResponsesPerItem: 6,
    items: [{ mediaUrl: picsum("photobomb1") }, { mediaUrl: picsum("photobomb2", 480, 360) }],
  });

  // ---- FUN / FREEFORM_DRAWING (more) ----
  await add({
    creatorId: vibes.id,
    templateType: "FREEFORM_DRAWING",
    category: "FUN",
    prompt: "Sketch it",
    config: {},
    timeLimitSeconds: 30,
    targetResponsesPerItem: 6,
    items: [
      { textContent: "your emotional support object" },
      { textContent: "a dragon that's bad at its job" },
    ],
  });

  // ---- FUN / VIDEO_RECORDING (more) ----
  await add({
    creatorId: skeptic.id,
    templateType: "VIDEO_RECORDING",
    category: "FUN",
    prompt: "Record it",
    config: { maxDurationSeconds: 3 },
    timeLimitSeconds: 60,
    targetResponsesPerItem: 5,
    items: [{ textContent: "show us your best unimpressed face" }],
  });

  console.log(`Seeded ${count} challenges across 6 creators (including all 5 template types).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
