/**
 * Night Arena — CR-style hits, troop aggro, bridge-only river pathing, crowns, king ends the match.
 */
(function () {
  "use strict";

  const W = 800;
  const H = 560;

  const RIVER_TOP = 228;
  const RIVER_BOT = 312;
  /** Half-width of walkable bridge deck (must match drawBridge deckW ~ 46). */
  const BRIDGE_HALF_W = 23;
  /** Lateral offset from bridge center for deploy / ford (stay inside deck). */
  const BRIDGE_LANE_MAX_OFF = 17;

  const BRIDGES = [
    { x: 220, y: (RIVER_TOP + RIVER_BOT) / 2 },
    { x: 580, y: (RIVER_TOP + RIVER_BOT) / 2 },
  ];
  /**
   * After a princess falls, far-side deploy uses a box this fraction of the old half-lane rectangle
   * (linear ½ ⇒ ¼ area), centered on the lane bridge vertically.
   */
  const PRINCESS_FALL_GAIN_SCALE = 0.5;

  const MINI_PEKKA_COST = 4;
  const KNIGHT_COST = 3;
  /** Ground assassin — only fights enemy ground troops; arena towers ignore him. */
  const ASSASSIN_COST = 12;
  /** Seconds of movement toward a foe before purple charge (2× speed, next hit 2× damage). */
  const ASSASSIN_CHARGE_PREP_SEC = 1;
  const ASSASSIN_CHARGE_SPEED_MUL = 2;
  /** Melee splash: nearby enemy ground troops take this fraction of the strike (primary gets full hit). */
  const ASSASSIN_SPLASH_RADIUS = 24;
  const ASSASSIN_SPLASH_FRACTION = 0.5;
  /** Meme melee: fast, huge sprite, very high hit-rate DPS. */
  const TUNG_SAHUR_COST = 7;
  const TUNG_SAHUR_HP = 200;
  const TUNG_SAHUR_DMG = 5;
  const SPEED_TUNG_SAHUR = 75;
  const ATTACK_INTERVAL_TUNG_SAHUR = 1 / 50;
  const TUNG_SAHUR_DEATH_BLAST_RADIUS = 122;
  const TUNG_SAHUR_DEATH_BLAST_DMG = 750;
  const TUNG_EVO_REQUIRED_CYCLES = 2;
  /** Heavenly Tung: death → pause → rally → charge → red lasers (3s) → nuke + 12 Tung Sahur, 3 Mega Goblin Army, 1 Heavenly Tung (or early if no targets). */
  const HEAVENLY_TUNG_COST = 50;
  const HEAVENLY_TUNG_PAUSE_SEC = 1;
  const HEAVENLY_TUNG_CHARGE_SEC = 3;
  const HEAVENLY_TUNG_CHARGE_MAX_R = 92;
  const HEAVENLY_TUNG_RALLY_MOVE_SPEED = 240;
  const HEAVENLY_TUNG_FIRE_SEC = 3;
  const HEAVENLY_TUNG_LASER_HZ = 12;
  const HEAVENLY_TUNG_LASER_DMG = 42;
  const HEAVENLY_TUNG_NUKE_RADIUS = 268;
  const HEAVENLY_TUNG_NUKE_DMG = 2200;
  const HEAVENLY_TUNG_NUKE_FX_SEC = 2.35;
  /** Victory finale spawn counts / layout radii (px from nuke center). */
  const HEAVENLY_TUNG_FINALE_TUNG_SAHUR_COUNT = 12;
  const HEAVENLY_TUNG_FINALE_TUNG_RING_R = 34;
  const HEAVENLY_TUNG_FINALE_MEGA_GOBLIN_ARMY_COUNT = 3;
  const HEAVENLY_TUNG_FINALE_MGA_RING_R = 78;
  /** Spawns 3; each becomes an untargetable ghost at 0 HP until all 3 are ghosts, then the squad is removed. */
  const BIR_BIR_PATAPINS_COST = 7;
  const BIR_PATAPIN_HP = 120;
  const BIR_PATAPIN_DMG = 30;
  const SPEED_BIR_PATAPIN = 21;
  const ATTACK_INTERVAL_BIR_PATAPIN = 0.95;
  const SKELETON_COST = 1;
  const GOBLINS_COST = 3;
  const GOBLIN_GANG_COST = 5;
  const CHUD_COST = 6;
  const ARCHERS_COST = 3;
  /** Archers card: spawns this many `archer` troops. */
  const ARCHERS_PER_CARD = 4;
  /** Skarmy spawn count — Archers Army uses the same swarm layout. */
  const SKARMY_SPAWN_COUNT = 15;
  const ARCHERS_ARMY_COST = 8;
  const SPEAR_GOBLINS_COST = 2;
  const SKARMY_COST = 3.5;
  /** Skeleton Army formation — swarm of bats. */
  const BAT_ARMY_COST = 6;
  /** Mega Knight × Skarmy count — chaotic jump spam. */
  const MEGA_KNIGHT_ARMY_COST = 40;
  const MEGA_ARMY_COST = 13;
  /** Mega Army: skeletons + shielded guards (shield HP, overflow wasted when it breaks) + one witch. */
  const MEGA_ARMY_GUARD_COUNT = 10;
  const MEGA_ARMY_SKELETON_COUNT = 10;
  const SKELETON_GUARD_SHIELD_HP = 10;
  const ARROWS_COST = 3;
  const ARROWS_SPELL_DMG = 150;
  const ARROWS_SPELL_RADIUS = 92;
  const CLONE_COST = 5;
  const CLONE_SPELL_RADIUS = ARROWS_SPELL_RADIUS * 0.7;
  const FIREBALL_COST = 4;
  const FIREBALL_SPELL_DMG = ARROWS_SPELL_DMG * 2.5;
  const FIREBALL_TOWER_DMG = FIREBALL_SPELL_DMG * 0.5;
  const FIREBALL_SPELL_RADIUS = ARROWS_SPELL_RADIUS * (2 / 3);
  /** Airborne bomber: mini Fireballs — ½ spell damage vs Fireball; splash = ½ Fireball footprint (doubled vs old tiny bombs). */
  const BOBERDINO_CROCODELO_COST = 9;
  const BOBERDINO_HP = 1000;
  const BOBERDINO_SPEED = 20;
  const BOBERDINO_BOMB_INTERVAL_SEC = 1.2;
  const BOBERDINO_BOMB_SPELL_DMG = FIREBALL_SPELL_DMG * 0.5;
  const BOBERDINO_BOMB_TOWER_DMG = FIREBALL_TOWER_DMG * 0.5;
  const BOBERDINO_BOMB_RADIUS = FIREBALL_SPELL_RADIUS * 0.5;
  /** Close enough to tower center to orbit and bomb. */
  const BOBERDINO_HOVER_DIST = 46;
  /** Ground impact lands this far below plane (bombs drop “under” the fuselage). */
  const BOBERDINO_BOMB_DROP_OFFSET_Y = 22;
  /** Traveling AoE: third of Fireball radius; troop/building dmg = Fireball troop dmg × 5 × 0.8 (−20% from prior). */
  const ROCKET_COST = 12;
  const ROCKET_SPELL_RADIUS = FIREBALL_SPELL_RADIUS / 3;
  const ROCKET_SPELL_DMG = FIREBALL_SPELL_DMG * 5 * 0.8;
  const ROCKET_TOWER_DMG = ROCKET_SPELL_DMG * 0.5;

  const GOBLIN_HUT_COST = 4;
  /** Burrows from your king to enemy grass, then spawns melee Goblins (Clash-style). */
  const GOBLIN_DRILL_COST = 6.5;
  const GOBLIN_DRILL_HP = 720;
  const GOBLIN_DRILL_TRAVEL_SEC = 1.05;
  const GOBLIN_DRILL_SPAWN_INTERVAL = 2;
  const MAX_DRILL_GOBLINS = 6;
  /** Repairs allied spawned buildings (+HP each hit, capped) in {@link ARROWS_SPELL_RADIUS}. */
  const BUILD_SPELL_COST = 3;
  const BUILD_SPELL_HEAL = 500;
  const GOBLIN_HUT_HP = 680;
  /** Building “timer”: HP ticks down at this rate until the hut collapses (CR-style lifetime). */
  const GOBLIN_HUT_LIFETIME_SEC = 30;
  const GOBLIN_HUT_DECAY_PER_SEC = GOBLIN_HUT_HP / GOBLIN_HUT_LIFETIME_SEC;
  const GOBLIN_DRILL_DECAY_PER_SEC = ((GOBLIN_DRILL_HP / GOBLIN_HUT_LIFETIME_SEC) * 2);
  /** Six simultaneous tunnel ends from one tap (from your king each). */
  const GOBLIN_DRILL_ARMY_COST = 25;
  const GOBLIN_DRILL_ARMY_COUNT = 6;
  /** Seconds between spawns while a foe is inside the hut’s trigger ring. */
  const HUT_SPAWN_INTERVAL = 2;
  /** Spear spawns from Mega Goblin Army troop (hut ring). */
  const MEGA_GOBLIN_ARMY_SPEAR_INTERVAL = 1;
  /** Radius from hut center: enemies inside enable spawning; ring is drawn in-game. */
  const HUT_TRIGGER_RADIUS = 138;
  const MAX_SPEAR_PER_HUT = 5;
  const SPEAR_GOBLIN_HP = 50;
  const SPEAR_GOBLIN_DMG = 26;
  const SPEAR_GOBLIN_RANGE = 118;
  const SPEAR_GOBLIN_INTERVAL = 1.05;
  const ZAP_COST = 2;
  const ZAP_SPELL_DMG = 72;
  const ZAP_SPELL_RADIUS = 46;
  /** Zap briefly stuns troops/towers and breaks their attack lock. */
  const ZAP_STUN_DURATION = 1.85;
  const FREEZE_COST = 4;
  const FREEZE_SPELL_DMG = 24;
  const FREEZE_SPELL_RADIUS = 44;
  /** Freeze zone lasts this long; enemies inside are stunned for the duration (re-applied each tick). */
  const FREEZE_DURATION_SEC = 4;

  const RAGE_SPELL_COST = 5;
  /** Allies buffed — enemies (troops, towers, buildings) struck for damage once. Same footprint as Zap. */
  const RAGE_SPELL_RADIUS = ZAP_SPELL_RADIUS;
  const RAGE_SPELL_DMG = 60;
  const RAGE_BUFF_DURATION_SEC = 3;
  /** 50% faster move speed and melee/ranged cooldowns (+ attack pose timer). */
  const RAGE_MOVE_ATK_MUL = 1.5;

  const TOMBSTONE_COST = 3;
  const TOMBSTONE_HP = 300;
  const TOMBSTONE_LIFETIME_SEC = 20;
  const TOMBSTONE_DECAY_PER_SEC = TOMBSTONE_HP / TOMBSTONE_LIFETIME_SEC;
  const TOMBSTONE_SKEL_INTERVAL_SEC = 3;
  const TOMBSTONE_SKELS_EACH_SPAWN = 2;
  const TOMBSTONE_SKELS_ON_DEATH = 4;

  /** Clash-style Cannon: timed building, shoots single-target cannonballs at ground foes. */
  const CANNON_COST = 3;
  const CANNON_HP = 500;
  const CANNON_LIFETIME_SEC = 40;
  const CANNON_DECAY_PER_SEC = CANNON_HP / CANNON_LIFETIME_SEC;
  const CANNON_RANGE = 105;
  const CANNON_SHOT_DMG = 52;
  const CANNON_FIRE_INTERVAL = 0.88;
  const STATUE_COST = 4;
  const STATUE_HP = 750;
  const STATUE_DEATH_BLAST_RADIUS = FIREBALL_SPELL_RADIUS * 0.7;
  const STATUE_DEATH_BLAST_DMG = FIREBALL_SPELL_DMG * 0.6;
  const STATUE_DEATH_BLAST_TOWER_DMG = FIREBALL_TOWER_DMG * 0.6;

  /** Garrison tower: 150 HP decays over 60s; one friendly troop deployed on it hides inside until the tower dies. */
  const GARRISON_TOWER_COST = 4;
  const GARRISON_TOWER_HP = 150;
  /** Nominal full-drain time before decay tuning (used for copy / balance). */
  const GARRISON_TOWER_LIFETIME_SEC = 60;
  /** HP drain rate vs baseline (1.3 = 30% faster empty-to-zero at full HP). */
  const GARRISON_TOWER_DECAY_SPEED_MUL = 1.3;
  const GARRISON_TOWER_DECAY_PER_SEC =
    (GARRISON_TOWER_HP / GARRISON_TOWER_LIFETIME_SEC) * GARRISON_TOWER_DECAY_SPEED_MUL;

  /** Like Garrison Tower: troops hide inside (untargetable, shoot out) — no HP decay; holds two. */
  const LUXURY_HOTEL_COST = 13;
  const LUXURY_HOTEL_HP = 500;

  /** Beyond melee “reach”, hard lock breaks (target kites away). */
  const LOCK_LEASH_EXTRA = 12;

  /** Buffs friendly troops — radius ½× Arrows splash. */
  const SHIELDS_SPELL_COST = 4;
  const SHIELDS_SPELL_RADIUS = ARROWS_SPELL_RADIUS * 0.5;
  /** Applied by Shield spell and Mirror copies — overflow from the breaking hit is wasted (no chip to HP). */
  const GENERIC_SHIELD_BUFF_HP = 60;
  /** Mirror: +1 elixir over YOUR side’s previous deploy (per side — not opponent’s plays). */
  const MIRROR_EXTRA_ELIXIR = 1;
  /** Play for 0 elixir — cycles the hand only; nothing is placed. */
  const NOTHING_COST = 0;
  /** Flavor — still no units/buildings/spells spawned. */
  const NOTHING_ARMY_COUNT = 15;

  /** All implemented card ids (deck builder + validation). */
  const ALL_CARD_IDS = [
    "mini_pekka",
    "knight",
    "assassin",
    "skeleton",
    "bomber",
    "goblins",
    "archers",
    "spear_goblins",
    "archers_army",
    "goblin_gang",
    "chud",
    "skarmy",
    "bat_army",
    "mega_army",
    "arrows",
    "clone",
    "fireball",
    "goblin_barrel",
    "rocket",
    "freeze",
    "goblin_hut",
    "statue",
    "cannon",
    "garrison_tower",
    "luxury_hotel",
    "mega_goblin_army",
    "goblin_drill",
    "goblin_drill_army",
    "build",
    "zap",
    "wizard",
    "electro_wizard",
    "tombstone",
    "mega_knight",
    "mega_knight_army",
    "musketeer",
    "tung_tung_tung_sahur",
    "heavenly_tung",
    "bir_bir_patapins",
    "witch",
    "bats",
    "prince_tower",
    "boberdino_crocodelo",
    "mirror",
    "shields",
    "rage",
    "nothing",
    "nothing_army",
  ];

  /**
   * Default 8-card rotation when no saved deck — pick any 8 unique from ALL_CARD_IDS in the menu to customize.
   */
  const DEFAULT_DECK_EIGHT = [
    "mini_pekka",
    "knight",
    "wizard",
    "archers",
    "witch",
    "mega_knight",
    "arrows",
    "goblin_hut",
  ];

  const MINI_PEKKA_REF_HP = 400;
  const MINI_PEKKA_REF_DMG = 350;
  const MINI_HP = Math.round(MINI_PEKKA_REF_HP * 1.2);
  const MINI_DMG = Math.round(MINI_PEKKA_REF_DMG * 1.2);
  const SPEED_MINI_PEKKA = 25;

  const WIZARD_COST = 5;
  const WIZARD_HP = Math.round(((MINI_PEKKA_REF_HP * 2) / 3 / 2) * 1.5);
  const WIZARD_DMG = MINI_PEKKA_REF_DMG / 2;
  const WIZARD_RANGE = 92;
  const SPEED_WIZARD = 26;
  const ATTACK_INTERVAL_WIZARD = 1.45;
  const WIZARD_SPLASH_RADIUS = 27;
  /** Splash: fraction of bolt damage to other enemies in the blast (primary takes full bolt once). */
  const WIZARD_SPLASH_FRACTION = 0.58;

  const ELECTRO_WIZARD_COST = 4;
  const ELECTRO_WIZARD_HP = 150;
  const ELECTRO_WIZARD_DMG = Math.max(24, Math.floor((WIZARD_DMG * 0.46) / 2));
  const ELECTRO_WIZARD_RANGE = WIZARD_RANGE;
  const ELECTRO_WIZARD_ATTACK_SEC = 1.5;
  const ELECTRO_STUN_SEC = 0.5;
  const ELECTRO_SPAWN_ZAP_RADIUS = 40;
  const ELECTRO_SPAWN_ZAP_DMG = 46;

  const KNIGHT_HP = 700;
  const KNIGHT_DMG = 65;
  const SPEED_KNIGHT = 17;

  const MEGA_KNIGHT_COST = 8;
  const MEGA_KNIGHT_HP = 2000;
  const SPEED_MEGA_KNIGHT = 12;
  const ATTACK_INTERVAL_MEGA_KNIGHT = 1.42;
  /** Ground slam splash: ⅔ of wizard bolt splash radius. */
  const MEGA_KNIGHT_GROUND_SPLASH_R = (WIZARD_SPLASH_RADIUS * 2) / 3;
  const MEGA_KNIGHT_JUMP_RANGE = 96;
  const MEGA_KNIGHT_WINDUP = 2.0;
  const MEGA_KNIGHT_JUMP_DURATION = 0.38;
  const MEGA_KNIGHT_JUMP_DMG = 200;
  /** Landing AoE: outer ring 2× knight dmg, inner 3×. */
  const MEGA_KNIGHT_JUMP_SLAM_OUTER = 72;

  const SKELETON_HP = 1;
  const SKELETON_DMG = 30;
  const SPEED_SKELETON = 25;
  /** Ground splash bomber: skeleton speed, arcing bomb deals flat splash to all in radius. */
  const BOMBER_COST = 2;
  const BOMBER_HP = 150;
  const BOMBER_SPLASH_DMG = 150;
  const BOMBER_SPLASH_RADIUS = 30;
  /** Splash lands this far past the locked target along the bomb’s flight — deeper into clumps. */
  const BOMBER_SPLASH_AIM_PAST = 14;
  /** Projectile flies at PROJ_SPEED × this (30% slower than standard ranged bolts). */
  const BOMBER_PROJ_SPEED_SCALE = 0.7;
  /** Evo Bomber only: after the first splash on impact, follow-up splashes while the bomb keeps moving — spaced by this interval. */
  const BOMBER_CHAIN_STEP_SEC = 0.3;
  const BOMBER_CHAIN_FOLLOW_UP_COUNT = 3;
  const SPEED_BOMBER = SPEED_SKELETON;
  const BOMBER_RANGE = 90;
  const ATTACK_INTERVAL_BOMBER = 1.85;
  /** Evo Bomber: ~28% faster throws than standard. */
  const ATTACK_INTERVAL_BOMBER_EVO = ATTACK_INTERVAL_BOMBER * 0.72;

  const ARCHER_HP = 35;
  /** Melee goblin (Goblins / Goblin Gang): same cadence as skeletons, 1.3× skeleton slash. */
  const GOBLIN_HP = Math.round(75 * 0.8);
  const GOBLIN_DMG = SKELETON_DMG * 1.3;
  const SPEED_GOBLIN = 27;
  /** Spear Goblins + hut spawns: 3 slower than melee goblins. */
  const SPEAR_GOBLIN_SPEED = SPEED_GOBLIN - 3;
  /** Tower-only melee goblin bruiser. */
  const CHUD_HP = 2000;
  const CHUD_DMG = 150;
  const SPEED_CHUD = 13;
  const ATTACK_INTERVAL_CHUD = 1.55;
  const CHUD_MELEE_RANGE = 28;
  const CHUD_RADIUS = 14;
  /** Evo Chud pulse cadence. */
  const CHUD_EVO_PULSE_SEC = 2;
  const CHUD_EVO_PULSE_DMG = 100;
  const CHUD_EVO_PULSE_RADIUS = 64;
  const CHUD_EVO_KNOCK_DIST = 24;
  /** Chud-style troop (towers only) with hut head; 5 melee goblins on death. */
  const MEGA_GOBLIN_ARMY_COST = 15;
  const MEGA_GOBLIN_ARMY_HP = GOBLIN_HUT_HP + CHUD_HP;
  const ARCHER_SHOT_DMG = 40;
  const ARCHER_RANGE = 85;
  const SPEED_ARCHER = 30;
  const ATTACK_INTERVAL_ARCHER = 1.1;

  /** Single-target rifle troop (Clash Royale Musketeer–style). */
  const MUSKETEER_COST = 4;
  const MUSKETEER_HP = 270;
  const MUSKETEER_SHOT_DMG = 100;
  const MUSKETEER_RANGE = 92 * 1.5 * 1.2;
  const SPEED_MUSKETEER = 24;
  const ATTACK_INTERVAL_MUSKETEER = 1.1 * 2;

  /** Splash ranged + periodic skeleton spawns. */
  const WITCH_COST = 5;
  const WITCH_HP = 304;
  const WITCH_SHOT_DMG = ARCHER_SHOT_DMG * 2 * 1.5;
  const WITCH_RANGE = ARCHER_RANGE;
  const SPEED_WITCH = 24;
  const ATTACK_INTERVAL_WITCH = ATTACK_INTERVAL_ARCHER * 2;
  const WITCH_SPLASH_RADIUS = 24;
  const WITCH_SPLASH_FRACTION = 0.55;
  const WITCH_SPAWN_INTERVAL = 4;

  /** Delay before first melee (Mini / Knight only). */
  const MELEE_FIRST_HIT_DELAY = 0.5;
  /** Seconds between attacks (melee repeat, or archer arrow cadence). */
  const ATTACK_INTERVAL_MINI_PEKKA = 1.6;
  const ATTACK_INTERVAL_KNIGHT = 1.2;
  /** Skeleton card & Skarmy use the same cadence. */
  const ATTACK_INTERVAL_SKELETON = 0.7;
  /** Four-frame walk loop duration (matches old 2×0.5s cadence). */
  const WALK_LOOP_SEC = 1;
  const WALK_FRAME_COUNT = 4;
  /** Native art: 16×16 heavy troops, 12×12 light troops; scaled when drawn. */
  const DRAW_PX_UNIT = 32;
  const DRAW_PX_SKEL = 16;
  const MAX_ELIXIR = 50;
  const ELIXIR_PER_SEC = 1 / 2.75;
  const DEPLOY_DELAY_SEC = 0.4;
  /** PvP regulation length (seconds); then tiebreak or winner by crowns. */
  const PVP_MATCH_DURATION_SEC = 180;
  const PVP_ELIXIR_MULT_2X_REMAINING = 120;
  const PVP_ELIXIR_MULT_3X_REMAINING = 60;
  const PVP_ELIXIR_MULT_5X_REMAINING = 30;
  const PVP_OVERTIME_ELIXIR_MULT = 10;
  /** Princess lanes: x less than this = left tower lane (eL / pL), else right (eR / pR). */
  const LANE_SPLIT_X = 400;
  /** Mega Knight ground slam center shifts this fraction toward the target (not on his feet). */
  const MEGA_KNIGHT_GROUND_AIM_BLEND = 0.58;
  /** Coarse grid for deploy-hint overlay (performance). */
  const DEPLOY_HINT_STEP = 14;

  const PROJ_SPEED = 300;
  const FIREBALL_PROJ_SPEED = 265;

  /** Flies like Fireball — no impact damage; spills 3 melee goblins (same offsets as Goblins card). */
  const GOBLIN_BARREL_COST = 3;
  const PROJ_RADIUS = 5;
  /** Extra reach so melee connects reliably once you’re on a target. */
  const MELEE_REACH_BONUS = 6;
  /** Homing shots connect when this close to the locked target’s hit circle. */
  const PROJECTILE_HIT_FUDGE = 4;
  /**
   * Ranged units stop moving at rangedRange + this slack; shot picking must use the same band or they
   * stand still just outside strict rangedRange and never fire (especially vs towers).
   */
  const RANGED_STANDOFF_SLACK = 4;
  const PRINCESS_DMG = 24;
  const KING_DMG = 24;
  const PRINCESS_TOWER_HP = 2000;
  const KING_TOWER_HP = 4000;
  const PRINCESS_RANGE = 170;
  const KING_RANGE = 255;
  const PRINCESS_FIRE = 1.12;
  const KING_FIRE = 0.72;

  const BATS_COST = 2;
  const BAT_HP = 1;
  /** Three quarters of skeleton slash damage per hit. */
  const BAT_DMG = SKELETON_DMG * 0.75;
  const BAT_COUNT = 5;
  const SPEED_BAT = SPEED_SKELETON + 8;
  const BAT_MELEE_RANGE = 14;

  /** Placeable princess-style shooter — half princess HP, no lifetime drain. */
  const PRINCE_TOWER_COST = 10;
  const PRINCE_PLACEABLE_HP = PRINCESS_TOWER_HP / 2;

  const SPRITES = {
    miniWalk: /** @type {HTMLImageElement[]} */ ([]),
    knightWalk: /** @type {HTMLImageElement[]} */ ([]),
    skelWalk: /** @type {HTMLImageElement[]} */ ([]),
    bomberWalk: /** @type {HTMLImageElement[]} */ ([]),
    archerWalk: /** @type {HTMLImageElement[]} */ ([]),
    spearGoblinWalk: /** @type {HTMLImageElement[]} */ ([]),
    wizardWalk: /** @type {HTMLImageElement[]} */ ([]),
    electroWizardWalk: /** @type {HTMLImageElement[]} */ ([]),
    witchWalk: /** @type {HTMLImageElement[]} */ ([]),
    musketeerWalk: /** @type {HTMLImageElement[]} */ ([]),
    megaKnightWalk: /** @type {HTMLImageElement[]} */ ([]),
    chudWalk: /** @type {HTMLImageElement[]} */ ([]),
    batWalk: /** @type {HTMLImageElement[]} */ ([]),
    tungSahur: new Image(),
    heavenlyTung: new Image(),
    birPatapin: new Image(),
    tungBoom: new Image(),
    towerPrincess: new Image(),
    towerKing: new Image(),
    bridge: new Image(),
    boberdinoCrocodelo: new Image(),
  };

  function loadWalkFrames(folder, base, targetArr) {
    for (let i = 0; i < WALK_FRAME_COUNT; i++) {
      const im = new Image();
      im.src = `${folder}/${base}-w${i}.svg`;
      targetArr.push(im);
    }
  }
  loadWalkFrames("assets", "mini-pekka", SPRITES.miniWalk);
  loadWalkFrames("assets", "knight", SPRITES.knightWalk);
  loadWalkFrames("assets", "skeleton", SPRITES.skelWalk);
  loadWalkFrames("assets", "bomber", SPRITES.bomberWalk);
  loadWalkFrames("assets", "archer", SPRITES.archerWalk);
  loadWalkFrames("assets", "spear-goblin", SPRITES.spearGoblinWalk);
  loadWalkFrames("assets", "wizard", SPRITES.wizardWalk);
  loadWalkFrames("assets", "electro-wizard", SPRITES.electroWizardWalk);
  loadWalkFrames("assets", "witch", SPRITES.witchWalk);
  loadWalkFrames("assets", "musketeer", SPRITES.musketeerWalk);
  loadWalkFrames("assets", "mega-knight", SPRITES.megaKnightWalk);
  loadWalkFrames("assets", "chud", SPRITES.chudWalk);
  loadWalkFrames("assets", "bat", SPRITES.batWalk);
  SPRITES.tungSahur.src = "assets/tung-tung-tung-sahur.png";
  SPRITES.heavenlyTung.src = "assets/heavenly-tung.png";
  SPRITES.birPatapin.src = "assets/bir-bir-patapins-v2.png";
  SPRITES.tungBoom.src = "assets/tung-sahur-explosion.png";
  SPRITES.towerPrincess.src = "assets/tower-princess.svg";
  SPRITES.towerKing.src = "assets/tower-king.svg";
  SPRITES.bridge.src = "assets/bridge.svg";
  SPRITES.boberdinoCrocodelo.src = "assets/boberdino-crocodelo-card.png";

  const stateRef = { current: /** @type {null | object} */ (null) };
  const testingPanelSync = { fn: /** @type {null | (() => void)} */ (null) };

  function walkFrameIndex(state) {
    return Math.floor((state.time / WALK_LOOP_SEC) * WALK_FRAME_COUNT) % WALK_FRAME_COUNT;
  }

  /** Faster walk cycle while assassin is in purple charge. */
  function walkFrameIndexForTroop(state, u) {
    if (u.type === "assassin" && u.assassinCharging) {
      return Math.floor((state.time / WALK_LOOP_SEC) * WALK_FRAME_COUNT * 2) % WALK_FRAME_COUNT;
    }
    return walkFrameIndex(state);
  }

  function updateAssassinChargeWindup(dt, troop, state, moved) {
    if (troop.type !== "assassin") return;
    if (troopStunned(troop, state.time)) {
      troop.assassinCharging = false;
      troop.assassinWindupSec = 0;
      return;
    }
    if (troop.assassinCharging) return;
    const ct = resolveCombatPick(troop, state);
    if (ct && ct.kind === "troop" && moved) {
      troop.assassinWindupSec = (troop.assassinWindupSec || 0) + dt;
    } else {
      troop.assassinWindupSec = 0;
    }
    if (troop.assassinWindupSec >= ASSASSIN_CHARGE_PREP_SEC) {
      troop.assassinCharging = true;
      troop.assassinWindupSec = 0;
    }
  }

  function dist(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.hypot(dx, dy);
  }

  function norm(dx, dy) {
    const m = Math.hypot(dx, dy);
    if (m < 1e-6) return { x: 0, y: 0 };
    return { x: dx / m, y: dy / m };
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function isInRiverWater(x, y) {
    if (y < RIVER_TOP || y > RIVER_BOT) return false;
    for (let i = 0; i < BRIDGES.length; i++) {
      if (Math.abs(x - BRIDGES[i].x) <= BRIDGE_HALF_W) return false;
    }
    return true;
  }

  /** @param {"player" | "enemy"} forSide @param {"L" | "R"} lane */
  function princessFallGainBounds(forSide, lane) {
    const xPad = 48;
    const laneLeftX0 = xPad;
    const laneLeftX1 = LANE_SPLIT_X;
    const laneRightX0 = LANE_SPLIT_X;
    const laneRightX1 = W - xPad;
    const yTop = forSide === "player" ? 36 : RIVER_TOP;
    const yBot = forSide === "player" ? RIVER_BOT : H - 36;
    const legacyW = lane === "L" ? laneLeftX1 - laneLeftX0 : laneRightX1 - laneRightX0;
    const legacyH = yBot - yTop;
    const cx = lane === "L" ? (laneLeftX0 + laneLeftX1) / 2 : (laneRightX0 + laneRightX1) / 2;
    const cy = (RIVER_TOP + RIVER_BOT) / 2;
    const gw = legacyW * PRINCESS_FALL_GAIN_SCALE;
    const gh = legacyH * PRINCESS_FALL_GAIN_SCALE;
    let x0 = cx - gw / 2;
    let x1 = cx + gw / 2;
    let y0 = cy - gh / 2;
    let y1 = cy + gh / 2;
    y0 = Math.max(yTop, y0);
    y1 = Math.min(yBot, y1);
    if (lane === "L") {
      x0 = Math.max(laneLeftX0, x0);
      x1 = Math.min(laneLeftX1, x1);
    } else {
      x0 = Math.max(laneRightX0, x0);
      x1 = Math.min(laneRightX1, x1);
    }
    return { x0, x1, y0, y1 };
  }

  /** @param {"player" | "enemy"} forSide @param {"L" | "R"} lane */
  function inPrincessFallGainZone(forSide, lane, x, y) {
    const { x0, x1, y0, y1 } = princessFallGainBounds(forSide, lane);
    if (y < y0 || y > y1) return false;
    if (lane === "L") return x >= x0 && x <= x1 && x < LANE_SPLIT_X;
    return x >= LANE_SPLIT_X && x >= x0 && x <= x1;
  }

  function aliveTowers(towers) {
    return towers.filter((t) => t.hp > 0);
  }

  function kingAwakeForSide(towers, side) {
    return towers.some(
      (t) => t.side === side && t.kind === "princess" && t.hp <= 0,
    );
  }

  function foeTowers(troop, towers) {
    return aliveTowers(towers).filter((t) => t.side !== troop.side);
  }

  /** Princess + king (only when awake); dormant king cannot be targeted. */
  function targetableFoeTowers(troop, towers) {
    return foeTowers(troop, towers).filter((t) => {
      if (t.kind === "king" && !kingAwakeForSide(towers, t.side)) return false;
      return true;
    });
  }

  function pickBridgeIx(x, y) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < BRIDGES.length; i++) {
      const b = BRIDGES[i];
      const d = dist(x, y, b.x, b.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  function ensureBridgeLaneOx(troop) {
    if (troop.bridgeLaneOx != null && Number.isFinite(troop.bridgeLaneOx)) return;
    let h = 0;
    const s = String(troop.id || "u0");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    const n = 7;
    const k = Math.abs(h) % n;
    const ox = (k - (n >> 1)) * (BRIDGE_LANE_MAX_OFF / 3);
    troop.bridgeLaneOx = clamp(ox, -BRIDGE_LANE_MAX_OFF, BRIDGE_LANE_MAX_OFF);
  }

  function bridgeMouthX(troop, b) {
    return b.x + (troop.bridgeLaneOx ?? 0);
  }

  /**
   * Nearest enemy by straight-line distance — troop or targetable tower (CR-style),
   * not "troops always win over buildings."
   */
  function pickCombatTarget(troop, state) {
    if (
      troop.type === "chud" ||
      troop.type === "mega_goblin_army" ||
      troop.type === "boberdino_crocodelo"
    ) {
      let bestD = Infinity;
      /** @type {{ kind: "tower"; tower: (typeof state.towers)[0] } | null} */
      let pick = null;
      for (const tw of targetableFoeTowers(troop, state.towers)) {
        const d = dist(troop.x, troop.y, tw.x, tw.y);
        if (d < bestD) {
          bestD = d;
          pick = { kind: "tower", tower: tw };
        }
      }
      return pick;
    }

    if (troop.type === "assassin") {
      let bestD = Infinity;
      /** @type {{ kind: "troop"; troop: (typeof state.troops)[0] } | null} */
      let pick = null;
      for (const u of state.troops) {
        if (u === troop || u.side === troop.side) continue;
        if (heavenlyTungRageActive(u)) continue;
        if (u.hp <= 0) continue;
        if (isFlyingTroop(u)) continue;
        if (troopInsideGarrisonAlive(u, state)) continue;
        const d = dist(troop.x, troop.y, u.x, u.y);
        if (d < bestD) {
          bestD = d;
          pick = { kind: "troop", troop: u };
        }
      }
      return pick;
    }

    let bestD = Infinity;
    /** @type {{ kind: "troop"; troop: typeof state.troops[0] } | { kind: "tower"; tower: (typeof state.towers)[0] } | { kind: "building"; building: (typeof state.buildings)[0] } | null} */
    let pick = null;

    for (const u of state.troops) {
      if (u === troop || u.side === troop.side) continue;
      if (heavenlyTungRageActive(u)) continue;
      if (u.hp <= 0) continue;
      if (!canAttackerFightEnemyTroop(troop, u)) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      const d = dist(troop.x, troop.y, u.x, u.y);
      if (d < bestD) {
        bestD = d;
        pick = { kind: "troop", troop: u };
      }
    }

    for (const tw of targetableFoeTowers(troop, state.towers)) {
      const d = dist(troop.x, troop.y, tw.x, tw.y);
      if (d < bestD) {
        bestD = d;
        pick = { kind: "tower", tower: tw };
      }
    }

    const buildings = state.buildings || [];
    for (const bd of buildings) {
      if (bd.hp <= 0 || bd.side === troop.side) continue;
      const d = dist(troop.x, troop.y, bd.x, bd.y);
      if (d < bestD) {
        bestD = d;
        pick = { kind: "building", building: bd };
      }
    }

    return pick;
  }

  function clearTroopAggro(troop) {
    troop.aggroKind = null;
    troop.aggroId = null;
    troop.combatLocked = false;
  }

  function troopStunned(troop, now) {
    return troop.stunUntil != null && now < troop.stunUntil;
  }

  function patapinGhostActive(t) {
    return !!(t && t.type === "bir_patapin" && t.patapinGhost === true);
  }

  function heavenlyTungRageActive(t) {
    return !!(t && t.type === "heavenly_tung" && t.heavenlyRageActive === true);
  }

  /** @param {string | undefined} kind */
  function isGarrisonLikeKind(kind) {
    return kind === "garrison_tower" || kind === "luxury_hotel";
  }

  /** @param {{ kind: string; garrisonTroopId?: null | string; garrisonTroopId2?: null | string }} bd */
  function garrisonFilledCount(bd) {
    let n = 0;
    if (bd.garrisonTroopId) n++;
    if (bd.garrisonTroopId2) n++;
    return n;
  }

  /** @param {{ kind: string; garrisonTroopId?: null | string; garrisonTroopId2?: null | string }} bd */
  function garrisonCapacityForBuilding(bd) {
    if (bd.kind === "luxury_hotel") return 2;
    if (bd.kind === "garrison_tower") return 1;
    return 0;
  }

  /** @param {{ kind: string; garrisonTroopId?: null | string; garrisonTroopId2?: null | string }} bd */
  function hasOpenGarrisonSlot(bd) {
    return garrisonFilledCount(bd) < garrisonCapacityForBuilding(bd);
  }

  /** @returns {boolean} */
  function assignGarrisonTroopToBuilding(bd, troopId) {
    if (!bd.garrisonTroopId) {
      bd.garrisonTroopId = troopId;
      return true;
    }
    if (bd.kind === "luxury_hotel" && !bd.garrisonTroopId2) {
      bd.garrisonTroopId2 = troopId;
      return true;
    }
    return false;
  }

  /** @param {{ garrisonTroopId?: null | string; garrisonTroopId2?: null | string }} bd */
  function clearTroopGarrisonSlots(bd, troopId) {
    if (bd.garrisonTroopId === troopId) bd.garrisonTroopId = null;
    if (bd.garrisonTroopId2 === troopId) bd.garrisonTroopId2 = null;
  }

  function troopInsideGarrisonAlive(troop, state) {
    if (!troop || !troop.garrisonBuildingId || !state) return false;
    const bd = (state.buildings || []).find((b) => b.id === troop.garrisonBuildingId);
    return !!(bd && bd.hp > 0 && isGarrisonLikeKind(bd.kind));
  }

  /** Walking, melee, and facing (patapin ghosts keep fighting at 0 HP until the trio wipes). */
  function troopActsOnBattlefield(t) {
    return t && (t.hp > 0 || patapinGhostActive(t) || heavenlyTungRageActive(t));
  }

  function aggroTargetInMeleeEngageRange(troop, ct) {
    if (ct.kind === "troop") {
      const o = ct.troop;
      return (
        dist(troop.x, troop.y, o.x, o.y) <=
        troop.meleeRange + o.radius * 0.5 + MELEE_REACH_BONUS + LOCK_LEASH_EXTRA
      );
    }
    if (ct.kind === "building") {
      const bd = ct.building;
      return (
        dist(troop.x, troop.y, bd.x, bd.y) <=
        troop.meleeRange + bd.radius * 0.5 + MELEE_REACH_BONUS + LOCK_LEASH_EXTRA
      );
    }
    const tw = ct.tower;
    const pad = tw.kind === "king" ? 26 : 22;
    return dist(troop.x, troop.y, tw.x, tw.y) <= troop.meleeRange + pad + MELEE_REACH_BONUS + LOCK_LEASH_EXTRA;
  }

  function rangedEngagementInRange(unit, ct) {
    const R = unit.rangedRange * 1.08;
    if (ct.kind === "troop") return dist(unit.x, unit.y, ct.troop.x, ct.troop.y) <= R;
    if (ct.kind === "tower") return dist(unit.x, unit.y, ct.tower.x, ct.tower.y) <= R;
    return dist(unit.x, unit.y, ct.building.x, ct.building.y) <= R;
  }

  function isRangedTroopType(troop) {
    const t = troop.type;
    return (
      t === "archer" ||
      t === "spear_goblin" ||
      t === "wizard" ||
      t === "electro_wizard" ||
      t === "witch" ||
      t === "musketeer" ||
      t === "bomber"
    );
  }

  function isFlyingTroop(u) {
    return !!(u && u.flying);
  }

  /**
   * Airborne troops are ignored by ground melee / bomber bombs; other flyers, ranged bolts, Mega Knight splashes/jump, towers, sparks, spells still hit them.
   * @returns {boolean} false iff target is airborne and attacker cannot hurt it.
   */
  function canAttackerFightEnemyTroop(attacker, enemy) {
    if (!enemy || !isFlyingTroop(enemy)) return true;
    if (isFlyingTroop(attacker)) return true;
    if (attacker.type === "mega_knight") return true;
    if (isRangedTroopType(attacker)) return attacker.type !== "bomber";
    return false;
  }

  /** Skeleton / Goblin / Bat: no first-hit wind-up, interval-only melee cadence. */
  function isFastMeleeSwarmType(troop) {
    return troop.type === "skeleton" || troop.type === "skeleton_guard" || troop.type === "goblin" || troop.type === "bat";
  }

  function playerInfiniteElixir(state) {
    return state.matchMode === "training" && !!state.testing && state.testing.infiniteElixir === true;
  }

  /** Training sandbox: arena princess + king towers take no damage (still does not resurrect fallen towers). */
  function trainingInfiniteTowerHp(state) {
    return state.matchMode === "training" && !!state.testing && state.testing.infiniteTowerHp === true;
  }

  /** Side your cards/elixir control: bottom (player) or top (enemy). Battle mode is always player. */
  function humanControlSide(state) {
    if (state.matchMode !== "training" || !state.testing || !state.testing.playAsEnemy) return "player";
    return "enemy";
  }

  /** Training AI uses the opposite side from the human. */
  function trainingAiSide(state) {
    return humanControlSide(state) === "enemy" ? "player" : "enemy";
  }

  /** Training AI card drops + enemy hut spears respect “enemy spawns” off. */
  function trainingEnemyAiEnabled(state) {
    return state.matchMode !== "training" || !state.testing || state.testing.enemySpawns !== false;
  }

  function pvpRegulationRemainingSec(state) {
    return Math.max(0, PVP_MATCH_DURATION_SEC - state.time);
  }

  /** Elixir ramp during PvP regulation; 10× in overtime (sudden death). */
  function pvpBattleElixirMultiplier(state) {
    if (state.matchMode !== "battle" || !battleNet.matchId) return 1;
    if (playerInfiniteElixir(state)) return 1;
    if (state.battleOvertime) return PVP_OVERTIME_ELIXIR_MULT;
    const rem = pvpRegulationRemainingSec(state);
    if (rem > PVP_ELIXIR_MULT_2X_REMAINING) return 1;
    if (rem > PVP_ELIXIR_MULT_3X_REMAINING) return 2;
    if (rem > PVP_ELIXIR_MULT_5X_REMAINING) return 3;
    if (rem > 0) return 5;
    return 5;
  }

  /** At 3:00 sim time: tie → overtime (10× elixir, first princess tower wins); else crown leader wins. */
  function resolvePvpBattleRegulation(state) {
    if (state.matchMode !== "battle" || !battleNet.matchId || state.over) return;
    if (state.pvpRegulationResolved) return;
    if (state.time < PVP_MATCH_DURATION_SEC) return;
    state.pvpRegulationResolved = true;
    if (state.crownsPlayer === state.crownsEnemy) {
      state.battleOvertime = true;
    } else {
      state.over = true;
      state.winner = state.crownsPlayer > state.crownsEnemy ? "player" : "enemy";
      state.localEmote = null;
      state.remoteEmote = null;
      pushMatchEndIfBattle(state);
    }
  }

  function setTroopAggroFromPick(troop, pick) {
    if (!pick) {
      clearTroopAggro(troop);
      return;
    }
    if (pick.kind === "troop") {
      troop.aggroKind = "troop";
      troop.aggroId = pick.troop.id;
    } else if (pick.kind === "tower") {
      troop.aggroKind = "tower";
      troop.aggroId = pick.tower.id;
    } else {
      troop.aggroKind = "building";
      troop.aggroId = pick.building.id;
    }
  }

  function tryResolveTroopAggro(troop, state) {
    if (!troop.aggroKind || !troop.aggroId) return null;
    if (
      (troop.type === "chud" || troop.type === "mega_goblin_army") &&
      (troop.aggroKind === "troop" || troop.aggroKind === "building")
    ) {
      clearTroopAggro(troop);
      return null;
    }
    if (troop.aggroKind === "troop") {
      const u = state.troops.find((x) => x.id === troop.aggroId);
      if (!u || u.side === troop.side || heavenlyTungRageActive(u) || u.hp <= 0) {
        clearTroopAggro(troop);
        return null;
      }
      if (troopInsideGarrisonAlive(u, state)) {
        clearTroopAggro(troop);
        return null;
      }
      if (!canAttackerFightEnemyTroop(troop, u)) {
        clearTroopAggro(troop);
        return null;
      }
      return { kind: "troop", troop: u };
    }
    if (troop.aggroKind === "tower") {
      const tw = state.towers.find((x) => x.id === troop.aggroId);
      if (!tw || tw.hp <= 0 || tw.side === troop.side) {
        clearTroopAggro(troop);
        return null;
      }
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) {
        clearTroopAggro(troop);
        return null;
      }
      return { kind: "tower", tower: tw };
    }
    if (troop.aggroKind === "building") {
      const bd = (state.buildings || []).find((x) => x.id === troop.aggroId);
      if (!bd || bd.hp <= 0 || bd.side === troop.side) {
        clearTroopAggro(troop);
        return null;
      }
      return { kind: "building", building: bd };
    }
    clearTroopAggro(troop);
    return null;
  }

  /**
   * Chase nearest foe until first hit; then stay on that target unless it leaves melee engage range,
   * dies, or Zap stun clears the lock.
   */
  function resolveCombatPick(troop, state) {
    const now = state.time;
    if (troopStunned(troop, now)) return null;

    if (troop.combatLocked) {
      const locked = tryResolveTroopAggro(troop, state);
      if (locked) {
        if (locked.kind === "troop" && !canAttackerFightEnemyTroop(troop, locked.troop)) {
          clearTroopAggro(troop);
        } else {
          const still = isRangedTroopType(troop)
            ? rangedEngagementInRange(troop, locked)
            : aggroTargetInMeleeEngageRange(troop, locked);
          if (still) return locked;
          clearTroopAggro(troop);
        }
      } else {
        clearTroopAggro(troop);
      }
    }

    const pick = pickCombatTarget(troop, state);
    setTroopAggroFromPick(troop, pick);
    return pick;
  }

  function segmentCrossesWater(x0, y0, x1, y1) {
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      if (isInRiverWater(x, y)) return true;
    }
    return false;
  }

  function bestBridgeFor(troop, gx, gy) {
    ensureBridgeLaneOx(troop);
    let bestIx = 0;
    let bestCost = Infinity;
    for (let i = 0; i < BRIDGES.length; i++) {
      const b = BRIDGES[i];
      const mx = bridgeMouthX(troop, b);
      const mouthMy =
        troop.side === "player"
          ? { x: mx, y: RIVER_BOT + 28 }
          : { x: mx, y: RIVER_TOP - 28 };
      const mouthFar =
        troop.side === "player"
          ? { x: mx, y: RIVER_TOP - 26 }
          : { x: mx, y: RIVER_BOT + 26 };
      const cost =
        dist(troop.x, troop.y, mouthMy.x, mouthMy.y) +
        dist(mouthFar.x, mouthFar.y, gx, gy);
      if (cost < bestCost) {
        bestCost = cost;
        bestIx = i;
      }
    }
    return bestIx;
  }

  function refreshRiverPath(troop, gx, gy) {
    ensureBridgeLaneOx(troop);
    if (troop.path === "ford") {
      return;
    }
    if (!segmentCrossesWater(troop.x, troop.y, gx, gy)) {
      troop.path = "fight";
      return;
    }
    troop.bridgeIx = bestBridgeFor(troop, gx, gy);
    const b = BRIDGES[troop.bridgeIx];
    if (troop.side === "player") {
      const mouth = { x: bridgeMouthX(troop, b), y: RIVER_BOT + 28 };
      if (troop.y < RIVER_TOP - 6) {
        troop.path = "fight";
      } else if (troop.y > RIVER_BOT + 10) {
        troop.path = dist(troop.x, troop.y, mouth.x, mouth.y) < 22 ? "ford" : "deploy";
      } else {
        troop.path = "ford";
      }
    } else {
      const mouth = { x: bridgeMouthX(troop, b), y: RIVER_TOP - 28 };
      if (troop.y > RIVER_BOT + 6) {
        troop.path = "fight";
      } else if (troop.y < RIVER_TOP - 10) {
        troop.path = dist(troop.x, troop.y, mouth.x, mouth.y) < 22 ? "ford" : "deploy";
      } else {
        troop.path = "ford";
      }
    }
  }

  function moveWithWater(troop, dx, dy) {
    const splits = 5;
    const sdx = dx / splits;
    const sdy = dy / splits;

    for (let i = 0; i < splits; i++) {
      const nx = troop.x + sdx;
      const ny = troop.y + sdy;

      if (!isInRiverWater(nx, ny)) {
        troop.x = nx;
        troop.y = ny;
        continue;
      }

      if (!isInRiverWater(nx, troop.y)) {
        troop.x = nx;
        continue;
      }
      if (!isInRiverWater(troop.x, ny)) {
        troop.y = ny;
        continue;
      }

      const br = BRIDGES[pickBridgeIx(troop.x, troop.y)];
      ensureBridgeLaneOx(troop);
      const targetX = bridgeMouthX(troop, br);
      const step = Math.sign(targetX - troop.x) * Math.min(Math.abs(targetX - troop.x), 4.5);
      const sx = troop.x + step;
      if (!isInRiverWater(sx, troop.y)) troop.x = sx;
    }
  }

  function updateFacingTowardTarget(troop, state, dt) {
    if (!troopActsOnBattlefield(troop)) return;
    if (troopStunned(troop, state.time)) return;
    if (troop.type === "mega_knight" && troop.mkJumpPhase) {
      const tx = troop.mkJumpTX;
      const ty = troop.mkJumpTY;
      const d = dist(troop.x, troop.y, tx, ty);
      if (d < 1e-3) return;
      const fx = (tx - troop.x) / d;
      const fy = (ty - troop.y) / d;
      const k = clamp(10 * dt, 0, 1);
      troop.faceX += (fx - troop.faceX) * k;
      troop.faceY += (fy - troop.faceY) * k;
      const m = Math.hypot(troop.faceX, troop.faceY);
      if (m > 1e-3) {
        troop.faceX /= m;
        troop.faceY /= m;
      }
      return;
    }
    if (troop.attackT > 0) return;
    const ct = resolveCombatPick(troop, state);
    if (!ct) return;
    let tx;
    let ty;
    if (ct.kind === "troop" && ct.troop.hp > 0 && !heavenlyTungRageActive(ct.troop)) {
      tx = ct.troop.x;
      ty = ct.troop.y;
    } else if (ct.kind === "tower" && ct.tower.hp > 0) {
      tx = ct.tower.x;
      ty = ct.tower.y;
    } else if (ct.kind === "building" && ct.building.hp > 0) {
      tx = ct.building.x;
      ty = ct.building.y;
    } else return;
    const d = dist(troop.x, troop.y, tx, ty);
    if (d < 1e-3) return;
    const fx = (tx - troop.x) / d;
    const fy = (ty - troop.y) / d;
    const k = clamp(8 * dt, 0, 1);
    troop.faceX += (fx - troop.faceX) * k;
    troop.faceY += (fy - troop.faceY) * k;
    const m = Math.hypot(troop.faceX, troop.faceY);
    if (m > 1e-3) {
      troop.faceX /= m;
      troop.faceY /= m;
    }
  }

  function slideNudge(troop, dx, dy) {
    if (!isInRiverWater(troop.x + dx, troop.y + dy)) {
      troop.x += dx;
      troop.y += dy;
    } else if (!isInRiverWater(troop.x + dx, troop.y)) {
      troop.x += dx;
    } else if (!isInRiverWater(troop.x, troop.y + dy)) {
      troop.y += dy;
    }
  }

  function resolveTroopCollisions(troops) {
    const padding = 4;
    const iters = 5;
    /** Chud shoves foes aside (bridge body-block); other unit takes most of the separation. */
    const CHUD_PUSH_OTHER = 1.45;
    const CHUD_PUSH_SELF = 0.12;
    for (let k = 0; k < iters; k++) {
      for (let i = 0; i < troops.length; i++) {
        const a = troops[i];
        if (!troopActsOnBattlefield(a)) continue;
        if (heavenlyTungRageActive(a)) continue;
        for (let j = i + 1; j < troops.length; j++) {
          const b = troops[j];
          if (!troopActsOnBattlefield(b)) continue;
          if (heavenlyTungRageActive(b)) continue;
          if (
            (a.type === "boberdino_crocodelo" && !b.flying) ||
            (b.type === "boberdino_crocodelo" && !a.flying)
          ) {
            continue;
          }
          const minD = a.radius + b.radius + padding;
          const d = dist(a.x, a.y, b.x, b.y);
          if (d >= minD || d < 1e-4) continue;
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          const pen = (minD - d) * 0.55;
          const aChud = a.type === "chud" || a.type === "mega_goblin_army";
          const bChud = b.type === "chud" || b.type === "mega_goblin_army";
          const chudShoveFoe = a.side !== b.side;
          if (chudShoveFoe && aChud && !bChud) {
            slideNudge(a, -nx * pen * CHUD_PUSH_SELF, -ny * pen * CHUD_PUSH_SELF);
            slideNudge(b, nx * pen * CHUD_PUSH_OTHER, ny * pen * CHUD_PUSH_OTHER);
          } else if (chudShoveFoe && bChud && !aChud) {
            slideNudge(a, -nx * pen * CHUD_PUSH_OTHER, -ny * pen * CHUD_PUSH_OTHER);
            slideNudge(b, nx * pen * CHUD_PUSH_SELF, ny * pen * CHUD_PUSH_SELF);
          } else {
            slideNudge(a, -nx * pen, -ny * pen);
            slideNudge(b, nx * pen, ny * pen);
          }
        }
      }
    }
  }

  function registerTowerFall(state, tower) {
    if (tower.fallen) return;
    tower.fallen = true;

    if (tower.kind === "king") {
      for (const t of state.towers) {
        if (t.side === tower.side) {
          t.hp = 0;
          t.fallen = true;
        }
      }
      if (tower.side === "enemy") {
        state.crownsPlayer = 3;
        state.over = true;
        state.winner = "player";
      } else {
        state.crownsEnemy = 3;
        state.over = true;
        state.winner = "enemy";
      }
      state.localEmote = null;
      state.remoteEmote = null;
      pushMatchEndIfBattle(state);
      return;
    }

    if (tower.side === "enemy") {
      state.crownsPlayer = Math.min(2, state.crownsPlayer + 1);
    } else {
      state.crownsEnemy = Math.min(2, state.crownsEnemy + 1);
    }
    if (
      state.matchMode === "battle" &&
      battleNet.matchId &&
      state.battleOvertime &&
      !state.over
    ) {
      state.over = true;
      state.winner = tower.side === "enemy" ? "player" : "enemy";
      state.localEmote = null;
      state.remoteEmote = null;
      pushMatchEndIfBattle(state);
    }
  }

  function applyTowerDamage(state, tower, amount) {
    if (tower.hp <= 0 || amount <= 0) return;
    if (trainingInfiniteTowerHp(state)) return;
    let rem = amount;
    const sh = tower.shieldHp;
    if (sh != null && sh > 0) {
      if (rem >= sh) {
        delete tower.shieldHp;
        delete tower.shieldMax;
        return;
      }
      tower.shieldHp -= rem;
      return;
    }
    tower.hp -= rem;
    if (tower.hp < 0) tower.hp = 0;
    if (tower.hp <= 0) registerTowerFall(state, tower);
  }

  function applyBuildingDamage(state, b, amount) {
    if (b.hp <= 0 || amount <= 0) return;
    let rem = amount;
    const sh = b.shieldHp;
    if (sh != null && sh > 0) {
      if (rem >= sh) {
        delete b.shieldHp;
        delete b.shieldMax;
        return;
      }
      b.shieldHp -= rem;
      return;
    }
    b.hp -= rem;
    if (b.hp < 0) b.hp = 0;
    if (b.hp <= 0) {
      if (isGarrisonLikeKind(b.kind) && (b.garrisonTroopId || b.garrisonTroopId2)) {
        const ids = [];
        if (b.garrisonTroopId) ids.push(b.garrisonTroopId);
        if (b.garrisonTroopId2) ids.push(b.garrisonTroopId2);
        for (const tid of ids) {
          const gt = state.troops.find((t) => t.id === tid);
          if (gt) releaseTroopFromGarrison(state, gt, b);
        }
        b.garrisonTroopId = null;
        b.garrisonTroopId2 = null;
      }
      if (b.kind === "tombstone" && !b.tombDeathSpawned) {
        b.tombDeathSpawned = true;
        spawnSkeletonsFromTombstoneSite(state, b, TOMBSTONE_SKELS_ON_DEATH);
      }
      if (b.kind === "goblin_drill" && !b.drillDeathSpawned) {
        b.drillDeathSpawned = true;
        spawnGoblinsOnDrillDeath(state, b, 2);
      }
      if (b.kind === "statue" && !b.statueDeathBlasted) {
        b.statueDeathBlasted = true;
        triggerStatueDeathBlast(state, b);
      }
    }
  }

  /** Positive-only heal for spawned buildings (huts, drills, cannon, …). Ignores shields — structure HP only. */
  function applyBuildingHealFlat(state, b, amt) {
    if (!b || b.hp <= 0 || amt <= 0 || !Number.isFinite(amt)) return;
    b.hp = Math.min(b.maxHp, b.hp + amt);
  }

  /** Shield absorbs first; the hit that breaks shield wastes overflow (no HP chip). Then becomes a skeleton. */
  function convertSkeletonGuardToSkeleton(troop) {
    if (troop.type !== "skeleton_guard") return;
    troop.type = "skeleton";
    delete troop.shieldHp;
    delete troop.shieldMax;
  }

  function maybeFinalizePatapinSquad(state, squadId) {
    if (!state || !squadId) return;
    const mates = state.troops.filter((u) => u.type === "bir_patapin" && u.patapinSquad === squadId);
    if (!mates.length) return;
    if (!mates.every((u) => u.patapinGhost)) return;
    for (const u of mates) u.patapinDeparted = true;
    state.troops = state.troops.filter((u) => !u.patapinDeparted);
  }

  function triggerTungSahurDeathBlast(state, troop) {
    if (!state || !troop || troop.type !== "tung_tung_tung_sahur") return;
    const blastR =
      typeof troop.tungDeathBlastRadius === "number" ? troop.tungDeathBlastRadius : TUNG_SAHUR_DEATH_BLAST_RADIUS;
    const blastDmg =
      typeof troop.tungDeathBlastDamage === "number" ? troop.tungDeathBlastDamage : TUNG_SAHUR_DEATH_BLAST_DMG;
    applyFullAoEToFoes(
      state,
      troop.x,
      troop.y,
      troop.side,
      blastR,
      blastDmg,
    );
    state.wizardSplashFx.push({
      cx: troop.x,
      cy: troop.y,
      until: state.time + 1.4,
      radius: blastR,
      kind: "tung_boom",
    });

    if (!troop.tungEvo || troop.tungMiniSpawned) return;
    troop.tungMiniSpawned = true;
    const princessTowers = state.towers.filter((tw) => tw.kind === "princess");
    const miniHp = Math.max(1, Math.round(TUNG_SAHUR_HP * 0.5));
    const miniDmg = Math.max(1, Math.round(TUNG_SAHUR_DMG * 0.5));
    const miniBlastR = Math.max(8, TUNG_SAHUR_DEATH_BLAST_RADIUS * 0.5);
    const miniBlastDmg = Math.max(1, Math.round(TUNG_SAHUR_DEATH_BLAST_DMG * 0.5));
    for (const tw of princessTowers) {
      for (let i = 0; i < 2; i++) {
        const ox = i === 0 ? -10 : 10;
        const oy = tw.side === "enemy" ? 18 : -18;
        const sx = clamp(tw.x + ox, 14, W - 14);
        const sy = clamp(tw.y + oy, 14, H - 14);
        state.troops.push({
          id: `u${++state.uid}`,
          side: troop.side,
          type: "tung_tung_tung_sahur",
          x: sx,
          y: sy,
          hp: miniHp,
          maxHp: miniHp,
          speed: SPEED_TUNG_SAHUR,
          radius: 12,
          path: "deploy",
          bridgeIx: pickBridgeIx(sx, sy),
          spawnTime: state.time,
          hasHitOnce: false,
          firstHitDelay: MELEE_FIRST_HIT_DELAY,
          lastMeleeAt: -999,
          hitInterval: ATTACK_INTERVAL_TUNG_SAHUR,
          hitDamage: miniDmg,
          meleeRange: 30,
          attackT: 0,
          faceX: 0,
          faceY: troop.side === "player" ? -1 : 1,
          stunUntil: 0,
          combatLocked: false,
          tungMini: true,
          tungDeathBlastRadius: miniBlastR,
          tungDeathBlastDamage: miniBlastDmg,
          tungEvo: false,
          tungMiniSpawned: true,
        });
      }
    }
  }

  function triggerStatueDeathBlast(state, b) {
    const cx = b.x;
    const cy = b.y;
    const fromSide = b.side;
    const R = STATUE_DEATH_BLAST_RADIUS;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === fromSide) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (dist(u.x, u.y, cx, cy) <= R) applyTroopDamage(u, STATUE_DEATH_BLAST_DMG);
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === fromSide || bd.id === b.id) continue;
      if (dist(bd.x, bd.y, cx, cy) <= R + bd.radius) applyBuildingDamage(state, bd, STATUE_DEATH_BLAST_DMG);
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === fromSide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 34 : 26;
      if (dist(tw.x, tw.y, cx, cy) <= R + ext) applyTowerDamage(state, tw, STATUE_DEATH_BLAST_TOWER_DMG);
    }
    state.wizardSplashFx.push({
      cx,
      cy,
      until: state.time + 0.42,
      radius: R,
      kind: "mega_ground",
    });
  }

  function applyTroopDamage(troop, amount) {
    if (!troop || amount <= 0) return;
    if (heavenlyTungRageActive(troop)) return;
    const stG = stateRef.current;
    if (stG && troopInsideGarrisonAlive(troop, stG)) return;
    if (troop.hp <= 0) return;
    if (
      stG &&
      stG.matchMode === "training" &&
      stG.testing &&
      stG.testing.invincibleTroops &&
      troop.side === humanControlSide(stG)
    ) {
      return;
    }
    if (patapinGhostActive(troop)) return;
    const sh = troop.shieldHp;
    if (sh != null && sh > 0) {
      if (amount >= sh) {
        if (troop.type === "skeleton_guard") {
          convertSkeletonGuardToSkeleton(troop);
          return;
        }
        delete troop.shieldHp;
        delete troop.shieldMax;
        return;
      }
      troop.shieldHp -= amount;
      return;
    }
    troop.hp -= amount;
    if (troop.hp < 0) troop.hp = 0;
    if (troop.type === "heavenly_tung" && troop.hp <= 0 && !troop.heavenlyRageActive) {
      troop.heavenlyRageActive = true;
      const st = stateRef.current;
      troop.hp = 0;
      clearTroopAggro(troop);
      troop.heavenlyPhase = "pause";
      troop.heavenlyPhaseStart = st ? st.time : 0;
      const rp = st ? heavenlyKingRallyPoint(st, troop.side) : { x: LANE_SPLIT_X, y: H * 0.5 };
      troop.heavenlyRallyX = rp.x;
      troop.heavenlyRallyY = rp.y;
      troop.heavenlyLaserAcc = 0;
      return;
    }
    if (troop.type === "tung_tung_tung_sahur" && troop.hp <= 0) {
      const st = stateRef.current;
      if (st) triggerTungSahurDeathBlast(st, troop);
      return;
    }
    if (troop.type === "bir_patapin" && troop.hp <= 0) {
      troop.patapinGhost = true;
      const st = stateRef.current;
      if (st && troop.patapinSquad) maybeFinalizePatapinSquad(st, troop.patapinSquad);
    }
  }

  /** Stand just in front of your king (toward the river), centered between lanes. */
  function heavenlyKingRallyPoint(state, side) {
    const kid = side === "player" ? "pK" : "eK";
    const k = state.towers.find((t) => t.id === kid);
    if (!k) return { x: LANE_SPLIT_X, y: H * 0.5 };
    const dy = side === "player" ? -42 : 42;
    return {
      x: k.x,
      y: clamp(k.y + dy, 36, H - 36),
    };
  }

  /**
   * Up to `limit` nearest enemy targets for Heavenly laser visuals / damage.
   * @returns {{ kind: "troop"; troop: object; x: number; y: number; d: number } | { kind: "building"; b: object; x: number; y: number; d: number } | { kind: "tower"; tw: object; x: number; y: number; d: number }[]} */
  function pickHeavenlyLaserTargets(state, src, limit) {
    const side = src.side;
    /** @type {{ kind: "troop"; troop: object; x: number; y: number; d: number } | { kind: "building"; b: object; x: number; y: number; d: number } | { kind: "tower"; tw: object; x: number; y: number; d: number }[]} */
    const arr = [];
    for (const u of state.troops) {
      if (u === src || u.side === side) continue;
      if (heavenlyTungRageActive(u)) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (u.hp <= 0 && !patapinGhostActive(u)) continue;
      arr.push({ kind: "troop", troop: u, x: u.x, y: u.y, d: dist(src.x, src.y, u.x, u.y) });
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === side) continue;
      arr.push({ kind: "building", b: bd, x: bd.x, y: bd.y, d: dist(src.x, src.y, bd.x, bd.y) });
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === side) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      arr.push({ kind: "tower", tw, x: tw.x, y: tw.y, d: dist(src.x, src.y, tw.x, tw.y) });
    }
    arr.sort((a, b) => a.d - b.d);
    return arr.slice(0, limit);
  }

  /** Same eligibility as laser targets (incl. dormant king = not a target). */
  function heavenlyHasAnyEnemyTarget(state, side) {
    if (!state) return false;
    for (const u of state.troops) {
      if (u.side === side) continue;
      if (heavenlyTungRageActive(u)) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (u.hp <= 0 && !patapinGhostActive(u)) continue;
      return true;
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === side) continue;
      return true;
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === side) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      return true;
    }
    return false;
  }

  function triggerHeavenlyTungVictoryFinale(state, troop) {
    if (!state || !troop || troop.type !== "heavenly_tung") return;
    const prevTroopLen = state.troops.length;
    const cx = troop.x;
    const cy = troop.y;
    const side = troop.side;
    applyFullAoEToFoes(state, cx, cy, side, HEAVENLY_TUNG_NUKE_RADIUS, HEAVENLY_TUNG_NUKE_DMG);
    state.wizardSplashFx.push({
      cx,
      cy,
      until: state.time + HEAVENLY_TUNG_NUKE_FX_SEC,
      radius: HEAVENLY_TUNG_NUKE_RADIUS,
      kind: "heavenly_nuke",
    });
    const faceY = side === "player" ? -1 : 1;
    const nTung = HEAVENLY_TUNG_FINALE_TUNG_SAHUR_COUNT;
    const rTung = HEAVENLY_TUNG_FINALE_TUNG_RING_R;
    for (let i = 0; i < nTung; i++) {
      const ang = (i / nTung) * Math.PI * 2;
      const ox = Math.cos(ang) * rTung;
      const oy = Math.sin(ang) * rTung;
      createTroop(
        side,
        "tung_tung_tung_sahur",
        clamp(cx + ox, 14, W - 14),
        clamp(cy + oy * faceY, 14, H - 14),
        state,
      );
    }
    const nMga = HEAVENLY_TUNG_FINALE_MEGA_GOBLIN_ARMY_COUNT;
    const rMga = HEAVENLY_TUNG_FINALE_MGA_RING_R;
    for (let i = 0; i < nMga; i++) {
      const ang = (i / nMga) * Math.PI * 2 + Math.PI / 6;
      const ox = Math.cos(ang) * rMga;
      const oy = Math.sin(ang) * rMga;
      createTroop(
        side,
        "mega_goblin_army",
        clamp(cx + ox, 14, W - 14),
        clamp(cy + oy * faceY, 14, H - 14),
        state,
      );
    }
    createTroop(side, "heavenly_tung", clamp(cx, 14, W - 14), clamp(cy + 44 * faceY, 14, H - 14), state);
    attachNewTroopsToGarrisonFrom(state, prevTroopLen);
  }

  function applyHeavenlyThreeLaserDamage(state, src) {
    if (!state || !src || src.heavenlyPhase !== "fire") return;
    for (const p of pickHeavenlyLaserTargets(state, src, 3)) {
      if (p.kind === "troop") applyTroopDamage(p.troop, HEAVENLY_TUNG_LASER_DMG);
      else if (p.kind === "building") applyBuildingDamage(state, p.b, HEAVENLY_TUNG_LASER_DMG);
      else applyTowerDamage(state, p.tw, HEAVENLY_TUNG_LASER_DMG);
    }
  }

  function updateHeavenlyTungRage(dt, state) {
    for (let i = state.troops.length - 1; i >= 0; i--) {
      const u = state.troops[i];
      if (u.type !== "heavenly_tung" || !u.heavenlyRageActive) continue;
      if (state.over) {
        state.troops.splice(i, 1);
        continue;
      }
      const t = state.time;
      const ph = u.heavenlyPhase;
      if (ph === "pause") {
        if (t - u.heavenlyPhaseStart >= HEAVENLY_TUNG_PAUSE_SEC) {
          u.heavenlyPhase = "move";
          u.heavenlyPhaseStart = t;
        }
      } else if (ph === "move") {
        const tx = u.heavenlyRallyX;
        const ty = u.heavenlyRallyY;
        const d = dist(u.x, u.y, tx, ty);
        if (d < 7) {
          u.x = tx;
          u.y = ty;
          u.heavenlyPhase = "charge";
          u.heavenlyPhaseStart = t;
        } else {
          const sp = HEAVENLY_TUNG_RALLY_MOVE_SPEED * dt;
          const n = norm(tx - u.x, ty - u.y);
          const step = Math.min(sp, d);
          u.x = clamp(u.x + n.x * step, 14, W - 14);
          u.y = clamp(u.y + n.y * step, 14, H - 14);
        }
      } else if (ph === "charge") {
        if (t - u.heavenlyPhaseStart >= HEAVENLY_TUNG_CHARGE_SEC) {
          u.heavenlyPhase = "fire";
          u.heavenlyPhaseStart = t;
          u.heavenlyLaserAcc = 0;
        }
      } else if (ph === "fire") {
        const T0 = u.heavenlyPhaseStart;
        const fireEnd = T0 + HEAVENLY_TUNG_FIRE_SEC;
        const t0 = t - dt;

        if (!heavenlyHasAnyEnemyTarget(state, u.side)) {
          triggerHeavenlyTungVictoryFinale(state, u);
          state.troops.splice(i, 1);
          continue;
        }

        const laserStart = Math.max(t0, T0);
        const laserEnd = Math.min(t, fireEnd);
        const laserDt = Math.max(0, laserEnd - laserStart);

        u.heavenlyLaserAcc = (u.heavenlyLaserAcc || 0) + laserDt;
        const step = 1 / HEAVENLY_TUNG_LASER_HZ;
        let finaledEarly = false;
        while (u.heavenlyLaserAcc >= step) {
          u.heavenlyLaserAcc -= step;
          applyHeavenlyThreeLaserDamage(state, u);
          if (!heavenlyHasAnyEnemyTarget(state, u.side)) {
            triggerHeavenlyTungVictoryFinale(state, u);
            state.troops.splice(i, 1);
            finaledEarly = true;
            break;
          }
        }
        if (finaledEarly) continue;
        if (t >= fireEnd) {
          triggerHeavenlyTungVictoryFinale(state, u);
          state.troops.splice(i, 1);
          continue;
        }
      }
    }
  }

  function spawnGoblinsFromMegaTroopDeath(state, cx, cy, side) {
    const faceY = side === "player" ? -1 : 1;
    const offs = [
      [0, -2],
      [-11, 4],
      [11, 4],
      [-7, 12],
      [7, 12],
    ];
    const start = state.troops.length;
    for (const [ox, oy] of offs) {
      const gx = cx + ox;
      const gy = cy + oy * faceY;
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "goblin",
        x: gx,
        y: gy,
        hp: GOBLIN_HP,
        maxHp: GOBLIN_HP,
        speed: SPEED_GOBLIN,
        radius: 4,
        path: "deploy",
        bridgeIx: pickBridgeIx(gx, gy),
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_SKELETON,
        hitDamage: GOBLIN_DMG,
        meleeRange: 15,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
      });
    }
    for (let i = start; i < state.troops.length; i++) {
      const t = state.troops[i];
      t.bridgeIx = pickBridgeIx(t.x, t.y);
      ensureBridgeLaneOx(t);
    }
  }

  function processMegaGoblinArmyDeathSpawns(state) {
    for (const u of state.troops) {
      if (u.type !== "mega_goblin_army" || u.hp > 0 || u.megaDeathSpawned) continue;
      u.megaDeathSpawned = true;
      spawnGoblinsFromMegaTroopDeath(state, u.x, u.y, u.side);
    }
  }

  function countSpearFromHut(state, hutId) {
    let n = 0;
    for (const u of state.troops) {
      if (u.hp > 0 && u.type === "spear_goblin" && u.spawnedByHutId === hutId) n++;
    }
    return n;
  }

  function createSpearGoblinFromHut(state, hut) {
    const dir = hut.side === "player" ? -1 : 1;
    const jitter = (Math.random() - 0.5) * 16;
    const faceY = hut.side === "player" ? -1 : 1;
    state.troops.push({
      id: `u${++state.uid}`,
      side: hut.side,
      type: "spear_goblin",
      x: hut.x + jitter,
      y: hut.y + dir * 24,
      hp: SPEAR_GOBLIN_HP,
      maxHp: SPEAR_GOBLIN_HP,
      speed: SPEAR_GOBLIN_SPEED,
      radius: 3.5,
      path: "deploy",
      bridgeIx: pickBridgeIx(hut.x + jitter, hut.y + dir * 24),
      spawnTime: state.time,
      faceX: 0,
      faceY,
      fireAt: 0,
      rangedDmg: SPEAR_GOBLIN_DMG,
      rangedRange: SPEAR_GOBLIN_RANGE,
      rangedInterval: SPEAR_GOBLIN_INTERVAL,
      attackT: 0,
      spawnedByHutId: hut.id,
      stunUntil: 0,
      combatLocked: false,
    });
    const u = state.troops[state.troops.length - 1];
    u.bridgeIx = pickBridgeIx(u.x, u.y);
    ensureBridgeLaneOx(u);
  }

  function createGoblinHutBuilding(side, x, y, state) {
    state.buildings.push({
      id: `b${++state.uid}`,
      kind: "goblin_hut",
      side,
      x,
      y,
      hp: GOBLIN_HUT_HP,
      maxHp: GOBLIN_HUT_HP,
      radius: 22,
      spawnAcc: 0,
    });
  }

  function countDrillGoblinsAlive(state, drillId) {
    let n = 0;
    for (const u of state.troops) {
      if (u.hp > 0 && u.type === "goblin" && u.spawnedByDrillId === drillId) n++;
    }
    return n;
  }

  function createMeleeGoblinFromDrill(state, drill) {
    const jitter = (Math.random() - 0.5) * 14;
    const dir = drill.side === "player" ? -1 : 1;
    const faceY = drill.side === "player" ? -1 : 1;
    state.troops.push({
      id: `u${++state.uid}`,
      side: drill.side,
      type: "goblin",
      x: drill.x + jitter,
      y: drill.y + dir * 20,
      hp: GOBLIN_HP,
      maxHp: GOBLIN_HP,
      speed: SPEED_GOBLIN,
      radius: 4,
      path: "deploy",
      bridgeIx: pickBridgeIx(drill.x + jitter, drill.y + dir * 20),
      spawnTime: state.time,
      lastMeleeAt: -999,
      hitInterval: ATTACK_INTERVAL_SKELETON,
      hitDamage: GOBLIN_DMG,
      meleeRange: 15,
      attackT: 0,
      faceX: 0,
      faceY,
      stunUntil: 0,
      combatLocked: false,
      spawnedByDrillId: drill.id,
    });
    const u = state.troops[state.troops.length - 1];
    u.bridgeIx = pickBridgeIx(u.x, u.y);
    ensureBridgeLaneOx(u);
  }

  function createGoblinDrillBuilding(side, x, y, state) {
    state.buildings.push({
      id: `b${++state.uid}`,
      kind: "goblin_drill",
      side,
      x,
      y,
      hp: GOBLIN_DRILL_HP,
      maxHp: GOBLIN_DRILL_HP,
      radius: 22,
      spawnAcc: 0,
      drillDeathSpawned: false,
    });
  }

  /** When drill HP hits 0 — small death spawn (not periodic spawns). */
  function spawnGoblinsOnDrillDeath(state, bd, count) {
    const side = bd.side;
    const faceY = side === "player" ? -1 : 1;
    const offs = [
      [-10, 8],
      [10, 8],
    ];
    const start = state.troops.length;
    const nSpawn = Math.min(count, offs.length);
    for (let i = 0; i < nSpawn; i++) {
      const [ox, oy] = offs[i];
      const sx = bd.x + ox;
      const sy = bd.y + oy * faceY;
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "goblin",
        x: sx,
        y: sy,
        hp: GOBLIN_HP,
        maxHp: GOBLIN_HP,
        speed: SPEED_GOBLIN,
        radius: 4,
        path: "deploy",
        bridgeIx: pickBridgeIx(sx, sy),
        spawnTime: state.time,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_SKELETON,
        hitDamage: GOBLIN_DMG,
        meleeRange: 15,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
      });
    }
    for (let i = start; i < state.troops.length; i++) {
      const t = state.troops[i];
      t.bridgeIx = pickBridgeIx(t.x, t.y);
      ensureBridgeLaneOx(t);
    }
  }

  /** @param {"player"|"enemy"} ownerSide Drill owner — tunnel ends on opponent's turf. */
  function startDrillDeployment(state, ownerSide, tx, ty) {
    const kt = kingTowerForSide(state, ownerSide);
    const sx = kt ? kt.x : W / 2;
    const sy = kt ? kt.y + (ownerSide === "player" ? -20 : 20) : ownerSide === "player" ? H - 90 : 90;
    state.drillDeployments.push({
      side: ownerSide,
      sx,
      sy,
      tx,
      ty,
      startAt: state.time,
      travelSec: GOBLIN_DRILL_TRAVEL_SEC,
    });
  }

  /** One tap → {@link GOBLIN_DRILL_ARMY_COUNT} burrows from king to clustered points near the placement. */
  function startDrillArmyDeployments(state, ownerSide, cx, cy) {
    const foe = drillDeployFoeSide(ownerSide);
    /** Six landing sites in a loose ring around your tap (each tunnels from king). */
    const offs = [
      [0, 0],
      [-18, -10],
      [18, -10],
      [-18, 10],
      [18, 10],
      [0, 16],
    ];
    for (let i = 0; i < offs.length && i < GOBLIN_DRILL_ARMY_COUNT; i++) {
      const [ox, oy] = offs[i];
      let tx = cx + ox;
      let ty = cy + oy;
      if (!spellInArena(tx, ty)) {
        tx = clamp(tx, 16, W - 16);
        ty = clamp(ty, 16, H - 16);
      }
      if (!canDeploy(state, foe, tx, ty)) {
        const sn = snapToDeployable(state, foe, tx, ty);
        if (!sn) continue;
        tx = sn.x;
        ty = sn.y;
      }
      startDrillDeployment(state, ownerSide, tx, ty);
    }
  }

  function updateDrillDeployments(state) {
    const arr = state.drillDeployments;
    if (!arr || !arr.length) return;
    for (let i = arr.length - 1; i >= 0; i--) {
      const d = arr[i];
      if (state.time >= d.startAt + d.travelSec) {
        createGoblinDrillBuilding(d.side, d.tx, d.ty, state);
        arr.splice(i, 1);
      }
    }
  }

  function updateGoblinDrillDecay(dt, state) {
    const buildings = state.buildings;
    if (!buildings || !buildings.length) return;
    for (const b of buildings) {
      if (b.hp <= 0 || b.kind !== "goblin_drill") continue;
      applyBuildingDamage(state, b, GOBLIN_DRILL_DECAY_PER_SEC * dt);
    }
  }

  function updateGoblinDrillSpawns(dt, state) {
    const buildings = state.buildings;
    if (!buildings || !buildings.length) return;
    for (const b of buildings) {
      if (b.hp <= 0 || b.kind !== "goblin_drill") continue;
      if (!trainingEnemyAiEnabled(state) && b.side === trainingAiSide(state)) {
        b.spawnAcc = 0;
        continue;
      }
      b.spawnAcc = (b.spawnAcc || 0) + dt;
      while (
        b.spawnAcc >= GOBLIN_DRILL_SPAWN_INTERVAL &&
        countDrillGoblinsAlive(state, b.id) < MAX_DRILL_GOBLINS
      ) {
        b.spawnAcc -= GOBLIN_DRILL_SPAWN_INTERVAL;
        createMeleeGoblinFromDrill(state, b);
      }
    }
  }

  function drillDeployFoeSide(ownerSide) {
    return ownerSide === "player" ? "enemy" : "player";
  }

  function spawnSkeletonsFromTombstoneSite(state, site, count) {
    const side = site.side;
    const faceY = side === "player" ? -1 : 1;
    const golden = 2.17;
    const start = state.troops.length;
    for (let i = 0; i < count; i++) {
      const a = i * golden;
      const r = 5 + Math.sqrt(i + 1) * 5.5;
      const ox = Math.cos(a) * r * 0.55;
      const oy = Math.sin(a) * r * 0.5 * faceY;
      const sx = site.x + ox;
      const sy = site.y + oy;
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "skeleton",
        x: sx,
        y: sy,
        hp: SKELETON_HP,
        maxHp: SKELETON_HP,
        speed: SPEED_SKELETON,
        radius: 4,
        path: "deploy",
        bridgeIx: pickBridgeIx(sx, sy),
        spawnTime: state.time,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_SKELETON,
        hitDamage: SKELETON_DMG,
        meleeRange: 15,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
      });
    }
    for (let i = start; i < state.troops.length; i++) {
      const t = state.troops[i];
      t.bridgeIx = pickBridgeIx(t.x, t.y);
      ensureBridgeLaneOx(t);
    }
  }

  function createTombstoneBuilding(side, x, y, state) {
    state.buildings.push({
      id: `b${++state.uid}`,
      kind: "tombstone",
      side,
      x,
      y,
      hp: TOMBSTONE_HP,
      maxHp: TOMBSTONE_HP,
      radius: 20,
      spawnAcc: 0,
      tombDeathSpawned: false,
    });
  }

  function updateTombstoneDecay(dt, state) {
    const buildings = state.buildings;
    if (!buildings || !buildings.length) return;
    for (const b of buildings) {
      if (b.hp <= 0 || b.kind !== "tombstone") continue;
      applyBuildingDamage(state, b, TOMBSTONE_DECAY_PER_SEC * dt);
    }
  }

  function createCannonBuilding(side, x, y, state) {
    state.buildings.push({
      id: `b${++state.uid}`,
      kind: "cannon",
      side,
      x,
      y,
      hp: CANNON_HP,
      maxHp: CANNON_HP,
      radius: 20,
      fireAt: 0,
      aggroKind: /** @type {null | "troop" | "building"} */ (null),
      aggroId: /** @type {null | string} */ (null),
      combatLocked: false,
    });
  }

  function createStatueBuilding(side, x, y, state) {
    state.buildings.push({
      id: `b${++state.uid}`,
      kind: "statue",
      side,
      x,
      y,
      hp: STATUE_HP,
      maxHp: STATUE_HP,
      radius: 18,
      statueDeathBlasted: false,
    });
  }

  function createGarrisonTowerBuilding(side, x, y, state) {
    state.buildings.push({
      id: `b${++state.uid}`,
      kind: "garrison_tower",
      side,
      x,
      y,
      hp: GARRISON_TOWER_HP,
      maxHp: GARRISON_TOWER_HP,
      radius: 22,
      garrisonTroopId: /** @type {null | string} */ (null),
    });
  }

  function createLuxuryHotelBuilding(side, x, y, state) {
    state.buildings.push({
      id: `b${++state.uid}`,
      kind: "luxury_hotel",
      side,
      x,
      y,
      hp: LUXURY_HOTEL_HP,
      maxHp: LUXURY_HOTEL_HP,
      radius: 22,
      garrisonTroopId: /** @type {null | string} */ (null),
      garrisonTroopId2: /** @type {null | string} */ (null),
    });
  }

  function createPrinceTowerBuilding(side, x, y, state) {
    state.buildings.push({
      id: `b${++state.uid}`,
      kind: "prince_tower",
      side,
      x,
      y,
      hp: PRINCE_PLACEABLE_HP,
      maxHp: PRINCE_PLACEABLE_HP,
      radius: 26,
      fireAt: 0,
      stunUntil: 0,
      aggroKind: /** @type {null | "troop" | "building"} */ (null),
      aggroId: /** @type {null | string} */ (null),
      combatLocked: false,
    });
  }

  function releaseTroopFromGarrison(state, troop, bd) {
    delete troop.garrisonBuildingId;
    clearTroopGarrisonSlots(bd, troop.id);
    troop.x = bd.x;
    troop.y = bd.y;
    troop.bridgeIx = pickBridgeIx(troop.x, troop.y);
    ensureBridgeLaneOx(troop);
    troop.path = "fight";
    clearTroopAggro(troop);
  }

  function tryPlaceTroopInGarrisonTower(state, troop) {
    if (!troop || troop.garrisonBuildingId) return false;
    const cand = (state.buildings || []).filter(
      (bd) =>
        isGarrisonLikeKind(bd.kind) &&
        bd.side === troop.side &&
        bd.hp > 0 &&
        hasOpenGarrisonSlot(bd) &&
        dist(troop.x, troop.y, bd.x, bd.y) <= bd.radius * 0.82,
    );
    if (!cand.length) return false;
    cand.sort((a, b) => dist(troop.x, troop.y, a.x, a.y) - dist(troop.x, troop.y, b.x, b.y));
    const bd = cand[0];
    troop.garrisonBuildingId = bd.id;
    troop.path = "garrison";
    troop.x = bd.x;
    troop.y = bd.y;
    assignGarrisonTroopToBuilding(bd, troop.id);
    clearTroopAggro(troop);
    return true;
  }

  function attachNewTroopsToGarrisonFrom(state, prevTroopLen) {
    for (let i = prevTroopLen; i < state.troops.length; i++) {
      tryPlaceTroopInGarrisonTower(state, state.troops[i]);
    }
  }

  function updateCannonDecay(dt, state) {
    const buildings = state.buildings;
    if (!buildings || !buildings.length) return;
    const amt = CANNON_DECAY_PER_SEC * dt;
    for (const b of buildings) {
      if (b.hp <= 0 || b.kind !== "cannon") continue;
      applyBuildingDamage(state, b, amt);
    }
  }

  function updateGarrisonTowerDecay(dt, state) {
    const buildings = state.buildings;
    if (!buildings || !buildings.length) return;
    const amt = GARRISON_TOWER_DECAY_PER_SEC * dt;
    for (const b of buildings) {
      if (b.hp <= 0 || b.kind !== "garrison_tower") continue;
      applyBuildingDamage(state, b, amt);
    }
  }

  function clearCannonAggro(b) {
    b.aggroKind = null;
    b.aggroId = null;
    b.combatLocked = false;
  }

  function tryResolveCannonAggro(b, state) {
    if (!b.aggroKind || !b.aggroId) return null;
    if (b.aggroKind === "troop") {
      const u = state.troops.find((x) => x.id === b.aggroId);
      if (!u || u.side === b.side || heavenlyTungRageActive(u) || u.hp <= 0) {
        clearCannonAggro(b);
        return null;
      }
      if (troopInsideGarrisonAlive(u, state)) {
        clearCannonAggro(b);
        return null;
      }
      return { kind: "troop", troop: u };
    }
    if (b.aggroKind === "building") {
      const bd = (state.buildings || []).find((x) => x.id === b.aggroId);
      if (!bd || bd.hp <= 0 || bd.side === b.side || bd === b) {
        clearCannonAggro(b);
        return null;
      }
      return { kind: "building", building: bd };
    }
    clearCannonAggro(b);
    return null;
  }

  function setCannonAggroFromPick(b, pick) {
    if (!pick) {
      clearCannonAggro(b);
      return;
    }
    if (pick.kind === "troop") {
      b.aggroKind = "troop";
      b.aggroId = pick.troop.id;
    } else {
      b.aggroKind = "building";
      b.aggroId = pick.building.id;
    }
  }

  function cannonTargetInEngageRange(b, ct, range) {
    if (ct.kind === "troop") return dist(b.x, b.y, ct.troop.x, ct.troop.y) <= range;
    return dist(b.x, b.y, ct.building.x, ct.building.y) <= range;
  }

  function nearestFoeForCannonAttack(b, state) {
    const range = CANNON_RANGE;
    let best = /** @type {{ kind: "troop"; troop: (typeof state.troops)[0] } | { kind: "building"; building: (typeof state.buildings)[0] } | null} */ (
      null
    );
    let bestD = Infinity;
    for (const u of state.troops) {
      if (u.side === b.side) continue;
      if (heavenlyTungRageActive(u)) continue;
      if (u.hp <= 0) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (u.flying) continue;
      const d = dist(b.x, b.y, u.x, u.y);
      if (d <= range && d < bestD) {
        bestD = d;
        best = { kind: "troop", troop: u };
      }
    }
    for (const bd of state.buildings || []) {
      if (bd === b || bd.hp <= 0 || bd.side === b.side) continue;
      const d = dist(b.x, b.y, bd.x, bd.y);
      if (d <= range && d < bestD) {
        bestD = d;
        best = { kind: "building", building: bd };
      }
    }
    return best;
  }

  function cannonBuildingShoot(state, b, now) {
    if (b.kind !== "cannon" || b.hp <= 0 || state.over) return;
    const range = CANNON_RANGE;
    const cd = CANNON_FIRE_INTERVAL;
    if (now < b.fireAt) return;

    let ct = null;
    if (b.combatLocked) {
      const locked = tryResolveCannonAggro(b, state);
      if (locked && cannonTargetInEngageRange(b, locked, range)) {
        ct = locked;
      } else {
        clearCannonAggro(b);
      }
    }
    if (!ct) ct = nearestFoeForCannonAttack(b, state);
    if (!ct) {
      clearCannonAggro(b);
      return;
    }
    setCannonAggroFromPick(b, ct);
    b.combatLocked = true;

    let tx;
    let ty;
    /** @type {"troop" | "building"} */
    let targetKind;
    let targetId;
    if (ct.kind === "troop") {
      tx = ct.troop.x;
      ty = ct.troop.y;
      targetKind = "troop";
      targetId = ct.troop.id;
    } else {
      tx = ct.building.x;
      ty = ct.building.y;
      targetKind = "building";
      targetId = ct.building.id;
    }

    b.fireAt = now + cd;
    const n = norm(tx - b.x, ty - b.y);
    const yOff = b.side === "enemy" ? 6 : -6;
    state.projectiles.push({
      x: b.x,
      y: b.y + yOff,
      vx: n.x * PROJ_SPEED,
      vy: n.y * PROJ_SPEED,
      dmg: CANNON_SHOT_DMG,
      fromSide: b.side,
      hitsTowers: true,
      projKind: "cannon_ball",
      projRadius: 5,
      homing: true,
      targetKind,
      targetId,
    });
  }

  function updateTombstoneSkeletonSpawns(dt, state) {
    const buildings = state.buildings;
    if (!buildings || !buildings.length) return;
    for (const b of buildings) {
      if (b.hp <= 0 || b.kind !== "tombstone") continue;
      if (!trainingEnemyAiEnabled(state) && b.side === trainingAiSide(state)) {
        b.spawnAcc = 0;
        continue;
      }
      b.spawnAcc = (b.spawnAcc || 0) + dt;
      while (b.spawnAcc >= TOMBSTONE_SKEL_INTERVAL_SEC) {
        b.spawnAcc -= TOMBSTONE_SKEL_INTERVAL_SEC;
        spawnSkeletonsFromTombstoneSite(state, b, TOMBSTONE_SKELS_EACH_SPAWN);
      }
    }
  }

  /** True if any enemy troop, building, or targetable tower intersects the hut’s trigger disk. */
  function foeInGoblinHutRange(hut, state) {
    const R = HUT_TRIGGER_RADIUS;
    for (const u of state.troops) {
      if (u.side === hut.side) continue;
      if (u.type === "assassin") continue;
      if (u.hp <= 0 && !heavenlyTungRageActive(u)) continue;
      if (dist(hut.x, hut.y, u.x, u.y) <= R) return true;
    }
    for (const o of state.buildings || []) {
      if (o === hut || o.hp <= 0 || o.side === hut.side) continue;
      if (dist(hut.x, hut.y, o.x, o.y) <= R + o.radius * 0.35) return true;
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === hut.side) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 36 : 30;
      if (dist(hut.x, hut.y, tw.x, tw.y) <= R + ext) return true;
    }
    return false;
  }

  function updateGoblinHutDecay(dt, state) {
    const buildings = state.buildings;
    if (!buildings || !buildings.length) return;
    const amt = GOBLIN_HUT_DECAY_PER_SEC * dt;
    for (const b of buildings) {
      if (b.hp <= 0 || b.kind !== "goblin_hut") continue;
      applyBuildingDamage(state, b, amt);
    }
  }

  function updateHutSpawns(dt, state) {
    const buildings = state.buildings;
    if (!buildings || !buildings.length) return;
    for (const b of buildings) {
      if (b.hp <= 0 || b.kind !== "goblin_hut") continue;
      if (!trainingEnemyAiEnabled(state) && b.side === trainingAiSide(state)) {
        b.spawnAcc = 0;
        continue;
      }
      if (!foeInGoblinHutRange(b, state)) {
        b.spawnAcc = 0;
        continue;
      }
      b.spawnAcc += dt;
      while (b.spawnAcc >= HUT_SPAWN_INTERVAL && countSpearFromHut(state, b.id) < MAX_SPEAR_PER_HUT) {
        b.spawnAcc -= HUT_SPAWN_INTERVAL;
        createSpearGoblinFromHut(state, b);
      }
    }
  }

  /** Spear (“dart”) goblins while a foe is in range — same cadence/cap as Goblin Hut; ring follows the unit. */
  function updateMegaGoblinArmyHutSpawns(dt, state) {
    for (const u of state.troops) {
      if (u.hp <= 0 || u.type !== "mega_goblin_army") continue;
      if (!trainingEnemyAiEnabled(state) && u.side === trainingAiSide(state)) {
        u.spawnAcc = 0;
        continue;
      }
      if (!foeInGoblinHutRange(u, state)) {
        u.spawnAcc = 0;
        continue;
      }
      u.spawnAcc = (u.spawnAcc || 0) + dt;
      while (u.spawnAcc >= MEGA_GOBLIN_ARMY_SPEAR_INTERVAL && countSpearFromHut(state, u.id) < MAX_SPEAR_PER_HUT) {
        u.spawnAcc -= MEGA_GOBLIN_ARMY_SPEAR_INTERVAL;
        createSpearGoblinFromHut(state, u);
      }
    }
  }

  /** @type {string[] | null} */
  let runtimePlayerDeck = null;

  function validateDeckForGame(deck) {
    if (!deck || !Array.isArray(deck) || deck.length !== 8) return false;
    const allowed = new Set(ALL_CARD_IDS);
    const seen = new Set();
    for (const c of deck) {
      const cid = typeof c === "string" && c === "builder" ? "build" : c;
      if (typeof cid !== "string" || !allowed.has(cid) || seen.has(cid)) return false;
      seen.add(cid);
    }
    return true;
  }

  /** Map retired card ids saved in older decks onto current ids. */
  function normalizeDeckCardIds(deck) {
    if (!deck || !Array.isArray(deck)) return [];
    return deck.map((c) =>
      typeof c === "string" && c === "builder" ? "build" : c,
    );
  }

  function shuffleDeckFrom(sourceIds) {
    const d = sourceIds.slice();
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = d[i];
      d[i] = d[j];
      d[j] = t;
    }
    return d;
  }

  function evoCardEligible(cardId) {
    return cardId === "bomber" || cardId === "chud" || cardId === "tung_tung_tung_sahur";
  }

  function cardEvoEnabledForSide(state, side, cardId) {
    if (!state || !side || !evoCardEligible(cardId)) return false;
    const evo = state.evoSlotBySide;
    if (!evo) return false;
    return evo[side] === cardId;
  }

  function troopRageMultiplier(troop, now) {
    return troop.rageUntil != null && now < troop.rageUntil ? RAGE_MOVE_ATK_MUL : 1;
  }

  function meleeCooldownReady(troop, now) {
    const rageM = troopRageMultiplier(troop, now);
    const hitMul = (troop.type === "bir_patapin" ? (troop.patapinAttackMul || 1) : 1) * rageM;
    const hitInterval = troop.hitInterval / hitMul;
    if (isFastMeleeSwarmType(troop)) {
      return now - troop.lastMeleeAt >= hitInterval;
    }
    if (!troop.hasHitOnce) {
      return now - troop.spawnTime >= (troop.firstHitDelay ?? MELEE_FIRST_HIT_DELAY);
    }
    return now - troop.lastMeleeAt >= hitInterval;
  }

  function createTroop(side, type, x, y, state) {
    const start = state.troops.length;
    const faceY = side === "player" ? -1 : 1;
    if (type === "mini_pekka") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "mini_pekka",
        x,
        y,
        hp: MINI_HP,
        maxHp: MINI_HP,
        speed: SPEED_MINI_PEKKA,
        radius: 9,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        hasHitOnce: false,
        firstHitDelay: MELEE_FIRST_HIT_DELAY,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_MINI_PEKKA,
        hitDamage: MINI_DMG,
        meleeRange: 18,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
      });
    } else if (type === "assassin") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "assassin",
        x,
        y,
        hp: KNIGHT_HP,
        maxHp: KNIGHT_HP,
        speed: SPEED_MINI_PEKKA,
        radius: 9,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        hasHitOnce: false,
        firstHitDelay: MELEE_FIRST_HIT_DELAY,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_MINI_PEKKA,
        hitDamage: MINI_DMG,
        meleeRange: 18,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
        assassinWindupSec: 0,
        assassinCharging: false,
      });
      grantTroopBuffShield(state.troops[state.troops.length - 1]);
    } else if (type === "knight") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "knight",
        x,
        y,
        hp: KNIGHT_HP,
        maxHp: KNIGHT_HP,
        speed: SPEED_KNIGHT,
        radius: 9,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        hasHitOnce: false,
        firstHitDelay: MELEE_FIRST_HIT_DELAY,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_KNIGHT,
        hitDamage: KNIGHT_DMG,
        meleeRange: 26,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
      });
    } else if (type === "tung_tung_tung_sahur") {
      const idx = state.tungCycleIdx[side];
      const cycleReady = idx >= TUNG_EVO_REQUIRED_CYCLES;
      const isEvo = cardEvoEnabledForSide(state, side, "tung_tung_tung_sahur") && cycleReady;
      state.tungCycleIdx[side] = cycleReady ? 0 : idx + 1;
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "tung_tung_tung_sahur",
        x,
        y,
        hp: TUNG_SAHUR_HP,
        maxHp: TUNG_SAHUR_HP,
        speed: SPEED_TUNG_SAHUR,
        radius: 14,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        hasHitOnce: false,
        firstHitDelay: MELEE_FIRST_HIT_DELAY,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_TUNG_SAHUR,
        hitDamage: TUNG_SAHUR_DMG,
        meleeRange: 30,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
        tungEvo: isEvo,
        tungMini: false,
        tungMiniSpawned: false,
      });
    } else if (type === "heavenly_tung") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "heavenly_tung",
        x,
        y,
        hp: TUNG_SAHUR_HP,
        maxHp: TUNG_SAHUR_HP,
        speed: SPEED_TUNG_SAHUR,
        radius: 14,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        hasHitOnce: false,
        firstHitDelay: MELEE_FIRST_HIT_DELAY,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_TUNG_SAHUR,
        hitDamage: TUNG_SAHUR_DMG,
        meleeRange: 30,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
        heavenlyRageActive: false,
        heavenlyPhase: /** @type {"pause" | "move" | "charge" | "fire" | null} */ (null),
        heavenlyPhaseStart: 0,
        heavenlyRallyX: 0,
        heavenlyRallyY: 0,
        heavenlyLaserAcc: 0,
      });
    } else if (type === "mega_knight") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "mega_knight",
        x,
        y,
        hp: MEGA_KNIGHT_HP,
        maxHp: MEGA_KNIGHT_HP,
        speed: SPEED_MEGA_KNIGHT,
        radius: 11,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        hasHitOnce: false,
        firstHitDelay: MELEE_FIRST_HIT_DELAY,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_MEGA_KNIGHT,
        hitDamage: KNIGHT_DMG,
        meleeRange: 30,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
        mkJumpPhase: 0,
        mkWindupT: 0,
        mkJumpT: 0,
        mkJumpSX: 0,
        mkJumpSY: 0,
        mkJumpTX: 0,
        mkJumpTY: 0,
      });
    } else if (type === "wizard") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "wizard",
        x,
        y,
        hp: WIZARD_HP,
        maxHp: WIZARD_HP,
        speed: SPEED_WIZARD,
        radius: 7,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        faceX: 0,
        faceY,
        fireAt: 0,
        rangedDmg: WIZARD_DMG,
        rangedRange: WIZARD_RANGE,
        rangedInterval: ATTACK_INTERVAL_WIZARD,
        attackT: 0,
        stunUntil: 0,
        combatLocked: false,
      });
    } else if (type === "electro_wizard") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "electro_wizard",
        x,
        y,
        hp: ELECTRO_WIZARD_HP,
        maxHp: ELECTRO_WIZARD_HP,
        speed: SPEED_WIZARD,
        radius: 7,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        faceX: 0,
        faceY,
        fireAt: 0,
        rangedDmg: ELECTRO_WIZARD_DMG,
        rangedRange: ELECTRO_WIZARD_RANGE,
        rangedInterval: ELECTRO_WIZARD_ATTACK_SEC,
        attackT: 0,
        stunUntil: 0,
        combatLocked: false,
      });
      applyElectroWizardSpawnPulse(x, y, side, state);
    } else if (type === "witch") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "witch",
        x,
        y,
        hp: WITCH_HP,
        maxHp: WITCH_HP,
        speed: SPEED_WITCH,
        radius: 7,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        faceX: 0,
        faceY,
        fireAt: 0,
        rangedDmg: WITCH_SHOT_DMG,
        rangedRange: WITCH_RANGE,
        rangedInterval: ATTACK_INTERVAL_WITCH,
        attackT: 0,
        stunUntil: 0,
        combatLocked: false,
        witchSpawnAcc: 0,
      });
    } else if (type === "musketeer") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "musketeer",
        x,
        y,
        hp: MUSKETEER_HP,
        maxHp: MUSKETEER_HP,
        speed: SPEED_MUSKETEER,
        radius: 7,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        faceX: 0,
        faceY,
        fireAt: 0,
        rangedDmg: MUSKETEER_SHOT_DMG,
        rangedRange: MUSKETEER_RANGE,
        rangedInterval: ATTACK_INTERVAL_MUSKETEER,
        attackT: 0,
        stunUntil: 0,
        combatLocked: false,
      });
    } else if (type === "chud") {
      const trainAlwaysEvo =
        state.matchMode === "training" && state.testing && state.testing.chudAlwaysEvo;
      const idx = state.chudCycleIdx[side];
      const cycleReady = idx % 2 === 1;
      const isEvo = trainAlwaysEvo
        ? true
        : cardEvoEnabledForSide(state, side, "chud") && cycleReady;
      state.chudCycleIdx[side] = idx + 1;
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "chud",
        x,
        y,
        hp: CHUD_HP,
        maxHp: CHUD_HP,
        speed: SPEED_CHUD,
        radius: CHUD_RADIUS,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        hasHitOnce: false,
        firstHitDelay: MELEE_FIRST_HIT_DELAY,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_CHUD,
        hitDamage: CHUD_DMG,
        meleeRange: CHUD_MELEE_RANGE,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
        chudEvo: isEvo,
        chudEvoPulseAcc: 0,
      });
    } else if (type === "mega_goblin_army") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "mega_goblin_army",
        x,
        y,
        hp: MEGA_GOBLIN_ARMY_HP,
        maxHp: MEGA_GOBLIN_ARMY_HP,
        speed: SPEED_CHUD,
        radius: CHUD_RADIUS,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        hasHitOnce: false,
        firstHitDelay: MELEE_FIRST_HIT_DELAY,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_CHUD,
        hitDamage: CHUD_DMG,
        meleeRange: CHUD_MELEE_RANGE,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
        megaDeathSpawned: false,
        spawnAcc: 0,
      });
    } else if (type === "archers") {
      const quad = [
        [-15, -5],
        [15, -5],
        [-15, 6],
        [15, 6],
      ];
      for (const [ox, oy] of quad) {
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "archer",
          x: x + ox,
          y: y + oy,
          hp: ARCHER_HP,
          maxHp: ARCHER_HP,
          speed: SPEED_ARCHER,
          radius: 3.5,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          spawnTime: state.time,
          faceX: 0,
          faceY,
          fireAt: 0,
          rangedDmg: ARCHER_SHOT_DMG,
          rangedRange: ARCHER_RANGE,
          rangedInterval: ATTACK_INTERVAL_ARCHER,
          attackT: 0,
          stunUntil: 0,
          combatLocked: false,
        });
      }
    } else if (type === "bats") {
      const golden = 2.17;
      for (let i = 0; i < BAT_COUNT; i++) {
        const a = i * golden;
        const r = 3.5 + Math.sqrt(i + 1) * 4.5;
        const ox = Math.cos(a) * r * 0.75;
        const oy = Math.sin(a) * r * 0.55;
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "bat",
          x: x + ox,
          y: y + oy,
          hp: BAT_HP,
          maxHp: BAT_HP,
          speed: SPEED_BAT,
          radius: 3.2,
          path: "fight",
          flying: true,
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          spawnTime: state.time,
          lastMeleeAt: -999,
          hitInterval: ATTACK_INTERVAL_SKELETON,
          hitDamage: BAT_DMG,
          meleeRange: BAT_MELEE_RANGE,
          attackT: 0,
          faceX: 0,
          faceY,
          stunUntil: 0,
          combatLocked: false,
        });
      }
      const startBat = state.troops.length - BAT_COUNT;
      for (let i = startBat; i < state.troops.length; i++) {
        const t = state.troops[i];
        t.bridgeIx = pickBridgeIx(t.x, t.y);
        ensureBridgeLaneOx(t);
      }
    } else if (type === "boberdino_crocodelo") {
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "boberdino_crocodelo",
        x,
        y,
        hp: BOBERDINO_HP,
        maxHp: BOBERDINO_HP,
        speed: BOBERDINO_SPEED,
        radius: 14,
        path: "fight",
        flying: true,
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
        boberBombAcc: BOBERDINO_BOMB_INTERVAL_SEC * 0.35,
        boberPhase: 0,
      });
    } else if (type === "spear_goblins") {
      const trio = [
        [-12, -2],
        [0, 6],
        [12, -2],
      ];
      for (const [ox, oy] of trio) {
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "spear_goblin",
          x: x + ox,
          y: y + oy,
          hp: SPEAR_GOBLIN_HP,
          maxHp: SPEAR_GOBLIN_HP,
          speed: SPEAR_GOBLIN_SPEED,
          radius: 3.5,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          spawnTime: state.time,
          faceX: 0,
          faceY,
          fireAt: 0,
          rangedDmg: SPEAR_GOBLIN_DMG,
          rangedRange: SPEAR_GOBLIN_RANGE,
          rangedInterval: SPEAR_GOBLIN_INTERVAL,
          attackT: 0,
          stunUntil: 0,
          combatLocked: false,
        });
      }
    } else if (type === "goblin_gang") {
      const spearOffs = [
        [-13, -5],
        [13, -5],
        [0, -11],
        [0, 1],
      ];
      for (const [ox, oy] of spearOffs) {
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "spear_goblin",
          x: x + ox,
          y: y + oy,
          hp: SPEAR_GOBLIN_HP,
          maxHp: SPEAR_GOBLIN_HP,
          speed: SPEAR_GOBLIN_SPEED,
          radius: 3.5,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          spawnTime: state.time,
          faceX: 0,
          faceY,
          fireAt: 0,
          rangedDmg: SPEAR_GOBLIN_DMG,
          rangedRange: SPEAR_GOBLIN_RANGE,
          rangedInterval: SPEAR_GOBLIN_INTERVAL,
          attackT: 0,
          stunUntil: 0,
          combatLocked: false,
        });
      }
      const gobOffs = [
        [-10, 9],
        [10, 9],
        [-6, 15],
        [6, 15],
      ];
      for (const [ox, oy] of gobOffs) {
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "goblin",
          x: x + ox,
          y: y + oy,
          hp: GOBLIN_HP,
          maxHp: GOBLIN_HP,
          speed: SPEED_GOBLIN,
          radius: 4,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          lastMeleeAt: -999,
          hitInterval: ATTACK_INTERVAL_SKELETON,
          hitDamage: GOBLIN_DMG,
          meleeRange: 15,
          attackT: 0,
          faceX: 0,
          faceY,
          stunUntil: 0,
          combatLocked: false,
        });
      }
    } else if (type === "skarmy") {
      for (let i = 0; i < SKARMY_SPAWN_COUNT; i++) {
        const a = i * 1.37;
        const r = 2.5 + i * 1.15;
        const ox = Math.cos(a) * r * 0.85;
        const oy = Math.sin(a) * r * 0.65;
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "skeleton",
          x: x + ox,
          y: y + oy,
          hp: SKELETON_HP,
          maxHp: SKELETON_HP,
          speed: SPEED_SKELETON,
          radius: 4,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          lastMeleeAt: -999,
          hitInterval: ATTACK_INTERVAL_SKELETON,
          hitDamage: SKELETON_DMG,
          meleeRange: 15,
          attackT: 0,
          faceX: 0,
          faceY,
          stunUntil: 0,
          combatLocked: false,
        });
      }
    } else if (type === "archers_army") {
      for (let i = 0; i < SKARMY_SPAWN_COUNT; i++) {
        const a = i * 1.37;
        const r = 2.5 + i * 1.15;
        const ox = Math.cos(a) * r * 0.85;
        const oy = Math.sin(a) * r * 0.65;
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "archer",
          x: x + ox,
          y: y + oy,
          hp: ARCHER_HP,
          maxHp: ARCHER_HP,
          speed: SPEED_ARCHER,
          radius: 3.5,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          spawnTime: state.time,
          faceX: 0,
          faceY,
          fireAt: 0,
          rangedDmg: ARCHER_SHOT_DMG,
          rangedRange: ARCHER_RANGE,
          rangedInterval: ATTACK_INTERVAL_ARCHER,
          attackT: 0,
          stunUntil: 0,
          combatLocked: false,
        });
      }
    } else if (type === "bat_army") {
      for (let i = 0; i < SKARMY_SPAWN_COUNT; i++) {
        const a = i * 1.37;
        const r = 2.5 + i * 1.15;
        const ox = Math.cos(a) * r * 0.85;
        const oy = Math.sin(a) * r * 0.65;
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "bat",
          x: x + ox,
          y: y + oy,
          hp: BAT_HP,
          maxHp: BAT_HP,
          speed: SPEED_BAT,
          radius: 3.2,
          path: "fight",
          flying: true,
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          spawnTime: state.time,
          lastMeleeAt: -999,
          hitInterval: ATTACK_INTERVAL_SKELETON,
          hitDamage: BAT_DMG,
          meleeRange: BAT_MELEE_RANGE,
          attackT: 0,
          faceX: 0,
          faceY,
          stunUntil: 0,
          combatLocked: false,
        });
      }
      const startBat = state.troops.length - SKARMY_SPAWN_COUNT;
      for (let i = startBat; i < state.troops.length; i++) {
        const t = state.troops[i];
        t.bridgeIx = pickBridgeIx(t.x, t.y);
        ensureBridgeLaneOx(t);
      }
    } else if (type === "mega_knight_army") {
      for (let i = 0; i < SKARMY_SPAWN_COUNT; i++) {
        const a = i * 1.37;
        const r = 2.5 + i * 1.15;
        const ox = Math.cos(a) * r * 0.85;
        const oy = Math.sin(a) * r * 0.65;
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "mega_knight",
          x: x + ox,
          y: y + oy,
          hp: MEGA_KNIGHT_HP,
          maxHp: MEGA_KNIGHT_HP,
          speed: SPEED_MEGA_KNIGHT,
          radius: 11,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          spawnTime: state.time,
          hasHitOnce: false,
          firstHitDelay: MELEE_FIRST_HIT_DELAY,
          lastMeleeAt: -999,
          hitInterval: ATTACK_INTERVAL_MEGA_KNIGHT,
          hitDamage: KNIGHT_DMG,
          meleeRange: 30,
          attackT: 0,
          faceX: 0,
          faceY,
          stunUntil: 0,
          combatLocked: false,
          mkJumpPhase: 0,
          mkWindupT: 0,
          mkJumpT: 0,
          mkJumpSX: 0,
          mkJumpSY: 0,
          mkJumpTX: 0,
          mkJumpTY: 0,
        });
      }
    } else if (type === "mega_army") {
      const golden = 2.39996322972865332;
      for (let i = 0; i < MEGA_ARMY_GUARD_COUNT; i++) {
        const a = i * golden;
        const r = 3.35 * Math.sqrt(i + 1);
        const ox = Math.cos(a) * r * 0.88;
        const oy = Math.sin(a) * r * 0.72;
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "skeleton_guard",
          x: x + ox,
          y: y + oy,
          hp: SKELETON_HP,
          maxHp: SKELETON_HP,
          shieldHp: SKELETON_GUARD_SHIELD_HP,
          shieldMax: SKELETON_GUARD_SHIELD_HP,
          speed: SPEED_SKELETON,
          radius: 4,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          lastMeleeAt: -999,
          hitInterval: ATTACK_INTERVAL_SKELETON,
          hitDamage: SKELETON_DMG,
          meleeRange: 15,
          attackT: 0,
          faceX: 0,
          faceY,
          stunUntil: 0,
          combatLocked: false,
        });
      }
      for (let i = 0; i < MEGA_ARMY_SKELETON_COUNT; i++) {
        const a = (i + 0.37) * golden;
        const r = 2.05 * Math.sqrt(i + 1);
        const ox = Math.cos(a) * r * 0.88;
        const oy = Math.sin(a) * r * 0.72;
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "skeleton",
          x: x + ox,
          y: y + oy,
          hp: SKELETON_HP,
          maxHp: SKELETON_HP,
          speed: SPEED_SKELETON,
          radius: 4,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          lastMeleeAt: -999,
          hitInterval: ATTACK_INTERVAL_SKELETON,
          hitDamage: SKELETON_DMG,
          meleeRange: 15,
          attackT: 0,
          faceX: 0,
          faceY,
          stunUntil: 0,
          combatLocked: false,
        });
      }
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "witch",
        x,
        y: y + faceY * 6,
        hp: WITCH_HP,
        maxHp: WITCH_HP,
        speed: SPEED_WITCH,
        radius: 7,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y + faceY * 6),
        spawnTime: state.time,
        faceX: 0,
        faceY,
        fireAt: 0,
        rangedDmg: WITCH_SHOT_DMG,
        rangedRange: WITCH_RANGE,
        rangedInterval: ATTACK_INTERVAL_WITCH,
        attackT: 0,
        stunUntil: 0,
        combatLocked: false,
        witchSpawnAcc: 0,
      });
    } else if (type === "goblins") {
      const offs = [
        [0, 0],
        [-8, 6],
        [8, 6],
      ];
      for (const [ox, oy] of offs) {
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "goblin",
          x: x + ox,
          y: y + oy,
          hp: GOBLIN_HP,
          maxHp: GOBLIN_HP,
          speed: SPEED_GOBLIN,
          radius: 4,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          lastMeleeAt: -999,
          hitInterval: ATTACK_INTERVAL_SKELETON,
          hitDamage: GOBLIN_DMG,
          meleeRange: 15,
          attackT: 0,
          faceX: 0,
          faceY,
          stunUntil: 0,
          combatLocked: false,
        });
      }
    } else if (type === "skeleton") {
      const offs = [
        [0, 0],
        [-8, 6],
        [8, 6],
      ];
      for (const [ox, oy] of offs) {
        state.troops.push({
          id: `u${++state.uid}`,
          side,
          type: "skeleton",
          x: x + ox,
          y: y + oy,
          hp: SKELETON_HP,
          maxHp: SKELETON_HP,
          speed: SPEED_SKELETON,
          radius: 4,
          path: "deploy",
          bridgeIx: pickBridgeIx(x + ox, y + oy),
          lastMeleeAt: -999,
          hitInterval: ATTACK_INTERVAL_SKELETON,
          hitDamage: SKELETON_DMG,
          meleeRange: 15,
          attackT: 0,
          faceX: 0,
          faceY,
          stunUntil: 0,
          combatLocked: false,
        });
      }
    } else if (type === "bomber") {
      const trainAlwaysEvo =
        state.matchMode === "training" && state.testing && state.testing.bomberAlwaysEvo;
      const idx = state.bomberCycleIdx[side];
      const cycleReady = idx % 2 === 1;
      const isEvo = trainAlwaysEvo
        ? true
        : cardEvoEnabledForSide(state, side, "bomber") && cycleReady;
      state.bomberCycleIdx[side] = idx + 1;
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "bomber",
        x,
        y,
        hp: BOMBER_HP,
        maxHp: BOMBER_HP,
        speed: SPEED_BOMBER,
        radius: 4,
        path: "deploy",
        bridgeIx: pickBridgeIx(x, y),
        spawnTime: state.time,
        faceX: 0,
        faceY,
        fireAt: 0,
        rangedDmg: BOMBER_SPLASH_DMG,
        rangedRange: BOMBER_RANGE,
        rangedInterval: isEvo ? ATTACK_INTERVAL_BOMBER_EVO : ATTACK_INTERVAL_BOMBER,
        attackT: 0,
        stunUntil: 0,
        combatLocked: false,
        bomberEvo: isEvo,
      });
    }
    for (let i = start; i < state.troops.length; i++) {
      const t = state.troops[i];
      t.bridgeIx = pickBridgeIx(t.x, t.y);
      ensureBridgeLaneOx(t);
    }
  }

  /** Three melee goblins in standard triangle layout (matches {@link createTroop} <code>"goblins"</code>). */
  function spawnThreeMeleeGoblinsAt(state, side, cx, cy) {
    const faceY = side === "player" ? -1 : 1;
    const start = state.troops.length;
    const offs = [
      [0, 0],
      [-8, 6],
      [8, 6],
    ];
    for (const [ox, oy] of offs) {
      const px = cx + ox;
      const py = cy + oy;
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "goblin",
        x: px,
        y: py,
        hp: GOBLIN_HP,
        maxHp: GOBLIN_HP,
        speed: SPEED_GOBLIN,
        radius: 4,
        path: "deploy",
        bridgeIx: pickBridgeIx(px, py),
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_SKELETON,
        hitDamage: GOBLIN_DMG,
        meleeRange: 15,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
      });
    }
    for (let i = start; i < state.troops.length; i++) {
      const t = state.troops[i];
      t.bridgeIx = pickBridgeIx(t.x, t.y);
      ensureBridgeLaneOx(t);
    }
  }

  function createBirPatapinSquad(side, x, y, state) {
    const squadId = `bp_${side}_${state.time.toFixed(3)}_${((Math.random() * 1e9) | 0)}`;
    const faceY = side === "player" ? -1 : 1;
    const offs = [
      [-10, -4],
      [10, -4],
      [-18, 10],
      [18, 10],
    ];
    const start = state.troops.length;
    for (const [ox, oy] of offs) {
      const px = x + ox;
      const py = y + oy * faceY;
      state.troops.push({
        id: `u${++state.uid}`,
        side,
        type: "bir_patapin",
        x: px,
        y: py,
        hp: BIR_PATAPIN_HP,
        maxHp: BIR_PATAPIN_HP,
        speed: SPEED_BIR_PATAPIN,
        radius: 8,
        path: "deploy",
        bridgeIx: pickBridgeIx(px, py),
        spawnTime: state.time,
        hasHitOnce: false,
        firstHitDelay: MELEE_FIRST_HIT_DELAY,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_BIR_PATAPIN,
        hitDamage: BIR_PATAPIN_DMG,
        meleeRange: 20,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
        patapinSquad: squadId,
        patapinGhost: false,
      });
    }
    for (let i = start; i < state.troops.length; i++) {
      const t = state.troops[i];
      t.bridgeIx = pickBridgeIx(t.x, t.y);
      ensureBridgeLaneOx(t);
    }
  }

  function deployAnchor(troop) {
    ensureBridgeLaneOx(troop);
    const b = BRIDGES[troop.bridgeIx ?? 0];
    const mx = bridgeMouthX(troop, b);
    if (troop.side === "player") {
      return { x: mx, y: RIVER_BOT + 28 };
    }
    return { x: mx, y: RIVER_TOP - 28 };
  }

  function updateBoberdinoFlight(dt, troop, state) {
    if (!troopActsOnBattlefield(troop)) return;
    if (troop.garrisonBuildingId) {
      const bd = (state.buildings || []).find((b) => b.id === troop.garrisonBuildingId);
      if (!bd || bd.hp <= 0 || !isGarrisonLikeKind(bd.kind)) {
        delete troop.garrisonBuildingId;
        if (bd) clearTroopGarrisonSlots(bd, troop.id);
        troop.bridgeIx = pickBridgeIx(troop.x, troop.y);
        ensureBridgeLaneOx(troop);
      } else return;
    }
    if (troopStunned(troop, state.time)) return;

    const ct = resolveCombatPick(troop, state);
    let tx = null;
    let ty = null;
    if (ct && ct.kind === "tower" && ct.tower.hp > 0) {
      tx = ct.tower.x;
      ty = ct.tower.y;
    }
    const rageM = troopRageMultiplier(troop, state.time);
    const step = troop.speed * rageM * dt;
    if (tx != null && ty != null) {
      const d = dist(troop.x, troop.y, tx, ty);
      if (d > BOBERDINO_HOVER_DIST) {
        const n = norm(tx - troop.x, ty - troop.y);
        troop.x += n.x * step;
        troop.y += n.y * step;
        troop.boberPhase = 0;
      } else {
        troop.boberPhase = (troop.boberPhase || 0) + dt * 2.6;
        const w = 4.5;
        troop.x = tx + Math.sin(troop.boberPhase) * w;
        troop.y = ty + Math.cos(troop.boberPhase * 1.07) * w * 0.72;
      }
    }

    troop.boberBombAcc = (troop.boberBombAcc || 0) + dt;
    while (troop.boberBombAcc >= BOBERDINO_BOMB_INTERVAL_SEC) {
      troop.boberBombAcc -= BOBERDINO_BOMB_INTERVAL_SEC;
      const bx = troop.x;
      const by = troop.y + BOBERDINO_BOMB_DROP_OFFSET_Y;
      applyBoberdinoBombStrike(bx, by, troop.side, state);
    }
  }

  function updateTroopNavAndMove(dt, troop, state) {
    if (!troopActsOnBattlefield(troop)) return;
    if (heavenlyTungRageActive(troop)) return;
    if (troop.garrisonBuildingId) {
      const bd = (state.buildings || []).find((b) => b.id === troop.garrisonBuildingId);
      if (!bd || bd.hp <= 0 || !isGarrisonLikeKind(bd.kind)) {
        delete troop.garrisonBuildingId;
        if (bd) clearTroopGarrisonSlots(bd, troop.id);
        troop.bridgeIx = pickBridgeIx(troop.x, troop.y);
        ensureBridgeLaneOx(troop);
        if (troop.path === "garrison") troop.path = "fight";
      } else {
        if (bd.kind === "luxury_hotel" && bd.garrisonTroopId && bd.garrisonTroopId2) {
          troop.x = bd.x + (troop.id === bd.garrisonTroopId ? -11 : 11);
          troop.y = bd.y;
        } else {
          troop.x = bd.x;
          troop.y = bd.y;
        }
        return;
      }
    }
    if (troopStunned(troop, state.time)) return;
    if (troop.flying && troop.type === "boberdino_crocodelo") {
      updateBoberdinoFlight(dt, troop, state);
      return;
    }
    if (troop.flying) {
      const speedMul = troop.type === "bir_patapin" ? (troop.patapinSpeedMul || 1) : 1;
      const rageM = troopRageMultiplier(troop, state.time);
      const step = troop.speed * speedMul * rageM * dt;
      const ct = resolveCombatPick(troop, state);
      let tx = null;
      let ty = null;
      if (ct) {
        if (ct.kind === "troop" && ct.troop.hp > 0 && !heavenlyTungRageActive(ct.troop)) {
          tx = ct.troop.x;
          ty = ct.troop.y;
        } else if (ct.kind === "tower" && ct.tower.hp > 0) {
          tx = ct.tower.x;
          ty = ct.tower.y;
        } else if (ct.kind === "building" && ct.building.hp > 0) {
          tx = ct.building.x;
          ty = ct.building.y;
        }
      }
      if (tx != null && ty != null) {
        const n = norm(tx - troop.x, ty - troop.y);
        troop.x += n.x * step;
        troop.y += n.y * step;
      }
      return;
    }
    if (troop.type === "mega_knight" && troop.mkJumpPhase) return;
    const speedMul = troop.type === "bir_patapin" ? (troop.patapinSpeedMul || 1) : 1;
    const rageM = troopRageMultiplier(troop, state.time);
    const chargeMul =
      troop.type === "assassin" && troop.assassinCharging ? ASSASSIN_CHARGE_SPEED_MUL : 1;
    const step = troop.speed * speedMul * rageM * dt * chargeMul;
    const ct = resolveCombatPick(troop, state);
    let tx = null;
    let ty = null;
    if (ct) {
      if (ct.kind === "troop" && ct.troop.hp > 0 && !heavenlyTungRageActive(ct.troop)) {
        tx = ct.troop.x;
        ty = ct.troop.y;
      } else if (ct.kind === "tower" && ct.tower.hp > 0) {
        tx = ct.tower.x;
        ty = ct.tower.y;
      } else if (ct.kind === "building" && ct.building.hp > 0) {
        tx = ct.building.x;
        ty = ct.building.y;
      }
    }
    /** Ranged: stop walking once in shot range or while firing — don’t march into the tower. */
    if (isRangedTroopType(troop)) {
      if (troop.attackT > 0) {
        tx = null;
        ty = null;
      } else if (tx != null && ty != null) {
        const dHold = dist(troop.x, troop.y, tx, ty);
        if (dHold <= troop.rangedRange + RANGED_STANDOFF_SLACK) {
          tx = null;
          ty = null;
        }
      }
    }
    if (tx != null) {
      refreshRiverPath(troop, tx, ty);
    }

    const b = BRIDGES[troop.bridgeIx ?? 0];
    const anch = deployAnchor(troop);

    if (troop.path === "deploy") {
      const n = norm(anch.x - troop.x, anch.y - troop.y);
      moveWithWater(troop, n.x * step, n.y * step);
      if (dist(troop.x, troop.y, anch.x, anch.y) < 12) {
        troop.x = anch.x;
        troop.y = anch.y;
        troop.path = "ford";
      }
      return;
    }

    if (troop.path === "ford") {
      ensureBridgeLaneOx(troop);
      const laneX = clamp(
        bridgeMouthX(troop, b),
        b.x - BRIDGE_HALF_W + 2,
        b.x + BRIDGE_HALF_W - 2,
      );
      troop.x = clamp(
        troop.x +
          Math.sign(laneX - troop.x) * Math.min(Math.abs(laneX - troop.x), step * 1.65),
        b.x - BRIDGE_HALF_W + 2,
        b.x + BRIDGE_HALF_W - 2,
      );
      const dirY = troop.side === "player" ? -1 : 1;
      const ny = troop.y + dirY * step;
      const nx = troop.x;
      if (!isInRiverWater(nx, ny)) {
        troop.y = ny;
      }
      const done =
        troop.side === "player" ? troop.y <= RIVER_TOP - 5 : troop.y >= RIVER_BOT + 5;
      if (done) {
        troop.path = "fight";
      }
      return;
    }

    if (tx == null) return;

    const n = norm(tx - troop.x, ty - troop.y);
    moveWithWater(troop, n.x * step, n.y * step);
  }

  function triggerAttackAnim(troop, tx, ty) {
    const d = dist(troop.x, troop.y, tx, ty);
    if (d < 1e-3) return;
    troop.faceX = (tx - troop.x) / d;
    troop.faceY = (ty - troop.y) / d;
    if (troop.type === "mini_pekka" || troop.type === "assassin") troop.attackT = 0.32;
    else     if (troop.type === "knight") troop.attackT = 0.26;
    else if (troop.type === "bir_patapin") troop.attackT = 0.22;
    else if (troop.type === "tung_tung_tung_sahur" || troop.type === "heavenly_tung") troop.attackT = 0.018;
    else if (troop.type === "chud" || troop.type === "mega_goblin_army") troop.attackT = 0.38;
    else if (troop.type === "mega_knight") troop.attackT = 0.34;
    else if (troop.type === "bat") troop.attackT = 0.14;
    else if (isRangedTroopType(troop)) troop.attackT = 0.22;
    else troop.attackT = 0.18;
  }

  function tryMelee(troop, state, now) {
    if (!troopActsOnBattlefield(troop)) return;
    if (troop.type === "boberdino_crocodelo") return;
    if (heavenlyTungRageActive(troop)) return;
    if (troopStunned(troop, now)) return;
    if (troop.type === "mega_knight") return;
    if (isRangedTroopType(troop)) return;
    if (!meleeCooldownReady(troop, now)) return;

    const ct = resolveCombatPick(troop, state);
    if (!ct) return;

    if (ct.kind === "troop") {
      const o = ct.troop;
      if (heavenlyTungRageActive(o)) return;
      if (o.hp <= 0) return;
      if (!canAttackerFightEnemyTroop(troop, o)) return;
      if (dist(troop.x, troop.y, o.x, o.y) > troop.meleeRange + o.radius * 0.5 + MELEE_REACH_BONUS) return;
      let dmg = troop.hitDamage;
      if (troop.type === "assassin" && troop.assassinCharging) {
        dmg *= 2;
        troop.assassinCharging = false;
      }
      applyTroopDamage(o, dmg);
      if (troop.type === "assassin") applyAssassinMeleeSplash(state, troop, o, dmg, o.x, o.y);
      troop.lastMeleeAt = now;
      troop.combatLocked = true;
      if (!isFastMeleeSwarmType(troop)) troop.hasHitOnce = true;
      triggerAttackAnim(troop, o.x, o.y);
      return;
    }

    if (ct.kind === "building") {
      const bd = ct.building;
      if (bd.hp <= 0) return;
      if (dist(troop.x, troop.y, bd.x, bd.y) > troop.meleeRange + bd.radius * 0.5 + MELEE_REACH_BONUS) return;
      applyBuildingDamage(state, bd, troop.hitDamage);
      troop.lastMeleeAt = now;
      troop.combatLocked = true;
      if (!isFastMeleeSwarmType(troop)) troop.hasHitOnce = true;
      triggerAttackAnim(troop, bd.x, bd.y);
      return;
    }

    const tw = ct.tower;
    if (tw.hp <= 0) return;
    const reach = troop.meleeRange + (tw.kind === "king" ? 26 : 22) + MELEE_REACH_BONUS;
    if (dist(troop.x, troop.y, tw.x, tw.y) > reach) return;
    applyTowerDamage(state, tw, troop.hitDamage);
    troop.lastMeleeAt = now;
    troop.combatLocked = true;
    if (!isFastMeleeSwarmType(troop)) troop.hasHitOnce = true;
    triggerAttackAnim(troop, tw.x, tw.y);
  }

  function createInitialState() {
    const mkTower = (base) => ({
      ...base,
      fireAt: 0,
      fallen: false,
      stunUntil: 0,
      aggroKind: /** @type {null | "troop" | "building"} */ (null),
      aggroId: /** @type {null | string} */ (null),
      combatLocked: false,
    });

    const towers = [
      mkTower({
        id: "eL",
        side: "enemy",
        x: 268,
        y: 112,
        hp: PRINCESS_TOWER_HP,
        maxHp: PRINCESS_TOWER_HP,
        kind: "princess",
      }),
      mkTower({
        id: "eR",
        side: "enemy",
        x: 532,
        y: 112,
        hp: PRINCESS_TOWER_HP,
        maxHp: PRINCESS_TOWER_HP,
        kind: "princess",
      }),
      mkTower({
        id: "eK",
        side: "enemy",
        x: 400,
        y: 70,
        hp: KING_TOWER_HP,
        maxHp: KING_TOWER_HP,
        kind: "king",
      }),
      mkTower({
        id: "pL",
        side: "player",
        x: 268,
        y: H - 112,
        hp: PRINCESS_TOWER_HP,
        maxHp: PRINCESS_TOWER_HP,
        kind: "princess",
      }),
      mkTower({
        id: "pR",
        side: "player",
        x: 532,
        y: H - 112,
        hp: PRINCESS_TOWER_HP,
        maxHp: PRINCESS_TOWER_HP,
        kind: "princess",
      }),
      mkTower({
        id: "pK",
        side: "player",
        x: 400,
        y: H - 70,
        hp: KING_TOWER_HP,
        maxHp: KING_TOWER_HP,
        kind: "king",
      }),
    ];

    const pSrcRaw =
      runtimePlayerDeck && validateDeckForGame(runtimePlayerDeck)
        ? runtimePlayerDeck.slice()
        : DEFAULT_DECK_EIGHT.slice();
    const pSrc = normalizeDeckCardIds(pSrcRaw);
    const eSrc = normalizeDeckCardIds(DEFAULT_DECK_EIGHT);
    const pDeck = shuffleDeckFrom(pSrc);
    const eDeck = shuffleDeckFrom(eSrc);
    return {
      towers,
      troops: [],
      projectiles: [],
      uid: 0,
      playerElixir: 4,
      enemyElixir: 4,
      /** @type {string[]} */
      hand: pDeck.slice(0, 4),
      /** @type {string[]} */
      waiting: pDeck.slice(4, 8),
      /** @type {string[]} */
      enemyHand: eDeck.slice(0, 4),
      /** @type {string[]} */
      enemyWaiting: eDeck.slice(4, 8),
      /** @type {0 | 1 | 2 | 3 | null} */
      selectedSlot: null,
      /** @type {{ cx: number; cy: number; until: number } | null} */
      arrowFx: null,
      /** @type {{ cx: number; cy: number; until: number } | null} */
      cloneFx: null,
      /** @type {{ cx: number; cy: number; until: number } | null} */
      fireballFx: null,
      /** Barrel landing puff (spawn only — no AoE damage). */
      goblinBarrelFx: /** @type {{ cx: number; cy: number; until: number } | null} */ (null),
      /** @type {{ cx: number; cy: number; until: number } | null} */
      rocketFx: null,
      /** @type {{ cx: number; cy: number; until: number } | null} */
      shieldBuffFx: null,
      /** Brief ring when Build spell repairs allied buildings (@link ARROWS_SPELL_RADIUS). */
      buildRepairFx: /** @type {{ cx: number; cy: number; until: number } | null} */ (null),
      /** @type {{ cx: number; cy: number; until: number } | null} */
      zapFx: null,
      rageFx: /** @type {{ cx: number; cy: number; until: number } | null} */ (null),
      /** Per side — Mirror copies that side’s most recent placement (ignored for opponent). */
      lastPlayedBySide: {
        /** @type {string | null} */
        player: null,
        /** @type {string | null} */
        enemy: null,
      },
      /** @type {{ cx: number; cy: number; R: number; until: number; side: "player" | "enemy" }[]} */
      freezeZones: [],
      /** @type {{ cx: number; cy: number; until: number; radius: number; kind: "wizard" | "mega_jump" | "mega_ground" | "bomber_evo" | "chud_evo" | "tung_boom" | "witch" | "electro_hit" }[]} */
      wizardSplashFx: [],
      /** @type {object[]} */
      buildings: [],
      /** @type {{ at: number; side: "player" | "enemy"; card: string; x: number; y: number }[]} */
      pendingDeploys: [],
      /** Goblin Drill: burrows from king → target; emerges when travel ends. */
      /** @type {{ side: "player" | "enemy"; sx: number; sy: number; tx: number; ty: number; startAt: number; travelSec: number }[]} */
      drillDeployments: [],
      enemyBrainAcc: 0,
      over: false,
      winner: null,
      time: 0,
      crownsPlayer: 0,
      crownsEnemy: 0,
      /** @type {{ text: string; until: number; side: string } | null} */
      localEmote: null,
      /** @type {{ text: string; until: number; side: string } | null} */
      remoteEmote: null,
      /** @type {"training" | "battle"} */
      matchMode: "training",
      /** Legacy counters kept for compatibility/debug. */
      bomberCycleIdx: { player: 0, enemy: 0 },
      /** Legacy counters kept for compatibility/debug. */
      chudCycleIdx: { player: 0, enemy: 0 },
      /** Evo Tung requires 2 non-evo cycles before next evo proc. */
      tungCycleIdx: { player: 0, enemy: 0 },
      /** Evo slot card per side (deck slot #1 only). */
      evoSlotBySide: { player: pSrc[0] || null, enemy: eSrc[0] || null },
      /** PvP: regulation ended (clock hit 0); tie → overtime, else winner set. */
      pvpRegulationResolved: false,
      /** PvP: sudden death after regulation tie; first princess tower ends the match. */
      battleOvertime: false,
      /** Training-only sandbox toggles (see #testing-panel). */
      testing: {
        enemySpawns: true,
        infiniteElixir: false,
        /** Training: princess + king arena towers ignore all damage while alive (fallen towers stay dead). */
        infiniteTowerHp: false,
        /** Training: you deploy on the top (enemy) side; AI uses the bottom. */
        playAsEnemy: false,
        /** Training: draw attack ranges, projectile collision radii, and HP labels. */
        combatDebug: false,
        /** Training: troops you deploy never lose HP (enemy troops unaffected). */
        invincibleTroops: false,
        /** Training: every Bomber is Evo (bouncing bomb). */
        bomberAlwaysEvo: false,
        /** Training: every Chud is Evo (timed shockwave). */
        chudAlwaysEvo: false,
      },
    };
  }

  function resolveTroopBuildingCollisions(troops, buildings) {
    if (!buildings || !buildings.length) return;
    const padding = 2;
    for (const b of buildings) {
      if (b.hp <= 0) continue;
      for (const u of troops) {
        if (!troopActsOnBattlefield(u)) continue;
        if (u.garrisonBuildingId === b.id) continue;
        if (heavenlyTungRageActive(u)) continue;
        if (u.type === "boberdino_crocodelo") continue;
        const minD = u.radius + b.radius + padding;
        const d = dist(u.x, u.y, b.x, b.y);
        if (d >= minD || d < 1e-4) continue;
        const nx = (u.x - b.x) / d;
        const ny = (u.y - b.y) / d;
        const pen = (minD - d) * 0.55;
        slideNudge(u, nx * pen, ny * pen);
      }
    }
  }

  /** Nearest foe troop or building in tower range (CR-style). */
  function nearestFoeInRangeForArenaShooter(ax, ay, atkSide, range, state) {
    let best = /** @type {{ kind: "troop"; troop: (typeof state.troops)[0] } | { kind: "building"; building: (typeof state.buildings)[0] } | null} */ (
      null
    );
    let bestD = Infinity;
    for (const u of state.troops) {
      if (u.side === atkSide) continue;
      if (u.type === "assassin") continue;
      if (heavenlyTungRageActive(u)) continue;
      if (u.hp <= 0) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      const d = dist(ax, ay, u.x, u.y);
      if (d <= range && d < bestD) {
        bestD = d;
        best = { kind: "troop", troop: u };
      }
    }
    const buildings = state.buildings || [];
    for (const b of buildings) {
      if (b.hp <= 0 || b.side === atkSide) continue;
      const d = dist(ax, ay, b.x, b.y);
      if (d <= range && d < bestD) {
        bestD = d;
        best = { kind: "building", building: b };
      }
    }
    return best;
  }

  function nearestFoeForTowerAttack(tower, state) {
    const range = tower.kind === "king" ? KING_RANGE : PRINCESS_RANGE;
    return nearestFoeInRangeForArenaShooter(tower.x, tower.y, tower.side, range, state);
  }

  function clearTowerAggro(tower) {
    tower.aggroKind = null;
    tower.aggroId = null;
    tower.combatLocked = false;
  }

  function towerStunned(tower, now) {
    return tower.stunUntil != null && now < tower.stunUntil;
  }

  function towerTargetInEngageRange(tower, ct) {
    const range = tower.kind === "king" ? KING_RANGE : PRINCESS_RANGE;
    if (ct.kind === "troop") return dist(tower.x, tower.y, ct.troop.x, ct.troop.y) <= range;
    return dist(tower.x, tower.y, ct.building.x, ct.building.y) <= range;
  }

  function setTowerAggroFromPick(tower, pick) {
    if (!pick) {
      clearTowerAggro(tower);
      return;
    }
    if (pick.kind === "troop") {
      tower.aggroKind = "troop";
      tower.aggroId = pick.troop.id;
    } else {
      tower.aggroKind = "building";
      tower.aggroId = pick.building.id;
    }
  }

  function tryResolveTowerAggro(tower, state) {
    if (!tower.aggroKind || !tower.aggroId) return null;
    if (tower.aggroKind === "troop") {
      const u = state.troops.find((x) => x.id === tower.aggroId);
      if (!u || u.side === tower.side || heavenlyTungRageActive(u) || u.hp <= 0) {
        clearTowerAggro(tower);
        return null;
      }
      if (u.type === "assassin") {
        clearTowerAggro(tower);
        return null;
      }
      if (troopInsideGarrisonAlive(u, state)) {
        clearTowerAggro(tower);
        return null;
      }
      return { kind: "troop", troop: u };
    }
    if (tower.aggroKind === "building") {
      const bd = (state.buildings || []).find((x) => x.id === tower.aggroId);
      if (!bd || bd.hp <= 0 || bd.side === tower.side) {
        clearTowerAggro(tower);
        return null;
      }
      return { kind: "building", building: bd };
    }
    clearTowerAggro(tower);
    return null;
  }

  function towerShoot(state, tower, now) {
    if (tower.hp <= 0 || state.over) return;
    if (towerStunned(tower, now)) return;
    const cd = tower.kind === "king" ? KING_FIRE : PRINCESS_FIRE;
    if (now < tower.fireAt) return;
    if (tower.kind === "king" && !kingAwakeForSide(state.towers, tower.side)) return;

    let ct = null;
    if (tower.combatLocked) {
      const locked = tryResolveTowerAggro(tower, state);
      if (locked && towerTargetInEngageRange(tower, locked)) {
        ct = locked;
      } else {
        clearTowerAggro(tower);
      }
    }
    if (!ct) ct = nearestFoeForTowerAttack(tower, state);
    if (!ct) {
      clearTowerAggro(tower);
      return;
    }
    setTowerAggroFromPick(tower, ct);
    tower.combatLocked = true;

    let tx;
    let ty;
    let targetKind;
    let targetId;
    if (ct.kind === "troop") {
      tx = ct.troop.x;
      ty = ct.troop.y;
      targetKind = "troop";
      targetId = ct.troop.id;
    } else {
      tx = ct.building.x;
      ty = ct.building.y;
      targetKind = "building";
      targetId = ct.building.id;
    }

    tower.fireAt = now + cd;
    const n = norm(tx - tower.x, ty - tower.y);
    const dmg = tower.kind === "king" ? KING_DMG : PRINCESS_DMG;
    const yOff = tower.side === "enemy" ? 24 : -24;
    const projKind = tower.kind === "king" ? "king" : "princess";
    const projRadius = tower.kind === "king" ? 7 : 5;
    state.projectiles.push({
      x: tower.x,
      y: tower.y + yOff,
      vx: n.x * PROJ_SPEED,
      vy: n.y * PROJ_SPEED,
      dmg,
      fromSide: tower.side,
      hitsTowers: false,
      projKind,
      projRadius,
      homing: true,
      targetKind,
      targetId,
    });
  }

  function clearPrinceTowerAggro(bd) {
    bd.aggroKind = null;
    bd.aggroId = null;
    bd.combatLocked = false;
  }

  function tryResolvePrinceTowerAggro(bd, state) {
    if (!bd.aggroKind || !bd.aggroId) return null;
    if (bd.aggroKind === "troop") {
      const u = state.troops.find((x) => x.id === bd.aggroId);
      if (!u || u.side === bd.side || heavenlyTungRageActive(u) || u.hp <= 0) {
        clearPrinceTowerAggro(bd);
        return null;
      }
      if (u.type === "assassin") {
        clearPrinceTowerAggro(bd);
        return null;
      }
      if (troopInsideGarrisonAlive(u, state)) {
        clearPrinceTowerAggro(bd);
        return null;
      }
      return { kind: "troop", troop: u };
    }
    if (bd.aggroKind === "building") {
      const ob = (state.buildings || []).find((x) => x.id === bd.aggroId);
      if (!ob || ob.hp <= 0 || ob.side === bd.side || ob === bd) {
        clearPrinceTowerAggro(bd);
        return null;
      }
      return { kind: "building", building: ob };
    }
    clearPrinceTowerAggro(bd);
    return null;
  }

  function setPrinceTowerAggroFromPick(bd, pick) {
    if (!pick) {
      clearPrinceTowerAggro(bd);
      return;
    }
    if (pick.kind === "troop") {
      bd.aggroKind = "troop";
      bd.aggroId = pick.troop.id;
    } else {
      bd.aggroKind = "building";
      bd.aggroId = pick.building.id;
    }
  }

  function princeTowerTargetInEngageRange(bd, ct) {
    const range = PRINCESS_RANGE;
    if (ct.kind === "troop") return dist(bd.x, bd.y, ct.troop.x, ct.troop.y) <= range;
    return dist(bd.x, bd.y, ct.building.x, ct.building.y) <= range;
  }

  /** Placeable building: princess range / cadence / bolt damage; no HP decay. */
  function princeTowerBuildingShoot(state, bd, now) {
    if (bd.kind !== "prince_tower" || bd.hp <= 0 || state.over) return;
    if (bd.stunUntil != null && now < bd.stunUntil) return;
    const cd = PRINCESS_FIRE;
    if (now < bd.fireAt) return;

    let ct = null;
    if (bd.combatLocked) {
      const locked = tryResolvePrinceTowerAggro(bd, state);
      if (locked && princeTowerTargetInEngageRange(bd, locked)) {
        ct = locked;
      } else {
        clearPrinceTowerAggro(bd);
      }
    }
    if (!ct) ct = nearestFoeInRangeForArenaShooter(bd.x, bd.y, bd.side, PRINCESS_RANGE, state);
    if (!ct) {
      clearPrinceTowerAggro(bd);
      return;
    }
    setPrinceTowerAggroFromPick(bd, ct);
    bd.combatLocked = true;

    let tx;
    let ty;
    let targetKind;
    let targetId;
    if (ct.kind === "troop") {
      tx = ct.troop.x;
      ty = ct.troop.y;
      targetKind = "troop";
      targetId = ct.troop.id;
    } else {
      tx = ct.building.x;
      ty = ct.building.y;
      targetKind = "building";
      targetId = ct.building.id;
    }

    bd.fireAt = now + cd;
    const n = norm(tx - bd.x, ty - bd.y);
    const dmg = PRINCESS_DMG;
    const yOff = bd.side === "enemy" ? 20 : -20;
    state.projectiles.push({
      x: bd.x,
      y: bd.y + yOff,
      vx: n.x * PROJ_SPEED,
      vy: n.y * PROJ_SPEED,
      dmg,
      fromSide: bd.side,
      hitsTowers: true,
      projKind: "princess",
      projRadius: 5,
      homing: true,
      targetKind,
      targetId,
    });
  }

  /** Nearest foe troop, building, or targetable tower within ranged shot range (CR-style). */
  function pickRangedShotTarget(unit, state) {
    if (troopStunned(unit, state.time)) return null;
    const shotR = unit.rangedRange + RANGED_STANDOFF_SLACK;

    if (unit.combatLocked) {
      const locked = tryResolveTroopAggro(unit, state);
      if (locked && rangedEngagementInRange(unit, locked)) {
        return locked;
      }
      clearTroopAggro(unit);
    }

    let bestD = Infinity;
    /** @type {{ kind: "troop"; troop: (typeof state.troops)[0] } | { kind: "tower"; tower: (typeof state.towers)[0] } | { kind: "building"; building: (typeof state.buildings)[0] } | null} */
    let best = null;
    for (const u of state.troops) {
      if (u.side === unit.side) continue;
      if (heavenlyTungRageActive(u)) continue;
      if (u.hp <= 0) continue;
      if (unit.type === "bomber" && isFlyingTroop(u)) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      const d = dist(unit.x, unit.y, u.x, u.y);
      if (d <= shotR && d < bestD) {
        bestD = d;
        best = { kind: "troop", troop: u };
      }
    }
    for (const tw of targetableFoeTowers(unit, state.towers)) {
      const d = dist(unit.x, unit.y, tw.x, tw.y);
      if (d <= shotR && d < bestD) {
        bestD = d;
        best = { kind: "tower", tower: tw };
      }
    }
    const buildings = state.buildings || [];
    for (const bd of buildings) {
      if (bd.hp <= 0 || bd.side === unit.side) continue;
      const d = dist(unit.x, unit.y, bd.x, bd.y);
      if (d <= shotR && d < bestD) {
        bestD = d;
        best = { kind: "building", building: bd };
      }
    }
    if (best) setTroopAggroFromPick(unit, best);
    return best;
  }

  function combatPickKey(ct) {
    if (ct.kind === "troop") return `t:${ct.troop.id}`;
    if (ct.kind === "tower") return `tw:${ct.tower.id}`;
    return `b:${ct.building.id}`;
  }

  function collectSortedRangedFoeTargets(unit, state) {
    const shotR = unit.rangedRange + RANGED_STANDOFF_SLACK;
    /** @type {{ kind: "troop"; troop: (typeof state.troops)[0] } | { kind: "tower"; tower: (typeof state.towers)[0] } | { kind: "building"; building: (typeof state.buildings)[0] }[]} */
    const out = [];
    const arr = [];
    for (const u of state.troops) {
      if (u.side === unit.side) continue;
      if (heavenlyTungRageActive(u)) continue;
      if (u.hp <= 0) continue;
      if (unit.type === "bomber" && isFlyingTroop(u)) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      const d = dist(unit.x, unit.y, u.x, u.y);
      if (d <= shotR) arr.push({ ct: { kind: "troop", troop: u }, d });
    }
    for (const tw of targetableFoeTowers(unit, state.towers)) {
      const d = dist(unit.x, unit.y, tw.x, tw.y);
      if (d <= shotR) arr.push({ ct: { kind: "tower", tower: tw }, d });
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === unit.side) continue;
      const d = dist(unit.x, unit.y, bd.x, bd.y);
      if (d <= shotR) arr.push({ ct: { kind: "building", building: bd }, d });
    }
    arr.sort((a, b) => a.d - b.d);
    for (const a of arr) out.push(a.ct);
    return out;
  }

  function applyElectroStunFromHit(state, resolved) {
    const stunT = state.time + ELECTRO_STUN_SEC;
    if (resolved.kind === "troop") {
      const u = resolved.troop;
      u.stunUntil = Math.max(u.stunUntil || 0, stunT);
      clearTroopAggro(u);
      if (u.type === "mega_knight") resetMegaKnightJump(u);
    } else if (resolved.kind === "tower") {
      const tw = resolved.tower;
      tw.stunUntil = Math.max(tw.stunUntil || 0, stunT);
      clearTowerAggro(tw);
    }
  }

  /** Instant lightning strike (no projectile) — CR-style Electro Wizard. */
  function applyElectroInstantStrike(state, fromSide, pick, dmg) {
    if (pick.kind === "troop") {
      const t = pick.troop;
      if (t.hp <= 0 || t.side === fromSide) return;
      applyTroopDamage(t, dmg);
      applyElectroStunFromHit(state, { kind: "troop", troop: t });
    } else if (pick.kind === "tower") {
      const tw = pick.tower;
      if (tw.hp <= 0 || tw.side === fromSide) return;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) return;
      applyTowerDamage(state, tw, dmg);
      applyElectroStunFromHit(state, { kind: "tower", tower: tw });
    } else {
      const b = pick.building;
      if (b.hp <= 0 || b.side === fromSide) return;
      applyBuildingDamage(state, b, dmg);
    }
    const cx =
      pick.kind === "troop"
        ? pick.troop.x
        : pick.kind === "tower"
          ? pick.tower.x
          : pick.building.x;
    const cy =
      pick.kind === "troop"
        ? pick.troop.y
        : pick.kind === "tower"
          ? pick.tower.y
          : pick.building.y;
    state.wizardSplashFx.push({
      cx,
      cy,
      until: state.time + 0.24,
      radius: 24,
      kind: "electro_hit",
    });
  }

  function rangedTroopShoot(state, unit, now) {
    if (unit.hp <= 0 || state.over) return;
    if (heavenlyTungRageActive(unit)) return;
    if (troopStunned(unit, now)) return;
    if (!isRangedTroopType(unit)) return;
    if (now < unit.fireAt) return;
    const rMul = troopRageMultiplier(unit, now);
    if (unit.type === "electro_wizard") {
      const list = collectSortedRangedFoeTargets(unit, state);
      if (!list.length) return;
      const primary = list[0];
      let secondary = primary;
      for (let i = 1; i < list.length; i++) {
        if (combatPickKey(list[i]) !== combatPickKey(primary)) {
          secondary = list[i];
          break;
        }
      }
      setTroopAggroFromPick(unit, primary);
      unit.fireAt = now + unit.rangedInterval / rMul;
      unit.combatLocked = true;
      triggerAttackAnim(unit, primary.kind === "troop" ? primary.troop.x : primary.kind === "tower" ? primary.tower.x : primary.building.x, primary.kind === "troop" ? primary.troop.y : primary.kind === "tower" ? primary.tower.y : primary.building.y);
      applyElectroInstantStrike(state, unit.side, primary, unit.rangedDmg);
      applyElectroInstantStrike(state, unit.side, secondary, unit.rangedDmg);
      return;
    }
    const target = pickRangedShotTarget(unit, state);
    if (!target) return;
    unit.fireAt = now + unit.rangedInterval / rMul;
    unit.combatLocked = true;
    let tx;
    let ty;
    if (target.kind === "troop") {
      tx = target.troop.x;
      ty = target.troop.y;
    } else if (target.kind === "tower") {
      tx = target.tower.x;
      ty = target.tower.y;
    } else {
      tx = target.building.x;
      ty = target.building.y;
    }
    triggerAttackAnim(unit, tx, ty);
    const n = norm(tx - unit.x, ty - unit.y);
    const bomberSpd = PROJ_SPEED * BOMBER_PROJ_SPEED_SCALE;
    const yOff = unit.side === "enemy" ? 8 : -8;
    const projKind =
      unit.type === "spear_goblin"
        ? "spear"
        : unit.type === "wizard"
          ? "wizard"
          : unit.type === "witch"
            ? "witch"
            : unit.type === "musketeer"
              ? "musket"
              : unit.type === "bomber"
                ? "bomber"
                : "archer";
    /** @type {"troop" | "tower" | "building"} */
    let targetKind;
    let targetId;
    if (target.kind === "troop") {
      targetKind = "troop";
      targetId = target.troop.id;
    } else if (target.kind === "tower") {
      targetKind = "tower";
      targetId = target.tower.id;
    } else {
      targetKind = "building";
      targetId = target.building.id;
    }
    state.projectiles.push({
      x: unit.x,
      y: unit.y + yOff,
      vx: n.x * (unit.type === "bomber" ? bomberSpd : PROJ_SPEED),
      vy: n.y * (unit.type === "bomber" ? bomberSpd : PROJ_SPEED),
      dmg: unit.rangedDmg,
      fromSide: unit.side,
      hitsTowers: true,
      projKind,
      projRadius:
        unit.type === "wizard"
          ? 6
          : unit.type === "witch"
            ? 5.5
            : unit.type === "musketeer"
              ? 4.5
              : unit.type === "bomber"
                ? 5.2
                : 4,
      homing: true,
      bomberEvo: unit.type === "bomber" ? !!unit.bomberEvo : false,
      targetKind,
      targetId,
    });
  }

  function resolveHomingProjectileTarget(p, state) {
    if (!p.homing || !p.targetKind || !p.targetId) return null;
    if (p.targetKind === "troop") {
      const u = state.troops.find((t) => t.id === p.targetId);
      if (!u || u.side === p.fromSide || heavenlyTungRageActive(u)) return null;
      if (u.hp <= 0) return null;
      if (troopInsideGarrisonAlive(u, state)) return null;
      return { kind: "troop", troop: u, x: u.x, y: u.y, hitR: u.radius };
    }
    if (p.targetKind === "tower") {
      const tw = state.towers.find((t) => t.id === p.targetId);
      if (!tw || tw.hp <= 0 || tw.side === p.fromSide) return null;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) return null;
      const hitR = tw.kind === "king" ? 30 : 22;
      return { kind: "tower", tower: tw, x: tw.x, y: tw.y, hitR };
    }
    if (p.targetKind === "building") {
      const bd = (state.buildings || []).find((b) => b.id === p.targetId);
      if (!bd || bd.hp <= 0 || bd.side === p.fromSide) return null;
      return { kind: "building", building: bd, x: bd.x, y: bd.y, hitR: bd.radius };
    }
    return null;
  }

  function applyProjectileDamageResolved(state, p, resolved) {
    if (resolved.kind === "troop") {
      applyTroopDamage(resolved.troop, p.dmg);
    } else if (resolved.kind === "tower") {
      applyTowerDamage(state, resolved.tower, p.dmg);
    } else {
      applyBuildingDamage(state, resolved.building, p.dmg);
    }
  }

  /** Wizard bolt: primary took full bolt damage; splash hits others in radius for a fraction. */
  function applyWizardSplashAround(state, cx, cy, fromSide, radius, splashDmg, primaryResolved) {
    if (!primaryResolved || splashDmg <= 0) return;
    let skipTroopId = null;
    let skipTowerId = null;
    let skipBuildingId = null;
    if (primaryResolved.kind === "troop") skipTroopId = primaryResolved.troop.id;
    else if (primaryResolved.kind === "tower") skipTowerId = primaryResolved.tower.id;
    else skipBuildingId = primaryResolved.building.id;

    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === fromSide) continue;
      if (skipTroopId && u.id === skipTroopId) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (dist(u.x, u.y, cx, cy) <= radius + u.radius * 0.35) {
        applyTroopDamage(u, splashDmg);
      }
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === fromSide) continue;
      if (skipBuildingId && bd.id === skipBuildingId) continue;
      if (dist(bd.x, bd.y, cx, cy) <= radius + bd.radius * 0.4) {
        applyBuildingDamage(state, bd, splashDmg);
      }
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === fromSide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      if (skipTowerId && tw.id === skipTowerId) continue;
      const ext = tw.kind === "king" ? 32 : 24;
      if (dist(tw.x, tw.y, cx, cy) <= radius + ext) {
        applyTowerDamage(state, tw, splashDmg);
      }
    }
  }

  /** Assassin melee: other enemy ground troops near the primary take a fraction of the same strike damage. */
  function applyAssassinMeleeSplash(state, attacker, primaryTroop, strikeDmg, cx, cy) {
    const splashDmg = Math.max(1, Math.floor(strikeDmg * ASSASSIN_SPLASH_FRACTION));
    if (splashDmg <= 0) return;
    const R = ASSASSIN_SPLASH_RADIUS;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === attacker.side) continue;
      if (u === primaryTroop) continue;
      if (heavenlyTungRageActive(u)) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (isFlyingTroop(u)) continue;
      if (!canAttackerFightEnemyTroop(attacker, u)) continue;
      if (dist(u.x, u.y, cx, cy) <= R + u.radius * 0.35) {
        applyTroopDamage(u, splashDmg);
      }
    }
    state.wizardSplashFx.push({
      cx,
      cy,
      until: state.time + 0.38,
      radius: R,
      kind: "wizard",
    });
  }

  /** Full damage to every foe troop/building/tower in radius (no primary skip). */
  function applyFullAoEToFoes(state, cx, cy, fromSide, radius, dmg, skipAirborneTroops) {
    if (dmg <= 0) return;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === fromSide) continue;
      if (skipAirborneTroops && isFlyingTroop(u)) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (dist(u.x, u.y, cx, cy) <= radius + u.radius * 0.35) {
        applyTroopDamage(u, dmg);
      }
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === fromSide) continue;
      if (dist(bd.x, bd.y, cx, cy) <= radius + bd.radius * 0.4) {
        applyBuildingDamage(state, bd, dmg);
      }
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === fromSide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 32 : 24;
      if (dist(tw.x, tw.y, cx, cy) <= radius + ext) {
        applyTowerDamage(state, tw, dmg);
      }
    }
  }

  function applyBomberSplashAt(state, bx, by, fromSide, tOff, isEvoBomber) {
    applyFullAoEToFoes(state, bx, by, fromSide, BOMBER_SPLASH_RADIUS, BOMBER_SPLASH_DMG, true);
    state.wizardSplashFx.push({
      cx: bx,
      cy: by,
      until: state.time + 0.48 + tOff,
      radius: BOMBER_SPLASH_RADIUS,
      kind: isEvoBomber ? "bomber_evo" : "mega_ground",
    });
  }

  function applyChudEvoShockwave(state, chud) {
    const cx = chud.x;
    const cy = chud.y;
    const fromSide = chud.side;
    const R = CHUD_EVO_PULSE_RADIUS;
    const dmg = CHUD_EVO_PULSE_DMG;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === fromSide) continue;
      if (u.id === chud.id) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      const d = dist(u.x, u.y, cx, cy);
      if (d <= R + u.radius * 0.35) {
        applyTroopDamage(u, dmg);
        if (d > 1e-4 && !heavenlyTungRageActive(u)) {
          const nx = (u.x - cx) / d;
          const ny = (u.y - cy) / d;
          slideNudge(u, nx * CHUD_EVO_KNOCK_DIST, ny * CHUD_EVO_KNOCK_DIST);
        }
      }
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === fromSide) continue;
      if (dist(bd.x, bd.y, cx, cy) <= R + bd.radius * 0.4) {
        applyBuildingDamage(state, bd, dmg);
      }
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === fromSide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 32 : 24;
      if (dist(tw.x, tw.y, cx, cy) <= R + ext) {
        applyTowerDamage(state, tw, dmg);
      }
    }
    state.wizardSplashFx.push({
      cx,
      cy,
      until: state.time + 0.45,
      radius: R,
      kind: "chud_evo",
    });
  }

  function updateChudEvoPulse(dt, troop, state) {
    if (!troop.chudEvo || !troopActsOnBattlefield(troop) || troop.hp <= 0) return;
    troop.chudEvoPulseAcc = (troop.chudEvoPulseAcc || 0) + dt;
    while (troop.chudEvoPulseAcc >= CHUD_EVO_PULSE_SEC) {
      troop.chudEvoPulseAcc -= CHUD_EVO_PULSE_SEC;
      applyChudEvoShockwave(state, troop);
    }
  }

  /** Evo Bomber only: first splash past the target; bomb keeps flying and drops timed follow-up splashes. */
  function beginBomberChainProjectile(state, p, homingResolved) {
    const vm = Math.hypot(p.vx, p.vy) || 1;
    const fx = p.vx / vm;
    const fy = p.vy / vm;
    const sx = homingResolved.x + fx * BOMBER_SPLASH_AIM_PAST;
    const sy = homingResolved.y + fy * BOMBER_SPLASH_AIM_PAST;
    applyBomberSplashAt(state, sx, sy, p.fromSide, 0, !!p.bomberEvo);
    const spd = PROJ_SPEED * BOMBER_PROJ_SPEED_SCALE;
    p.x = sx;
    p.y = sy;
    p.vx = fx * spd;
    p.vy = fy * spd;
    p.homing = false;
    p.bomberChainActive = true;
    p.bomberRingsRemaining = BOMBER_CHAIN_FOLLOW_UP_COUNT;
    p.bomberChainTimer = BOMBER_CHAIN_STEP_SEC;
  }

  function resetMegaKnightJump(troop) {
    troop.mkJumpPhase = 0;
    troop.mkWindupT = 0;
    troop.mkJumpT = 0;
  }

  /** Jump landing: flat 200 damage in the jump splash (Clash-style request). */
  function applyMegaKnightJumpSlam(state, cx, cy, fromSide) {
    const rOut = MEGA_KNIGHT_JUMP_SLAM_OUTER;
    const dJump = MEGA_KNIGHT_JUMP_DMG;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === fromSide) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      const d = dist(u.x, u.y, cx, cy);
      if (d <= rOut + u.radius * 0.35) {
        applyTroopDamage(u, dJump);
      }
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === fromSide) continue;
      const d = dist(bd.x, bd.y, cx, cy);
      if (d <= rOut + bd.radius * 0.35) {
        applyBuildingDamage(state, bd, dJump);
      }
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === fromSide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const extK = tw.kind === "king" ? 32 : 24;
      const d = dist(tw.x, tw.y, cx, cy);
      if (d <= rOut + extK) {
        applyTowerDamage(state, tw, dJump);
      }
    }
  }

  function megaKnightGroundReach(troop, ct) {
    if (ct.kind === "troop") {
      const o = ct.troop;
      return troop.meleeRange + o.radius * 0.5 + MELEE_REACH_BONUS + 2;
    }
    if (ct.kind === "building") {
      const bd = ct.building;
      return troop.meleeRange + bd.radius * 0.5 + MELEE_REACH_BONUS;
    }
    const tw = ct.tower;
    const pad = tw.kind === "king" ? 26 : 22;
    return troop.meleeRange + pad + MELEE_REACH_BONUS;
  }

  function combatTargetCenter(ct) {
    if (ct.kind === "troop") return { x: ct.troop.x, y: ct.troop.y };
    if (ct.kind === "building") return { x: ct.building.x, y: ct.building.y };
    return { x: ct.tower.x, y: ct.tower.y };
  }

  function updateMegaKnight(troop, dt, state, now) {
    if (troop.type !== "mega_knight" || troop.hp <= 0) return;
    if (troop.path === "garrison") return;
    if (troopStunned(troop, now)) {
      resetMegaKnightJump(troop);
      return;
    }

    const rDt = dt * troopRageMultiplier(troop, now);

    if (troop.mkJumpPhase === 1 && troop.mkWindupT > 0) {
      troop.mkWindupT -= rDt;
      if (troop.mkWindupT <= 0) {
        troop.mkWindupT = 0;
        troop.mkJumpPhase = 2;
        troop.mkJumpT = MEGA_KNIGHT_JUMP_DURATION;
      }
      return;
    }

    if (troop.mkJumpPhase === 2 && troop.mkJumpT > 0) {
      const dur = MEGA_KNIGHT_JUMP_DURATION;
      troop.mkJumpT -= rDt;
      const t = clamp(1 - troop.mkJumpT / dur, 0, 1);
      const e = t * t * (3 - 2 * t);
      troop.x = troop.mkJumpSX + (troop.mkJumpTX - troop.mkJumpSX) * e;
      troop.y = troop.mkJumpSY + (troop.mkJumpTY - troop.mkJumpSY) * e;
      if (troop.mkJumpT <= 0) {
        const lx = troop.mkJumpTX;
        const ly = troop.mkJumpTY;
        const ax = lx + (lx - troop.mkJumpSX);
        const ay = ly + (ly - troop.mkJumpSY);
        troop.x = lx;
        troop.y = ly;
        applyMegaKnightJumpSlam(state, lx, ly, troop.side);
        state.wizardSplashFx.push({
          cx: lx,
          cy: ly,
          until: state.time + 0.48,
          radius: MEGA_KNIGHT_JUMP_SLAM_OUTER,
          kind: "mega_jump",
        });
        resetMegaKnightJump(troop);
        troop.lastMeleeAt = now;
        troop.combatLocked = true;
        troop.hasHitOnce = true;
        triggerAttackAnim(troop, ax, ay);
      }
      return;
    }

    if (!meleeCooldownReady(troop, now)) return;

    const ct = resolveCombatPick(troop, state);
    if (!ct) return;
    const { x: tx, y: ty } = combatTargetCenter(ct);
    const d = dist(troop.x, troop.y, tx, ty);
    const reach = megaKnightGroundReach(troop, ct);

    if (d <= reach) {
      const b = MEGA_KNIGHT_GROUND_AIM_BLEND;
      const cx = troop.x + (tx - troop.x) * b;
      const cy = troop.y + (ty - troop.y) * b;
      applyFullAoEToFoes(state, cx, cy, troop.side, MEGA_KNIGHT_GROUND_SPLASH_R, KNIGHT_DMG);
      state.wizardSplashFx.push({
        cx,
        cy,
        until: state.time + 0.34,
        radius: MEGA_KNIGHT_GROUND_SPLASH_R,
        kind: "mega_ground",
      });
      troop.lastMeleeAt = now;
      troop.combatLocked = true;
      troop.hasHitOnce = true;
      triggerAttackAnim(troop, tx, ty);
      return;
    }

    if (d <= MEGA_KNIGHT_JUMP_RANGE) {
      const maxL = MEGA_KNIGHT_JUMP_RANGE;
      const landT = Math.min(1, maxL / Math.max(d, 1e-3));
      const ltx = troop.x + (tx - troop.x) * landT;
      const lty = troop.y + (ty - troop.y) * landT;
      troop.mkJumpPhase = 1;
      troop.mkWindupT = MEGA_KNIGHT_WINDUP;
      troop.mkJumpT = 0;
      troop.mkJumpSX = troop.x;
      troop.mkJumpSY = troop.y;
      troop.mkJumpTX = ltx;
      troop.mkJumpTY = lty;
      troop.combatLocked = true;
      triggerAttackAnim(troop, ltx, lty);
    }
  }

  function updateProjectiles(dt, state) {
    const { projectiles, troops } = state;
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      const pr = p.projRadius ?? PROJ_RADIUS;

      if (p.projKind === "bomber" && p.bomberChainActive) {
        let rem = dt;
        let done = false;
        while (rem > 1e-9 && !done) {
          if ((p.bomberRingsRemaining ?? 0) <= 0) {
            projectiles.splice(i, 1);
            done = true;
            break;
          }
          let timer = p.bomberChainTimer ?? BOMBER_CHAIN_STEP_SEC;
          if (timer <= 1e-8 && (p.bomberRingsRemaining ?? 0) > 0) {
            applyBomberSplashAt(state, p.x, p.y, p.fromSide, 0, !!p.bomberEvo);
            p.bomberRingsRemaining = (p.bomberRingsRemaining ?? 0) - 1;
            if (p.bomberRingsRemaining <= 0) {
              projectiles.splice(i, 1);
              done = true;
              break;
            }
            p.bomberChainTimer = BOMBER_CHAIN_STEP_SEC;
            continue;
          }
          const step = Math.min(rem, timer);
          if (step < 1e-12) break;
          p.x += p.vx * step;
          p.y += p.vy * step;
          p.bomberChainTimer = timer - step;
          rem -= step;
          if (p.bomberChainTimer <= 1e-8 && (p.bomberRingsRemaining ?? 0) > 0) {
            applyBomberSplashAt(state, p.x, p.y, p.fromSide, 0, !!p.bomberEvo);
            p.bomberRingsRemaining = (p.bomberRingsRemaining ?? 0) - 1;
            if (p.bomberRingsRemaining <= 0) {
              projectiles.splice(i, 1);
              done = true;
              break;
            }
            p.bomberChainTimer = BOMBER_CHAIN_STEP_SEC;
          }
        }
        if (
          !done &&
          (p.x < -80 - pr || p.x > W + 80 + pr || p.y < -80 - pr || p.y > H + 80 + pr)
        ) {
          projectiles.splice(i, 1);
        }
        continue;
      }

      let homingResolved = null;
      if (p.homing) {
        homingResolved = resolveHomingProjectileTarget(p, state);
        if (!homingResolved) {
          projectiles.splice(i, 1);
          continue;
        }
        const steer = norm(homingResolved.x - p.x, homingResolved.y - p.y);
        const spd = p.projKind === "bomber" ? PROJ_SPEED * BOMBER_PROJ_SPEED_SCALE : PROJ_SPEED;
        p.vx = steer.x * spd;
        p.vy = steer.y * spd;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.goblinBarrelSpell) {
        const tx = p.targetX ?? p.x;
        const ty = p.targetY ?? p.y;
        if (p.x < -20 - pr || p.x > W + 20 + pr || p.y < -20 - pr || p.y > H + 20 + pr) {
          projectiles.splice(i, 1);
          continue;
        }
        const reached =
          dist(p.x, p.y, tx, ty) <= pr + 5 || p.vx * (tx - p.x) + p.vy * (ty - p.y) <= 0;
        if (reached) {
          const prev = state.troops.length;
          spawnThreeMeleeGoblinsAt(state, p.fromSide, tx, ty);
          attachNewTroopsToGarrisonFrom(state, prev);
          state.goblinBarrelFx = { cx: tx, cy: ty, until: state.time + 0.5 };
          projectiles.splice(i, 1);
          continue;
        }
        continue;
      }

      if (p.fireballSpell) {
        const tx = p.targetX ?? p.x;
        const ty = p.targetY ?? p.y;
        if (p.x < -20 - pr || p.x > W + 20 + pr || p.y < -20 - pr || p.y > H + 20 + pr) {
          projectiles.splice(i, 1);
          continue;
        }
        const reached = dist(p.x, p.y, tx, ty) <= pr + 5 || p.vx * (tx - p.x) + p.vy * (ty - p.y) <= 0;
        if (reached) {
          const R = FIREBALL_SPELL_RADIUS;
          for (const u of state.troops) {
            if (u.hp <= 0 || u.side === p.fromSide) continue;
            if (troopInsideGarrisonAlive(u, state)) continue;
            if (dist(u.x, u.y, tx, ty) <= R) {
              applyTroopDamage(u, FIREBALL_SPELL_DMG);
            }
          }
          for (const tw of state.towers) {
            if (tw.hp <= 0 || tw.side === p.fromSide) continue;
            if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
            const ext = tw.kind === "king" ? 34 : 26;
            if (dist(tw.x, tw.y, tx, ty) <= R + ext) {
              applyTowerDamage(state, tw, FIREBALL_TOWER_DMG);
            }
          }
          for (const bd of state.buildings || []) {
            if (bd.hp <= 0 || bd.side === p.fromSide) continue;
            if (dist(bd.x, bd.y, tx, ty) <= R + bd.radius) {
              applyBuildingDamage(state, bd, FIREBALL_SPELL_DMG);
            }
          }
          state.fireballFx = { cx: tx, cy: ty, until: state.time + 0.52 };
          projectiles.splice(i, 1);
          continue;
        }
        continue;
      }

      if (p.rocketSpell) {
        const tx = p.targetX ?? p.x;
        const ty = p.targetY ?? p.y;
        if (p.x < -20 - pr || p.x > W + 20 + pr || p.y < -20 - pr || p.y > H + 20 + pr) {
          projectiles.splice(i, 1);
          continue;
        }
        const reached =
          dist(p.x, p.y, tx, ty) <= pr + 5 || p.vx * (tx - p.x) + p.vy * (ty - p.y) <= 0;
        if (reached) {
          const R = ROCKET_SPELL_RADIUS;
          for (const u of state.troops) {
            if (u.hp <= 0 || u.side === p.fromSide) continue;
            if (troopInsideGarrisonAlive(u, state)) continue;
            if (dist(u.x, u.y, tx, ty) <= R) {
              applyTroopDamage(u, ROCKET_SPELL_DMG);
            }
          }
          for (const tw of state.towers) {
            if (tw.hp <= 0 || tw.side === p.fromSide) continue;
            if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
            const ext = tw.kind === "king" ? 34 : 26;
            if (dist(tw.x, tw.y, tx, ty) <= R + ext) {
              applyTowerDamage(state, tw, ROCKET_TOWER_DMG);
            }
          }
          for (const bd of state.buildings || []) {
            if (bd.hp <= 0 || bd.side === p.fromSide) continue;
            if (dist(bd.x, bd.y, tx, ty) <= R + bd.radius) {
              applyBuildingDamage(state, bd, ROCKET_SPELL_DMG);
            }
          }
          state.rocketFx = { cx: tx, cy: ty, until: state.time + 0.52 };
          projectiles.splice(i, 1);
          continue;
        }
        continue;
      }

      if (p.x < -20 - pr || p.x > W + 20 + pr || p.y < -20 - pr || p.y > H + 20 + pr) {
        projectiles.splice(i, 1);
        continue;
      }

      if (p.homing) {
        homingResolved = resolveHomingProjectileTarget(p, state);
        if (!homingResolved) {
          projectiles.splice(i, 1);
          continue;
        }
        if (dist(p.x, p.y, homingResolved.x, homingResolved.y) < homingResolved.hitR + pr + PROJECTILE_HIT_FUDGE) {
          if (p.projKind === "bomber") {
            if (p.bomberEvo) {
              beginBomberChainProjectile(state, p, homingResolved);
              continue;
            }
            const vm = Math.hypot(p.vx, p.vy) || 1;
            const fx = p.vx / vm;
            const fy = p.vy / vm;
            const sx = homingResolved.x + fx * BOMBER_SPLASH_AIM_PAST;
            const sy = homingResolved.y + fy * BOMBER_SPLASH_AIM_PAST;
            applyBomberSplashAt(state, sx, sy, p.fromSide, 0, false);
            projectiles.splice(i, 1);
            continue;
          } else {
            applyProjectileDamageResolved(state, p, homingResolved);
            if (p.projKind === "wizard" || p.projKind === "witch") {
              const splR = p.projKind === "witch" ? WITCH_SPLASH_RADIUS : WIZARD_SPLASH_RADIUS;
              const splF = p.projKind === "witch" ? WITCH_SPLASH_FRACTION : WIZARD_SPLASH_FRACTION;
              const splash = Math.max(1, Math.floor(p.dmg * splF));
              applyWizardSplashAround(state, homingResolved.x, homingResolved.y, p.fromSide, splR, splash, homingResolved);
              state.wizardSplashFx.push({
                cx: homingResolved.x,
                cy: homingResolved.y,
                until: state.time + 0.42,
                radius: splR,
                kind: p.projKind === "witch" ? "witch" : "wizard",
              });
            }
          }
          projectiles.splice(i, 1);
          continue;
        }
        continue;
      }

      let hit = false;
      for (const u of troops) {
        if (u.hp <= 0 || u.side === p.fromSide) continue;
        if (troopInsideGarrisonAlive(u, state)) continue;
        if (dist(p.x, p.y, u.x, u.y) < u.radius + pr) {
          applyTroopDamage(u, p.dmg);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const bd of state.buildings || []) {
          if (bd.hp <= 0 || bd.side === p.fromSide) continue;
          if (dist(p.x, p.y, bd.x, bd.y) < bd.radius + pr) {
            applyBuildingDamage(state, bd, p.dmg);
            hit = true;
            break;
          }
        }
      }
      if (!hit && p.hitsTowers) {
        for (const tw of state.towers) {
          if (tw.hp <= 0 || tw.side === p.fromSide) continue;
          if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
          const hitR = tw.kind === "king" ? 30 : 22;
          if (dist(p.x, p.y, tw.x, tw.y) < hitR + pr) {
            applyTowerDamage(state, tw, p.dmg);
            hit = true;
            break;
          }
        }
      }
      if (hit) projectiles.splice(i, 1);
    }
  }

  function enemyBrain(dt, state) {
    if (state.over) return;
    if (!trainingEnemyAiEnabled(state)) return;
    state.enemyBrainAcc += dt;
    if (state.enemyBrainAcc < 5.5) return;
    state.enemyBrainAcc = 0;
    const aiSide = trainingAiSide(state);
    const slots = [];
    for (let s = 0; s < 4; s++) {
      const c = state.enemyHand[s];
      if (!c) continue;
      const ec = effectiveCardCost(state, c, aiSide);
      if (!Number.isFinite(ec)) continue;
      if (state.enemyElixir >= ec) slots.push(s);
    }
    if (!slots.length) return;
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const card = state.enemyHand[slot];
    const cost = effectiveCardCost(state, card, aiSide);

    if (card === "shields") {
      const px = clamp(120 + Math.random() * 560, 24, W - 24);
      const py =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      state.enemyElixir -= cost;
      applyShieldBuffSpell(px, py, aiSide, state);
      notifyLastPlayedCard(state, aiSide, "shields");
      cycleEnemyHand(state, slot);
      return;
    }

    if (card === "rage") {
      const px = clamp(120 + Math.random() * 560, 24, W - 24);
      const py =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      state.enemyElixir -= cost;
      applyRageStrike(px, py, aiSide, state);
      notifyLastPlayedCard(state, aiSide, "rage");
      cycleEnemyHand(state, slot);
      return;
    }

    if (card === "mirror") {
      const inner =
        aiSide === "player" ? state.lastPlayedBySide.player : state.lastPlayedBySide.enemy;
      if (!inner || inner === "mirror") return;
      const sx = clamp(120 + Math.random() * 560, 24, W - 24);
      const sy =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      let mx = sx;
      let my = sy;
      if (!isSpellCardId(inner)) {
        mx = 260 + Math.random() * 280;
        my =
          aiSide === "enemy"
            ? 52 + Math.random() * 70
            : RIVER_BOT + 45 + Math.random() * Math.max(40, H - RIVER_BOT - 90);
      }
      if (!runMirrorReplay(state, aiSide, inner, mx, my)) return;
      state.enemyElixir -= cost;
      notifyLastPlayedCard(state, aiSide, inner);
      cycleEnemyHand(state, slot);
      return;
    }

    if (card === "arrows") {
      const px = clamp(120 + Math.random() * 560, 24, W - 24);
      const py =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      state.enemyElixir -= cost;
      applyArrowsStrike(px, py, aiSide, state);
      notifyLastPlayedCard(state, aiSide, "arrows");
      cycleEnemyHand(state, slot);
      return;
    }
    if (card === "clone") {
      const px = clamp(120 + Math.random() * 560, 24, W - 24);
      const py =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      state.enemyElixir -= cost;
      applyCloneSpell(px, py, state);
      notifyLastPlayedCard(state, aiSide, "clone");
      cycleEnemyHand(state, slot);
      return;
    }
    if (card === "fireball") {
      const px = clamp(120 + Math.random() * 560, 24, W - 24);
      const py =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      state.enemyElixir -= cost;
      applyFireballStrike(px, py, aiSide, state);
      notifyLastPlayedCard(state, aiSide, "fireball");
      cycleEnemyHand(state, slot);
      return;
    }
    if (card === "goblin_barrel") {
      const px = clamp(120 + Math.random() * 560, 24, W - 24);
      const py =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      state.enemyElixir -= cost;
      applyGoblinBarrelStrike(px, py, aiSide, state);
      notifyLastPlayedCard(state, aiSide, "goblin_barrel");
      cycleEnemyHand(state, slot);
      return;
    }
    if (card === "rocket") {
      const px = clamp(120 + Math.random() * 560, 24, W - 24);
      const py =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      state.enemyElixir -= cost;
      applyRocketStrike(px, py, aiSide, state);
      notifyLastPlayedCard(state, aiSide, "rocket");
      cycleEnemyHand(state, slot);
      return;
    }
    if (card === "zap") {
      const px = clamp(120 + Math.random() * 560, 24, W - 24);
      const py =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      state.enemyElixir -= cost;
      applyZapStrike(px, py, aiSide, state);
      notifyLastPlayedCard(state, aiSide, "zap");
      cycleEnemyHand(state, slot);
      return;
    }
    if (card === "freeze") {
      const px = clamp(120 + Math.random() * 560, 24, W - 24);
      const py =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      state.enemyElixir -= cost;
      applyFreezeStrike(px, py, aiSide, state);
      notifyLastPlayedCard(state, aiSide, "freeze");
      cycleEnemyHand(state, slot);
      return;
    }

    if (card === "goblin_drill") {
      const foe = drillDeployFoeSide(aiSide);
      for (let a = 0; a < 12; a++) {
        const gx = 72 + Math.random() * (W - 144);
        const gy =
          foe === "player"
            ? RIVER_BOT + 35 + Math.random() * (H - RIVER_BOT - 70)
            : 36 + Math.random() * (RIVER_TOP - 72);
        if (canDeploy(state, foe, gx, gy)) {
          state.enemyElixir -= cost;
          startDrillDeployment(state, aiSide, gx, gy);
          notifyLastPlayedCard(state, aiSide, "goblin_drill");
          cycleEnemyHand(state, slot);
          return;
        }
      }
      return;
    }

    if (card === "goblin_drill_army") {
      const foe = drillDeployFoeSide(aiSide);
      for (let a = 0; a < 24; a++) {
        const gx = 72 + Math.random() * (W - 144);
        const gy =
          foe === "player"
            ? RIVER_BOT + 35 + Math.random() * (H - RIVER_BOT - 70)
            : 36 + Math.random() * (RIVER_TOP - 72);
        if (canDeploy(state, foe, gx, gy)) {
          state.enemyElixir -= cost;
          startDrillArmyDeployments(state, aiSide, gx, gy);
          notifyLastPlayedCard(state, aiSide, "goblin_drill_army");
          cycleEnemyHand(state, slot);
          return;
        }
      }
      return;
    }

    if (card === "build") {
      const px = clamp(120 + Math.random() * 560, 24, W - 24);
      const py =
        aiSide === "enemy"
          ? clamp(RIVER_BOT + 40 + Math.random() * (H - RIVER_BOT - 80), 24, H - 24)
          : clamp(40 + Math.random() * Math.max(24, RIVER_TOP - 80), 24, H - 24);
      state.enemyElixir -= cost;
      applyBuildRepairSpell(px, py, aiSide, state);
      notifyLastPlayedCard(state, aiSide, "build");
      cycleEnemyHand(state, slot);
      return;
    }

    if (card === "nothing" || card === "nothing_army") {
      state.enemyElixir -= cost;
      notifyLastPlayedCard(state, aiSide, card);
      cycleEnemyHand(state, slot);
      return;
    }

    const x = 260 + Math.random() * 280;
    const y =
      aiSide === "enemy"
        ? 52 + Math.random() * 70
        : RIVER_BOT + 45 + Math.random() * Math.max(40, H - RIVER_BOT - 90);
    if (!canDeploy(state, aiSide, x, y)) return;
    state.enemyElixir -= cost;
    queueDeploySpawn(state, aiSide, card, x, y);
    cycleEnemyHand(state, slot);
  }

  function isArenaWideTapNoSpawnCard(card) {
    return card === "nothing" || card === "nothing_army";
  }

  function canDeploy(state, side, x, y) {
    if (x < 48 || x > W - 48) return false;
    if (isInRiverWater(x, y)) return false;
    const towers = state.towers || [];
    const eL = towers.find((t) => t.id === "eL");
    const eR = towers.find((t) => t.id === "eR");
    const pL = towers.find((t) => t.id === "pL");
    const pR = towers.find((t) => t.id === "pR");
    if (side === "player") {
      if (y > RIVER_BOT && y < H - 36) return true;
      if (y >= 36 && y <= RIVER_BOT) {
        if (eL && eL.hp <= 0 && inPrincessFallGainZone("player", "L", x, y)) return true;
        if (eR && eR.hp <= 0 && inPrincessFallGainZone("player", "R", x, y)) return true;
      }
      return false;
    }
    if (y < RIVER_TOP && y > 36) return true;
    if (y >= RIVER_TOP && y <= H - 36) {
      if (pL && pL.hp <= 0 && inPrincessFallGainZone("enemy", "L", x, y)) return true;
      if (pR && pR.hp <= 0 && inPrincessFallGainZone("enemy", "R", x, y)) return true;
    }
    return false;
  }

  /** Nudge (x,y) until canDeploy — fixes rare PvP mirror misses from float / tap drift. */
  function snapToDeployable(state, side, x, y) {
    if (canDeploy(state, side, x, y)) return { x, y };
    for (let d = 0; d <= 36; d += 3) {
      for (const sx of [-1, 0, 1]) {
        for (const sy of [-1, 0, 1]) {
          if (sx === 0 && sy === 0 && d === 0) continue;
          const xx = x + sx * d;
          const yy = y + sy * d;
          if (canDeploy(state, side, xx, yy)) return { x: xx, y: yy };
        }
      }
    }
    return null;
  }

  function isSpellCardId(card) {
    return (
      card === "arrows" ||
      card === "clone" ||
      card === "fireball" ||
      card === "goblin_barrel" ||
      card === "rocket" ||
      card === "zap" ||
      card === "freeze" ||
      card === "shields" ||
      card === "build" ||
      card === "rage"
    );
  }

  function drawDeployZoneOverlay(ctx, state) {
    if (state.over) return;
    const slot = state.selectedSlot;
    if (slot === null || slot === undefined) return;
    const card = state.hand[slot];
    if (!card) return;

    const hs = humanControlSide(state);
    const myMirror = hs === "player" ? state.lastPlayedBySide.player : state.lastPlayedBySide.enemy;
    const overlayCard =
      card === "mirror" && myMirror && myMirror !== "mirror" ? myMirror : card;

    if (isSpellCardId(overlayCard) || isArenaWideTapNoSpawnCard(overlayCard) || overlayCard === "goblin_drill" || overlayCard === "goblin_drill_army") {
      ctx.save();
      ctx.strokeStyle = "rgba(251, 191, 36, 0.75)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 7]);
      ctx.strokeRect(10.5, 10.5, W - 21, H - 21);
      ctx.fillStyle = "rgba(251, 191, 36, 0.06)";
      ctx.fillRect(10, 10, W - 20, H - 20);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(254, 243, 199, 0.85)";
      ctx.font = "600 11px system-ui";
      let spellHint = "Spell — anywhere in arena";
      let hintX = W / 2 - 72;
      if (overlayCard === "nothing") {
        spellHint = "Nothing — places nothing (tap anywhere)";
        hintX = W / 2 - 132;
      } else if (overlayCard === "nothing_army") {
        spellHint = `Nothing Army — ${NOTHING_ARMY_COUNT}× nothing (still nothing on arena)`;
        hintX = W / 2 - 168;
      } else if (overlayCard === "goblin_drill") {
        spellHint = "Goblin Drill — tap opponent’s grass; burrows from your king (~1s)";
        hintX = W / 2 - 188;
      } else if (overlayCard === "goblin_drill_army") {
        spellHint = `Drill Army (${GOBLIN_DRILL_ARMY_COST} elixir) — tap center on opponent grass; six burrows`;
        hintX = W / 2 - 205;
      }
      ctx.fillText(spellHint, hintX, 24);
      ctx.restore();
      return;
    }

    ctx.save();
    const step = DEPLOY_HINT_STEP;
    ctx.fillStyle = "rgba(34, 197, 94, 0.11)";
    for (let gx = 48 + step / 2; gx < W - 48; gx += step) {
      for (let gy = 36 + step / 2; gy < H - 36; gy += step) {
        if (canDeploy(state, hs, gx, gy)) {
          ctx.fillRect(gx - step * 0.45, gy - step * 0.45, step * 0.9, step * 0.9);
        }
      }
    }
    ctx.strokeStyle = "rgba(34, 197, 94, 0.65)";
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 6]);
    const eL = state.towers.find((t) => t.id === "eL");
    const eR = state.towers.find((t) => t.id === "eR");
    const pL = state.towers.find((t) => t.id === "pL");
    const pR = state.towers.find((t) => t.id === "pR");
    if (hs === "player") {
      ctx.strokeRect(48.5, RIVER_BOT + 0.5, W - 97, H - 36 - RIVER_BOT - 1);
      if (eL && eL.hp <= 0) {
        ctx.strokeStyle = "rgba(52, 211, 153, 0.85)";
        const g = princessFallGainBounds("player", "L");
        ctx.strokeRect(g.x0 + 0.5, g.y0 + 0.5, g.x1 - g.x0 - 0.5, g.y1 - g.y0 - 0.5);
      }
      if (eR && eR.hp <= 0) {
        ctx.strokeStyle = "rgba(52, 211, 153, 0.85)";
        const g = princessFallGainBounds("player", "R");
        ctx.strokeRect(g.x0 + 0.5, g.y0 + 0.5, g.x1 - g.x0 - 0.5, g.y1 - g.y0 - 0.5);
      }
    } else {
      ctx.strokeRect(48.5, 36.5, W - 97, RIVER_TOP - 36.5 - 1);
      if (pL && pL.hp <= 0) {
        ctx.strokeStyle = "rgba(52, 211, 153, 0.85)";
        const g = princessFallGainBounds("enemy", "L");
        ctx.strokeRect(g.x0 + 0.5, g.y0 + 0.5, g.x1 - g.x0 - 0.5, g.y1 - g.y0 - 0.5);
      }
      if (pR && pR.hp <= 0) {
        ctx.strokeStyle = "rgba(52, 211, 153, 0.85)";
        const g = princessFallGainBounds("enemy", "R");
        ctx.strokeRect(g.x0 + 0.5, g.y0 + 0.5, g.x1 - g.x0 - 0.5, g.y1 - g.y0 - 0.5);
      }
    }
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(187, 247, 208, 0.9)";
    ctx.font = "600 11px system-ui";
    ctx.fillText(
      hs === "player"
        ? "Deploy zone — bridges cross the river"
        : "Deploy zone (top team) — bridges cross the river",
      W / 2 - 148,
      24,
    );
    ctx.restore();
  }

  function cardCost(card) {
    if (card === "mirror") return Infinity;
    if (card === "nothing" || card === "nothing_army") return NOTHING_COST;
    if (card === "shields") return SHIELDS_SPELL_COST;
    if (card === "rage") return RAGE_SPELL_COST;
    if (card === "mini_pekka") return MINI_PEKKA_COST;
    if (card === "knight") return KNIGHT_COST;
    if (card === "assassin") return ASSASSIN_COST;
    if (card === "tung_tung_tung_sahur") return TUNG_SAHUR_COST;
    if (card === "heavenly_tung") return HEAVENLY_TUNG_COST;
    if (card === "bir_bir_patapins") return BIR_BIR_PATAPINS_COST;
    if (card === "wizard") return WIZARD_COST;
    if (card === "electro_wizard") return ELECTRO_WIZARD_COST;
    if (card === "tombstone") return TOMBSTONE_COST;
    if (card === "witch") return WITCH_COST;
    if (card === "musketeer") return MUSKETEER_COST;
    if (card === "mega_knight") return MEGA_KNIGHT_COST;
    if (card === "archers") return ARCHERS_COST;
    if (card === "archers_army") return ARCHERS_ARMY_COST;
    if (card === "bat_army") return BAT_ARMY_COST;
    if (card === "mega_knight_army") return MEGA_KNIGHT_ARMY_COST;
    if (card === "goblins") return GOBLINS_COST;
    if (card === "goblin_gang") return GOBLIN_GANG_COST;
    if (card === "chud") return CHUD_COST;
    if (card === "spear_goblins") return SPEAR_GOBLINS_COST;
    if (card === "skarmy") return SKARMY_COST;
    if (card === "mega_army") return MEGA_ARMY_COST;
    if (card === "arrows") return ARROWS_COST;
    if (card === "clone") return CLONE_COST;
    if (card === "fireball") return FIREBALL_COST;
    if (card === "goblin_barrel") return GOBLIN_BARREL_COST;
    if (card === "rocket") return ROCKET_COST;
    if (card === "goblin_hut") return GOBLIN_HUT_COST;
    if (card === "statue") return STATUE_COST;
    if (card === "goblin_drill") return GOBLIN_DRILL_COST;
    if (card === "goblin_drill_army") return GOBLIN_DRILL_ARMY_COST;
    if (card === "build") return BUILD_SPELL_COST;
    if (card === "garrison_tower") return GARRISON_TOWER_COST;
    if (card === "luxury_hotel") return LUXURY_HOTEL_COST;
    if (card === "cannon") return CANNON_COST;
    if (card === "mega_goblin_army") return MEGA_GOBLIN_ARMY_COST;
    if (card === "zap") return ZAP_COST;
    if (card === "freeze") return FREEZE_COST;
    if (card === "bomber") return BOMBER_COST;
    if (card === "bats") return BATS_COST;
    if (card === "boberdino_crocodelo") return BOBERDINO_CROCODELO_COST;
    if (card === "prince_tower") return PRINCE_TOWER_COST;
    return SKELETON_COST;
  }

  /** For menu ordering: Mirror sorts last among normal cards; unknown IDs sort near the end; Nothing sorts after Mirror. */
  function getCardCostNumber(cardId) {
    const id = String(cardId);
    if (id === "nothing") return 100000;
    if (id === "nothing_army") return 100001;
    const c = cardCost(cardId);
    if (c === Infinity) return 99999;
    if (typeof c === "number" && Number.isFinite(c)) return c;
    return 99998;
  }

  function cardUiInfo(cardId) {
    /** Menu / static preview numbers (battle uses {@link effectiveCardCost} for Mirror). */
    const cost =
      cardId === "mirror" ? "?" : typeof cardCost(cardId) === "number" ? cardCost(cardId) : "?";
    if (cardId === "mini_pekka") {
      return { name: "Mini P.E.K.K.A", img: "assets/mini-pekka-w0.svg", cost };
    }
    if (cardId === "knight") return { name: "Knight", img: "assets/knight-w0.svg", cost };
    if (cardId === "assassin")
      return { name: "Assassin", img: "assets/assassin-card.svg", cost };
    if (cardId === "wizard")
      return { name: "Wizard", img: "assets/wizard-card.svg", cost };
    if (cardId === "electro_wizard")
      return { name: "Electro Wizard", img: "assets/electro-wizard-card.svg", cost };
    if (cardId === "tombstone") return { name: "Tombstone", img: "assets/tombstone-card.svg", cost };
    if (cardId === "witch") return { name: "Witch", img: "assets/witch-card.svg", cost };
    if (cardId === "mega_knight")
      return { name: "Mega Knight", img: "assets/mega-knight-card.svg", cost };
    if (cardId === "mega_knight_army")
      return { name: "Mega Knight Army", img: "assets/mega-knight-army-card.svg", cost };
    if (cardId === "musketeer")
      return { name: "Musketeer", img: "assets/musketeer-card.svg", cost };
    if (cardId === "skeleton") return { name: "Skeletons", img: "assets/skeleton-w0.svg", cost };
    if (cardId === "bomber")
      return { name: "Bomber", img: "assets/bomber-w0.svg", cost };
    if (cardId === "goblins") return { name: "Goblins", img: "assets/goblins-card.svg", cost };
    if (cardId === "goblin_gang")
      return { name: "Goblin Gang", img: "assets/goblin-gang-card.svg", cost };
    if (cardId === "chud") return { name: "Chud", img: "assets/chud-card.svg", cost };
    if (cardId === "tung_tung_tung_sahur")
      return {
        name: "Tung Tung Tung Sahur",
        img: "assets/tung-tung-tung-sahur.png",
        cost,
      };
    if (cardId === "heavenly_tung")
      return {
        name: "Heavenly Tung",
        img: "assets/heavenly-tung.png",
        cost,
      };
    if (cardId === "bir_bir_patapins")
      return { name: "Bir Bir Patapins", img: "assets/bir-bir-patapins-v2.png", cost };
    if (cardId === "archers") return { name: "Archers", img: "assets/archer-w0.svg", cost };
    if (cardId === "archers_army")
      return {
        name: "Archers Army",
        img: "assets/archers-army-card.svg",
        cost,
      };
    if (cardId === "spear_goblins")
      return { name: "Spear Goblins", img: "assets/spear-goblins-card.svg", cost };
    if (cardId === "skarmy") return { name: "Skarmy", img: "assets/skarmy-card.svg", cost };
    if (cardId === "mega_army")
      return { name: "Mega Army", img: "assets/mega-army-card.svg", cost };
    if (cardId === "arrows") return { name: "Arrows", img: "assets/arrows-card.svg", cost };
    if (cardId === "clone") return { name: "Clone", img: "assets/clone-card.svg", cost };
    if (cardId === "fireball") return { name: "Fireball", img: "assets/fireball-card.svg", cost };
    if (cardId === "goblin_barrel") return { name: "Goblin Barrel", img: "assets/goblin-barrel-card.svg", cost };
    if (cardId === "rocket") return { name: "Rocket", img: "assets/rocket-card.svg", cost };
    if (cardId === "goblin_hut") return { name: "Goblin Hut", img: "assets/goblin-hut-card.svg", cost };
    if (cardId === "statue") return { name: "Statue", img: "assets/statue-card.svg", cost };
    if (cardId === "goblin_drill") return { name: "Goblin Drill", img: "assets/goblin-drill-card.svg", cost };
    if (cardId === "goblin_drill_army")
      return {
        name: "Goblin Drill Army",
        img: "assets/goblin-drill-army-card.svg",
        cost,
      };
    if (cardId === "build")
      return {
        name: "Build",
        img: "assets/build-card.svg",
        cost,
      };
    if (cardId === "cannon") return { name: "Cannon", img: "assets/cannon-card.svg", cost };
    if (cardId === "garrison_tower")
      return { name: "Garrison Tower", img: "assets/garrison-tower-card.svg", cost };
    if (cardId === "luxury_hotel")
      return { name: "Luxury Hotel", img: "assets/luxury-hotel-card.svg", cost };
    if (cardId === "mega_goblin_army")
      return { name: "Mega Goblin Army", img: "assets/mega-goblin-army-card.svg", cost };
    if (cardId === "zap") return { name: "Zap", img: "assets/zap-card.svg", cost };
    if (cardId === "freeze") return { name: "Freeze", img: "assets/freeze-card.svg", cost };
    if (cardId === "shields") return { name: "Shields", img: "assets/shields-card.svg", cost };
    if (cardId === "rage") return { name: "Rage", img: "assets/rage-card.svg", cost };
    if (cardId === "nothing") return { name: "Nothing", img: "assets/nothing-card.svg", cost };
    if (cardId === "nothing_army")
      return {
        name: "Nothing Army",
        img: "assets/nothing-army-card.svg",
        cost,
      };
    if (cardId === "mirror") return { name: "Mirror", img: "assets/mirror-card.svg", cost };
    if (cardId === "bats") return { name: "Bats", img: "assets/bats-card.svg", cost };
    if (cardId === "bat_army")
      return { name: "Bat Army", img: "assets/bat-army-card.svg", cost };
    if (cardId === "boberdino_crocodelo")
      return {
        name: "Boberdino Crocodelo",
        img: "assets/boberdino-crocodelo-card.png",
        cost,
      };
    if (cardId === "prince_tower") return { name: "Prince Tower", img: "assets/prince-tower-card.svg", cost };
    return { name: String(cardId), img: "assets/skeleton-w0.svg", cost };
  }

  /** Short blurbs for deck builder collection rows (offline menu). */
  const COLLECTION_CARD_DESCRIPTIONS = {
    mini_pekka: "Fast heavy melee — very high damage per swing; hunts ground targets.",
    knight: "Durable melee tank — bridges the river and soaks hits for supports.",
    assassin:
      "Elite duelist — Knight HP and Mini P.E.K.K.A damage; only hunts enemy ground troops. Spawns with a shield; melee splashes half damage to nearby enemy ground troops. After 1s moving toward a foe he charges (purple aura, 2× move, 2× on next hit). Towers ignore him; Goblin Hut ring ignores him.",
    skeleton: "Three cheap skeletons — cycle your deck or distract defenders.",
    bomber:
      "Ranged splash — bombs land past the target (30% slower than other bolts). Evo: purple cap, faster throws, traveling bomb with chained splashes every 0.3s.",
    goblins: "Three melee goblins in a wedge — cheap, fast swarm.",
    archers: "Four ranged archers — ground and air; keep them behind a tank.",
    spear_goblins: "Ranged goblins with spears — cheap chip from behind the river line.",
    archers_army: "Skarmy-sized ring of archers — lots of arrows, weak if splashed.",
    goblin_gang: "Mix of melee and spear goblins — cheap split threat.",
    chud:
      "Heavy melee bruiser — enormous HP and chunky hits; bumps smaller fighters aside. Evo (every other deploy): shockwave every 2s — 100 area damage + knockback.",
    skarmy: "Fifteen skeletons in a ring — surrounds and shreds single targets if not splashed.",
    bat_army: "Fifteen bats in the same spiral — flying swarm; ground melee can’t reach them.",
    mega_army: "Skeletons, shielded guards, and a witch — layered push with spawns.",
    arrows: "Spell — damage in a circle anywhere on arena; hurts troops, towers, and enemy buildings.",
    clone:
      "Spell — duplicates troops in radius (any side). Clones are cyan and always 1 HP; cannot clone clones.",
    fireball: "Spell — projectile from your king; big burst where it lands.",
    goblin_barrel: "Barrel flies like Fireball; spawns three melee goblins on landing (no spell damage).",
    rocket: "Spell — tight, very high blast; strong vs clumped troops and towers.",
    freeze: "Spell — lingering zone that damages once and locks enemies inside in stuns.",
    goblin_hut: "Building — drains over time while spearing enemies who step in its spawn ring.",
    statue:
      "Building — inert stone monument. On death it explodes (small fireball-like blast: 40% less damage).",
    cannon: "Timed cannon — shoots the nearest foe troop or building in range until it breaks.",
    garrison_tower: "Decay tower — one troop hides inside until the structure dies.",
    luxury_hotel: "Two-slot garrison building — hides two troops with special occupancy rules.",
    mega_goblin_army: "Hut-bodied chud plus goblin spawns — long, messy push down a lane.",
    goblin_drill: "Burrows from your king to a spot on enemy grass; drill spawns goblins while alive.",
    goblin_drill_army: "Six drills from your king — ring deployment around your target point on their side.",
    build: "Spell — restores HP to your damaged spawned buildings (huts, drills, etc.) in one splash.",
    zap: "Spell — small radius damage and a short stun on troops and towers.",
    wizard: "Ranged splash attacker — line-of-sight bolts with secondary splash.",
    electro_wizard: "Ranged shots that can stun — good vs medium targets and support.",
    tombstone: "Building — decays over time and periodically spawns skeletons; more on death.",
    mega_knight: "Armored jumper — shadow leap onto clusters, ground splash on landing.",
    mega_knight_army: "Fifteen Mega Knights in the same spiral as Skarmy — pure jump chaos.",
    musketeer: "Long-range single-shot rifle — consistent DPS on one target at a time.",
    tung_tung_tung_sahur:
      "Meme melee — absurd attack rate; explodes on death in a large ring. Evo (slot #1 + 2 cycles): on death, spawns 2 mini Tungs at each princess tower (all 50% stats).",
    heavenly_tung:
      "Super unit — charge, laser phase, then arena nuke; finale spawns 12 Tung Sahur, 3 Mega Goblin Army, and another Heavenly Tung.",
    bir_bir_patapins: "Four flying patapins — ghost/squad rules when they fall.",
    witch: "Splash bolts plus periodic skeleton spawns — back-line value engine.",
    bats: "Five fast flying bats — swarm air/ground from the flanks.",
    prince_tower: "Building — arena tower piece that shoots like a mini defensive turret.",
    boberdino_crocodelo: "Flying bomber — circles a tower and drops repeating small fireballs below.",
    mirror: "Copies your last card’s effect for a higher cost and adds mirror shields on spawns.",
    nothing: "Places nothing — free cycle; tap anywhere to burn the card.",
    nothing_army: "Many sequential nothings — still nothing on the field; tap anywhere.",
    shields: "Spell — temporary shields on your troops and arena towers in the buff radius.",
    rage: "Spell — speeds up allies in the ring and damages enemies once on drop.",
  };

  function collectionCardDescription(cardId) {
    const id = String(cardId);
    return COLLECTION_CARD_DESCRIPTIONS[id] || "Card in your deck — select it in a match to see the full deploy hint.";
  }

  function cyclePlayerHand(state, slot) {
    const next = state.waiting.shift();
    state.waiting.push(state.hand[slot]);
    state.hand[slot] = next;
  }

  function cycleEnemyHand(state, slot) {
    const next = state.enemyWaiting.shift();
    state.enemyWaiting.push(state.enemyHand[slot]);
    state.enemyHand[slot] = next;
  }

  function spawnUnitOrBuildingNow(state, side, card, x, y) {
    const prevTroopLen = state.troops.length;
    if (card === "nothing" || card === "nothing_army") {
      /* Intentional no-op — hand still cycles via caller. */
    } else if (card === "goblin_drill") {
      startDrillDeployment(state, side, x, y);
    } else if (card === "goblin_drill_army") {
      startDrillArmyDeployments(state, side, x, y);
    } else if (card === "goblin_hut") {
      createGoblinHutBuilding(side, x, y, state);
    } else if (card === "statue") {
      createStatueBuilding(side, x, y, state);
    } else if (card === "prince_tower") {
      createPrinceTowerBuilding(side, x, y, state);
    } else if (card === "cannon") {
      createCannonBuilding(side, x, y, state);
    } else if (card === "garrison_tower") {
      createGarrisonTowerBuilding(side, x, y, state);
    } else if (card === "luxury_hotel") {
      createLuxuryHotelBuilding(side, x, y, state);
    } else if (card === "tombstone") {
      createTombstoneBuilding(side, x, y, state);
    } else if (card === "bir_bir_patapins") {
      createBirPatapinSquad(side, x, y, state);
    } else if (
      card === "mini_pekka" ||
      card === "knight" ||
      card === "assassin" ||
      card === "wizard" ||
      card === "electro_wizard" ||
      card === "witch" ||
      card === "mega_knight" ||
      card === "musketeer" ||
      card === "chud" ||
      card === "mega_goblin_army" ||
      card === "tung_tung_tung_sahur" ||
      card === "heavenly_tung" ||
      card === "bomber" ||
      card === "boberdino_crocodelo"
    ) {
      createTroop(side, card, x, y, state);
    } else if (card === "bats") {
      createTroop(side, "bats", x, y, state);
    } else if (card === "archers") {
      createTroop(side, "archers", x, y, state);
    } else if (card === "archers_army") {
      createTroop(side, "archers_army", x, y, state);
    } else if (card === "bat_army") {
      createTroop(side, "bat_army", x, y, state);
    } else if (card === "mega_knight_army") {
      createTroop(side, "mega_knight_army", x, y, state);
    } else if (card === "spear_goblins") {
      createTroop(side, "spear_goblins", x, y, state);
    } else if (card === "goblins") {
      createTroop(side, "goblins", x, y, state);
    } else if (card === "goblin_gang") {
      createTroop(side, "goblin_gang", x, y, state);
    } else if (card === "skarmy") {
      createTroop(side, "skarmy", x, y, state);
    } else if (card === "mega_army") {
      createTroop(side, "mega_army", x, y, state);
    } else {
      createTroop(side, "skeleton", x, y, state);
    }
    if (state.troops.length > prevTroopLen) {
      attachNewTroopsToGarrisonFrom(state, prevTroopLen);
    }
  }

  function queueDeploySpawn(state, side, card, x, y) {
    state.pendingDeploys.push({
      at: state.time + DEPLOY_DELAY_SEC,
      side,
      card,
      x,
      y,
    });
  }

  function processPendingDeploys(state) {
    const q = state.pendingDeploys;
    if (!q || !q.length) return;
    for (let i = q.length - 1; i >= 0; i--) {
      const d = q[i];
      if (state.time < d.at) continue;
      spawnUnitOrBuildingNow(state, d.side, d.card, d.x, d.y);
      notifyLastPlayedCard(state, d.side, d.card);
      q.splice(i, 1);
    }
  }

  function spellInArena(x, y) {
    return x >= 12 && x <= W - 12 && y >= 12 && y <= H - 12;
  }

  function kingTowerForSide(state, side) {
    return state.towers.find((t) => t.side === side && t.kind === "king" && t.hp > 0) || null;
  }

  function applyArrowsStrike(cx, cy, attackerSide, state) {
    const R = ARROWS_SPELL_RADIUS;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === attackerSide) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (dist(u.x, u.y, cx, cy) <= R) {
        applyTroopDamage(u, ARROWS_SPELL_DMG);
      }
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === attackerSide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 34 : 26;
      if (dist(tw.x, tw.y, cx, cy) <= R + ext) {
        applyTowerDamage(state, tw, ARROWS_SPELL_DMG);
      }
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === attackerSide) continue;
      if (dist(bd.x, bd.y, cx, cy) <= R + bd.radius) {
        applyBuildingDamage(state, bd, ARROWS_SPELL_DMG);
      }
    }
    state.arrowFx = { cx, cy, until: state.time + 0.48 };
  }

  function applyCloneSpell(cx, cy, state) {
    const R = CLONE_SPELL_RADIUS;
    const clones = [];
    for (const u of state.troops) {
      if (u.hp <= 0) continue;
      if (u.isClone) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (dist(u.x, u.y, cx, cy) > R) continue;
      clones.push(u);
    }
    if (!clones.length) {
      state.cloneFx = { cx, cy, until: state.time + 0.42 };
      return;
    }
    for (let i = 0; i < clones.length; i++) {
      const src = clones[i];
      const a = ((i + 1) / clones.length) * Math.PI * 2;
      const ox = Math.cos(a) * 8;
      const oy = Math.sin(a) * 8;
      const clone = { ...src };
      clone.id = `u${++state.uid}`;
      clone.x = clamp(src.x + ox, 12, W - 12);
      clone.y = clamp(src.y + oy, 12, H - 12);
      clone.hp = 1;
      clone.maxHp = 1;
      clone.isClone = true;
      clone.spawnTime = state.time;
      clone.lastMeleeAt = -999;
      clone.attackT = 0;
      clone.shieldHp = 0;
      clone.shieldMax = 0;
      if (clone.type === "chud") clone.chudEvoPulseAcc = 0;
      state.troops.push(clone);
    }
    state.cloneFx = { cx, cy, until: state.time + 0.42 };
  }

  function applyFireballStrike(cx, cy, attackerSide, state) {
    const src = kingTowerForSide(state, attackerSide);
    const sx = src ? src.x : cx;
    const sy = src ? src.y + (attackerSide === "enemy" ? 20 : -20) : (attackerSide === "enemy" ? 70 : H - 70);
    const n = norm(cx - sx, cy - sy);
    state.projectiles.push({
      x: sx,
      y: sy,
      vx: n.x * FIREBALL_PROJ_SPEED,
      vy: n.y * FIREBALL_PROJ_SPEED,
      dmg: FIREBALL_SPELL_DMG,
      fromSide: attackerSide,
      hitsTowers: true,
      projKind: "fireball_spell",
      projRadius: 7,
      fireballSpell: true,
      targetX: cx,
      targetY: cy,
    });
  }

  function applyGoblinBarrelStrike(cx, cy, attackerSide, state) {
    const src = kingTowerForSide(state, attackerSide);
    const sx = src ? src.x : cx;
    const sy = src ? src.y + (attackerSide === "enemy" ? 20 : -20) : attackerSide === "enemy" ? 70 : H - 70;
    const n = norm(cx - sx, cy - sy);
    state.projectiles.push({
      x: sx,
      y: sy,
      vx: n.x * FIREBALL_PROJ_SPEED,
      vy: n.y * FIREBALL_PROJ_SPEED,
      fromSide: attackerSide,
      hitsTowers: true,
      projKind: "goblin_barrel",
      projRadius: 7,
      goblinBarrelSpell: true,
      targetX: cx,
      targetY: cy,
    });
  }

  /** Instant mini–Fireball at (cx,cy) — used by Boberdino Crocodelo bomber. */
  function applyBoberdinoBombStrike(cx, cy, attackerSide, state) {
    const R = BOBERDINO_BOMB_RADIUS;
    const dTroop = BOBERDINO_BOMB_SPELL_DMG;
    const dTower = BOBERDINO_BOMB_TOWER_DMG;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === attackerSide) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (dist(u.x, u.y, cx, cy) <= R) {
        applyTroopDamage(u, dTroop);
      }
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === attackerSide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 34 : 26;
      if (dist(tw.x, tw.y, cx, cy) <= R + ext) {
        applyTowerDamage(state, tw, dTower);
      }
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === attackerSide) continue;
      if (dist(bd.x, bd.y, cx, cy) <= R + bd.radius) {
        applyBuildingDamage(state, bd, dTroop);
      }
    }
    state.wizardSplashFx.push({
      cx,
      cy,
      until: state.time + 0.34,
      radius: R,
      kind: "boberdino_mini",
    });
  }

  function applyRocketStrike(cx, cy, attackerSide, state) {
    const src = kingTowerForSide(state, attackerSide);
    const sx = src ? src.x : cx;
    const sy = src ? src.y + (attackerSide === "enemy" ? 20 : -20) : attackerSide === "enemy" ? 70 : H - 70;
    const n = norm(cx - sx, cy - sy);
    state.projectiles.push({
      x: sx,
      y: sy,
      vx: n.x * FIREBALL_PROJ_SPEED,
      vy: n.y * FIREBALL_PROJ_SPEED,
      dmg: ROCKET_SPELL_DMG,
      fromSide: attackerSide,
      hitsTowers: true,
      projKind: "rocket_spell",
      projRadius: 8,
      rocketSpell: true,
      targetX: cx,
      targetY: cy,
    });
  }

  /** Allies gain move + attack speed; enemies take one-time damage (towers/buildings hit like Zap). */
  function applyRageStrike(cx, cy, allySide, state) {
    const R = RAGE_SPELL_RADIUS;
    const rageEnd = state.time + RAGE_BUFF_DURATION_SEC;
    state.rageFx = { cx, cy, until: state.time + 0.42 };
    for (const u of state.troops) {
      if (u.hp <= 0) continue;
      if (dist(u.x, u.y, cx, cy) > R) continue;
      if (u.side === allySide) {
        u.rageUntil = Math.max(u.rageUntil || 0, rageEnd);
        continue;
      }
      if (troopInsideGarrisonAlive(u, state)) continue;
      applyTroopDamage(u, RAGE_SPELL_DMG);
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === allySide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 34 : 26;
      if (dist(tw.x, tw.y, cx, cy) <= R + ext) applyTowerDamage(state, tw, RAGE_SPELL_DMG);
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === allySide) continue;
      if (dist(bd.x, bd.y, cx, cy) <= R + bd.radius) applyBuildingDamage(state, bd, RAGE_SPELL_DMG);
    }
  }

  function applyZapStrike(cx, cy, attackerSide, state) {
    const R = ZAP_SPELL_RADIUS;
    const stunT = state.time + ZAP_STUN_DURATION;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === attackerSide) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (dist(u.x, u.y, cx, cy) <= R) {
        applyTroopDamage(u, ZAP_SPELL_DMG);
        u.stunUntil = Math.max(u.stunUntil || 0, stunT);
        clearTroopAggro(u);
        if (u.type === "mega_knight") resetMegaKnightJump(u);
      }
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === attackerSide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 34 : 26;
      if (dist(tw.x, tw.y, cx, cy) <= R + ext) {
        applyTowerDamage(state, tw, ZAP_SPELL_DMG);
        tw.stunUntil = Math.max(tw.stunUntil || 0, stunT);
        clearTowerAggro(tw);
      }
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === attackerSide) continue;
      if (dist(bd.x, bd.y, cx, cy) <= R + bd.radius) {
        applyBuildingDamage(state, bd, ZAP_SPELL_DMG);
        if (bd.kind === "prince_tower") {
          bd.stunUntil = Math.max(bd.stunUntil || 0, stunT);
          clearPrinceTowerAggro(bd);
        }
      }
    }
    state.zapFx = { cx, cy, until: state.time + 0.38 };
  }

  function applyElectroWizardSpawnPulse(cx, cy, attackerSide, state) {
    const R = ELECTRO_SPAWN_ZAP_RADIUS;
    const dmg = ELECTRO_SPAWN_ZAP_DMG;
    const stunT = state.time + ELECTRO_STUN_SEC;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === attackerSide) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (dist(u.x, u.y, cx, cy) <= R) {
        applyTroopDamage(u, dmg);
        u.stunUntil = Math.max(u.stunUntil || 0, stunT);
        clearTroopAggro(u);
        if (u.type === "mega_knight") resetMegaKnightJump(u);
      }
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === attackerSide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 34 : 26;
      if (dist(tw.x, tw.y, cx, cy) <= R + ext) {
        applyTowerDamage(state, tw, dmg);
        tw.stunUntil = Math.max(tw.stunUntil || 0, stunT);
        clearTowerAggro(tw);
      }
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === attackerSide) continue;
      if (dist(bd.x, bd.y, cx, cy) <= R + bd.radius) {
        applyBuildingDamage(state, bd, dmg);
        if (bd.kind === "prince_tower") {
          bd.stunUntil = Math.max(bd.stunUntil || 0, stunT);
          clearPrinceTowerAggro(bd);
        }
      }
    }
    state.zapFx = { cx, cy, until: state.time + 0.38 };
  }

  function applyFreezeStrike(cx, cy, attackerSide, state) {
    const R = FREEZE_SPELL_RADIUS;
    const until = state.time + FREEZE_DURATION_SEC;
    if (!state.freezeZones) state.freezeZones = [];
    state.freezeZones.push({ cx, cy, R, until, side: attackerSide });
    const stunT = until;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side === attackerSide) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (dist(u.x, u.y, cx, cy) <= R) {
        applyTroopDamage(u, FREEZE_SPELL_DMG);
        u.stunUntil = Math.max(u.stunUntil || 0, stunT);
        clearTroopAggro(u);
        if (u.type === "mega_knight") resetMegaKnightJump(u);
      }
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side === attackerSide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 34 : 26;
      if (dist(tw.x, tw.y, cx, cy) <= R + ext) {
        applyTowerDamage(state, tw, FREEZE_SPELL_DMG);
        tw.stunUntil = Math.max(tw.stunUntil || 0, stunT);
        clearTowerAggro(tw);
      }
    }
    for (const bd of state.buildings || []) {
      if (bd.hp <= 0 || bd.side === attackerSide) continue;
      if (dist(bd.x, bd.y, cx, cy) <= R + bd.radius) {
        applyBuildingDamage(state, bd, FREEZE_SPELL_DMG);
      }
    }
  }

  /** @param {"player"|"enemy"} side Who placed the card — Mirror mirrors your own deck line only. */
  function notifyLastPlayedCard(state, side, playedCard) {
    if (!state || !playedCard || playedCard === "mirror") return;
    if (side === "player") state.lastPlayedBySide.player = playedCard;
    else if (side === "enemy") state.lastPlayedBySide.enemy = playedCard;
  }

  /** @param {"player"|"enemy"} side */
  function mirrorPlayCost(state, side) {
    if (!state) return Infinity;
    const id =
      side === "player" ? state.lastPlayedBySide.player : side === "enemy" ? state.lastPlayedBySide.enemy : null;
    if (!id || id === "mirror") return Infinity;
    return cardCost(id) + MIRROR_EXTRA_ELIXIR;
  }

  /**
   * @param {"player"|"enemy" | undefined} mirrorSide Passing side is required only for decks that are not YOUR hand UI (enemy AI mirror).
   */
  function effectiveCardCost(state, playedCard, mirrorSide) {
    const c = String(playedCard);
    if (c === "mirror") {
      const ms = mirrorSide ?? humanControlSide(state);
      return mirrorPlayCost(state, ms);
    }
    return cardCost(c);
  }

  function grantTroopBuffShield(tr) {
    tr.shieldMax = GENERIC_SHIELD_BUFF_HP;
    tr.shieldHp = GENERIC_SHIELD_BUFF_HP;
  }

  function grantTowerBuffShield(tw) {
    tw.shieldMax = GENERIC_SHIELD_BUFF_HP;
    tw.shieldHp = GENERIC_SHIELD_BUFF_HP;
  }

  function grantBuildingBuffShield(bd) {
    bd.shieldMax = GENERIC_SHIELD_BUFF_HP;
    bd.shieldHp = GENERIC_SHIELD_BUFF_HP;
  }

  /** Swarm-ish deploys — Mirror shields ~⅓ when multiple bodies spawn off one card id. */
  function mirrorTreatsSpawnAsSwarm(mirroredCard) {
    return (
      mirroredCard === "skeleton" ||
      mirroredCard === "archers" ||
      mirroredCard === "skarmy" ||
      mirroredCard === "archers_army" ||
      mirroredCard === "bat_army" ||
      mirroredCard === "mega_knight_army" ||
      mirroredCard === "spear_goblins" ||
      mirroredCard === "goblins" ||
      mirroredCard === "goblin_gang" ||
      mirroredCard === "bats" ||
      mirroredCard === "mega_army" ||
      mirroredCard === "bir_bir_patapins"
    );
  }

  function applyMirrorShieldsAfterSpawn(state, mirroredCard, prevTroopLen, prevBuildingLen, fromSpell) {
    if (fromSpell) return;
    const troopAdded = state.troops.slice(prevTroopLen);
    const bNew = (state.buildings || []).slice(prevBuildingLen);
    for (const bd of bNew) {
      grantBuildingBuffShield(bd);
    }
    if (!troopAdded.length) return;
    if (!mirrorTreatsSpawnAsSwarm(mirroredCard)) {
      for (const t of troopAdded) grantTroopBuffShield(t);
      return;
    }
    const sorted = troopAdded.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const shieldCount = Math.max(1, Math.ceil(sorted.length / 3));
    for (let i = 0; i < shieldCount && i < sorted.length; i++) grantTroopBuffShield(sorted[i]);
  }

  /** Ally spawned buildings (+HP, capped): same footprint as Arrows vs buildings ({@link ARROWS_SPELL_RADIUS} + building radius). */
  function applyBuildRepairSpell(cx, cy, allySide, state) {
    const R = ARROWS_SPELL_RADIUS;
    state.buildRepairFx = { cx, cy, until: state.time + 0.48 };
    for (const bd of state.buildings || []) {
      if (!bd || bd.hp <= 0 || bd.side !== allySide) continue;
      if (dist(bd.x, bd.y, cx, cy) <= R + bd.radius) {
        applyBuildingHealFlat(state, bd, BUILD_SPELL_HEAL);
      }
    }
  }

  /** @param {"player"|"enemy"} side */
  function replayMirroredSpell(state, inner, cx, cy, side) {
    if (inner === "arrows") applyArrowsStrike(cx, cy, side, state);
    else if (inner === "clone") applyCloneSpell(cx, cy, state);
    else if (inner === "fireball") applyFireballStrike(cx, cy, side, state);
    else if (inner === "goblin_barrel") applyGoblinBarrelStrike(cx, cy, side, state);
    else if (inner === "rocket") applyRocketStrike(cx, cy, side, state);
    else if (inner === "zap") applyZapStrike(cx, cy, side, state);
    else if (inner === "freeze") applyFreezeStrike(cx, cy, side, state);
    else if (inner === "shields") applyShieldBuffSpell(cx, cy, side, state);
    else if (inner === "build" || inner === "builder") applyBuildRepairSpell(cx, cy, side, state);
    else if (inner === "rage") applyRageStrike(cx, cy, side, state);
  }

  /** Buff allied troops and arena towers standing in radius (½ Arrows splash). */
  function applyShieldBuffSpell(cx, cy, allySide, state) {
    state.shieldBuffFx = { cx, cy, until: state.time + 0.42 };
    const R = SHIELDS_SPELL_RADIUS;
    for (const u of state.troops) {
      if (u.hp <= 0 || u.side !== allySide) continue;
      if (troopInsideGarrisonAlive(u, state)) continue;
      if (dist(u.x, u.y, cx, cy) <= R) grantTroopBuffShield(u);
    }
    for (const tw of state.towers) {
      if (tw.hp <= 0 || tw.side !== allySide) continue;
      if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
      const ext = tw.kind === "king" ? 34 : 26;
      if (dist(tw.x, tw.y, cx, cy) <= R + ext) grantTowerBuffShield(tw);
    }
  }

  /**
   * @param {"player"|"enemy"} side
   * @returns {boolean}
   */
  function runMirrorReplay(state, side, innerCard, px, py) {
    if (!innerCard || innerCard === "mirror") return false;
    if (innerCard === "builder") innerCard = "build";
    const pt = state.troops.length;
    const pb = (state.buildings || []).length;
    if (innerCard === "goblin_drill" || innerCard === "goblin_drill_army") {
      const foeSide = side === "player" ? "enemy" : "player";
      let gx = px;
      let gy = py;
      if (!canDeploy(state, foeSide, gx, gy)) {
        const sn = snapToDeployable(state, foeSide, gx, gy);
        if (!sn) return false;
        gx = sn.x;
        gy = sn.y;
      }
      spawnUnitOrBuildingNow(state, side, innerCard, gx, gy);
      applyMirrorShieldsAfterSpawn(state, innerCard, pt, pb, false);
      return true;
    }
    if (isSpellCardId(innerCard)) {
      let x = px;
      let y = py;
      if (!spellInArena(x, y)) {
        x = clamp(px, 16, W - 16);
        y = clamp(py, 16, H - 16);
      }
      replayMirroredSpell(state, innerCard, x, y, side);
      applyMirrorShieldsAfterSpawn(state, innerCard, pt, pb, true);
      return true;
    }
    let gx = px;
    let gy = py;
    if (!canDeploy(state, side, gx, gy)) {
      const sn = snapToDeployable(state, side, gx, gy);
      if (!sn) return false;
      gx = sn.x;
      gy = sn.y;
    }
    spawnUnitOrBuildingNow(state, side, innerCard, gx, gy);
    applyMirrorShieldsAfterSpawn(state, innerCard, pt, pb, false);
    return true;
  }

  /** Drop expired zones; keep stuns synced for anyone still inside an active zone. */
  function updateFreezeZones(state, now) {
    if (!state.freezeZones || !state.freezeZones.length) return;
    state.freezeZones = state.freezeZones.filter((z) => z.until > now);
    for (const z of state.freezeZones) {
      const R = z.R;
      const stunT = z.until;
      for (const u of state.troops) {
        if (u.hp <= 0 || u.side === z.side) continue;
        if (dist(u.x, u.y, z.cx, z.cy) <= R) {
          u.stunUntil = Math.max(u.stunUntil || 0, stunT);
        }
      }
      for (const tw of state.towers) {
        if (tw.hp <= 0 || tw.side === z.side) continue;
        if (tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side)) continue;
        const ext = tw.kind === "king" ? 34 : 26;
        if (dist(tw.x, tw.y, z.cx, z.cy) <= R + ext) {
          tw.stunUntil = Math.max(tw.stunUntil || 0, stunT);
        }
      }
      for (const bd of state.buildings || []) {
        if (bd.hp <= 0 || bd.side === z.side) continue;
        if (bd.kind !== "prince_tower") continue;
        if (dist(bd.x, bd.y, z.cx, z.cy) <= R + bd.radius * 1.05) {
          bd.stunUntil = Math.max(bd.stunUntil || 0, stunT);
          clearPrinceTowerAggro(bd);
        }
      }
    }
  }

  const SEEN_MOVES_STORAGE_PREFIX = "na_seen_moves_v1_";
  const SEEN_EMOTES_STORAGE_PREFIX = "na_seen_emotes_v1_";

  /** @param {string} mid */
  function seenMovesStorageKey(mid) {
    return SEEN_MOVES_STORAGE_PREFIX + mid;
  }

  /** @param {string} mid */
  function seenEmotesStorageKey(mid) {
    return SEEN_EMOTES_STORAGE_PREFIX + mid;
  }

  /**
   * Restore dedupe ids so a reconnect / new listener does not replay every historical move as "added".
   * @param {string} matchId
   * @param {Set<string>} into
   */
  function loadSeenIdsFromStorage(matchId, into) {
    try {
      const raw = sessionStorage.getItem(seenMovesStorageKey(matchId));
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) for (const id of arr) into.add(String(id));
    } catch (_) {}
  }

  /**
   * @param {string} matchId
   * @param {Set<string>} from
   */
  function loadSeenEmoteIdsFromStorage(matchId, from) {
    try {
      const raw = sessionStorage.getItem(seenEmotesStorageKey(matchId));
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) for (const id of arr) from.add(String(id));
    } catch (_) {}
  }

  function persistSeenMoveIds() {
    const mid = battleNet.matchId;
    if (!mid) return;
    try {
      const arr = [...battleNet.seenMoveIds];
      const cap = 500;
      const trimmed = arr.length > cap ? arr.slice(-cap) : arr;
      sessionStorage.setItem(seenMovesStorageKey(mid), JSON.stringify(trimmed));
    } catch (_) {}
  }

  function persistSeenEmoteIds() {
    const mid = battleNet.matchId;
    if (!mid) return;
    try {
      const arr = [...battleNet.seenEmoteIds];
      const cap = 200;
      const trimmed = arr.length > cap ? arr.slice(-cap) : arr;
      sessionStorage.setItem(seenEmotesStorageKey(mid), JSON.stringify(trimmed));
    } catch (_) {}
  }

  const battleNet = {
    matchId: "",
    guestId: "",
    opponentGuestId: /** @type {string | null} */ (null),
    /** `players[0]` = Player 1, `players[1]` = Player 2 (match order). Null until roster loads. */
    myPlayerSlot: /** @type {null | 0 | 1} */ (null),
    unsub: /** @type {null | (() => void)} */ (null),
    unsubMatch: /** @type {null | (() => void)} */ (null),
    unsubEmotes: /** @type {null | (() => void)} */ (null),
    seenMoveIds: /** @type {Set<string>} */ (new Set()),
    seenEmoteIds: /** @type {Set<string>} */ (new Set()),
    endWritten: false,
  };

  function tearDownBattleNet() {
    if (battleNet.unsub) {
      battleNet.unsub();
      battleNet.unsub = null;
    }
    if (battleNet.unsubMatch) {
      battleNet.unsubMatch();
      battleNet.unsubMatch = null;
    }
    if (battleNet.unsubEmotes) {
      battleNet.unsubEmotes();
      battleNet.unsubEmotes = null;
    }
    battleNet.matchId = "";
    battleNet.guestId = "";
    battleNet.opponentGuestId = null;
    battleNet.myPlayerSlot = null;
    battleNet.seenMoveIds = new Set();
    battleNet.seenEmoteIds = new Set();
    battleNet.endWritten = false;
    battleNet._endRetries = 0;
  }

  /**
   * Match doc `players` is ordered: index 0 = Player 1, 1 = Player 2.
   * @param {unknown[]} players
   * @param {string} myGuestId
   */
  function syncBattleRoster(players, myGuestId) {
    if (!Array.isArray(players) || players.length < 2 || !myGuestId) return;
    const p0 = players[0];
    const p1 = players[1];
    if (typeof p0 !== "string" || typeof p1 !== "string") return;
    if (myGuestId === p0) {
      battleNet.myPlayerSlot = 0;
      battleNet.opponentGuestId = p1 !== p0 ? p1 : null;
    } else if (myGuestId === p1) {
      battleNet.myPlayerSlot = 1;
      battleNet.opponentGuestId = p0 !== p1 ? p0 : null;
    } else {
      battleNet.myPlayerSlot = null;
      battleNet.opponentGuestId =
        p0 !== myGuestId ? p0 : p1 !== myGuestId ? p1 : null;
    }
  }

  function applyAuthoritativeResult(wonByGuest) {
    const state = stateRef.current;
    if (!state || !battleNet.guestId) return;
    if (wonByGuest === battleNet.guestId) {
      state.crownsPlayer = 3;
      state.crownsEnemy = Math.min(state.crownsEnemy, 2);
      state.over = true;
      state.winner = "player";
      battleNet.endWritten = true;
      state.localEmote = null;
      state.remoteEmote = null;
    } else if (wonByGuest && battleNet.opponentGuestId && wonByGuest === battleNet.opponentGuestId) {
      state.crownsEnemy = 3;
      state.crownsPlayer = Math.min(state.crownsPlayer, 2);
      state.over = true;
      state.winner = "enemy";
      battleNet.endWritten = true;
      state.localEmote = null;
      state.remoteEmote = null;
    }
  }

  function pushMatchEndIfBattle(state) {
    if (!battleNet.matchId || !battleNet.guestId || battleNet.endWritten) return;
    if (!state.over || !state.winner) return;
    if (!battleNet.opponentGuestId) {
      battleNet._endRetries = (battleNet._endRetries || 0) + 1;
      if (battleNet._endRetries < 25) {
        setTimeout(() => pushMatchEndIfBattle(state), 200);
      }
      return;
    }
    battleNet._endRetries = 0;
    battleNet.endWritten = true;
    const wonBy = state.winner === "player" ? battleNet.guestId : battleNet.opponentGuestId;
    firebase
      .firestore()
      .collection("battle_matches")
      .doc(battleNet.matchId)
      .set(
        {
          result: {
            wonBy,
            at: firebase.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      )
      .catch(() => {});
  }

  function applyRemoteBattleDeploy(x, y, card) {
    const state = stateRef.current;
    if (!state || state.over) return;
    /** PvP: never block opponent spawns on elixir — local regen can drift under lag and would drop real troops. */
    const relaxRemoteElixir = state.matchMode === "battle";
    const yMir = H - y;
    if (
      card !== "mini_pekka" &&
      card !== "knight" &&
      card !== "assassin" &&
      card !== "skeleton" &&
      card !== "bomber" &&
      card !== "goblins" &&
      card !== "goblin_gang" &&
      card !== "archers_army" &&
      card !== "archers" &&
      card !== "skarmy" &&
      card !== "bat_army" &&
      card !== "mega_army" &&
      card !== "arrows" &&
      card !== "clone" &&
      card !== "fireball" &&
      card !== "goblin_barrel" &&
      card !== "rocket" &&
      card !== "goblin_hut" &&
      card !== "statue" &&
      card !== "cannon" &&
      card !== "garrison_tower" &&
      card !== "luxury_hotel" &&
      card !== "tombstone" &&
      card !== "mega_goblin_army" &&
      card !== "zap" &&
      card !== "freeze" &&
      card !== "spear_goblins" &&
      card !== "wizard" &&
      card !== "electro_wizard" &&
      card !== "mega_knight" &&
      card !== "mega_knight_army" &&
      card !== "musketeer" &&
      card !== "chud" &&
      card !== "tung_tung_tung_sahur" &&
      card !== "heavenly_tung" &&
      card !== "bir_bir_patapins" &&
      card !== "witch" &&
      card !== "bats" &&
      card !== "boberdino_crocodelo" &&
      card !== "prince_tower" &&
      card !== "shields" &&
      card !== "rage" &&
      card !== "nothing" &&
      card !== "nothing_army" &&
      card !== "goblin_drill" &&
      card !== "goblin_drill_army" &&
      card !== "build"
    )
      return;
    const cost = cardCost(card);
    if (!relaxRemoteElixir && state.enemyElixir < cost) return;
    if (card === "arrows") {
      const cx = clamp(x, 16, W - 16);
      const cy = clamp(yMir, 16, H - 16);
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      applyArrowsStrike(cx, cy, "enemy", state);
      notifyLastPlayedCard(state, "enemy", "arrows");
      return;
    }
    if (card === "clone") {
      const cx = clamp(x, 16, W - 16);
      const cy = clamp(yMir, 16, H - 16);
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      applyCloneSpell(cx, cy, state);
      notifyLastPlayedCard(state, "enemy", "clone");
      return;
    }
    if (card === "fireball") {
      const cx = clamp(x, 16, W - 16);
      const cy = clamp(yMir, 16, H - 16);
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      applyFireballStrike(cx, cy, "enemy", state);
      notifyLastPlayedCard(state, "enemy", "fireball");
      return;
    }
    if (card === "goblin_barrel") {
      const cx = clamp(x, 16, W - 16);
      const cy = clamp(yMir, 16, H - 16);
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      applyGoblinBarrelStrike(cx, cy, "enemy", state);
      notifyLastPlayedCard(state, "enemy", "goblin_barrel");
      return;
    }
    if (card === "rocket") {
      const cx = clamp(x, 16, W - 16);
      const cy = clamp(yMir, 16, H - 16);
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      applyRocketStrike(cx, cy, "enemy", state);
      notifyLastPlayedCard(state, "enemy", "rocket");
      return;
    }
    if (card === "zap") {
      const cx = clamp(x, 16, W - 16);
      const cy = clamp(yMir, 16, H - 16);
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      applyZapStrike(cx, cy, "enemy", state);
      notifyLastPlayedCard(state, "enemy", "zap");
      return;
    }
    if (card === "freeze") {
      const cx = clamp(x, 16, W - 16);
      const cy = clamp(yMir, 16, H - 16);
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      applyFreezeStrike(cx, cy, "enemy", state);
      notifyLastPlayedCard(state, "enemy", "freeze");
      return;
    }
    if (card === "shields") {
      const cx = clamp(x, 16, W - 16);
      const cy = clamp(yMir, 16, H - 16);
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      applyShieldBuffSpell(cx, cy, "enemy", state);
      notifyLastPlayedCard(state, "enemy", "shields");
      return;
    }
    if (card === "build") {
      const cx = clamp(x, 16, W - 16);
      const cy = clamp(yMir, 16, H - 16);
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      applyBuildRepairSpell(cx, cy, "enemy", state);
      notifyLastPlayedCard(state, "enemy", "build");
      return;
    }
    if (card === "rage") {
      const cx = clamp(x, 16, W - 16);
      const cy = clamp(yMir, 16, H - 16);
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      applyRageStrike(cx, cy, "enemy", state);
      notifyLastPlayedCard(state, "enemy", "rage");
      return;
    }
    if (card === "goblin_drill") {
      let gx = clamp(x, 16, W - 16);
      let gy = clamp(yMir, 16, H - 16);
      const foe = drillDeployFoeSide("enemy");
      if (!canDeploy(state, foe, gx, gy)) {
        const sn = snapToDeployable(state, foe, gx, gy);
        if (!sn) return;
        gx = sn.x;
        gy = sn.y;
      }
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      startDrillDeployment(state, "enemy", gx, gy);
      notifyLastPlayedCard(state, "enemy", "goblin_drill");
      return;
    }
    if (card === "goblin_drill_army") {
      let gx = clamp(x, 16, W - 16);
      let gy = clamp(yMir, 16, H - 16);
      const foe = drillDeployFoeSide("enemy");
      if (!canDeploy(state, foe, gx, gy)) {
        const sn = snapToDeployable(state, foe, gx, gy);
        if (!sn) return;
        gx = sn.x;
        gy = sn.y;
      }
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      startDrillArmyDeployments(state, "enemy", gx, gy);
      notifyLastPlayedCard(state, "enemy", "goblin_drill_army");
      return;
    }
    if (card === "nothing" || card === "nothing_army") {
      state.enemyElixir = Math.max(0, state.enemyElixir - cost);
      notifyLastPlayedCard(state, "enemy", card);
      return;
    }
    const snapped = snapToDeployable(state, "enemy", x, yMir);
    if (!snapped) return;
    state.enemyElixir = Math.max(0, state.enemyElixir - cost);
    /** Opponent’s units always use side `"enemy"` on this client (their grass is mirrored). */
    queueDeploySpawn(state, "enemy", card, snapped.x, snapped.y);
  }

  function setupBattleNet(matchId, guestId) {
    tearDownBattleNet();
    if (!matchId || !guestId) return;
    if (typeof firebase === "undefined" || !firebase.apps.length) return;
    battleNet.matchId = matchId;
    battleNet.guestId = guestId;
    battleNet.seenMoveIds = new Set();
    loadSeenIdsFromStorage(matchId, battleNet.seenMoveIds);
    battleNet.seenEmoteIds = new Set();
    loadSeenEmoteIdsFromStorage(matchId, battleNet.seenEmoteIds);
    const db = firebase.firestore();
    const mref = db.collection("battle_matches").doc(matchId);
    mref
      .get()
      .then((snap) => {
        const p = snap.data()?.players;
        if (Array.isArray(p) && p.length >= 2) syncBattleRoster(p, guestId);
      })
      .catch(() => {});

    battleNet.unsubMatch = mref.onSnapshot((snap) => {
      const d = snap.data();
      if (!d) return;
      const pl = d.players;
      if (Array.isArray(pl) && pl.length >= 2) syncBattleRoster(pl, guestId);
      const r = d.result?.wonBy;
      if (r && typeof r === "string") applyAuthoritativeResult(r);
    });

    const cref = mref.collection("moves");
    battleNet.unsub = cref.onSnapshot((snap) => {
      snap.docChanges().forEach((ch) => {
        if (ch.type !== "added") return;
        const id = ch.doc.id;
        const d = ch.doc.data();
        if (!d || d.by === battleNet.guestId) return;
        if (battleNet.opponentGuestId && d.by !== battleNet.opponentGuestId) return;
        if (battleNet.seenMoveIds.has(id)) return;
        battleNet.seenMoveIds.add(id);
        persistSeenMoveIds();
        applyRemoteBattleDeploy(Number(d.x), Number(d.y), String(d.card));
      });
    });

    const eref = mref.collection("emotes");
    battleNet.unsubEmotes = eref.onSnapshot((snap) => {
      snap.docChanges().forEach((ch) => {
        if (ch.type !== "added") return;
        const id = ch.doc.id;
        const d = ch.doc.data();
        if (!d || d.by === battleNet.guestId) return;
        if (battleNet.seenEmoteIds.has(id)) return;
        battleNet.seenEmoteIds.add(id);
        persistSeenEmoteIds();
        const em = String(d.emoji || "👋");
        const st = stateRef.current;
        if (st) {
          st.remoteEmote = { text: em, until: st.time + 2.8, side: "enemy" };
        }
      });
    });
  }

  function pushBattleDeploy(card, x, y) {
    if (!battleNet.matchId || !battleNet.guestId) return;
    if (typeof firebase === "undefined" || !firebase.apps.length) return;
    const moveDocId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${battleNet.guestId}_${Date.now()}_${((Math.random() * 1e9) | 0)}`;
    const payload = {
      by: battleNet.guestId,
      card,
      x,
      y,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const col = firebase.firestore().collection("battle_matches").doc(battleNet.matchId).collection("moves");
    const trySet = (attempt) => {
      col
        .doc(moveDocId)
        .set(payload)
        .catch(() => {
          if (attempt < 3) {
            setTimeout(() => trySet(attempt + 1), 180 + attempt * 120);
          }
        });
    };
    trySet(0);
  }

  function pushEmote(emoji) {
    const st = stateRef.current;
    if (st) st.localEmote = { text: emoji, until: st.time + 2.2, side: "player" };
    if (!battleNet.matchId || !battleNet.guestId) return;
    if (typeof firebase === "undefined" || !firebase.apps.length) return;
    firebase
      .firestore()
      .collection("battle_matches")
      .doc(battleNet.matchId)
      .collection("emotes")
      .add({
        by: battleNet.guestId,
        emoji,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .catch(() => {});
  }

  function trySpawnPlayer(state, x, y) {
    if (state.selectedSlot === null || state.selectedSlot === undefined || state.over) return false;
    const slot = state.selectedSlot;
    const card = state.hand[slot];
    if (!card) return false;
    const hs = humanControlSide(state);
    const inf = playerInfiniteElixir(state);
    const cost = effectiveCardCost(state, card, hs);
    if (!inf && (!Number.isFinite(cost) || state.playerElixir < cost)) return false;

    let px = x;
    let py = y;

    if (card === "mirror") {
      const inner =
        hs === "player" ? state.lastPlayedBySide.player : state.lastPlayedBySide.enemy;
      if (!inner || inner === "mirror") return false;
      if (!runMirrorReplay(state, hs, inner, px, py)) return false;
      if (!inf) state.playerElixir -= cost;
      notifyLastPlayedCard(state, hs, inner);
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy(inner, px, py);
      return true;
    }

    if (card === "shields") {
      if (!spellInArena(px, py)) {
        px = clamp(x, 16, W - 16);
        py = clamp(y, 16, H - 16);
      }
      if (!inf) state.playerElixir -= cost;
      applyShieldBuffSpell(px, py, hs, state);
      notifyLastPlayedCard(state, hs, "shields");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy("shields", px, py);
      return true;
    }

    if (card === "build") {
      if (!spellInArena(px, py)) {
        px = clamp(x, 16, W - 16);
        py = clamp(y, 16, H - 16);
      }
      if (!inf) state.playerElixir -= cost;
      applyBuildRepairSpell(px, py, hs, state);
      notifyLastPlayedCard(state, hs, "build");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy("build", px, py);
      return true;
    }

    if (card === "arrows") {
      if (!spellInArena(px, py)) {
        px = clamp(x, 16, W - 16);
        py = clamp(y, 16, H - 16);
      }
      if (!inf) state.playerElixir -= cost;
      applyArrowsStrike(px, py, hs, state);
      notifyLastPlayedCard(state, hs, "arrows");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy(card, px, py);
      return true;
    }

    if (card === "clone") {
      if (!spellInArena(px, py)) {
        px = clamp(x, 16, W - 16);
        py = clamp(y, 16, H - 16);
      }
      if (!inf) state.playerElixir -= cost;
      applyCloneSpell(px, py, state);
      notifyLastPlayedCard(state, hs, "clone");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy(card, px, py);
      return true;
    }

    if (card === "fireball") {
      if (!spellInArena(px, py)) {
        px = clamp(x, 16, W - 16);
        py = clamp(y, 16, H - 16);
      }
      if (!inf) state.playerElixir -= cost;
      applyFireballStrike(px, py, hs, state);
      notifyLastPlayedCard(state, hs, "fireball");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy(card, px, py);
      return true;
    }

    if (card === "goblin_barrel") {
      if (!spellInArena(px, py)) {
        px = clamp(x, 16, W - 16);
        py = clamp(y, 16, H - 16);
      }
      if (!inf) state.playerElixir -= cost;
      applyGoblinBarrelStrike(px, py, hs, state);
      notifyLastPlayedCard(state, hs, "goblin_barrel");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy("goblin_barrel", px, py);
      return true;
    }

    if (card === "rocket") {
      if (!spellInArena(px, py)) {
        px = clamp(x, 16, W - 16);
        py = clamp(y, 16, H - 16);
      }
      if (!inf) state.playerElixir -= cost;
      applyRocketStrike(px, py, hs, state);
      notifyLastPlayedCard(state, hs, "rocket");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy(card, px, py);
      return true;
    }

    if (card === "zap") {
      if (!spellInArena(px, py)) {
        px = clamp(x, 16, W - 16);
        py = clamp(y, 16, H - 16);
      }
      if (!inf) state.playerElixir -= cost;
      applyZapStrike(px, py, hs, state);
      notifyLastPlayedCard(state, hs, "zap");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy(card, px, py);
      return true;
    }

    if (card === "freeze") {
      if (!spellInArena(px, py)) {
        px = clamp(x, 16, W - 16);
        py = clamp(y, 16, H - 16);
      }
      if (!inf) state.playerElixir -= cost;
      applyFreezeStrike(px, py, hs, state);
      notifyLastPlayedCard(state, hs, "freeze");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy(card, px, py);
      return true;
    }

    if (card === "rage") {
      if (!spellInArena(px, py)) {
        px = clamp(x, 16, W - 16);
        py = clamp(y, 16, H - 16);
      }
      if (!inf) state.playerElixir -= cost;
      applyRageStrike(px, py, hs, state);
      notifyLastPlayedCard(state, hs, "rage");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy("rage", px, py);
      return true;
    }

    if (card === "goblin_drill") {
      const foe = drillDeployFoeSide(hs);
      let dx = px;
      let dy = py;
      if (!spellInArena(dx, dy)) {
        dx = clamp(x, 16, W - 16);
        dy = clamp(y, 16, H - 16);
      }
      if (!canDeploy(state, foe, dx, dy)) {
        const sn = snapToDeployable(state, foe, dx, dy);
        if (!sn) return false;
        dx = sn.x;
        dy = sn.y;
      }
      if (!inf) state.playerElixir -= cost;
      startDrillDeployment(state, hs, dx, dy);
      notifyLastPlayedCard(state, hs, "goblin_drill");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy("goblin_drill", dx, dy);
      return true;
    }

    if (card === "goblin_drill_army") {
      const foe = drillDeployFoeSide(hs);
      let ax = px;
      let ay = py;
      if (!spellInArena(ax, ay)) {
        ax = clamp(x, 16, W - 16);
        ay = clamp(y, 16, H - 16);
      }
      if (!canDeploy(state, foe, ax, ay)) {
        const sn = snapToDeployable(state, foe, ax, ay);
        if (!sn) return false;
        ax = sn.x;
        ay = sn.y;
      }
      if (!inf) state.playerElixir -= cost;
      startDrillArmyDeployments(state, hs, ax, ay);
      notifyLastPlayedCard(state, hs, "goblin_drill_army");
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy("goblin_drill_army", ax, ay);
      return true;
    }

    if (card === "nothing" || card === "nothing_army") {
      if (!inf) state.playerElixir -= cost;
      notifyLastPlayedCard(state, hs, card);
      cyclePlayerHand(state, slot);
      state.selectedSlot = null;
      pushBattleDeploy(card, px, py);
      return true;
    }

    if (!canDeploy(state, hs, px, py)) {
      const sn = snapToDeployable(state, hs, px, py);
      if (!sn) return false;
      px = sn.x;
      py = sn.y;
    }
    if (!inf) state.playerElixir -= cost;
    queueDeploySpawn(state, hs, card, px, py);
    cyclePlayerHand(state, slot);
    state.selectedSlot = null;
    pushBattleDeploy(card, px, py);
    return true;
  }

  function spawnSkeletonsFromWitch(witch, state) {
    const faceY = witch.side === "player" ? -1 : 1;
    const offs = [
      [-7, 5],
      [7, 5],
    ];
    for (const [ox, oy] of offs) {
      const sx = witch.x + ox;
      const sy = witch.y + oy * faceY;
      state.troops.push({
        id: `u${++state.uid}`,
        side: witch.side,
        type: "skeleton",
        x: sx,
        y: sy,
        hp: SKELETON_HP,
        maxHp: SKELETON_HP,
        speed: SPEED_SKELETON,
        radius: 4,
        path: "fight",
        bridgeIx: pickBridgeIx(sx, sy),
        spawnTime: state.time,
        lastMeleeAt: -999,
        hitInterval: ATTACK_INTERVAL_SKELETON,
        hitDamage: SKELETON_DMG,
        meleeRange: 15,
        attackT: 0,
        faceX: 0,
        faceY,
        stunUntil: 0,
        combatLocked: false,
      });
      ensureBridgeLaneOx(state.troops[state.troops.length - 1]);
    }
  }

  function updateWitchSpawns(dt, state) {
    for (const u of state.troops) {
      if (u.hp <= 0 || u.type !== "witch") continue;
      u.witchSpawnAcc = (u.witchSpawnAcc || 0) + dt;
      if (u.witchSpawnAcc < WITCH_SPAWN_INTERVAL) continue;
      u.witchSpawnAcc = 0;
      spawnSkeletonsFromWitch(u, state);
    }
  }

  function updateBirPatapinEnrage(state) {
    /** @type {Record<string, number>} */
    const ghostsBySquad = {};
    for (const u of state.troops) {
      if (u.type !== "bir_patapin" || !u.patapinSquad) continue;
      if (u.patapinGhost) ghostsBySquad[u.patapinSquad] = (ghostsBySquad[u.patapinSquad] || 0) + 1;
    }
    for (const u of state.troops) {
      if (u.type !== "bir_patapin") continue;
      if (u.patapinGhost) {
        u.patapinSpeedMul = 1;
        u.patapinAttackMul = 1;
        continue;
      }
      const dead = u.patapinSquad ? ghostsBySquad[u.patapinSquad] || 0 : 0;
      const mul = dead >= 3 ? 5 : dead >= 2 ? 3 : dead >= 1 ? 1.5 : 1;
      u.patapinSpeedMul = mul;
      u.patapinAttackMul = mul;
    }
  }

  function stepSimulation(dt, state) {
    if (state.localEmote && state.time >= state.localEmote.until) state.localEmote = null;
    if (state.remoteEmote && state.time >= state.remoteEmote.until) state.remoteEmote = null;
    if (state.arrowFx && state.time >= state.arrowFx.until) state.arrowFx = null;
    if (state.cloneFx && state.time >= state.cloneFx.until) state.cloneFx = null;
    if (state.fireballFx && state.time >= state.fireballFx.until) state.fireballFx = null;
    if (state.goblinBarrelFx && state.time >= state.goblinBarrelFx.until) state.goblinBarrelFx = null;
    if (state.rocketFx && state.time >= state.rocketFx.until) state.rocketFx = null;
    if (state.zapFx && state.time >= state.zapFx.until) state.zapFx = null;
    if (state.rageFx && state.time >= state.rageFx.until) state.rageFx = null;
    if (state.shieldBuffFx && state.time >= state.shieldBuffFx.until) state.shieldBuffFx = null;
    if (state.buildRepairFx && state.time >= state.buildRepairFx.until) state.buildRepairFx = null;
    if (state.wizardSplashFx && state.wizardSplashFx.length) {
      state.wizardSplashFx = state.wizardSplashFx.filter((w) => state.time < w.until);
    }
    if (state.over) return;
    state.time += dt;
    const now = state.time;
    resolvePvpBattleRegulation(state);
    const elixirMult = pvpBattleElixirMultiplier(state);

    state.playerElixir = Math.min(
      MAX_ELIXIR,
      state.playerElixir + ELIXIR_PER_SEC * elixirMult * dt,
    );
    if (playerInfiniteElixir(state)) state.playerElixir = MAX_ELIXIR;
    state.enemyElixir = Math.min(
      MAX_ELIXIR,
      state.enemyElixir + ELIXIR_PER_SEC * elixirMult * dt,
    );
    if (trainingInfiniteTowerHp(state)) {
      for (const tw of state.towers || []) {
        if (tw && tw.hp > 0 && typeof tw.maxHp === "number") tw.hp = tw.maxHp;
      }
    }
    processPendingDeploys(state);
    updateDrillDeployments(state);
    updateGoblinDrillDecay(dt, state);
    updateWitchSpawns(dt, state);
    updateBirPatapinEnrage(state);
    updateHeavenlyTungRage(dt, state);

    if (!battleNet.matchId) {
      enemyBrain(dt, state);
    }

    updateGoblinHutDecay(dt, state);
    updateHutSpawns(dt, state);
    updateGoblinDrillSpawns(dt, state);
    updateTombstoneDecay(dt, state);
    updateCannonDecay(dt, state);
    updateGarrisonTowerDecay(dt, state);
    updateTombstoneSkeletonSpawns(dt, state);

    for (const u of state.troops) {
      updateMegaKnight(u, dt, state, now);
    }
    for (const u of state.troops) {
      const ax = u.type === "assassin" ? u.x : 0;
      const ay = u.type === "assassin" ? u.y : 0;
      updateTroopNavAndMove(dt, u, state);
      if (u.type === "assassin") {
        const moved = (u.x - ax) ** 2 + (u.y - ay) ** 2 > 0.015;
        updateAssassinChargeWindup(dt, u, state, moved);
      }
      if (u.type === "chud") updateChudEvoPulse(dt, u, state);
    }
    resolveTroopCollisions(state.troops);
    resolveTroopBuildingCollisions(state.troops, state.buildings);
    updateFreezeZones(state, now);
    updateMegaGoblinArmyHutSpawns(dt, state);
    for (const u of state.troops) {
      if (troopActsOnBattlefield(u) && u.attackT > 0) {
        const rMul = troopRageMultiplier(u, now);
        u.attackT -= dt * rMul;
        if (u.attackT < 0) u.attackT = 0;
      }
    }
    for (const u of state.troops) {
      updateFacingTowardTarget(u, state, dt);
    }
    for (const u of state.troops) {
      tryMelee(u, state, now);
    }
    for (const u of state.troops) {
      rangedTroopShoot(state, u, now);
    }

    updateProjectiles(dt, state);

    for (const tower of state.towers) {
      towerShoot(state, tower, now);
    }
    for (const bd of state.buildings || []) {
      if (bd.kind === "cannon") cannonBuildingShoot(state, bd, now);
      else if (bd.kind === "prince_tower") princeTowerBuildingShoot(state, bd, now);
    }

    processMegaGoblinArmyDeathSpawns(state);
  }

  function drawCrowns(ctx, state) {
    const drawSet = (startX, filled, dir) => {
      for (let i = 0; i < 3; i++) {
        const x = startX + i * dir * 22;
        const active = i < filled;
        ctx.save();
        ctx.translate(x, 20);
        ctx.fillStyle = active ? "#fde047" : "rgba(30,41,59,0.85)";
        ctx.strokeStyle = active ? "#ca8a04" : "rgba(100,116,139,0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(-7, -2);
        ctx.lineTo(-3, -6);
        ctx.lineTo(0, -3);
        ctx.lineTo(3, -6);
        ctx.lineTo(7, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    };

    ctx.save();
    drawSet(52, state.crownsEnemy, 1);
    drawSet(W - 52 - 44, state.crownsPlayer, -1);
    ctx.restore();
  }

  function drawStars(ctx) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    const pts = [
      [80, 38],
      [140, 22],
      [620, 48],
      [720, 28],
      [520, 18],
      [360, 52],
      [240, 26],
    ];
    for (const [sx, sy] of pts) {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMoon(ctx) {
    const mx = W - 72;
    const my = 48;
    const g = ctx.createRadialGradient(mx, my, 4, mx, my, 38);
    g.addColorStop(0, "rgba(255,248,220,0.95)");
    g.addColorStop(0.45, "rgba(200,210,240,0.25)");
    g.addColorStop(1, "rgba(200,210,240,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, 38, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawNightArena(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, RIVER_TOP);
    sky.addColorStop(0, "#0d1528");
    sky.addColorStop(1, "#152238");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, RIVER_TOP);

    drawMoon(ctx);
    drawStars(ctx);

    const grassN = ctx.createLinearGradient(0, 0, 0, RIVER_TOP);
    grassN.addColorStop(0, "rgba(45,72,52,0.35)");
    grassN.addColorStop(1, "rgba(30,52,40,0.85)");
    ctx.fillStyle = grassN;
    ctx.fillRect(0, 40, W, RIVER_TOP - 40);

    const riverGrad = ctx.createLinearGradient(0, RIVER_TOP, 0, RIVER_BOT);
    riverGrad.addColorStop(0, "#1a3a5c");
    riverGrad.addColorStop(0.5, "#0f2844");
    riverGrad.addColorStop(1, "#152d48");
    ctx.fillStyle = riverGrad;
    ctx.fillRect(0, RIVER_TOP, W, RIVER_BOT - RIVER_TOP);

    ctx.strokeStyle = "rgba(120,180,255,0.06)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const wy = RIVER_TOP + 12 + i * 16;
      ctx.beginPath();
      ctx.moveTo(0, wy);
      for (let x = 0; x <= W; x += 24) {
        ctx.lineTo(x, wy + Math.sin((x + i * 40) * 0.04) * 2);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < W; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, RIVER_TOP);
      ctx.lineTo(x, RIVER_BOT);
      ctx.stroke();
    }

    const grassS = ctx.createLinearGradient(0, RIVER_BOT, 0, H);
    grassS.addColorStop(0, "rgba(28,48,36,0.9)");
    grassS.addColorStop(1, "#1a3024");
    ctx.fillStyle = grassS;
    ctx.fillRect(0, RIVER_BOT, W, H - RIVER_BOT);

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, W, H);

    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBridge(ctx, cx, cy) {
    const img = SPRITES.bridge;
    const deckW = 46;
    const deckH = RIVER_BOT - RIVER_TOP + 16;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, cx - deckW / 2, cy - deckH / 2, deckW, deckH);
    } else {
      ctx.fillStyle = "#4a5568";
      ctx.fillRect(cx - deckW / 2, cy - deckH / 2, deckW, deckH);
    }
    ctx.restore();
  }

  function drawTower(ctx, tower, state) {
    const img =
      tower.kind === "king" ? SPRITES.towerKing : SPRITES.towerPrincess;
    const tw = tower.kind === "king" ? 44 : 40;
    const th = tower.kind === "king" ? 52 : 48;
    const px = tower.x - tw / 2;
    const py = tower.y - th / 2;
    if (tower.hp <= 0) {
      ctx.globalAlpha = 0.28;
    }
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = tower.kind === "king" ? 14 : 8;
    ctx.shadowOffsetY = 4;
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, px, py, tw, th);
    } else {
      ctx.fillStyle = tower.kind === "king" ? "#8b7355" : "#7a8aa3";
      ctx.fillRect(px, py, tw, th);
    }
    const now = state ? state.time : 0;
    const hs = state ? humanControlSide(state) : "player";
    if (tower.hp > 0 && state && towerStunned(tower, now) && tower.side !== hs) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
      ctx.fillRect(px, py, tw, th);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    const pct = Math.max(0, tower.hp / tower.maxHp);
    const smax = tower.shieldMax != null ? tower.shieldMax : 0;
    const shp = tower.shieldHp != null ? tower.shieldHp : 0;
    const drawSh = smax > 0 && shp > 0;
    if (tower.side === "enemy") {
      let y = py + th + 5;
      if (drawSh) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(px, y, tw, 6);
        ctx.fillStyle = "rgba(56,189,248,0.95)";
        ctx.fillRect(px, y, tw * (shp / smax), 6);
        y += 8;
      }
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px, y, tw, 6);
      ctx.fillStyle = pct > 0.35 ? "#4ade80" : "#f87171";
      ctx.fillRect(px, y, tw * pct, 6);
    } else {
      const hpY = py - 12;
      if (drawSh) {
        const sy = py - 22;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(px, sy, tw, 6);
        ctx.fillStyle = "rgba(56,189,248,0.95)";
        ctx.fillRect(px, sy, tw * (shp / smax), 6);
      }
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px, hpY, tw, 6);
      ctx.fillStyle = pct > 0.35 ? "#4ade80" : "#f87171";
      ctx.fillRect(px, hpY, tw * pct, 6);
    }
  }

  function pickWalkImage(frames, wf) {
    const n = frames && frames.length;
    if (!n) return /** @type {HTMLImageElement | null} */ (null);
    const i0 = ((wf % n) + n) % n;
    for (let k = 0; k < n; k++) {
      const im = frames[(i0 + k) % n];
      if (im && im.complete && im.naturalWidth > 0) return im;
    }
    return frames[i0];
  }

  function troopVisual(u, state) {
    const wf = walkFrameIndex(state);
    if (u.type === "mini_pekka") {
      return {
        img: pickWalkImage(SPRITES.miniWalk, wf),
        s: DRAW_PX_UNIT,
        atkMax: 0.32,
        lunge: 8,
        tilt: 0.32,
        slashW: 2.6,
        arcR: 18,
        fallback: "#3b82f6",
      };
    }
    if (u.type === "assassin") {
      return {
        /** Drawn in {@link drawUnit} — knight body + Mini P.E.K.K.A head, purple fusion. */
        img: null,
        s: DRAW_PX_UNIT,
        atkMax: u.assassinCharging ? 0.22 : 0.32,
        lunge: u.assassinCharging ? 10 : 8,
        tilt: 0.3,
        slashW: u.assassinCharging ? 2.7 : 2.4,
        arcR: u.assassinCharging ? 19 : 17,
        fallback: "#7c3aed",
      };
    }
    if (u.type === "tung_tung_tung_sahur") {
      return {
        img: SPRITES.tungSahur,
        s: 64,
        atkMax: 0.018,
        lunge: 12,
        tilt: 0.55,
        slashW: 2.4,
        arcR: 24,
        fallback: "#c4a574",
      };
    }
    if (u.type === "heavenly_tung") {
      return {
        img: SPRITES.heavenlyTung,
        s: 64,
        atkMax: 0.018,
        lunge: 12,
        tilt: 0.55,
        slashW: 2.4,
        arcR: 24,
        fallback: "#fef9c3",
      };
    }
    if (u.type === "bir_patapin") {
      return {
        img: SPRITES.birPatapin,
        s: 44,
        atkMax: 0.22,
        lunge: 7,
        tilt: 0.36,
        slashW: 2.2,
        arcR: 17,
        fallback: "#15803d",
      };
    }
    if (u.type === "knight") {
      return {
        img: pickWalkImage(SPRITES.knightWalk, wf),
        s: DRAW_PX_UNIT,
        atkMax: 0.26,
        lunge: 7,
        tilt: 0.38,
        slashW: 2.2,
        arcR: 16,
        fallback: "#94a3b8",
      };
    }
    if (u.type === "chud" || u.type === "mega_goblin_army") {
      return {
        img: pickWalkImage(SPRITES.chudWalk, wf),
        s: 46,
        atkMax: 0.38,
        lunge: 7,
        tilt: 0.34,
        slashW: 2.8,
        arcR: 20,
        fallback: "#15803d",
      };
    }
    if (u.type === "mega_knight") {
      return {
        img: pickWalkImage(SPRITES.megaKnightWalk, wf),
        s: 40,
        atkMax: 0.34,
        lunge: 9,
        tilt: 0.42,
        slashW: 2.8,
        arcR: 20,
        fallback: "#ca8a04",
      };
    }
    if (u.type === "archer") {
      return {
        img: pickWalkImage(SPRITES.archerWalk, wf),
        s: 15,
        atkMax: 0.22,
        lunge: 3,
        tilt: 0.2,
        slashW: 1.2,
        arcR: 10,
        fallback: "#db2777",
      };
    }
    if (u.type === "spear_goblin") {
      return {
        img: pickWalkImage(SPRITES.spearGoblinWalk, wf),
        s: 12,
        atkMax: 0.22,
        lunge: 3,
        tilt: 0.2,
        slashW: 1.2,
        arcR: 10,
        fallback: "#16a34a",
      };
    }
    if (u.type === "bomber") {
      return {
        img: pickWalkImage(SPRITES.bomberWalk, wf),
        s: DRAW_PX_SKEL,
        atkMax: 0.22,
        lunge: 3,
        tilt: 0.2,
        slashW: 1.2,
        arcR: 10,
        fallback: "#38bdf8",
      };
    }
    if (u.type === "wizard") {
      return {
        img: pickWalkImage(SPRITES.wizardWalk, wf),
        s: 22,
        atkMax: 0.22,
        lunge: 3,
        tilt: 0.2,
        slashW: 1.2,
        arcR: 10,
        fallback: "#a855f7",
      };
    }
    if (u.type === "electro_wizard") {
      return {
        img: pickWalkImage(SPRITES.electroWizardWalk, wf),
        s: 22,
        atkMax: 0.22,
        lunge: 3,
        tilt: 0.2,
        slashW: 1.2,
        arcR: 10,
        fallback: "#38bdf8",
      };
    }
    if (u.type === "witch") {
      return {
        img: pickWalkImage(SPRITES.witchWalk, wf),
        s: 24,
        atkMax: 0.22,
        lunge: 3,
        tilt: 0.2,
        slashW: 1.2,
        arcR: 10,
        fallback: "#166534",
      };
    }
    if (u.type === "musketeer") {
      return {
        img: pickWalkImage(SPRITES.musketeerWalk, wf),
        s: 27,
        atkMax: 0.24,
        lunge: 3,
        tilt: 0.22,
        slashW: 1.2,
        arcR: 12,
        fallback: "#2563eb",
      };
    }
    if (u.type === "goblin") {
      return {
        img: pickWalkImage(SPRITES.spearGoblinWalk, wf),
        s: 14,
        atkMax: 0.18,
        lunge: 5,
        tilt: 0.42,
        slashW: 1.5,
        arcR: 12,
        fallback: "#16a34a",
      };
    }
    if (u.type === "skeleton_guard") {
      return {
        img: pickWalkImage(SPRITES.skelWalk, wf),
        s: DRAW_PX_SKEL,
        atkMax: 0.18,
        lunge: 5,
        tilt: 0.48,
        slashW: 1.5,
        arcR: 12,
        fallback: "#7dd3fc",
      };
    }
    if (u.type === "bat") {
      return {
        img: pickWalkImage(SPRITES.batWalk, wf),
        s: 11,
        atkMax: 0.14,
        lunge: 4,
        tilt: 0.35,
        slashW: 1.1,
        arcR: 9,
        fallback: "#7c3aed",
      };
    }
    if (u.type === "boberdino_crocodelo") {
      return {
        img: SPRITES.boberdinoCrocodelo,
        s: 60,
        atkMax: 0,
        lunge: 0,
        tilt: 0,
        slashW: 1,
        arcR: 12,
        fallback: "#94a3b8",
      };
    }
    return {
      img: pickWalkImage(SPRITES.skelWalk, wf),
      s: DRAW_PX_SKEL,
      atkMax: 0.18,
      lunge: 5,
      tilt: 0.48,
      slashW: 1.5,
      arcR: 12,
      fallback: "#e2e8f0",
    };
  }

  function drawUnit(ctx, u, state) {
    const vis = troopVisual(u, state);
    if (patapinGhostActive(u)) {
      ctx.globalAlpha = 0.5;
    } else if (u.hp <= 0 && !heavenlyTungRageActive(u)) {
      ctx.globalAlpha = 0.25;
    }

    if (u.hp > 0 && u.type === "mega_goblin_army" && state) {
      ctx.save();
      const active = foeInGoblinHutRange(u, state);
      const pulse = 0.55 + 0.08 * Math.sin((state.time || 0) * (active ? 5 : 2.2));
      ctx.globalAlpha = active ? 0.22 * pulse : 0.12 * pulse;
      ctx.fillStyle = active ? "rgba(250,204,21,0.35)" : "rgba(148,163,184,0.25)";
      ctx.beginPath();
      ctx.arc(u.x, u.y, HUT_TRIGGER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = active ? 0.55 + 0.15 * pulse : 0.32;
      ctx.strokeStyle = active ? "rgba(250,204,21,0.85)" : "rgba(148,163,184,0.65)";
      ctx.lineWidth = active ? 2.2 : 1.5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(u.x, u.y, HUT_TRIGGER_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    const atkK = vis.atkMax > 0 ? clamp(u.attackT / vis.atkMax, 0, 1) : 0;
    const swing = atkK > 0 ? Math.sin((1 - atkK) * Math.PI) : 0;
    const lunge = swing * vis.lunge;
    let faceX = u.faceX;
    let faceY = u.faceY;
    if (u.type === "mega_knight" && Math.abs(faceX) < 1e-4 && Math.abs(faceY) < 1e-4) {
      faceX = 0;
      faceY = u.side === "player" ? -1 : 1;
    }
    const ang = Math.atan2(faceY, faceX);
    let lx = faceX * lunge;
    let ly = faceY * lunge;
    const tilt = swing * (u.side === "player" ? -1 : 1) * vis.tilt;
    let drawY = u.flying ? u.y - 12 : u.y;
    if (u.type === "mega_knight" && u.mkJumpPhase === 1 && u.mkWindupT > 0) {
      const w = clamp(1 - u.mkWindupT / MEGA_KNIGHT_WINDUP, 0, 1);
      // Wind-up: stand still and compress slightly before launch.
      drawY = u.y + 2.5 * w;
    } else if (u.type === "mega_knight" && u.mkJumpPhase === 2 && u.mkJumpT > 0) {
      const jt = clamp(1 - u.mkJumpT / MEGA_KNIGHT_JUMP_DURATION, 0, 1);
      const h = (1 - jt) * (1 - jt) * 128;
      drawY = u.y - h;
      const sh = 1 - (h / 90) * 0.65;
      ctx.save();
      ctx.globalAlpha = 0.32 * sh;
      ctx.fillStyle = "rgba(15,23,42,0.75)";
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + u.radius * 0.65, 16 + 12 * sh, 6 + 2 * sh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Fast-fall streaks.
      ctx.save();
      ctx.globalAlpha = 0.22 + (1 - jt) * 0.28;
      ctx.strokeStyle = "rgba(226,232,240,0.45)";
      ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        const ox = i * 4.5;
        ctx.beginPath();
        ctx.moveTo(u.x + ox, drawY - 18);
        ctx.lineTo(u.x + ox, drawY + 8);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (u.hp > 0 && u.type === "assassin" && u.assassinCharging && state) {
      ctx.save();
      const pulse = 0.55 + 0.14 * Math.sin((state.time || 0) * 11);
      ctx.globalAlpha = 0.26 + 0.2 * pulse;
      ctx.fillStyle = `rgba(124, 58, 237, ${0.35 + 0.25 * pulse})`;
      ctx.beginPath();
      ctx.arc(u.x, drawY, u.radius + 15 + pulse * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.72 + 0.2 * pulse;
      ctx.strokeStyle = `rgba(196, 181, 253, ${0.92})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(u.x, drawY, u.radius + 18 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.35 * pulse;
      ctx.strokeStyle = "rgba(91, 33, 182, 0.8)";
      ctx.lineWidth = 1.25;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.arc(u.x, drawY, u.radius + 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(u.x + lx, drawY + ly);
    ctx.rotate(tilt);
    ctx.scale(1 + swing * 0.12, 1 + swing * 0.08);
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = u.type === "boberdino_crocodelo";
    if (u.type === "assassin") {
      const wf = walkFrameIndexForTroop(state, u);
      const mini = pickWalkImage(SPRITES.miniWalk, wf);
      const knight = pickWalkImage(SPRITES.knightWalk, wf);
      const s = vis.s;
      const headH = s * 0.4;
      /** Purple reads as texture (multiply) instead of flat source-atop wash. */
      const drawClipTexturePurple = (img, clipTop, clipH, multiplyRgb, strength) => {
        if (!img || !img.complete || !img.naturalWidth) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(-s / 2, clipTop, s, clipH);
        ctx.clip();
        ctx.drawImage(img, -s / 2, -s / 2, s, s);
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = multiplyRgb;
        ctx.globalAlpha = strength;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.restore();
      };
      if (knight && knight.complete && knight.naturalWidth > 0) {
        drawClipTexturePurple(knight, -s / 2 + headH, s - headH, "rgb(155, 115, 215)", 0.38);
      }
      if (mini && mini.complete && mini.naturalWidth > 0) {
        drawClipTexturePurple(mini, -s / 2, headH, "rgb(175, 135, 235)", 0.32);
      }
      if (
        !(knight && knight.complete && knight.naturalWidth > 0) &&
        !(mini && mini.complete && mini.naturalWidth > 0)
      ) {
        ctx.fillStyle = vis.fallback;
        ctx.beginPath();
        ctx.arc(0, 0, u.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (vis.img && vis.img.complete && vis.img.naturalWidth > 0) {
      if (u.type === "boberdino_crocodelo") ctx.rotate(ang);
      ctx.drawImage(vis.img, -vis.s / 2, -vis.s / 2, vis.s, vis.s);
    } else if (u.type === "boberdino_crocodelo") {
      ctx.rotate(ang);
      ctx.fillStyle = vis.fallback;
      ctx.beginPath();
      ctx.ellipse(0, 0, u.radius, u.radius * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      ctx.fillStyle = vis.fallback;
      ctx.beginPath();
      ctx.arc(0, 0, u.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (u.type === "mega_goblin_army") {
      const hx = 0;
      const hy = -vis.s * 0.4;
      ctx.fillStyle = "#78350f";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, hy - 10);
      ctx.lineTo(hx + 11, hy + 1);
      ctx.lineTo(hx - 11, hy + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const hw = 20;
      const hh = 12;
      ctx.fillStyle = "#92400e";
      ctx.fillRect(hx - hw / 2, hy + 1, hw, hh);
      ctx.strokeRect(hx - hw / 2, hy + 1, hw, hh);
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(hx - 3, hy + 4, 6, 7);
      ctx.fillStyle = "rgba(254,243,199,0.45)";
      ctx.fillRect(hx - 8, hy + 2, 4, 3);
    }
    if (u.type === "bomber" && u.bomberEvo) {
      const capY = -vis.s * 0.36;
      const rw = vis.s * 0.24;
      const rh = vis.s * 0.12;
      ctx.fillStyle = "#6d28d9";
      ctx.fillRect(-rw * 1.15, capY + rh * 0.2, rw * 2.3, rh * 0.7);
      ctx.strokeStyle = "#4c1d95";
      ctx.lineWidth = 0.9;
      ctx.strokeRect(-rw * 1.15, capY + rh * 0.2, rw * 2.3, rh * 0.7);
      ctx.fillStyle = "#7c3aed";
      ctx.beginPath();
      ctx.ellipse(0, capY, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(196, 181, 253, 0.55)";
      ctx.beginPath();
      ctx.ellipse(-rw * 0.35, capY - rh * 0.15, rw * 0.2, rh * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (u.type === "chud" && u.chudEvo) {
      // Evo Chud: blue pants accent on lower body.
      const pantsTop = vis.s * 0.06;
      const pantsH = vis.s * 0.44;
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(37, 99, 235, 0.5)";
      ctx.fillRect(-vis.s * 0.42, pantsTop, vis.s * 0.84, pantsH);
      ctx.strokeStyle = "rgba(147, 197, 253, 0.85)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-vis.s * 0.22, pantsTop + 2);
      ctx.lineTo(-vis.s * 0.22, pantsTop + pantsH);
      ctx.moveTo(vis.s * 0.22, pantsTop + 2);
      ctx.lineTo(vis.s * 0.22, pantsTop + pantsH);
      ctx.stroke();
      ctx.restore();
    }
    if (u.type === "tung_tung_tung_sahur" && u.tungEvo) {
      // Evo Tung: glowing red eyes.
      const eyeY = -vis.s * 0.12;
      const ex = vis.s * 0.13;
      const er = Math.max(1.3, vis.s * 0.055);
      ctx.save();
      ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
      ctx.shadowColor = "rgba(239, 68, 68, 0.95)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(-ex, eyeY, er, 0, Math.PI * 2);
      ctx.arc(ex, eyeY, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(254, 242, 242, 0.95)";
      ctx.beginPath();
      ctx.arc(-ex - er * 0.15, eyeY - er * 0.15, er * 0.33, 0, Math.PI * 2);
      ctx.arc(ex - er * 0.15, eyeY - er * 0.15, er * 0.33, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (u.isClone) {
      // Glassy cyan clone look inspired by vial-style art.
      const shell = vis.s * 0.56;
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      const grad = ctx.createLinearGradient(0, -vis.s / 2, 0, vis.s / 2);
      grad.addColorStop(0, "rgba(103, 232, 249, 0.56)");
      grad.addColorStop(0.6, "rgba(34, 211, 238, 0.34)");
      grad.addColorStop(1, "rgba(8, 145, 178, 0.42)");
      ctx.fillStyle = grad;
      ctx.fillRect(-vis.s / 2 - 3, -vis.s / 2 - 3, vis.s + 6, vis.s + 6);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(224, 255, 255, 0.22)";
      ctx.fillRect(-vis.s * 0.2, -vis.s * 0.35, vis.s * 0.12, vis.s * 0.65);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = "rgba(165, 243, 252, 0.9)";
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.ellipse(u.x, drawY - 2, shell, shell * 0.84, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    {
      const hs = state ? humanControlSide(state) : "player";
      const foeStunned =
        state &&
        troopActsOnBattlefield(u) &&
        troopStunned(u, state.time) &&
        u.side !== hs;
      if (foeStunned) {
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(6, 182, 212, 0.42)";
        ctx.fillRect(-vis.s / 2 - 3, -vis.s / 2 - 3, vis.s + 6, vis.s + 6);
        ctx.restore();
      }
      if (
        state &&
        u.hp > 0 &&
        troopActsOnBattlefield(u) &&
        u.rageUntil != null &&
        state.time < u.rageUntil
      ) {
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(220, 38, 38, 0.26)";
        ctx.fillRect(-vis.s / 2 - 3, -vis.s / 2 - 3, vis.s + 6, vis.s + 6);
        ctx.restore();
      }
    }
    ctx.imageSmoothingEnabled = smooth;
    ctx.restore();

    /** Guard-style cyan bubble — skeleton guards plus Shields spell / Mirror buff on any troop. Scales with draw size & hitbox radius. */
    if (
      u.hp > 0 &&
      state &&
      (u.shieldHp ?? 0) > 0 &&
      (u.shieldMax ?? 0) > 0
    ) {
      ctx.save();
      const pulse = 0.92 + 0.07 * Math.sin((state.time || 0) * 5.5);
      const hull = Math.max(vis.s, (u.radius > 0 ? u.radius : 4) * 2.55);
      const rx = (hull * 0.52 + 7) * pulse;
      const ry = (hull * 0.48 + 6) * pulse;
      const scl = Math.min(1.45, hull / 24);
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = "rgba(56,189,248,0.75)";
      ctx.beginPath();
      ctx.ellipse(u.x, drawY - 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.88;
      ctx.strokeStyle = "rgba(186,230,253,0.98)";
      ctx.lineWidth = Math.max(1.6, 2.2 * scl);
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.ellipse(u.x, drawY - 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "rgba(224,242,254,0.95)";
      ctx.lineWidth = Math.max(0.95, 1.1 * scl);
      ctx.beginPath();
      ctx.ellipse(u.x, drawY - 3, rx * 0.72, ry * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (heavenlyTungRageActive(u) && u.heavenlyPhase === "charge" && state) {
      const elapsed = state.time - u.heavenlyPhaseStart;
      const prog = clamp(elapsed / HEAVENLY_TUNG_CHARGE_SEC, 0, 1);
      const r = HEAVENLY_TUNG_CHARGE_MAX_R * prog;
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgba(0,0,0,${0.18 + 0.52 * prog})`;
      ctx.beginPath();
      ctx.arc(u.x, drawY, Math.max(4, r), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = `rgba(15,23,42,${0.55 + 0.35 * prog})`;
      ctx.lineWidth = 2 + prog * 2;
      ctx.beginPath();
      ctx.arc(u.x, drawY, Math.max(4, r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (troopActsOnBattlefield(u) && atkK > 0) {
      ctx.save();
      const mkReach = u.type === "mega_knight" ? 22 : 0;
      ctx.translate(u.x + faceX * mkReach, drawY + faceY * mkReach);
      ctx.rotate(ang);
      ctx.strokeStyle =
        u.type === "mini_pekka"
          ? "rgba(147,197,253,0.95)"
          : u.type === "assassin"
            ? "rgba(192,132,252,0.95)"
          : u.type === "tung_tung_tung_sahur"
            ? "rgba(234,179,8,0.95)"
            : u.type === "heavenly_tung"
              ? "rgba(250,204,21,0.95)"
            : u.type === "bir_patapin"
              ? "rgba(74,222,128,0.95)"
            : u.type === "electro_wizard"
              ? "rgba(56,189,248,0.95)"
              : u.type === "mega_knight"
                ? "rgba(251,191,36,0.95)"
                : u.type === "chud" || u.type === "mega_goblin_army"
                ? "rgba(134,239,172,0.95)"
                : u.type === "bat"
                  ? "rgba(167,139,250,0.95)"
                : u.type === "bomber"
                  ? "rgba(56,189,248,0.92)"
                  : "rgba(255,255,255,0.9)";
      ctx.lineWidth = vis.slashW;
      ctx.lineCap = "round";
      const sweep = (1 - atkK) * 1.1;
      const arcR = u.type === "mega_knight" ? vis.arcR * 1.15 : vis.arcR;
      ctx.beginPath();
      ctx.arc(0, 0, arcR, -0.2, -0.2 + sweep);
      ctx.stroke();
      ctx.strokeStyle = "rgba(251,191,36,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, arcR + 3, -0.35, -0.35 + sweep * 0.9);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;

    if (
      ((u.hp > 0 && !patapinGhostActive(u)) || heavenlyTungRageActive(u)) &&
      (u.maxHp > 1 || ((u.shieldMax ?? 0) > 0 && (u.shieldHp ?? 0) > 0))
    ) {
      const bw =
        u.type === "mini_pekka" || u.type === "assassin"
          ? 34
          : u.type === "knight"
            ? 30
            : u.type === "tung_tung_tung_sahur"
              ? 44
            : u.type === "heavenly_tung"
              ? 44
            : u.type === "bir_patapin"
              ? 36
            : u.type === "mega_knight"
              ? 38
            : u.type === "chud" || u.type === "mega_goblin_army"
              ? 40
            : u.type === "archer"
              ? 19
              : u.type === "goblin"
                ? 22
              : u.type === "spear_goblin"
                ? 18
              : u.type === "wizard" || u.type === "electro_wizard"
              ? 28
              : u.type === "witch"
                ? 28
              : u.type === "musketeer"
                ? 32
              : u.type === "bomber"
                ? 20
                : 18;
      let by = u.y + u.radius + 7;
      const smax = u.shieldMax != null ? u.shieldMax : 0;
      const shp = u.shieldHp != null ? u.shieldHp : 0;
      if (smax > 0 && shp > 0) {
        const spct = shp / smax;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(u.x - bw / 2, by, bw, 4);
        ctx.fillStyle = "rgba(56,189,248,0.95)";
        ctx.fillRect(u.x - bw / 2, by, bw * spct, 4);
        by += 6;
      }
      if (heavenlyTungRageActive(u) && state) {
        const pulse = 0.82 + 0.18 * Math.sin((state.time || 0) * 14);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(u.x - bw / 2, by, bw, 4);
        ctx.fillStyle = `rgba(250,204,21,${0.65 + 0.35 * pulse})`;
        ctx.fillRect(u.x - bw / 2, by, bw * pulse, 4);
      } else if (u.maxHp > 1) {
        const pct = u.hp / u.maxHp;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(u.x - bw / 2, by, bw, 4);
        ctx.fillStyle = u.side === "player" ? "#7dd3fc" : "#fca5a5";
        ctx.fillRect(u.x - bw / 2, by, bw * pct, 4);
      }
    }
  }

  function drawProjectiles(ctx, projectiles) {
    for (const p of projectiles) {
      const r = p.projRadius ?? PROJ_RADIUS;
      const kind = p.projKind ?? "princess";
      ctx.save();
      ctx.translate(p.x, p.y);
      const ang = Math.atan2(p.vy, p.vx);
      ctx.rotate(ang);
      if (kind === "king") {
        ctx.shadowColor = "rgba(124,58,237,0.9)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(-r * 2, -r * 0.6, r * 4, r * 1.2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fef9c3";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === "princess") {
        ctx.fillStyle = "#38bdf8";
        ctx.strokeStyle = "#0c4a6e";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(r * 1.1, 0);
        ctx.lineTo(0, r * 1.1);
        ctx.lineTo(-r * 1.1, 0);
        ctx.lineTo(0, -r * 1.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (kind === "spear") {
        ctx.fillStyle = "#86efac";
        ctx.strokeStyle = "#14532d";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r * 2.2, 0);
        ctx.lineTo(-r * 0.6, r * 0.75);
        ctx.lineTo(-r * 0.15, 0);
        ctx.lineTo(-r * 0.6, -r * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (kind === "wizard") {
        ctx.shadowColor = "rgba(168,85,247,0.95)";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#c084fc";
        ctx.strokeStyle = "#581c87";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fae8ff";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === "witch") {
        ctx.shadowColor = "rgba(22,163,74,0.9)";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#4ade80";
        ctx.strokeStyle = "#14532d";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#dcfce7";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === "musket") {
        ctx.fillStyle = "#cbd5e1";
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        ctx.fillRect(-r * 2.8, -r * 0.45, r * 5.2, r * 0.9);
        ctx.strokeRect(-r * 2.8, -r * 0.45, r * 5.2, r * 0.9);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-r * 3.1, -r * 0.35, r * 0.55, r * 0.7);
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(r * 2.35, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === "bomber") {
        const evo = !!p.bomberEvo;
        ctx.fillStyle = evo ? "#3b0764" : "#0f172a";
        ctx.strokeStyle = evo ? "#581c87" : "#020617";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, r * 0.15, r * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = evo ? "#e9d5ff" : "#facc15";
        ctx.lineWidth = 0.8;
        ctx.setLineDash([1.2, 1.2]);
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.05);
        ctx.lineTo(r * 0.35, -r * 1.35);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = evo ? "rgba(216,180,254,0.45)" : "rgba(250,250,250,0.25)";
        ctx.beginPath();
        ctx.arc(-r * 0.4, -r * 0.2, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        if (evo) {
          ctx.shadowColor = "rgba(168,85,247,0.85)";
          ctx.shadowBlur = 10;
          ctx.strokeStyle = "rgba(196,181,253,0.9)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, r * 0.15, r * 1.22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      } else if (kind === "cannon_ball") {
        ctx.fillStyle = "#27272a";
        ctx.strokeStyle = "#18181b";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(250,250,250,0.35)";
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.35, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === "goblin_barrel") {
        ctx.fillStyle = "#78350f";
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.ellipse(0, r * 0.1, r * 1.5, r * 1.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#a16207";
        ctx.strokeStyle = "#713f12";
        ctx.beginPath();
        ctx.moveTo(r * 0.85, -r * 0.55);
        ctx.lineTo(-r * 1.15, -r * 0.15);
        ctx.lineTo(-r * 1.15, r * 0.45);
        ctx.lineTo(r * 0.85, r * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(253,230,138,0.85)";
        ctx.beginPath();
        ctx.arc(r * 0.45, -r * 0.15, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === "rocket_spell") {
        ctx.shadowColor = "rgba(248,113,113,0.92)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#dc2626";
        ctx.strokeStyle = "#991b1b";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(r * 2.15, 0);
        ctx.lineTo(-r * 1.1, r * 0.62);
        ctx.lineTo(-r * 1.45, 0);
        ctx.lineTo(-r * 1.1, -r * 0.62);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(254,226,226,0.9)";
        ctx.beginPath();
        ctx.arc(r * -0.15, r * -0.1, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(254,249,244,0.75)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-r * 2.2, 0);
        ctx.lineTo(-r * 3.35, -r * 0.08);
        ctx.lineTo(-r * 2.95, -r * 0.28);
        ctx.lineTo(-r * 4.1, -r * 0.52);
        ctx.lineTo(-r * 3.95, -r * 0.88);
        ctx.stroke();
      } else if (kind === "fireball_spell") {
        ctx.shadowColor = "rgba(251,146,60,0.95)";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#fb923c";
        ctx.strokeStyle = "#7c2d12";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fde68a";
        ctx.beginPath();
        ctx.arc(r * 0.25, -r * 0.1, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(254,215,170,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-r * 1.9, 0);
        ctx.lineTo(-r * 3.2, 0);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#fbcfe8";
        ctx.strokeStyle = "#9d174d";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r * 2.2, 0);
        ctx.lineTo(-r * 0.6, r * 0.75);
        ctx.lineTo(-r * 0.15, 0);
        ctx.lineTo(-r * 0.6, -r * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawGoblinDrillBurrowFx(ctx, state) {
    const dd = state.drillDeployments;
    if (!dd || !dd.length) return;
    ctx.save();
    for (const d of dd) {
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "rgba(180, 83, 9, 0.78)";
      ctx.beginPath();
      ctx.moveTo(d.sx, d.sy);
      ctx.lineTo(d.tx, d.ty);
      ctx.stroke();
      const dur = d.travelSec > 1e-6 ? d.travelSec : 1;
      const u = clamp((state.time - d.startAt) / dur, 0, 1);
      const bx = d.sx + (d.tx - d.sx) * u;
      const by = d.sy + (d.ty - d.sy) * u;
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(245, 158, 11, 0.92)";
      ctx.strokeStyle = "rgba(69, 26, 3, 0.92)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawArrowSpellFx(ctx, state) {
    const f = state.arrowFx;
    if (!f || state.time > f.until) return;
    const cx = f.cx;
    const cy = f.cy;
    const t = clamp((f.until - state.time) / 0.48, 0, 1);
    const pulse = ARROWS_SPELL_RADIUS * (0.55 + 0.45 * (1 - t));
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.45 * t;
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(251,191,36,0.85)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + state.time * 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (pulse * 0.15), cy + Math.sin(a) * (pulse * 0.15));
      ctx.lineTo(cx + Math.cos(a) * pulse, cy + Math.sin(a) * pulse);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(254,243,199,0.25)";
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCloneSpellFx(ctx, state) {
    const f = state.cloneFx;
    if (!f || state.time > f.until) return;
    const cx = f.cx;
    const cy = f.cy;
    const t = clamp((f.until - state.time) / 0.42, 0, 1);
    const pulse = CLONE_SPELL_RADIUS * (0.52 + 0.48 * (1 - t));
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.45 * t;
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(165,243,252,0.85)";
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + state.time * 5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (pulse * 0.2), cy + Math.sin(a) * (pulse * 0.2));
      ctx.lineTo(cx + Math.cos(a) * pulse, cy + Math.sin(a) * pulse);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(34,211,238,0.2)";
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFireballSpellFx(ctx, state) {
    const f = state.fireballFx;
    if (!f || state.time > f.until) return;
    const cx = f.cx;
    const cy = f.cy;
    const t = clamp((f.until - state.time) / 0.52, 0, 1);
    const pulse = FIREBALL_SPELL_RADIUS * (0.52 + 0.48 * (1 - t));
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.45 * t;
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(254,215,170,0.9)";
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + state.time * 4.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (pulse * 0.2), cy + Math.sin(a) * (pulse * 0.2));
      ctx.lineTo(cx + Math.cos(a) * pulse, cy + Math.sin(a) * pulse);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(251,146,60,0.25)";
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRocketSpellFx(ctx, state) {
    const f = state.rocketFx;
    if (!f || state.time > f.until) return;
    const cx = f.cx;
    const cy = f.cy;
    const t = clamp((f.until - state.time) / 0.52, 0, 1);
    const pulse = ROCKET_SPELL_RADIUS * (0.52 + 0.48 * (1 - t));
    ctx.save();
    ctx.globalAlpha = 0.42 + 0.48 * t;
    ctx.strokeStyle = "#f87171";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(248,113,113,0.92)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + state.time * 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (pulse * 0.12), cy + Math.sin(a) * (pulse * 0.12));
      ctx.lineTo(cx + Math.cos(a) * pulse, cy + Math.sin(a) * pulse);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(220,38,38,0.22)";
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWizardSplashFx(ctx, state) {
    const list = state.wizardSplashFx;
    if (!list || !list.length) return;
    for (const f of list) {
      if (state.time > f.until) continue;
      const cx = f.cx;
      const cy = f.cy;
      const rad = f.radius;
      const kind = f.kind || "wizard";
      const dur = kind === "electro_hit" ? 0.28 : 0.42;
      const t = clamp((f.until - state.time) / dur, 0, 1);
      const pulse = rad * (0.62 + 0.38 * (1 - t));
      if (kind === "heavenly_nuke") {
        const dur = HEAVENLY_TUNG_NUKE_FX_SEC;
        const life = Math.max(0, f.until - state.time);
        const k = clamp(1 - life / dur, 0, 1);
        const r0 = rad * (0.35 + 1.85 * k);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r0 * 1.1);
        grd.addColorStop(0, `rgba(255,255,255,${0.5 * (1 - k * 0.7)})`);
        grd.addColorStop(0.25, `rgba(254,215,170,${0.55 * (1 - k)})`);
        grd.addColorStop(0.55, `rgba(239,68,68,${0.45 * (1 - k * 0.5)})`);
        grd.addColorStop(1, "rgba(127,29,29,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, r0 * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        for (let ring = 0; ring < 3; ring++) {
          const lag = ring * 0.12;
          const rk = clamp(k - lag, 0, 1);
          const rr = rad * (0.4 + 1.4 * rk);
          ctx.strokeStyle = `rgba(255,237,213,${0.55 * (1 - rk)})`;
          ctx.lineWidth = 4 - ring;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(220,38,38,${0.4 * (1 - rk * 0.8)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, rr * 0.92, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }
      if (kind === "boberdino_mini") {
        const tmini = clamp((f.until - state.time) / 0.32, 0, 1);
        const pm = rad * (0.52 + 0.48 * (1 - tmini));
        ctx.save();
        ctx.globalAlpha = 0.36 + 0.5 * tmini;
        ctx.strokeStyle = "rgba(251,146,60,0.95)";
        ctx.lineWidth = 2.2;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.arc(cx, cy, pm, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(253,224,71,0.16)";
        ctx.beginPath();
        ctx.arc(cx, cy, pm * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(234,88,12,0.85)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, pm * 0.78, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      if (kind === "tung_boom") {
        ctx.save();
        const img = SPRITES.tungBoom;
        const sz = pulse * 2.45;
        const glow = 0.55 + (1 - t) * 0.4;
        ctx.globalAlpha = glow;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, cx - sz / 2, cy - sz / 2, sz, sz);
        }
        ctx.globalAlpha = 0.42 * t;
        ctx.strokeStyle = "rgba(251,146,60,0.95)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      const baseStroke =
        kind === "mega_jump"
          ? "#f59e0b"
          : kind === "mega_ground"
            ? "#eab308"
          : kind === "bomber_evo" || kind === "chud_evo"
            ? "#a855f7"
            : kind === "witch"
              ? "#15803d"
              : kind === "electro_hit"
                ? "#0ea5e9"
                : "#9333ea";
      const spokesStroke =
        kind === "mega_jump"
          ? "rgba(253,224,71,0.94)"
          : kind === "mega_ground"
            ? "rgba(254,240,138,0.9)"
          : kind === "bomber_evo" || kind === "chud_evo"
            ? "rgba(233,213,255,0.92)"
            : kind === "witch"
              ? "rgba(187,247,208,0.92)"
              : kind === "electro_hit"
                ? "rgba(125,211,252,0.95)"
                : "rgba(216,180,254,0.92)";
      const fillCol =
        kind === "mega_jump"
          ? "rgba(245,158,11,0.22)"
          : kind === "mega_ground"
            ? "rgba(234,179,8,0.2)"
          : kind === "bomber_evo" || kind === "chud_evo"
            ? "rgba(147,51,234,0.22)"
            : kind === "witch"
              ? "rgba(34,197,94,0.2)"
              : kind === "electro_hit"
                ? "rgba(56,189,248,0.22)"
                : "rgba(168,85,247,0.2)";
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.4 * t;
      ctx.strokeStyle = baseStroke;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = spokesStroke;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + state.time * 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (pulse * 0.18), cy + Math.sin(a) * (pulse * 0.18));
        ctx.lineTo(cx + Math.cos(a) * pulse, cy + Math.sin(a) * pulse);
        ctx.stroke();
      }
      ctx.fillStyle = fillCol;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFreezeSpellFx(ctx, state) {
    const zones = state.freezeZones;
    if (!zones || !zones.length) return;
    ctx.save();
    for (const z of zones) {
      const life = Math.max(0.001, z.until - state.time);
      const pulse = 0.96 + 0.04 * Math.sin(state.time * 4 + z.cx * 0.02);
      const r = z.R * pulse;
      const aFill = 0.1 + 0.06 * clamp(life / FREEZE_DURATION_SEC, 0, 1);
      ctx.fillStyle = `rgba(186,230,253,${aFill})`;
      ctx.beginPath();
      ctx.arc(z.cx, z.cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(125,211,252,${0.35 + 0.25 * clamp(life / FREEZE_DURATION_SEC, 0, 1)})`;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.arc(z.cx, z.cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(224,242,254,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(z.cx, z.cy, r * 0.65, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawZapSpellFx(ctx, state) {
    const f = state.zapFx;
    if (!f || state.time > f.until) return;
    const cx = f.cx;
    const cy = f.cy;
    const t = clamp((f.until - state.time) / 0.38, 0, 1);
    const pulse = ZAP_SPELL_RADIUS * (0.5 + 0.5 * (1 - t));
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.45 * t;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(224,242,254,0.9)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + state.time * 6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (pulse * 0.2), cy + Math.sin(a) * (pulse * 0.2));
      ctx.lineTo(cx + Math.cos(a) * pulse, cy + Math.sin(a) * pulse);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(186,230,253,0.35)";
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShieldSpellFx(ctx, state) {
    const f = state.shieldBuffFx;
    if (!f || state.time >= f.until) return;
    const cx = f.cx;
    const cy = f.cy;
    const t = clamp((f.until - state.time) / 0.42, 0, 1);
    const pulse = SHIELDS_SPELL_RADIUS * (0.45 + 0.55 * t);
    ctx.save();
    ctx.globalAlpha = 0.38 + 0.45 * t;
    ctx.strokeStyle = "rgba(45,212,191,0.92)";
    ctx.lineWidth = 2.8;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(167,243,208,0.55)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBuildRepairSpellFx(ctx, state) {
    const f = state.buildRepairFx;
    if (!f || state.time >= f.until) return;
    const cx = f.cx;
    const cy = f.cy;
    const t = clamp((f.until - state.time) / 0.48, 0, 1);
    const pulse = ARROWS_SPELL_RADIUS * (0.55 + 0.45 * (1 - t));
    ctx.save();
    ctx.globalAlpha = 0.32 + 0.42 * t;
    ctx.strokeStyle = "rgba(34,197,94,0.9)";
    ctx.lineWidth = 2.85;
    ctx.setLineDash([9, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(167,243,208,0.65)";
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(187,247,208,0.18)";
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRageSpellFx(ctx, state) {
    const f = state.rageFx;
    if (!f || state.time >= f.until) return;
    const cx = f.cx;
    const cy = f.cy;
    const t = clamp((f.until - state.time) / 0.42, 0, 1);
    const pulse = RAGE_SPELL_RADIUS * (0.45 + 0.55 * t);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.5 * t;
    ctx.strokeStyle = "rgba(249,115,22,0.95)";
    ctx.lineWidth = 2.85;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(254,215,170,0.75)";
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(251,146,60,0.12)";
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGoblinBarrelLandFx(ctx, state) {
    const f = state.goblinBarrelFx;
    if (!f || state.time >= f.until) return;
    const cx = f.cx;
    const cy = f.cy;
    const t = clamp((f.until - state.time) / 0.5, 0, 1);
    const pulse = 36 * (0.5 + 0.5 * (1 - t));
    ctx.save();
    ctx.globalAlpha = 0.32 + 0.4 * t;
    ctx.strokeStyle = "rgba(161,98,7,0.9)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(253,230,138,0.22)";
    ctx.beginPath();
    ctx.arc(cx, cy, pulse * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBuilding(ctx, b, state) {
    if (b.kind === "statue") {
      const w = 30;
      const h = 36;
      const px = b.x - w / 2;
      const py = b.y - h / 2;
      if (b.hp <= 0) ctx.globalAlpha = 0.28;
      ctx.save();
      ctx.fillStyle = "#334155";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(b.x, py - 10);
      ctx.lineTo(px + w + 2, py + 4);
      ctx.lineTo(px - 2, py + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(px + 5, py + 4, w - 10, h - 4);
      ctx.strokeRect(px + 5, py + 4, w - 10, h - 4);
      ctx.fillStyle = "rgba(148,163,184,0.45)";
      ctx.fillRect(px + 10, py + 10, 4, h - 14);
      ctx.restore();
      ctx.globalAlpha = 1;
      const pct = Math.max(0, b.hp / b.maxHp);
      const barY = b.side === "enemy" ? py + h + 6 : py - 12;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px, barY, w, 5);
      ctx.fillStyle = pct > 0.35 ? "#4ade80" : "#f87171";
      ctx.fillRect(px, barY, w * pct, 5);
      return;
    }
    if (b.kind === "tombstone") {
      const w = 32;
      const h = 28;
      const px = b.x - w / 2;
      const py = b.y - h / 2;
      if (b.hp <= 0) ctx.globalAlpha = 0.28;
      ctx.save();
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.5;
      ctx.fillRect(px, py, w, h);
      ctx.strokeRect(px, py, w, h);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x - 6, py + 4);
      ctx.lineTo(b.x + 6, py + 4);
      ctx.moveTo(b.x - 4, py + 10);
      ctx.lineTo(b.x + 4, py + 10);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
      const pct = Math.max(0, b.hp / b.maxHp);
      const barY = b.side === "enemy" ? py + h + 6 : py - 12;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px, barY, w, 5);
      ctx.fillStyle = pct > 0.35 ? "#4ade80" : "#f87171";
      ctx.fillRect(px, barY, w * pct, 5);
      return;
    }
    if (b.kind === "cannon") {
      const w = 34;
      const h = 26;
      const px = b.x - w / 2;
      const py = b.y - h / 2;
      if (b.hp <= 0) ctx.globalAlpha = 0.28;
      ctx.save();
      ctx.fillStyle = "#475569";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      ctx.fillRect(px, py + 8, w, h - 8);
      ctx.strokeRect(px, py + 8, w, h - 8);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(px + 6, py + 4, w - 12, 10);
      ctx.strokeRect(px + 6, py + 4, w - 12, 10);
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(b.x + 10, py + 9, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.arc(b.x, py + 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      const pct = Math.max(0, b.hp / b.maxHp);
      const barY = b.side === "enemy" ? py + h + 6 : py - 12;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px, barY, w, 5);
      ctx.fillStyle = pct > 0.35 ? "#4ade80" : "#f87171";
      ctx.fillRect(px, barY, w * pct, 5);
      return;
    }
    if (b.kind === "garrison_tower") {
      const w = 40;
      const h = 36;
      const px = b.x - w / 2;
      const py = b.y - h / 2;
      if (b.hp <= 0) ctx.globalAlpha = 0.28;
      ctx.save();
      ctx.fillStyle = "#44403c";
      ctx.strokeStyle = "#292524";
      ctx.lineWidth = 1.5;
      ctx.fillRect(px, py + 10, w, h - 10);
      ctx.strokeRect(px, py + 10, w, h - 10);
      ctx.fillStyle = "#57534e";
      for (let i = 0; i < 3; i++) {
        const bx = px + 6 + i * 12;
        ctx.fillRect(bx, py + 2, 8, 12);
        ctx.strokeRect(bx, py + 2, 8, 12);
      }
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(px + 12, py + 18, 16, 12);
      ctx.strokeStyle = "#0c0a09";
      ctx.strokeRect(px + 12, py + 18, 16, 12);
      ctx.restore();
      ctx.globalAlpha = 1;
      const pct = Math.max(0, b.hp / b.maxHp);
      const barY = b.side === "enemy" ? py + h + 6 : py - 12;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px, barY, w, 5);
      ctx.fillStyle = pct > 0.35 ? "#4ade80" : "#f87171";
      ctx.fillRect(px, barY, w * pct, 5);
      return;
    }
    if (b.kind === "luxury_hotel") {
      const w = 46;
      const h = 40;
      const px = b.x - w / 2;
      const py = b.y - h / 2;
      if (b.hp <= 0) ctx.globalAlpha = 0.28;
      ctx.save();
      ctx.fillStyle = "#fef3c7";
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 1.5;
      ctx.fillRect(px, py + 8, w, h - 8);
      ctx.strokeRect(px, py + 8, w, h - 8);
      ctx.fillStyle = "#fde68a";
      for (let i = 0; i < 4; i++) {
        const bx = px + 5 + i * 10;
        ctx.fillRect(bx, py + 2, 7, 10);
        ctx.strokeStyle = "#d97706";
        ctx.strokeRect(bx, py + 2, 7, 10);
      }
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(px + 8, py + 20, 30, 12);
      ctx.strokeStyle = "#b45309";
      ctx.strokeRect(px + 8, py + 20, 30, 12);
      ctx.restore();
      ctx.globalAlpha = 1;
      const pct = Math.max(0, b.hp / b.maxHp);
      const barY = b.side === "enemy" ? py + h + 6 : py - 12;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px, barY, w, 5);
      ctx.fillStyle = pct > 0.35 ? "#4ade80" : "#f87171";
      ctx.fillRect(px, barY, w * pct, 5);
      return;
    }
    if (b.kind === "prince_tower") {
      const tw = 38;
      const th = 44;
      const px = b.x - tw / 2;
      const py = b.y - th / 2;
      if (b.hp <= 0) ctx.globalAlpha = 0.28;
      ctx.save();
      ctx.shadowColor = "rgba(88,28,135,0.45)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      const img = SPRITES.towerPrincess;
      if (img.complete && img.naturalWidth > 0) {
        ctx.globalAlpha = 0.92;
        ctx.drawImage(img, px, py, tw, th);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "#5b4a6e";
        ctx.fillRect(px, py, tw, th);
        ctx.strokeStyle = "#7c3aed";
        ctx.strokeRect(px, py, tw, th);
      }
      const now = state ? state.time : 0;
      const hs = state ? humanControlSide(state) : "player";
      if (b.hp > 0 && state && b.stunUntil != null && now < b.stunUntil && b.side !== hs) {
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
        ctx.fillRect(px, py, tw, th);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      const pct = Math.max(0, b.hp / b.maxHp);
      const barY = b.side === "enemy" ? py + th + 6 : py - 12;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px, barY, tw, 5);
      ctx.fillStyle = pct > 0.35 ? "#a78bfa" : "#f87171";
      ctx.fillRect(px, barY, tw * pct, 5);
      return;
    }
    if (b.kind === "goblin_drill") {
      const w = 36;
      const h = 26;
      const px = b.x - w / 2;
      const py = b.y - h / 2;
      ctx.save();
      if (b.hp <= 0) ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#431407";
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(b.x, py + h * 0.55, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#92400e";
      ctx.strokeStyle = "#451a03";
      ctx.fillRect(px + 6, py, w - 12, h);
      ctx.strokeRect(px + 6, py, w - 12, h);
      ctx.fillStyle = "#1c1917";
      ctx.beginPath();
      ctx.rect(b.x - 5, py + h * 0.35, 10, h * 0.45);
      ctx.fill();
      ctx.strokeStyle = "rgba(251,191,36,0.7)";
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(b.x - w * 0.35, py + h);
      ctx.lineTo(b.x, py + h + 5);
      ctx.lineTo(b.x + w * 0.35, py + h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.globalAlpha = 1;
      const pct = Math.max(0, b.hp / b.maxHp);
      const barY = b.side === "enemy" ? py + h + 8 : py - 10;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px, barY, w, 5);
      ctx.fillStyle = pct > 0.35 ? "#4ade80" : "#f87171";
      ctx.fillRect(px, barY, w * pct, 5);
      return;
    }
    if (b.kind !== "goblin_hut") return;
    const w = 36;
    const h = 30;
    const px = b.x - w / 2;
    const py = b.y - h / 2;
    ctx.save();
    if (b.hp > 0 && state) {
      ctx.save();
      const active = foeInGoblinHutRange(b, state);
      const pulse = 0.55 + 0.08 * Math.sin((state.time || 0) * (active ? 5 : 2.2));
      ctx.globalAlpha = active ? 0.22 * pulse : 0.12 * pulse;
      ctx.fillStyle = active ? "rgba(250,204,21,0.35)" : "rgba(148,163,184,0.25)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, HUT_TRIGGER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = active ? 0.55 + 0.15 * pulse : 0.32;
      ctx.strokeStyle = active ? "rgba(250,204,21,0.85)" : "rgba(148,163,184,0.65)";
      ctx.lineWidth = active ? 2.2 : 1.5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, HUT_TRIGGER_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (b.hp <= 0) ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#78350f";
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x, py - 10);
    ctx.lineTo(px + w + 2, py + 2);
    ctx.lineTo(px - 2, py + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#92400e";
    ctx.fillRect(px, py, w, h);
    ctx.strokeRect(px, py, w, h);
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(b.x - 6, py + h - 14, 12, 14);
    ctx.fillStyle = "rgba(254,243,199,0.35)";
    ctx.fillRect(px + 6, py + 6, 8, 6);
    ctx.restore();
    ctx.globalAlpha = 1;
    const pct = Math.max(0, b.hp / b.maxHp);
    const barY = b.side === "enemy" ? py + h + 6 : py - 12;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(px, barY, w, 5);
    ctx.fillStyle = pct > 0.35 ? "#4ade80" : "#f87171";
    ctx.fillRect(px, barY, w * pct, 5);
  }

  function drawEmoteBubbles(ctx, state) {
    function one(b, y, align) {
      if (!b || state.time > b.until) return;
      const t = b.text;
      ctx.font = "28px system-ui,Segoe UI Emoji,sans-serif";
      const w = Math.min(220, ctx.measureText(t).width + 28);
      const x = align === "left" ? 18 : W - 18 - w;
      ctx.fillStyle = "rgba(15,23,42,0.88)";
      ctx.strokeStyle = "rgba(148,163,184,0.5)";
      ctx.lineWidth = 1.5;
      const bx = x;
      const by = y - 36;
      ctx.fillRect(bx, by, w, 40);
      ctx.strokeRect(bx, by, w, 40);
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t, bx + w / 2, by + 20);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
    if (state.remoteEmote) one(state.remoteEmote, 88, "right");
    if (state.localEmote) one(state.localEmote, H - 52, "left");
  }

  function formatMatchClock(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  /** Three red lasers from Heavenly Tung (fire phase) to nearest foes. */
  function drawHeavenlyRageLasers(ctx, state) {
    for (const src of state.troops) {
      if (!heavenlyTungRageActive(src) || src.heavenlyPhase !== "fire") continue;
      const picks = pickHeavenlyLaserTargets(state, src, 3);
      const sx = src.x;
      const sy = src.y;
      ctx.save();
      for (const p of picks) {
        ctx.strokeStyle = "#b91c1c";
        ctx.lineWidth = 3.2;
        ctx.shadowColor = "rgba(220,38,38,0.95)";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.strokeStyle = "rgba(254,202,202,0.9)";
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  function combatDebugEnabled(state) {
    return (
      !state.over &&
      state.matchMode === "training" &&
      !!state.testing &&
      state.testing.combatDebug === true
    );
  }

  /**
   * Training-only overlay: melee/ranged radii, tower & building ranges, projectiles, HP text.
   */
  function drawCombatDebugOverlay(ctx, state) {
    if (!combatDebugEnabled(state)) return;
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.font = "600 9px ui-monospace,monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    function hpLine(x, y, u) {
      let hpTxt;
      if (u.hp != null && u.maxHp != null) {
        if (heavenlyTungRageActive(u) && u.heavenlyPhase) {
          hpTxt = String(u.heavenlyPhase).toUpperCase();
        } else {
          const smax = u.shieldMax != null ? u.shieldMax : 0;
          const shp = u.shieldHp != null ? u.shieldHp : 0;
          const h = patapinGhostActive(u) ? 0 : Math.max(0, Math.ceil(u.hp));
          if (smax > 0 && shp > 0) hpTxt = `${h}+${Math.ceil(shp)}/${Math.ceil(u.maxHp)}`;
          else hpTxt = `${h}/${Math.ceil(u.maxHp)}`;
        }
      } else if (u.hp != null) hpTxt = String(Math.ceil(Math.max(0, u.hp)));
      else return;
      ctx.fillStyle = "rgba(15,23,42,0.92)";
      ctx.strokeStyle = "rgba(148,163,184,0.7)";
      ctx.lineWidth = 1;
      const tw = Math.max(26, ctx.measureText(hpTxt).width + 6);
      const px = x - tw / 2;
      const py = y - 4;
      ctx.setLineDash([]);
      ctx.fillRect(px, py - 11, tw, 13);
      ctx.strokeRect(px, py - 11, tw, 13);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(hpTxt, x, py);
      ctx.setLineDash([5, 5]);
    }

    for (const u of state.troops) {
      if (!troopActsOnBattlefield(u)) continue;
      const col = u.side === "player" ? "96, 165, 250" : "248, 113, 113";

      if (u.meleeRange != null && !isRangedTroopType(u)) {
        const mr = u.meleeRange + MELEE_REACH_BONUS;
        ctx.strokeStyle =
          u.type === "bat"
            ? "rgba(167, 139, 250, 0.65)"
            : `rgba(${col}, 0.5)`;
        ctx.lineWidth = u.type === "bat" ? 1.4 : 1.25;
        ctx.beginPath();
        ctx.arc(u.x, u.y, mr, 0, Math.PI * 2);
        ctx.stroke();
        if (u.type === "bat") {
          ctx.setLineDash([2, 4]);
          ctx.strokeStyle = "rgba(124, 58, 237, 0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(u.x, u.y, mr + LOCK_LEASH_EXTRA * 0.5 + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([5, 5]);
        }
      } else if (u.meleeRange != null && isRangedTroopType(u)) {
        const mr = u.meleeRange + MELEE_REACH_BONUS;
        ctx.strokeStyle = `rgba(${col}, 0.28)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(u.x, u.y, mr, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (isRangedTroopType(u) && u.rangedRange != null) {
        const R = u.rangedRange + RANGED_STANDOFF_SLACK;
        ctx.strokeStyle = `rgba(${col}, 0.58)`;
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.arc(u.x, u.y, R, 0, Math.PI * 2);
        ctx.stroke();
        if (u.type === "wizard") {
          ctx.strokeStyle = `rgba(192, 132, 252, 0.42)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(u.x, u.y, WIZARD_SPLASH_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
        } else if (u.type === "witch") {
          ctx.strokeStyle = `rgba(74, 222, 128, 0.42)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(u.x, u.y, WITCH_SPLASH_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
        } else if (u.type === "bomber") {
          ctx.strokeStyle = `rgba(56, 189, 248, 0.45)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(u.x, u.y, BOMBER_SPLASH_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (u.type === "mega_knight") {
        ctx.strokeStyle = "rgba(167, 139, 250, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(u.x, u.y, MEGA_KNIGHT_JUMP_RANGE, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(167, 139, 250, 0.28)";
        ctx.beginPath();
        ctx.arc(u.x, u.y, MEGA_KNIGHT_JUMP_SLAM_OUTER, 0, Math.PI * 2);
        ctx.stroke();
      }

      hpLine(u.x, u.y - u.radius - 2, u);
      if (u.type === "bat") {
        const tag = "BAT · aerial melee";
        ctx.setLineDash([]);
        ctx.font = "600 7px ui-monospace,monospace";
        const tw = ctx.measureText(tag).width + 4;
        const px = u.x - tw / 2;
        const py = u.y + u.radius + 5;
        ctx.fillStyle = "rgba(76, 29, 149, 0.88)";
        ctx.strokeStyle = "rgba(167, 139, 250, 0.55)";
        ctx.lineWidth = 0.85;
        ctx.fillRect(px, py - 1, tw, 10);
        ctx.strokeRect(px, py - 1, tw, 10);
        ctx.fillStyle = "#f5f3ff";
        ctx.fillText(tag, u.x, py + 7);
      }
    }

    for (const tw of state.towers) {
      if (tw.hp <= 0) continue;
      const col = tw.side === "player" ? "250, 204, 21" : "251, 191, 36";
      const alpha = tw.kind === "king" && !kingAwakeForSide(state.towers, tw.side) ? 0.22 : 0.48;
      const rng = tw.kind === "king" ? KING_RANGE : PRINCESS_RANGE;
      ctx.strokeStyle = `rgba(${col}, ${alpha})`;
      ctx.lineWidth = tw.kind === "king" ? 1.5 : 1.25;
      ctx.beginPath();
      ctx.arc(tw.x, tw.y, rng, 0, Math.PI * 2);
      ctx.stroke();
      hpLine(tw.x, tw.y - (tw.kind === "king" ? 34 : 28), tw);
    }

    for (const b of state.buildings || []) {
      if (b.hp <= 0) continue;
      const col = b.side === "player" ? "52, 211, 153" : "45, 212, 191";
      if (b.kind === "cannon") {
        ctx.strokeStyle = `rgba(${col}, 0.52)`;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(b.x, b.y, CANNON_RANGE, 0, Math.PI * 2);
        ctx.stroke();
      } else if (b.kind === "goblin_hut") {
        ctx.strokeStyle = `rgba(${col}, 0.35)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, HUT_TRIGGER_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      } else if (b.kind === "goblin_drill") {
        ctx.strokeStyle = `rgba(245, 158, 11, 0.45)`;
        ctx.lineWidth = 1.1;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(b.x, b.y, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (b.kind === "prince_tower") {
        ctx.strokeStyle = `rgba(167, 139, 250, 0.5)`;
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.arc(b.x, b.y, PRINCESS_RANGE, 0, Math.PI * 2);
        ctx.stroke();
      } else if (b.kind === "garrison_tower" || b.kind === "luxury_hotel") {
        ctx.strokeStyle = `rgba(${col}, 0.42)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      hpLine(b.x, b.y - b.radius - 4, b);
      if (b.kind === "prince_tower") {
        const tag = `Prince · shot ${PRINCESS_RANGE}px / ${PRINCESS_DMG} dmg`;
        ctx.setLineDash([]);
        ctx.font = "600 7px ui-monospace,monospace";
        const twMeas = ctx.measureText(tag).width + 6;
        const px = b.x - twMeas / 2;
        const py = b.y + b.radius + 7;
        ctx.fillStyle = "rgba(76, 29, 149, 0.82)";
        ctx.strokeStyle = "rgba(167, 139, 250, 0.45)";
        ctx.lineWidth = 0.85;
        ctx.fillRect(px, py - 1, twMeas, 11);
        ctx.strokeRect(px, py - 1, twMeas, 11);
        ctx.fillStyle = "#f5f3ff";
        ctx.fillText(tag, b.x, py + 8);
      }
    }

    for (const u of state.troops) {
      if (u.hp <= 0 || u.type !== "mega_goblin_army") continue;
      ctx.strokeStyle = "rgba(245, 158, 11, 0.38)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(u.x, u.y, HUT_TRIGGER_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    for (const p of state.projectiles || []) {
      const pr = p.projRadius ?? PROJ_RADIUS;
      ctx.strokeStyle = "rgba(251, 191, 36, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.fillStyle = "rgba(251, 191, 36, 0.12)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const dmgTxt = p.dmg != null ? `r${pr} · ${Math.round(p.dmg)}` : `r${pr}`;
      ctx.font = "600 8px ui-monospace,monospace";
      ctx.fillStyle = "rgba(15,23,42,0.88)";
      ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
      ctx.lineWidth = 0.8;
      const tw = ctx.measureText(dmgTxt).width + 4;
      ctx.fillRect(p.x - tw / 2, p.y - pr - 16, tw, 11);
      ctx.strokeRect(p.x - tw / 2, p.y - pr - 16, tw, 11);
      ctx.fillStyle = "#fef3c7";
      ctx.textBaseline = "middle";
      ctx.fillText(dmgTxt, p.x, p.y - pr - 10.5);
      ctx.textBaseline = "bottom";
      ctx.font = "600 9px ui-monospace,monospace";
    }

    ctx.restore();
  }

  function drawPvpMatchHud(ctx, state) {
    if (state.matchMode !== "battle" || state.over) return;
    const rem = pvpRegulationRemainingSec(state);
    const mx = pvpBattleElixirMultiplier(state);
    const lx = 14;
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    if (state.battleOvertime) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.95)";
      ctx.font = "600 10px system-ui,sans-serif";
      ctx.fillText("Time left — none (overtime)", lx, H - 100);
      ctx.fillStyle = "rgba(254, 243, 199, 0.95)";
      ctx.font = "700 16px system-ui,sans-serif";
      ctx.fillText("OVERTIME", lx, H - 82);
      ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
      ctx.font = "600 11px system-ui,sans-serif";
      ctx.fillText(`${PVP_OVERTIME_ELIXIR_MULT}× elixir — first princess tower wins`, lx, H - 64);
    } else {
      ctx.fillStyle = "rgba(148, 163, 184, 0.95)";
      ctx.font = "600 10px system-ui,sans-serif";
      ctx.fillText("Time left", lx, H - 92);
      ctx.fillStyle = "rgba(248, 250, 252, 0.98)";
      ctx.font = "700 20px ui-monospace,monospace";
      ctx.fillText(formatMatchClock(rem), lx, H - 72);
      ctx.fillStyle = "rgba(148, 163, 184, 0.95)";
      ctx.font = "600 11px system-ui,sans-serif";
      ctx.fillText(mx > 1 ? `${mx}× elixir` : "1× elixir", lx, H - 52);
    }
    ctx.restore();
  }

  function render(ctx, state) {
    drawNightArena(ctx);
    drawCrowns(ctx, state);
    drawPvpMatchHud(ctx, state);
    for (const b of BRIDGES) {
      drawBridge(ctx, b.x, b.y);
    }
    drawDeployZoneOverlay(ctx, state);
    for (const t of state.towers) {
      drawTower(ctx, t, state);
    }
    /** @type {{ k: string; y: number; b?: object; u?: object }[]} */
    const layers = [];
    for (const b of state.buildings || []) {
      if (b.hp > 0) layers.push({ k: "b", y: b.y, b });
    }
    const drawTroops = state.troops.filter(
      (u) => u.hp > 0 || patapinGhostActive(u) || heavenlyTungRageActive(u),
    );
    for (const u of drawTroops) {
      layers.push({ k: "u", y: u.y, u });
    }
    layers.sort((a, c) => a.y - c.y);
    for (const L of layers) {
      if (L.k === "b" && L.b) drawBuilding(ctx, L.b, state);
      else if (L.k === "u" && L.u) drawUnit(ctx, L.u, state);
    }
    drawGoblinDrillBurrowFx(ctx, state);
    drawArrowSpellFx(ctx, state);
    drawCloneSpellFx(ctx, state);
    drawFireballSpellFx(ctx, state);
    drawGoblinBarrelLandFx(ctx, state);
    drawRocketSpellFx(ctx, state);
    drawFreezeSpellFx(ctx, state);
    drawZapSpellFx(ctx, state);
    drawShieldSpellFx(ctx, state);
    drawBuildRepairSpellFx(ctx, state);
    drawRageSpellFx(ctx, state);
    drawProjectiles(ctx, state.projectiles);
    drawHeavenlyRageLasers(ctx, state);
    drawWizardSplashFx(ctx, state);

    drawEmoteBubbles(ctx, state);
    drawCombatDebugOverlay(ctx, state);

    ctx.fillStyle = "rgba(226,232,240,0.5)";
    ctx.font = "600 11px system-ui";
    const swap =
      state.matchMode === "training" && state.testing && state.testing.playAsEnemy === true;
    ctx.fillText(swap ? "You (top)" : "Enemy", 14, 42);
    ctx.fillText(swap ? "AI (bottom)" : "You", 14, H - 14);
  }

  /** @type {string} */
  let hudModeLine = "";

  function hudHtml(state) {
    const ek = kingAwakeForSide(state.towers, "enemy");
    const pk = kingAwakeForSide(state.towers, "player");
    const modeLine = hudModeLine ? `${hudModeLine}<br/>` : "";
    if (state.over) {
      const kingDecided = state.crownsPlayer >= 3 || state.crownsEnemy >= 3;
      const msg = kingDecided
        ? state.winner === "player"
          ? "<strong>Enemy king down — 3 crowns.</strong>"
          : "<strong>Your king fell — they take 3 crowns.</strong>"
        : state.winner === "player"
          ? "<strong>You win.</strong>"
          : "<strong>You lose.</strong>";
      return `${modeLine}${msg}<br/>Reset to play again.`;
    }
    const aps = (sec) => (1 / sec).toFixed(2);
    const pvpRole =
      state.matchMode === "battle" && battleNet.matchId
        ? battleNet.myPlayerSlot === 0
          ? "<strong>You</strong> = <strong>Player 1</strong> (first in match pair). "
          : battleNet.myPlayerSlot === 1
            ? "<strong>You</strong> = <strong>Player 2</strong>. "
            : "<strong>Roster…</strong> "
        : "";
    const pvpLine =
      state.matchMode === "battle"
        ? `${pvpRole}` +
          (state.battleOvertime
            ? `<strong>Time left</strong> — <strong>none</strong> (overtime). <strong>${PVP_OVERTIME_ELIXIR_MULT}×</strong> elixir until a princess tower falls. `
            : `<strong>Time left</strong> <strong>${formatMatchClock(pvpRegulationRemainingSec(state))}</strong> / <strong>${formatMatchClock(PVP_MATCH_DURATION_SEC)}</strong> · elixir <strong>${pvpBattleElixirMultiplier(state)}×</strong> (ramps at 2:00 / 1:00 / 0:30). `)
        : "";
    const deckLine =
      `<strong>Deck</strong>: 8 <strong>unique</strong> cards — 4 in hand, 4 in queue (no duplicates in the rotation). ` +
      `<strong>Goblin Hut</strong> (${GOBLIN_HUT_COST}): HP decays over <strong>~${GOBLIN_HUT_LIFETIME_SEC}s</strong> like a timed building; dashed <strong>${HUT_TRIGGER_RADIUS}px</strong> ring; with a foe inside, one Spear Goblin every <strong>${HUT_SPAWN_INTERVAL}s</strong> (cap ${MAX_SPEAR_PER_HUT}). ` +
      `<strong>Cannon</strong> (${CANNON_COST}): <strong>${CANNON_HP}</strong> HP decays over <strong>${CANNON_LIFETIME_SEC}s</strong>; shoots ground troops/buildings in range (<strong>${CANNON_RANGE}px</strong>, <strong>${CANNON_SHOT_DMG}</strong> / <strong>${CANNON_FIRE_INTERVAL}s</strong>). ` +
      `<strong>Statue</strong> (${STATUE_COST}): <strong>${STATUE_HP}</strong> HP inert building (no attacks). On death: blast in <strong>${Math.round(STATUE_DEATH_BLAST_RADIUS)}px</strong> for <strong>${Math.round(STATUE_DEATH_BLAST_DMG)}</strong> to troops/buildings and <strong>${Math.round(STATUE_DEATH_BLAST_TOWER_DMG)}</strong> to towers. ` +
      `<strong>Mega Goblin Army</strong> (${MEGA_GOBLIN_ARMY_COST}): <strong>Chud</strong> + hut head; dashed <strong>${HUT_TRIGGER_RADIUS}px</strong> ring follows him — with a foe inside, one Spear Goblin / <strong>${MEGA_GOBLIN_ARMY_SPEAR_INTERVAL}s</strong> (cap ${MAX_SPEAR_PER_HUT} live). On death, <strong>5</strong> melee goblins. ` +
      `<strong>Mega Army</strong> (${MEGA_ARMY_COST}): <strong>${MEGA_ARMY_GUARD_COUNT}</strong> shielded skeleton guards (${SKELETON_GUARD_SHIELD_HP} shield HP, overflow wasted), <strong>${MEGA_ARMY_SKELETON_COUNT}</strong> skeletons, <strong>1</strong> witch. ` +
      `<strong>Boberdino Crocodelo</strong> (${BOBERDINO_CROCODELO_COST}): <strong>${BOBERDINO_HP}</strong> HP air unit — only hunts <strong>enemy towers</strong> (no melee damage); bombs every <strong>${BOBERDINO_BOMB_INTERVAL_SEC}s</strong> (<strong>${Math.round(BOBERDINO_BOMB_RADIUS)}</strong> splash, ½× Fireball radius; troop dmg −50% vs spell). ` +
      `<strong>Spear Goblins</strong> (${SPEAR_GOBLINS_COST}): spawns <strong>3</strong> ranged spear goblins. ` +
      `<strong>Archers</strong> (${ARCHERS_COST}): <strong>${ARCHERS_PER_CARD}</strong> ranged archers (${ARCHER_HP} HP, ${ATTACK_INTERVAL_ARCHER}s / shot, ${ARCHER_RANGE}px range). ` +
      `<strong>Archers Army</strong> (${ARCHERS_ARMY_COST}): <strong>${SKARMY_SPAWN_COUNT}</strong> archers in the Skeleton Army layout. ` +
      `<strong>Bat Army</strong> (${BAT_ARMY_COST}): <strong>${SKARMY_SPAWN_COUNT}</strong> bats in the Skeleton Army layout (${BAT_HP} HP each, flying). ` +
      `<strong>Mega Knight Army</strong> (${MEGA_KNIGHT_ARMY_COST}): <strong>${SKARMY_SPAWN_COUNT}</strong> Mega Knights in the Skeleton Army layout. ` +
      `<strong>Arrows</strong> (${ARROWS_COST}) / <strong>Fireball</strong> (${FIREBALL_COST}) / <strong>Goblin Barrel</strong> (${GOBLIN_BARREL_COST}) / <strong>Rocket</strong> (${ROCKET_COST}) / <strong>Zap</strong> (${ZAP_COST}) / <strong>Freeze</strong> (${FREEZE_COST}): cast <strong>anywhere</strong>; Goblin Barrel = flies like Fireball, <strong>no</strong> spell damage, spawns <strong>3</strong> melee goblins on arrival; Freeze = <strong>${FREEZE_DURATION_SEC}s</strong> icy zone, <strong>${FREEZE_SPELL_DMG}</strong> damage once, stuns while inside. ` +
      `<strong>Clone</strong> (${CLONE_COST}): duplicates troops in <strong>${Math.round(CLONE_SPELL_RADIUS)}px</strong>; clones are <strong>cyan</strong>, <strong>1 HP</strong>, and clones cannot be cloned. ` +
      `<strong>Shields</strong> (${SHIELDS_SPELL_COST}): allied troops and arena towers in <strong>${Math.round(SHIELDS_SPELL_RADIUS)}px</strong> (½ Arrows splash) gain <strong>${GENERIC_SHIELD_BUFF_HP}</strong> shield HP (breaking hit wastes extra damage). ` +
      `<strong>Rage</strong> (${RAGE_SPELL_COST}): Zap radius — allied troops <strong>+${Math.round((RAGE_MOVE_ATK_MUL - 1) * 100)}% move &amp; attack</strong> for <strong>${RAGE_BUFF_DURATION_SEC}s</strong>, <strong>${RAGE_SPELL_DMG}</strong> once to foes (troops/towers/buildings). ` +
      `<strong>Mirror</strong>: cost = <strong>your</strong> previous deploy on <em>your</em> grass + <strong>${MIRROR_EXTRA_ELIXIR}</strong> elixir — replays that card with shields (swarms: ~⅓ shielded).<br/>`;
    const atkLine =
      `<strong>Attack speed</strong> (time between hits · hits/sec): ` +
      `Mini <strong>${ATTACK_INTERVAL_MINI_PEKKA}s</strong> (${aps(ATTACK_INTERVAL_MINI_PEKKA)}/s) · ` +
      `Knight <strong>${ATTACK_INTERVAL_KNIGHT}s</strong> (${aps(ATTACK_INTERVAL_KNIGHT)}/s) · ` +
      `Tung Sahur <strong>${ATTACK_INTERVAL_TUNG_SAHUR}s</strong> (${aps(ATTACK_INTERVAL_TUNG_SAHUR)}/s) · ` +
      `Bir Patapins <strong>${ATTACK_INTERVAL_BIR_PATAPIN}s</strong> (${aps(ATTACK_INTERVAL_BIR_PATAPIN)}/s, ×3 squad) · ` +
      `Skeletons &amp; Skarmy <strong>${ATTACK_INTERVAL_SKELETON}s</strong> (${aps(ATTACK_INTERVAL_SKELETON)}/s) · ` +
      `Archers <strong>${ATTACK_INTERVAL_ARCHER}s</strong> (${aps(ATTACK_INTERVAL_ARCHER)}/s) · ` +
      `Spear Goblin <strong>${SPEAR_GOBLIN_INTERVAL}s</strong> (${aps(SPEAR_GOBLIN_INTERVAL)}/s) · ` +
      `Wizard <strong>${ATTACK_INTERVAL_WIZARD}s</strong> (${aps(ATTACK_INTERVAL_WIZARD)}/s, splash) · ` +
      `Witch <strong>${ATTACK_INTERVAL_WITCH}s</strong> (${aps(ATTACK_INTERVAL_WITCH)}/s, splash + skeletons) · ` +
      `Mega Knight <strong>${ATTACK_INTERVAL_MEGA_KNIGHT}s</strong> (${aps(ATTACK_INTERVAL_MEGA_KNIGHT)}/s, jump slam).`;
    return (
      `${modeLine}` +
      `${pvpLine}` +
      `Crowns: you <strong>${state.crownsPlayer}</strong> / 3 · enemy <strong>${state.crownsEnemy}</strong> / 3<br/>` +
      `King towers: yours <strong>${pk ? "awake" : "dormant"}</strong>, enemy ` +
      `<strong>${ek ? "awake" : "dormant"}</strong>. After the first hit, troops/towers <strong>stay on that target</strong> until it dies, <strong>leaves range</strong>, or <strong>Zap</strong> stuns (shots still home). Build your 8 in the main menu. ` +
      `only <strong>bridges</strong> cross the river. Hits are <strong>burst</strong> (not constant melt).<br/>` +
      `${deckLine}` +
      `${atkLine}`
    );
  }

  function nextDeployedBomberIsEvo(state, side) {
    if (!state || !state.bomberCycleIdx) return false;
    if (state.matchMode === "training" && state.testing && state.testing.bomberAlwaysEvo) return true;
    if (!cardEvoEnabledForSide(state, side, "bomber")) return false;
    return state.bomberCycleIdx[side] % 2 === 1;
  }

  function nextDeployedChudIsEvo(state, side) {
    if (!state || !state.chudCycleIdx) return false;
    if (state.matchMode === "training" && state.testing && state.testing.chudAlwaysEvo) return true;
    if (!cardEvoEnabledForSide(state, side, "chud")) return false;
    return state.chudCycleIdx[side] % 2 === 1;
  }

  function nextDeployedTungIsEvo(state, side) {
    if (!state || !state.tungCycleIdx) return false;
    if (!cardEvoEnabledForSide(state, side, "tung_tung_tung_sahur")) return false;
    return state.tungCycleIdx[side] >= TUNG_EVO_REQUIRED_CYCLES;
  }

  /** Hand / next preview: Evo Bomber gem when bomber owns evo slot. */
  function cardShowsBomberEvoGem(state, cardId) {
    return cardId === "bomber" && nextDeployedBomberIsEvo(state, humanControlSide(state));
  }

  /** Hand / next preview: Evo Chud gem when chud owns evo slot. */
  function cardShowsChudEvoGem(state, cardId) {
    return cardId === "chud" && nextDeployedChudIsEvo(state, humanControlSide(state));
  }

  function cardShowsTungEvoGem(state, cardId) {
    return cardId === "tung_tung_tung_sahur" && nextDeployedTungIsEvo(state, humanControlSide(state));
  }

  function syncHandDom(state, els) {
    const pct = (state.playerElixir / MAX_ELIXIR) * 100;
    els.fill.style.width = `${pct}%`;
    const elixirShown = state.playerElixir.toFixed(1);
    els.num.textContent = elixirShown;
    els.fill.parentElement?.setAttribute(
      "aria-valuenow",
      String(Math.round(state.playerElixir * 10) / 10),
    );

    for (let s = 0; s < 4; s++) {
      const btn = els.cardSlots[s];
      if (!btn) continue;
      const cardId = state.hand[s];
      const ui = cardUiInfo(cardId);
      const dispCost = effectiveCardCost(state, cardId);
      const inf = playerInfiniteElixir(state);
      const can = (inf || (Number.isFinite(dispCost) && state.playerElixir >= dispCost)) && !state.over;
      if (!can && state.selectedSlot === s) state.selectedSlot = null;
      btn.disabled = !can;
      btn.dataset.card = cardId;
      const img = btn.querySelector("img");
      const nameEl = btn.querySelector(".card-name");
      const costEl = btn.querySelector(".card-cost");
      if (img) {
        img.src = ui.img;
        img.alt = ui.name;
      }
      if (nameEl) nameEl.textContent = ui.name;
      if (costEl) costEl.textContent = Number.isFinite(dispCost) ? String(dispCost) : "?";
      btn.classList.toggle("is-selected", state.selectedSlot === s);
      btn.classList.toggle(
        "card-has-evo",
        cardShowsBomberEvoGem(state, cardId) ||
          cardShowsChudEvoGem(state, cardId) ||
          cardShowsTungEvoGem(state, cardId),
      );
    }

    const nextId = state.waiting[0];
    if (els.deckNextWrap) {
      if (nextId)
        els.deckNextWrap.classList.toggle(
          "card-next-has-evo",
          cardShowsBomberEvoGem(state, nextId) ||
            cardShowsChudEvoGem(state, nextId) ||
            cardShowsTungEvoGem(state, nextId),
        );
      else els.deckNextWrap.classList.remove("card-next-has-evo");
    }
    if (nextId && els.deckNextImg && els.deckNextName && els.deckNextCost) {
      const nu = cardUiInfo(nextId);
      const nextCost = effectiveCardCost(state, nextId);
      els.deckNextImg.src = nu.img;
      els.deckNextImg.alt = nu.name;
      els.deckNextName.textContent = nu.name;
      els.deckNextCost.textContent = Number.isFinite(nextCost) ? String(nextCost) : "?";
    }

    const sel = state.selectedSlot;
    const selCard = sel != null ? state.hand[sel] : null;
    const hintEl = els.hint;
    if (hintEl) {
      if (selCard === "arrows") {
        hintEl.textContent = "Tap anywhere on the arena to drop Arrows (150 area damage).";
      } else if (selCard === "fireball") {
        hintEl.textContent = "Tap anywhere on the arena to cast Fireball (small radius, heavy damage).";
      } else if (selCard === "goblin_barrel") {
        hintEl.textContent = `Goblin Barrel (${GOBLIN_BARREL_COST} elixir): flies from your king like Fireball — no spell damage; spawns 3 melee goblins where it lands (triangle layout like Goblins). Tap anywhere.`;
      } else if (selCard === "rocket") {
        hintEl.textContent = `Rocket (${ROCKET_COST} elixir): tiny blast (${Math.round(
          ROCKET_SPELL_RADIUS,
        )} radius, ¹⁄₃ of Fireball) — ${Math.round(ROCKET_SPELL_DMG)} damage to troops & buildings, ${Math.round(
          ROCKET_TOWER_DMG,
        )} to towers. Travels from your king tower. Tap anywhere on the arena.`;
      } else if (selCard === "zap") {
        hintEl.textContent = "Tap anywhere on the arena to cast Zap (small area damage).";
      } else if (selCard === "freeze") {
        hintEl.textContent = `Freeze (${FREEZE_COST} elixir): tap anywhere — ${FREEZE_DURATION_SEC}s zone, ${FREEZE_SPELL_DMG} damage once, enemies inside are stunned for the full duration.`;
      } else if (selCard === "clone") {
        hintEl.textContent = `Clone (${CLONE_COST} elixir): duplicates any troops in ${Math.round(
          CLONE_SPELL_RADIUS,
        )}px. Clones are cyan, always 1 HP, and cannot be cloned again. Tap anywhere.`;
      } else if (selCard === "shields") {
        hintEl.textContent = `Shields (${SHIELDS_SPELL_COST} elixir): buff allied troops and arena towers in ${Math.round(
          SHIELDS_SPELL_RADIUS,
        )} px (½ of Arrows splash) — +${GENERIC_SHIELD_BUFF_HP} shield HP (absorbs first; breaking hit wastes extra damage). Tap anywhere.`;
      } else if (selCard === "rage") {
        hintEl.textContent = `Rage (${RAGE_SPELL_COST} elixir): Zap-sized ring — allied troops gain +${Math.round(
          (RAGE_MOVE_ATK_MUL - 1) * 100,
        )}% move & attack speed for ${RAGE_BUFF_DURATION_SEC}s; ${RAGE_SPELL_DMG} damage once to enemies (troops/towers/buildings). Tap anywhere.`;
      } else if (selCard === "mirror") {
        const hm = humanControlSide(state);
        const last = hm === "player" ? state.lastPlayedBySide.player : state.lastPlayedBySide.enemy;
        const ec = effectiveCardCost(state, "mirror", hm);
        hintEl.textContent =
          last && last !== "mirror" && Number.isFinite(ec)
            ? `Mirror (${ec} elixir): replays your last card (${String(last).replace(/_/g, " ")}) with shields (swarms: ~⅓). Tap to deploy.`
            : "Play something else on your side first — Mirror shows “?” until you have a prior deploy.";
      } else if (selCard === "tombstone") {
        hintEl.textContent = `Tombstone (${TOMBSTONE_COST}): building — ${TOMBSTONE_HP} HP decays over ${TOMBSTONE_LIFETIME_SEC}s; spawns ${TOMBSTONE_SKELS_EACH_SPAWN} skeletons every ${TOMBSTONE_SKEL_INTERVAL_SEC}s; on death spawns ${TOMBSTONE_SKELS_ON_DEATH}.`;
      } else if (selCard === "electro_wizard") {
        hintEl.textContent = `Electro Wizard (${ELECTRO_WIZARD_COST}, ${ELECTRO_WIZARD_HP} HP): spawn zap; attacks every ${ELECTRO_WIZARD_ATTACK_SEC}s with instant lightning (two targets or 2× on one); each hit stuns ${ELECTRO_STUN_SEC}s.`;
      } else if (selCard === "goblin_hut") {
        hintEl.textContent =
          `Place on your grass. HP slowly drains (~${GOBLIN_HUT_LIFETIME_SEC}s lifetime). Ring = spawn range: one Spear Goblin / 2s while an enemy is inside.`;
      } else if (selCard === "statue") {
        hintEl.textContent = `Statue (${STATUE_COST}): ${STATUE_HP} HP building — does not attack. On death it explodes in ${Math.round(
          STATUE_DEATH_BLAST_RADIUS,
        )}px (small fireball-like blast): ${Math.round(STATUE_DEATH_BLAST_DMG)} damage to troops/buildings, ${Math.round(STATUE_DEATH_BLAST_TOWER_DMG)} to towers.`;
      } else if (selCard === "goblin_drill") {
        hintEl.textContent = `Goblin Drill (${GOBLIN_DRILL_COST} elixir): tap on opponent grass — tunnels ~${GOBLIN_DRILL_TRAVEL_SEC}s from your king (path shown); drill loses HP twice as fast as a hut baseline; when destroyed, spills 2 melee Goblins. Active drill spawns a Goblin every ${GOBLIN_DRILL_SPAWN_INTERVAL}s (max ${MAX_DRILL_GOBLINS} alive).`;
      } else if (selCard === "goblin_drill_army") {
        hintEl.textContent = `Goblin Drill Army (${GOBLIN_DRILL_ARMY_COST} elixir): tap center on opponent grass — six burrows from your king land in a ring around that point (${GOBLIN_DRILL_TRAVEL_SEC}s travel each); each drill behaves like Goblin Drill.`;
      } else if (selCard === "build") {
        hintEl.textContent = `Build (${BUILD_SPELL_COST} elixir): tap anywhere — restores +${BUILD_SPELL_HEAL} HP to each of your damaged spawned buildings (huts, drills, cannon, …) inside a ${Math.round(
          ARROWS_SPELL_RADIUS,
        )} px splash (same as Arrows vs buildings). Arena towers are not repaired.`;
      } else if (selCard === "cannon") {
        hintEl.textContent = `Cannon (${CANNON_COST}): ${CANNON_HP} HP drains over ${CANNON_LIFETIME_SEC}s. Fires at the nearest enemy troop or building in range (${CANNON_RANGE}px, ${CANNON_SHOT_DMG} dmg / ${CANNON_FIRE_INTERVAL}s).`;
      } else if (selCard === "garrison_tower") {
        hintEl.textContent = `Garrison Tower (${GARRISON_TOWER_COST}): ${GARRISON_TOWER_HP} HP drains in ~${Math.round(
          GARRISON_TOWER_LIFETIME_SEC / GARRISON_TOWER_DECAY_SPEED_MUL,
        )}s (30% faster drain than the ${GARRISON_TOWER_LIFETIME_SEC}s baseline). Deploy a troop on it — they stay inside, shoot out, and are untargetable until the tower is destroyed.`;
      } else if (selCard === "luxury_hotel") {
        hintEl.textContent = `Luxury Hotel (${LUXURY_HOTEL_COST}): ${LUXURY_HOTEL_HP} HP, no decay — holds up to 2 troops. Same garrison rules: troops inside shoot out and are untargetable until this building falls.`;
      } else if (selCard === "prince_tower") {
        hintEl.textContent = `Prince Tower (${PRINCE_TOWER_COST}): ${PRINCE_PLACEABLE_HP} HP (½ princess), no HP decay — shoots like a princess tower (${PRINCESS_RANGE}px, ${PRINCESS_DMG} dmg).`;
      } else if (selCard === "mega_goblin_army") {
        hintEl.textContent =
          `Chud that spawns Spear Goblins like a hut: ring moves with him; enemy inside = one spear / ${MEGA_GOBLIN_ARMY_SPEAR_INTERVAL}s (max ${MAX_SPEAR_PER_HUT} alive). Death: 5 melee goblins.`;
      } else if (selCard === "mega_army") {
        hintEl.textContent = `Swarm: ${MEGA_ARMY_GUARD_COUNT} guards (${SKELETON_GUARD_SHIELD_HP} shield HP each, overflow wasted when shield breaks — then they fight as skeletons), ${MEGA_ARMY_SKELETON_COUNT} skeletons, 1 witch (${MEGA_ARMY_COST} elixir).`;
      } else if (selCard === "archers") {
        hintEl.textContent = `Archers (${ARCHERS_COST} elixir): spawns ${ARCHERS_PER_CARD} archers — ${ARCHER_HP} HP each, ${ATTACK_INTERVAL_ARCHER}s shots, ${ARCHER_RANGE}px range.`;
      } else if (selCard === "archers_army") {
        hintEl.textContent = `Archers Army (${ARCHERS_ARMY_COST} elixir): same swarm pattern as Skarmy (${SKARMY_SPAWN_COUNT}), but every unit is an archer (${ARCHER_HP} HP, ${ARCHER_RANGE}px range).`;
      } else if (selCard === "bat_army") {
        hintEl.textContent = `Bat Army (${BAT_ARMY_COST} elixir): same swarm pattern as Skarmy (${SKARMY_SPAWN_COUNT}), but every unit is a bat (${BAT_HP} HP, flying; ${BAT_DMG} dmg — same as Bats card).`;
      } else if (selCard === "mega_knight_army") {
        hintEl.textContent = `Mega Knight Army (${MEGA_KNIGHT_ARMY_COST} elixir): ${SKARMY_SPAWN_COUNT} Mega Knights in the Skeleton Army spiral (${MEGA_KNIGHT_HP} HP each, jump slam).`;
      } else if (selCard === "boberdino_crocodelo") {
        hintEl.textContent = `Boberdino Crocodelo (${BOBERDINO_CROCODELO_COST} elixir): ${BOBERDINO_HP} HP — flies to the nearest enemy tower only; 0 melee damage; keeps dropping small Fireballs (${Math.round(
          BOBERDINO_BOMB_RADIUS,
        )}px radius, half Fireball troop damage, half vs towers).`;
      } else if (selCard === "nothing") {
        hintEl.textContent = "Nothing (0 elixir): places nothing — tap anywhere to cycle your hand.";
      } else if (selCard === "nothing_army") {
        hintEl.textContent = `Nothing Army (0 elixir): ${NOTHING_ARMY_COUNT} nothings — still nothing on the arena. Tap anywhere.`;
      } else if (selCard === "bats") {
        hintEl.textContent = `Bats (${BATS_COST}): ${BAT_COUNT}× flying swarm — ${BAT_HP} HP, ${BAT_DMG} dmg (¾ skeleton); ground melee can’t hit them.`;
      } else if (selCard === "tung_tung_tung_sahur") {
        const evoHint = nextDeployedTungIsEvo(state, humanControlSide(state))
          ? ` Evo slot active + cycles ready: on death spawns 2 mini Tungs at each princess tower (mini = 50% HP/damage/death splash/death explosion damage).`
          : ` Put him in deck slot #1 (evo slot) and cycle ${TUNG_EVO_REQUIRED_CYCLES} times to arm evo.`;
        hintEl.textContent = `Tung Tung Tung Sahur (${TUNG_SAHUR_COST} elixir): ${TUNG_SAHUR_HP} HP, ultra-fast hits (${ATTACK_INTERVAL_TUNG_SAHUR}s), death blast ${Math.round(
          TUNG_SAHUR_DEATH_BLAST_RADIUS,
        )}px for ${Math.round(TUNG_SAHUR_DEATH_BLAST_DMG)}.${evoHint}`;
      } else if (selCard === "assassin") {
        hintEl.textContent = `Assassin (${ASSASSIN_COST} elixir): ${KNIGHT_HP} HP + ${GENERIC_SHIELD_BUFF_HP} spawn shield, ${MINI_DMG} dmg / ${ATTACK_INTERVAL_MINI_PEKKA}s — ground troops only; melee splashes ~${Math.round(ASSASSIN_SPLASH_FRACTION * 100)}% damage in ${ASSASSIN_SPLASH_RADIUS}px. After ${ASSASSIN_CHARGE_PREP_SEC}s moving toward a foe: purple aura, ${ASSASSIN_CHARGE_SPEED_MUL}× speed & faster stride, next melee hits for double damage. Towers ignore him; Goblin Hut ring ignores him.`;
      } else if (selCard === "chud") {
        const evoHint = nextDeployedChudIsEvo(state, humanControlSide(state))
          ? ` Evo slot active: purple shockwave every ${CHUD_EVO_PULSE_SEC}s (${CHUD_EVO_PULSE_DMG} dmg + knockback in ${CHUD_EVO_PULSE_RADIUS}px).`
          : ` Put Chud in deck slot #1 (purple evo slot) to enable evo.`;
        hintEl.textContent = `Chud (${CHUD_COST} elixir): ${CHUD_HP} HP tower hunter — ${CHUD_DMG} dmg / ${ATTACK_INTERVAL_CHUD}s; shoves smaller foes aside.${evoHint}`;
      } else if (selCard === "bomber") {
        const evoHint = nextDeployedBomberIsEvo(state, humanControlSide(state))
          ? ` Evo slot active: purple bomb & splashes, ${ATTACK_INTERVAL_BOMBER_EVO.toFixed(2)}s throws; bomb travels 30% slower with ${BOMBER_CHAIN_FOLLOW_UP_COUNT + 1} splashes (${BOMBER_CHAIN_STEP_SEC}s apart).`
          : ` Put Bomber in deck slot #1 (purple evo slot) to enable evo.`;
        hintEl.textContent = `Bomber (${BOMBER_COST} elixir): explosions land slightly past enemies for fuller splashes.${evoHint}`;
      } else if (selCard) {
        hintEl.textContent =
          "Green tint shows where you can deploy. Destroy an enemy princess tower to place further up that lane (like Clash).";
      } else {
        hintEl.textContent = "Pick one of your 4 cards — next in line is shown under “Next”.";
      }
    }
  }

  function canvasPoint(canvas, evt) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    return {
      x: (evt.clientX - r.left) * sx,
      y: (evt.clientY - r.top) * sy,
    };
  }

  let gameRunning = false;
  let rafId = 0;
  let lastFrameT = 0;
  /** Keeps hudHtml() from touching the DOM when text unchanged — cheaper and avoids noisy aria-live churn. */
  let lastHudHtmlStr = "";
  /** @type {CanvasRenderingContext2D | null} */
  let gameCtx = null;
  /** @type {HTMLElement | null} */
  let gameHud = null;
  const gameEls = {
    fill: /** @type {HTMLElement | null} */ (null),
    num: /** @type {HTMLElement | null} */ (null),
    hint: /** @type {HTMLElement | null} */ (null),
    /** @type {HTMLButtonElement[]} */
    cardSlots: [],
    deckNextImg: /** @type {HTMLImageElement | null} */ (null),
    deckNextName: /** @type {HTMLElement | null} */ (null),
    deckNextCost: /** @type {HTMLElement | null} */ (null),
    deckNextWrap: /** @type {HTMLElement | null} */ (null),
  };
  /** @type {HTMLCanvasElement | null} */
  let gameCanvas = null;
  let domMounted = false;

  function mountGameDom() {
    if (domMounted) return true;
    const canvas = document.getElementById("arena");
    const hud = document.getElementById("hud");
    const btn = document.getElementById("btn-reset");
    const hint = document.getElementById("deploy-hint");
    const fill = document.getElementById("elixir-fill");
    const num = document.getElementById("elixir-num");
    const deckNextImg = document.getElementById("deck-next-img");
    const deckNextName = document.getElementById("deck-next-name");
    const deckNextCost = document.getElementById("deck-next-cost");
    const deckNextWrap = document.getElementById("deck-next-wrap");
    const slots = [0, 1, 2, 3].map((i) => document.getElementById(`card-slot-${i}`));

    if (
      !canvas ||
      !(canvas instanceof HTMLCanvasElement) ||
      !hud ||
      !btn ||
      !hint ||
      !fill ||
      !num ||
      slots.some((el) => !el) ||
      !deckNextImg ||
      !deckNextName ||
      !deckNextCost
    ) {
      return false;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    gameCtx = ctx;
    gameHud = hud;
    gameCanvas = canvas;
    gameEls.fill = fill;
    gameEls.num = num;
    gameEls.hint = hint;
    gameEls.cardSlots = /** @type {HTMLButtonElement[]} */ (slots);
    gameEls.deckNextImg = deckNextImg;
    gameEls.deckNextName = deckNextName;
    gameEls.deckNextCost = deckNextCost;
    gameEls.deckNextWrap = deckNextWrap;

    function selectSlot(slot) {
      const state = stateRef.current;
      if (!state || state.over) return;
      const cardId = state.hand[slot];
      if (!playerInfiniteElixir(state) && state.playerElixir < effectiveCardCost(state, cardId, humanControlSide(state))) return;
      state.selectedSlot = state.selectedSlot === slot ? null : slot;
    }

    for (let s = 0; s < 4; s++) {
      slots[s].addEventListener("click", () => selectSlot(s));
    }

    canvas.addEventListener("click", (e) => {
      const state = stateRef.current;
      if (!state) return;
      const { x, y } = canvasPoint(canvas, e);
      trySpawnPlayer(state, x, y);
    });

    const testingPanel = document.getElementById("testing-panel");
    const testingEnemySpawns = document.getElementById("testing-enemy-spawns");
    const testingInfiniteElixir = document.getElementById("testing-infinite-elixir");
    const testingInfiniteTowerHp = document.getElementById("testing-infinite-tower-hp");
    const testingPlayAsEnemy = document.getElementById("testing-play-as-enemy");
    const testingCombatDebug = document.getElementById("testing-combat-debug");
    const testingInvincibleTroops = document.getElementById("testing-invincible-troops");
    const testingBomberAlwaysEvo = document.getElementById("testing-bomber-always-evo");
    const testingChudAlwaysEvo = document.getElementById("testing-chud-always-evo");
    const testingKillAll = document.getElementById("testing-kill-all");

    function syncTestingUi() {
      const st = stateRef.current;
      if (!testingPanel || !testingEnemySpawns || !testingInfiniteElixir) return;
      if (!st || st.matchMode !== "training") {
        testingPanel.hidden = true;
        return;
      }
      testingPanel.hidden = false;
      testingEnemySpawns.checked = st.testing.enemySpawns !== false;
      testingInfiniteElixir.checked = !!st.testing.infiniteElixir;
      if (testingInfiniteTowerHp) testingInfiniteTowerHp.checked = !!st.testing.infiniteTowerHp;
      if (testingPlayAsEnemy) testingPlayAsEnemy.checked = !!st.testing.playAsEnemy;
      if (testingCombatDebug) testingCombatDebug.checked = !!st.testing.combatDebug;
      if (testingInvincibleTroops) testingInvincibleTroops.checked = !!st.testing.invincibleTroops;
      if (testingBomberAlwaysEvo) testingBomberAlwaysEvo.checked = !!st.testing.bomberAlwaysEvo;
      if (testingChudAlwaysEvo) testingChudAlwaysEvo.checked = !!st.testing.chudAlwaysEvo;
    }

    if (testingPanel && testingEnemySpawns && testingInfiniteElixir && testingKillAll) {
      testingEnemySpawns.addEventListener("change", () => {
        const st = stateRef.current;
        if (st && st.testing) st.testing.enemySpawns = testingEnemySpawns.checked;
      });
      testingInfiniteElixir.addEventListener("change", () => {
        const st = stateRef.current;
        if (st && st.testing) st.testing.infiniteElixir = testingInfiniteElixir.checked;
      });
      if (testingInfiniteTowerHp) {
        testingInfiniteTowerHp.addEventListener("change", () => {
          const st = stateRef.current;
          if (st && st.testing) st.testing.infiniteTowerHp = testingInfiniteTowerHp.checked;
        });
      }
      if (testingPlayAsEnemy) {
        testingPlayAsEnemy.addEventListener("change", () => {
          const st = stateRef.current;
          if (st && st.testing) st.testing.playAsEnemy = testingPlayAsEnemy.checked;
        });
      }
      if (testingCombatDebug) {
        testingCombatDebug.addEventListener("change", () => {
          const st = stateRef.current;
          if (st && st.testing) st.testing.combatDebug = testingCombatDebug.checked;
        });
      }
      if (testingInvincibleTroops) {
        testingInvincibleTroops.addEventListener("change", () => {
          const st = stateRef.current;
          if (st && st.testing) st.testing.invincibleTroops = testingInvincibleTroops.checked;
        });
      }
      if (testingBomberAlwaysEvo) {
        testingBomberAlwaysEvo.addEventListener("change", () => {
          const st = stateRef.current;
          if (st && st.testing) st.testing.bomberAlwaysEvo = testingBomberAlwaysEvo.checked;
        });
      }
      if (testingChudAlwaysEvo) {
        testingChudAlwaysEvo.addEventListener("change", () => {
          const st = stateRef.current;
          if (st && st.testing) st.testing.chudAlwaysEvo = testingChudAlwaysEvo.checked;
        });
      }
      testingKillAll.addEventListener("click", () => {
        const st = stateRef.current;
        if (!st || st.matchMode !== "training" || st.over) return;
        for (const u of st.troops) u.hp = 0;
        st.projectiles.length = 0;
        st.pendingDeploys.length = 0;
        st.arrowFx = null;
        st.cloneFx = null;
        st.fireballFx = null;
        st.goblinBarrelFx = null;
        st.rocketFx = null;
        st.zapFx = null;
        st.shieldBuffFx = null;
        st.buildRepairFx = null;
        st.rageFx = null;
        st.freezeZones = [];
        st.wizardSplashFx.length = 0;
      });
    }

    btn.addEventListener("click", () => {
      if (stateRef.current) {
        const prevMode = stateRef.current.matchMode;
        stateRef.current = createInitialState();
        stateRef.current.matchMode = prevMode;
        if (prevMode === "training" && stateRef.current.testing) {
          stateRef.current.testing.enemySpawns = testingEnemySpawns.checked;
          stateRef.current.testing.infiniteElixir = testingInfiniteElixir.checked;
          if (testingInfiniteTowerHp) stateRef.current.testing.infiniteTowerHp = testingInfiniteTowerHp.checked;
          if (testingPlayAsEnemy) stateRef.current.testing.playAsEnemy = testingPlayAsEnemy.checked;
          if (testingCombatDebug) stateRef.current.testing.combatDebug = testingCombatDebug.checked;
          if (testingInvincibleTroops) stateRef.current.testing.invincibleTroops = testingInvincibleTroops.checked;
          if (testingBomberAlwaysEvo) stateRef.current.testing.bomberAlwaysEvo = testingBomberAlwaysEvo.checked;
          if (testingChudAlwaysEvo) stateRef.current.testing.chudAlwaysEvo = testingChudAlwaysEvo.checked;
        }
        syncTestingUi();
      }
    });

    const emoteBar = document.getElementById("emote-bar");
    if (emoteBar) {
      emoteBar.querySelectorAll(".btn-emote").forEach((node) => {
        node.addEventListener("click", () => {
          const emoji = node.getAttribute("data-emoji");
          if (emoji) pushEmote(emoji);
        });
      });
    }

    testingPanelSync.fn = syncTestingUi;
    domMounted = true;
    return true;
  }

  function frame(now) {
    if (!gameRunning || !gameCtx || !gameHud || !stateRef.current) return;
    let dt = (now - lastFrameT) / 1000;
    if (!(dt >= 0) || !(dt < 2)) dt = 0.016;
    dt = Math.min(0.05, dt);
    lastFrameT = now;
    const state = stateRef.current;
    try {
      stepSimulation(dt, state);
      render(gameCtx, state);
      const hudStr = hudHtml(state);
      if (hudStr !== lastHudHtmlStr) {
        lastHudHtmlStr = hudStr;
        gameHud.innerHTML = hudStr;
      }
      syncHandDom(state, gameEls);
    } catch (err) {
      console.error("[NightArena] frame()", err);
    } finally {
      if (gameRunning && gameCtx && gameHud && stateRef.current) {
        rafId = requestAnimationFrame(frame);
      }
    }
  }

  /**
   * @param {{ mode?: "training" | "battle"; matchId?: string; guestId?: string }} [opts]
   */
  function start(opts) {
    if (!mountGameDom() || !gameCtx || !gameHud) return;
    stop();
    const mode = opts && opts.mode === "battle" ? "battle" : "training";
    const mid = opts && opts.matchId ? String(opts.matchId) : "";
    const gid =
      (opts && opts.guestId && String(opts.guestId)) ||
      (typeof window !== "undefined" &&
        window.NightArenaMatchmaking &&
        typeof window.NightArenaMatchmaking.guestId === "function" &&
        window.NightArenaMatchmaking.guestId()) ||
      "";
    if (mode === "battle" && mid && gid) {
      setupBattleNet(mid, gid);
      hudModeLine = `<strong>Battle (PvP)</strong> · match <strong>${mid.slice(0, 8)}…</strong> — deploys sync via Firestore <strong>moves</strong>. <strong>${PVP_MATCH_DURATION_SEC / 60}:00</strong> regulation (elixir <strong>2× / 3× / 5×</strong> under 2:00 / 1:00 / 0:30); tie → <strong>overtime</strong> (<strong>${PVP_OVERTIME_ELIXIR_MULT}×</strong> elixir, first princess tower).`;
    } else if (mode === "battle" && mid) {
      hudModeLine = `<strong>Battle</strong> · match <strong>${mid.slice(0, 8)}…</strong> — refresh and re-queue if troops don’t sync (missing guest id).`;
    } else if (mode === "battle") {
      hudModeLine = "<strong>Battle</strong> — online queue (configure Firebase to match with others).";
    } else {
      hudModeLine = "<strong>Training</strong> — practice vs AI.";
    }
    runtimePlayerDeck =
      opts && opts.deck && validateDeckForGame(opts.deck) ? opts.deck.slice() : null;
    const st = createInitialState();
    st.matchMode = mode;
    st.testing.enemySpawns = true;
    st.testing.infiniteElixir = false;
    st.testing.infiniteTowerHp = false;
    st.testing.playAsEnemy = false;
    st.testing.combatDebug = false;
    st.testing.invincibleTroops = false;
    st.testing.bomberAlwaysEvo = false;
    st.testing.chudAlwaysEvo = false;
    stateRef.current = st;
    gameRunning = true;
    lastFrameT = performance.now();
    lastHudHtmlStr = "";
    const emoteBar = document.getElementById("emote-bar");
    if (emoteBar) {
      emoteBar.style.display = "flex";
    }
    testingPanelSync.fn?.();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    gameRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    stateRef.current = null;
    hudModeLine = "";
    lastHudHtmlStr = "";
    tearDownBattleNet();
    testingPanelSync.fn?.();
    const emoteBar = document.getElementById("emote-bar");
    if (emoteBar) emoteBar.style.display = "none";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountGameDom);
  } else {
    mountGameDom();
  }

  window.NightArena = {
    start,
    stop,
    mount: mountGameDom,
    CARD_POOL: ALL_CARD_IDS.slice().sort((a, b) => {
      const ca = getCardCostNumber(a);
      const cb = getCardCostNumber(b);
      if (ca !== cb) return ca - cb;
      return String(a).localeCompare(String(b));
    }),
    validateDeck: validateDeckForGame,
    getDefaultDeck: () => DEFAULT_DECK_EIGHT.slice(),
    getCardPreview: (cardId) => ({
      ...cardUiInfo(String(cardId)),
      description: collectionCardDescription(String(cardId)),
    }),
    getCardCostNumber: (cardId) => getCardCostNumber(String(cardId)),
  };

  const NIGHT_ARENA_VERSION = 180;
  window.NIGHT_ARENA_VERSION = NIGHT_ARENA_VERSION;
  function paintVersionBadge() {
    document.querySelectorAll("[data-na-version]").forEach((el) => {
      el.textContent = "v" + NIGHT_ARENA_VERSION;
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paintVersionBadge);
  } else {
    paintVersionBadge();
  }
})();
