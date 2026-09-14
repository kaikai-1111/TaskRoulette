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

// Real, topically-matched photos (Wikimedia Commons, freely licensed) — NOT
// Lorem Picsum. Picsum's "seed" only deterministically picks an arbitrary
// stock photo, it doesn't search by keyword, so a photo "seeded" with
// "pigeon" was never actually a pigeon. Every image below was chosen (and
// URL-verified) to actually show what its challenge asks about.
const IMG = {
  pigeon: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Common_pigeon_at_Waterlow_Park%2C_London%2C_United_Kingdom_01.jpg/960px-Common_pigeon_at_Waterlow_Park%2C_London%2C_United_Kingdom_01.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Feral_Pigeon_2023_11_19.jpg/960px-Feral_Pigeon_2023_11_19.jpg",
  ],
  cat: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Domestic_shorthair_cat_portrait_in_grass.jpg/960px-Domestic_shorthair_cat_portrait_in_grass.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Sleeping_cat_on_her_back.jpg/960px-Sleeping_cat_on_her_back.jpg",
  ],
  bear: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Brown_bear_at_Camperdown_Wildlife_Centre.jpg/960px-Brown_bear_at_Camperdown_Wildlife_Centre.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Eurasian_brown_bear_%28Ursus_arctos_arctos%29_female_1.jpg/960px-Eurasian_brown_bear_%28Ursus_arctos_arctos%29_female_1.jpg",
  ],
  street: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/DSCF0720_Busy_urban_street_scene_with_tuk-tuks_neon_signs_and_pedestrians_passing_shops_-_an_energetic_city_snapshot.jpg/960px-DSCF0720_Busy_urban_street_scene_with_tuk-tuks_neon_signs_and_pedestrians_passing_shops_-_an_energetic_city_snapshot.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Urban_street_scene_on_Rue_Saint-Joseph.jpg/960px-Urban_street_scene_on_Rue_Saint-Joseph.jpg",
  ],
  sunset: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Blue_and_orange_clouds_over_the_Mekong_with_a_pirogue_running_in_the_water_at_sunset_in_Don_Det_Laos.jpg/960px-Blue_and_orange_clouds_over_the_Mekong_with_a_pirogue_running_in_the_water_at_sunset_in_Don_Det_Laos.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Sunset_may_2006_panorama.jpg/960px-Sunset_may_2006_panorama.jpg",
  ],
  interior: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Cozy_living_room_setting_with_a_yellow_sofa_and_a_coffee_table_adorned_with_cups_and_a_flower_pot.jpg/960px-Cozy_living_room_setting_with_a_yellow_sofa_and_a_coffee_table_adorned_with_cups_and_a_flower_pot.jpg",
  outdoor: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Joshua_Tree_National_Park_2013.jpg/960px-Joshua_Tree_National_Park_2013.jpg",
  playground: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Playground_Equipment_%2829147729148%29.jpg/960px-Playground_Equipment_%2829147729148%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Oracle_Playground_equipment_jeh.jpg/960px-Oracle_Playground_equipment_jeh.jpg",
  ],
  singleObject: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Apple_%281%29.jpg/960px-Apple_%281%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/4/4e/Single_apple.png",
  ],
  fleaMarket: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Birgu_flea_market_02.jpg/960px-Birgu_flea_market_02.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Flea_market_at_Yurakucho%27s_Tokyo_International_Forum.jpg/960px-Flea_market_at_Yurakucho%27s_Tokyo_International_Forum.jpg",
  ],
  messyKitchen: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Gfp-messy-kitchen-sink.jpg/960px-Gfp-messy-kitchen-sink.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Messy_kitchen_sink.jpg/960px-Messy_kitchen_sink.jpg",
  ],
  groupPhoto: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Group_of_friends_posing_for_a_photograph_-_2010_%281501%29.jpg/960px-Group_of_friends_posing_for_a_photograph_-_2010_%281501%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/DFC_1112_A_lively_group_of_friends_posing_together_along_a_pool_table_smiling_and_enjoying_a_night_out.jpg/960px-DFC_1112_A_lively_group_of_friends_posing_together_along_a_pool_table_smiling_and_enjoying_a_night_out.jpg",
  ],
};

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
    items: [{ mediaUrl: IMG.cat[0] }, { mediaUrl: IMG.cat[1] }],
  });

  await add({
    creatorId: birder.id,
    templateType: "BOUNDING_BOX",
    category: "FUN",
    prompt: "Circle the most suspicious-looking pigeon",
    config: { targetLabel: "the suspicious pigeon" },
    timeLimitSeconds: 30,
    targetResponsesPerItem: 5,
    items: [{ mediaUrl: IMG.pigeon[0] }, { mediaUrl: IMG.pigeon[1] }],
  });

  await add({
    creatorId: chaos.id,
    templateType: "BOUNDING_BOX",
    category: "FUN",
    prompt: "Box the one object that doesn't belong in this scene",
    config: { targetLabel: "the odd one out" },
    timeLimitSeconds: 30,
    targetResponsesPerItem: 5,
    items: [{ mediaUrl: IMG.fleaMarket[0] }, { mediaUrl: IMG.fleaMarket[1] }],
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
    items: [{ mediaUrl: IMG.bear[0] }, { mediaUrl: IMG.bear[1] }],
  });

  await add({
    creatorId: labwork.id,
    templateType: "LABELING",
    category: "PRETRAINING",
    prompt: "Is there a person visible in this image?",
    config: { options: ["Yes", "No", "Can't tell"] },
    timeLimitSeconds: 15,
    targetResponsesPerItem: 8,
    items: [{ mediaUrl: IMG.street[0] }, { mediaUrl: IMG.street[1] }],
  });

  await add({
    creatorId: labwork.id,
    templateType: "LABELING",
    category: "PRETRAINING",
    prompt: "What time of day does this look like?",
    config: { options: ["Morning", "Afternoon", "Evening", "Night", "Unclear"] },
    timeLimitSeconds: 15,
    targetResponsesPerItem: 6,
    items: [{ mediaUrl: IMG.sunset[0] }, { mediaUrl: IMG.outdoor }],
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
    items: [{ mediaUrl: IMG.messyKitchen[0] }, { mediaUrl: IMG.messyKitchen[1] }],
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
    items: [{ mediaUrl: IMG.singleObject[0] }, { mediaUrl: IMG.singleObject[1] }],
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
    items: [{ mediaUrl: IMG.sunset[0] }, { mediaUrl: IMG.sunset[1] }],
  });

  await add({
    creatorId: labwork.id,
    templateType: "LABELING",
    category: "PRETRAINING",
    prompt: "Indoors or outdoors?",
    config: { options: ["Indoors", "Outdoors", "Unclear"] },
    timeLimitSeconds: 10,
    targetResponsesPerItem: 6,
    items: [{ mediaUrl: IMG.interior }, { mediaUrl: IMG.outdoor }],
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
    items: [{ mediaUrl: IMG.playground[0] }, { mediaUrl: IMG.playground[1] }],
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
    items: [{ mediaUrl: IMG.groupPhoto[0] }, { mediaUrl: IMG.groupPhoto[1] }],
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
