export type TwinFitMode = "check" | "build" | "rescue";

export type TwinFitFeeling =
  "Sexy" | "Powerful" | "Comfortable" | "Elegant" | "Bold" | "Different";

export type TwinFitContext = {
  mode: TwinFitMode;

  currentVibe?: string | null;
  desiredFeeling: TwinFitFeeling;

  photoProvided?: boolean;

  closetFirst?: boolean;

  budget?: string | null;
  timeWindow?: string | null;

  /**
   * These are intentionally optional.
   * TwinMe must never invent them if the user
   * has not supplied or connected the context.
   */
  destination?: string | null;
  dressCode?: string | null;
  weatherSummary?: string | null;
};

export type TwinFitSignal = {
  label: string;
  value: string;
  state: "strong" | "ready" | "attention" | "unknown";
  explanation: string;
};

export type TwinFitResult = {
  headline: string;
  summary: string;

  swagCheck: TwinFitSignal;
  codeCheck: TwinFitSignal;
  comfortCheck: TwinFitSignal;

  moveTitle: string;
  moveBody: string;

  why: string[];

  nextNeed?: string | null;

  confidence: "developing" | "contextual" | "strong";
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getFeelingMove(feeling: TwinFitFeeling): {
  title: string;
  body: string;
  why: string;
} {
  switch (feeling) {
    case "Sexy":
      return {
        title: "Make the shoes the decision.",
        body: "Keep the look direction. Choose the sexiest pair you already know you can actually last in tonight.",
        why: "Footwear can preserve the sexy energy while protecting how you feel later in the night.",
      };

    case "Powerful":
      return {
        title: "Give the fit one power piece.",
        body: "Keep the base clean and let one strong piece carry the look — jacket, shoe, accessory or silhouette.",
        why: "One intentional statement usually reads stronger than several competing ones.",
      };

    case "Comfortable":
      return {
        title: "Build around your most reliable piece.",
        body: "Start with what you already know feels good for hours, then elevate around it instead of sacrificing comfort.",
        why: "Comfort works best when it is part of the styling decision from the beginning.",
      };

    case "Elegant":
      return {
        title: "Remove one competing element.",
        body: "Keep the strongest line of the outfit and simplify anything fighting for attention.",
        why: "Elegant usually hits harder when the look feels deliberate rather than busy.",
      };

    case "Bold":
      return {
        title: "Push one category harder.",
        body: "Choose one place to go loud — footwear, outerwear, accessory or color — and keep the rest controlled.",
        why: "A focused statement lets the bold element look intentional instead of accidental.",
      };

    case "Different":
      return {
        title: "Break one of your usual patterns.",
        body: "Change one category you tend to repeat while keeping enough familiar pieces that the look still feels like you.",
        why: "The goal is evolution, not dressing like somebody else.",
      };
  }
}

function getRescueMove(budget?: string | null, timeWindow?: string | null) {
  const money = normalize(budget);
  const time = normalize(timeWindow);

  if (money.includes("$0") || money.includes("closet")) {
    return {
      title: "Shop your closet first.",
      body: "Build the strongest base from what you already own. TwinMe should only identify a missing piece if the closet cannot finish the assignment.",
      why: "Fit Rescue should solve the problem — not automatically create a shopping problem.",
    };
  }

  if (time.includes("30") || time.includes("1 hour")) {
    return {
      title: "Complete the fit. Don't rebuild it.",
      body: "Time is the constraint. Use your strongest existing base and solve only the one category preventing the look from working.",
      why: "A full shopping trip is usually the wrong move when getting-ready time is tight.",
    };
  }

  if (money.includes("under $50") || money.includes("under $100")) {
    return {
      title: "Buy one finishing piece.",
      body: "Use your closet for the base and spend the budget only where it changes the whole look.",
      why: "A targeted purchase usually creates more value than replacing pieces that already work.",
    };
  }

  return {
    title: "Start with your closet, then fill the gap.",
    body: "TwinMe should establish what you already have before deciding whether tonight actually requires shopping.",
    why: "Your budget should improve the experience, not disappear because shopping was treated as the default.",
  };
}

// TWINCORE_DRESS_CODE_INTELLIGENCE_R11_8

export type TwinDressCodeResolution = {
  status: "inferred" | "needs-clarification";
  dressCode: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
  options: string[];
};

export function resolveDressCodeContext(
  destination?: string | null,
): TwinDressCodeResolution {
  const place = normalize(destination);

  if (!place) {
    return {
      status: "needs-clarification",
      dressCode: null,
      confidence: "low",
      reason: "TwinMe needs the destination before reading the style lane.",
      options: [],
    };
  }

  const includesAny = (terms: string[]) =>
    terms.some((term) => place.includes(term));

  if (includesAny(["wedding", "gala", "black tie", "formal", "ball"])) {
    return {
      status: "inferred",
      dressCode: "Formal / Event Ready",
      confidence: "high",
      reason:
        "The event context strongly points toward a formal style lane. TwinMe is treating this as outfit guidance, not claiming a venue-specific rule.",
      options: [],
    };
  }

  if (includesAny(["rooftop", "cocktail", "lounge", "supper club"])) {
    return {
      status: "inferred",
      dressCode: "Elevated Night Out",
      confidence: "high",
      reason:
        "This destination strongly suggests an elevated night-out lane while leaving room for your own swag.",
      options: [],
    };
  }

  if (includesAny(["club", "nightclub", "dance club"])) {
    return {
      status: "inferred",
      dressCode: "Nightlife Ready",
      confidence: "high",
      reason:
        "The destination clearly points toward nightlife. TwinMe can style for that energy without pretending to know a specific door policy.",
      options: [],
    };
  }

  if (includesAny(["concert", "festival", "show", "arena"])) {
    return {
      status: "inferred",
      dressCode: "Statement Casual",
      confidence: "medium",
      reason:
        "The event points toward expressive styling with movement and comfort still protected.",
      options: [],
    };
  }

  if (includesAny(["house party", "home party", "kickback"])) {
    return {
      status: "inferred",
      dressCode: "Social Casual",
      confidence: "high",
      reason:
        "The setting supports a relaxed social lane, so TwinMe can prioritize personality over formality.",
      options: [],
    };
  }

  if (includesAny(["work event", "office", "corporate", "networking"])) {
    return {
      status: "inferred",
      dressCode: "Polished / Work Social",
      confidence: "high",
      reason:
        "The setting calls for a polished social look that still feels like you.",
      options: [],
    };
  }

  if (includesAny(["date night", "date"])) {
    return {
      status: "needs-clarification",
      dressCode: null,
      confidence: "medium",
      reason:
        "Date night can mean anything from casual food to a full upscale experience.",
      options: [
        "Casual Date",
        "Cute & Trendy",
        "Elevated Date Night",
        "Dressy / Upscale",
      ],
    };
  }

  if (includesAny(["dinner", "restaurant", "food"])) {
    return {
      status: "needs-clarification",
      dressCode: null,
      confidence: "medium",
      reason:
        "Dinner alone does not tell TwinMe how dressed-up the setting is.",
      options: ["Casual", "Trendy", "Upscale", "Date Night"],
    };
  }

  if (includesAny(["bar", "pub"])) {
    return {
      status: "needs-clarification",
      dressCode: null,
      confidence: "medium",
      reason:
        "Bars range from neighborhood casual to upscale nightlife, so TwinMe needs one quick read.",
      options: ["Casual", "Trendy", "Elevated", "Nightlife"],
    };
  }

  if (includesAny(["birthday", "anniversary", "graduation", "special event"])) {
    return {
      status: "needs-clarification",
      dressCode: null,
      confidence: "medium",
      reason:
        "The occasion matters, but TwinMe still needs the level of dressiness.",
      options: [
        "Casual Celebration",
        "Cute & Trendy",
        "Elevated",
        "Dressy / Formal",
      ],
    };
  }

  return {
    status: "needs-clarification",
    dressCode: null,
    confidence: "low",
    reason:
      "TwinMe knows where you're going but not enough about the setting to confidently choose the style lane.",
    options: ["Casual", "Trendy", "Elevated", "Dressy"],
  };
}

// TWINCORE_TIME_WEATHER_INTELLIGENCE_R11_9

export type TwinEnvironmentRead = {
  weatherLane: "unknown" | "clear" | "rain" | "cold" | "hot" | "wind" | "snow";
  timeLane: "day" | "evening" | "late-night";
  protectionLevel: "normal" | "watch" | "protect";
  headline: string;
  guidance: string;
  footwearNote: string | null;
  outerwearNote: string | null;
};

function readTimeLane(): TwinEnvironmentRead["timeLane"] {
  const hour = new Date().getHours();

  if (hour >= 22 || hour < 5) {
    return "late-night";
  }

  if (hour >= 17) {
    return "evening";
  }

  return "day";
}

export function resolveTimeWeatherContext(
  weatherSummary?: string | null,
): TwinEnvironmentRead {
  const weather = normalize(weatherSummary);
  const timeLane = readTimeLane();

  if (!weather) {
    return {
      weatherLane: "unknown",
      timeLane,
      protectionLevel: "normal",
      headline: "Weather check pending.",
      guidance:
        "TwinMe has the style direction. Live weather can tighten footwear, outerwear and comfort before the fit is locked.",
      footwearNote: null,
      outerwearNote: null,
    };
  }

  const hasAny = (terms: string[]) =>
    terms.some((term) => weather.includes(term));

  if (hasAny(["snow", "snowing", "blizzard", "freezing", "ice", "icy"])) {
    return {
      weatherLane: "snow",
      timeLane,
      protectionLevel: "protect",
      headline: "Protect the fit from the conditions.",
      guidance:
        "Cold or icy conditions change the practical lane. TwinMe will protect warmth, traction and the look.",
      footwearNote: "Prioritize secure, weather-ready footwear with traction.",
      outerwearNote:
        "A warm outer layer becomes part of the look, not an afterthought.",
    };
  }

  if (
    hasAny(["rain", "rainy", "showers", "shower", "drizzle", "storm", "wet"])
  ) {
    return {
      weatherLane: "rain",
      timeLane,
      protectionLevel: "protect",
      headline: "Keep the look. Weather-proof the weak points.",
      guidance:
        "Wet conditions should change the vulnerable pieces without rebuilding the whole outfit.",
      footwearNote:
        "Avoid footwear that cannot handle wet ground or a longer walk.",
      outerwearNote:
        "Use a rain-safe layer that still matches the dress-code lane.",
    };
  }

  if (hasAny(["cold", "chilly", "cool", "frost"])) {
    return {
      weatherLane: "cold",
      timeLane,
      protectionLevel: "watch",
      headline: "Layer without losing the look.",
      guidance:
        "TwinMe will preserve the outfit direction while protecting comfort as temperatures drop.",
      footwearNote: null,
      outerwearNote:
        "Add a deliberate outer layer that feels like part of the fit.",
    };
  }

  if (hasAny(["hot", "heat", "humid", "humidity", "warm"])) {
    return {
      weatherLane: "hot",
      timeLane,
      protectionLevel: "watch",
      headline: "Keep it breathable.",
      guidance:
        "Heat changes fabric weight, layering and comfort. TwinMe should keep the energy without making the fit exhausting to wear.",
      footwearNote:
        "Favor footwear you can comfortably stay in as the night moves.",
      outerwearNote:
        "Skip unnecessary heavy layers unless the venue itself calls for one.",
    };
  }

  if (hasAny(["wind", "windy", "gust", "gusty"])) {
    return {
      weatherLane: "wind",
      timeLane,
      protectionLevel: "watch",
      headline: "Control the pieces that can fight you.",
      guidance:
        "Wind affects loose layers, hair-sensitive styling and comfort during outdoor movement.",
      footwearNote: null,
      outerwearNote:
        "Choose an outer layer that stays controlled while moving.",
    };
  }

  return {
    weatherLane: "clear",
    timeLane,
    protectionLevel: "normal",
    headline: "Conditions are giving us room.",
    guidance:
      "No major weather constraint is showing. TwinMe can keep the recommendation centered on your swag, destination and comfort.",
    footwearNote: null,
    outerwearNote: null,
  };
}

// TWINCORE_FOOTWEAR_INTELLIGENCE_R12_0

export type TwinFootwearRead = {
  lane:
    | "balanced"
    | "sleek-statement"
    | "nightlife-statement"
    | "all-night-comfort"
    | "weather-safe"
    | "event-polished";
  headline: string;
  move: string;
  reason: string;
  comfortPriority: "normal" | "elevated" | "high";
  weatherProtected: boolean;
};

export type TwinFootwearContext = {
  desiredFeeling?: string | null;
  destination?: string | null;
  dressCode?: string | null;
  weatherSummary?: string | null;
  currentVibe?: string | null;
};

export function resolveFootwearIntelligence(
  context: TwinFootwearContext,
): TwinFootwearRead {
  const feeling = normalize(context.desiredFeeling);
  const destination = normalize(context.destination);
  const dressCode = normalize(context.dressCode);
  const weather = normalize(context.weatherSummary);
  const vibe = normalize(context.currentVibe);

  const hasAny = (value: string, terms: string[]) =>
    terms.some((term) => value.includes(term));

  const weatherRisk = hasAny(weather, [
    "rain",
    "rainy",
    "shower",
    "drizzle",
    "storm",
    "wet",
    "snow",
    "snowing",
    "ice",
    "icy",
    "freezing",
  ]);

  const movementHeavy =
    hasAny(destination, [
      "concert",
      "festival",
      "club",
      "nightclub",
      "dance",
      "arena",
    ]) || hasAny(vibe, ["dance", "outside", "we outside"]);

  const upscale =
    hasAny(dressCode, [
      "upscale",
      "formal",
      "elevated",
      "event ready",
      "polished",
    ]) ||
    hasAny(destination, [
      "rooftop",
      "cocktail",
      "lounge",
      "gala",
      "wedding",
      "supper club",
    ]);

  const comfortFirst = feeling.includes("comfortable");

  const statementFeeling = hasAny(feeling, [
    "sexy",
    "bold",
    "powerful",
    "different",
  ]);

  if (weatherRisk) {
    return {
      lane: "weather-safe",
      headline: "Weather-Safe Statement",
      move: "Keep the energy, but choose footwear that can handle the ground and the conditions.",
      reason:
        "TwinMe is protecting traction, material and all-night comfort without flattening the look.",
      comfortPriority: "high",
      weatherProtected: true,
    };
  }

  if (comfortFirst || movementHeavy) {
    return {
      lane: "all-night-comfort",
      headline: "All-Night Comfort",
      move: upscale
        ? "Choose the most polished supportive option you can comfortably stay in."
        : "Choose a supportive sneaker, boot or equivalent that can survive the whole move.",
      reason: movementHeavy
        ? "Tonight looks movement-heavy, so the shoe has to work after the first hour — not just in the mirror."
        : "Comfort is part of the requested energy tonight, so TwinMe is treating it as a design requirement.",
      comfortPriority: "high",
      weatherProtected: false,
    };
  }

  if (upscale && statementFeeling) {
    return {
      lane: "sleek-statement",
      headline: "Sleek Statement",
      move: "Let the footwear sharpen the look: polished, intentional and strong enough to carry the outfit.",
      reason:
        "Your desired feeling wants presence, while the setting calls for a cleaner elevated finish.",
      comfortPriority: "elevated",
      weatherProtected: false,
    };
  }

  if (
    hasAny(destination, ["club", "nightclub", "bar", "lounge"]) &&
    statementFeeling
  ) {
    return {
      lane: "nightlife-statement",
      headline: "Statement Nightlife",
      move: "Give the footwear attitude, but keep it wearable enough that the night does not end because your feet do.",
      reason:
        "The nightlife setting can take more personality, but TwinMe is still protecting the full-night experience.",
      comfortPriority: "elevated",
      weatherProtected: false,
    };
  }

  if (hasAny(dressCode, ["formal", "event ready", "work social", "polished"])) {
    return {
      lane: "event-polished",
      headline: "Event Polished",
      move: "Choose a clean, intentional footwear option that finishes the outfit without competing with it.",
      reason:
        "The event context calls for polish first. Personality can still show through shape, finish or detail.",
      comfortPriority: "normal",
      weatherProtected: false,
    };
  }

  return {
    lane: "balanced",
    headline: "Balanced Move",
    move: statementFeeling
      ? "Choose the strongest footwear option that still feels natural on you."
      : "Choose the pair that best balances the look, the setting and how long you expect to be out.",
    reason:
      "There is no strong environmental or venue constraint forcing the footwear in one direction.",
    comfortPriority: "normal",
    weatherProtected: false,
  };
}

// TWINCORE_FINAL_SWAG_ENGINE_R12_1

export type TwinFinalSwagMove = {
  title: string;
  body: string;
  strategy: string;
  priority: "identity" | "footwear" | "weather" | "comfort" | "rescue";
};

export function resolveFinalSwagMove(
  context: TwinFitContext,
): TwinFinalSwagMove {
  const feelingMove = getFeelingMove(context.desiredFeeling);

  const footwear = resolveFootwearIntelligence({
    desiredFeeling: context.desiredFeeling,
    destination: context.destination,
    dressCode: context.dressCode,
    weatherSummary: context.weatherSummary,
    currentVibe: context.currentVibe,
  });

  const environment = resolveTimeWeatherContext(context.weatherSummary);

  const destination = context.destination?.trim() || null;

  const dressCode = context.dressCode?.trim() || null;

  const feeling = context.desiredFeeling;

  const settingLine =
    destination && dressCode
      ? `${destination} is reading ${dressCode}.`
      : destination
        ? `We're building around ${destination}.`
        : dressCode
          ? `The style lane is ${dressCode}.`
          : null;

  /**
   * FIT RESCUE
   *
   * Rescue keeps time + budget as the dominant constraint,
   * but the newer intelligence still shapes the finish.
   */
  if (context.mode === "rescue") {
    const rescue = getRescueMove(context.budget, context.timeWindow);

    return {
      title: rescue.title,
      body: [rescue.body, settingLine, footwear.move].filter(Boolean).join(" "),
      strategy:
        "TwinMe is solving the immediate problem first, then protecting your swag, setting and comfort.",
      priority: "rescue",
    };
  }

  /**
   * WEATHER OVERRIDE
   *
   * Weather should modify the vulnerable pieces,
   * not erase the user's style direction.
   */
  if (environment.protectionLevel === "protect") {
    return {
      title: "Keep the look. Protect the finish.",
      body: [
        `You're still going for ${feeling.toLowerCase()} energy.`,
        settingLine,
        environment.guidance,
        footwear.move,
      ]
        .filter(Boolean)
        .join(" "),
      strategy:
        "TwinMe is preserving the original style direction while changing only what the conditions actually threaten.",
      priority: "weather",
    };
  }

  /**
   * COMFORT / MOVEMENT
   */
  if (footwear.lane === "all-night-comfort") {
    return {
      title:
        feeling === "Comfortable"
          ? "Make comfort look intentional."
          : "Protect the night, not just the mirror.",
      body: [
        `You want ${feeling.toLowerCase()} energy.`,
        settingLine,
        footwear.move,
      ]
        .filter(Boolean)
        .join(" "),
      strategy:
        "TwinMe is treating comfort as part of the styling decision instead of something you deal with later.",
      priority: "comfort",
    };
  }

  /**
   * FOOTWEAR-LED STATEMENT
   */
  if (
    footwear.lane === "sleek-statement" ||
    footwear.lane === "nightlife-statement"
  ) {
    return {
      title: "Let the footwear carry the attitude.",
      body: [
        `You want ${feeling.toLowerCase()} energy.`,
        settingLine,
        `${footwear.headline} is the strongest footwear lane.`,
        footwear.move,
      ]
        .filter(Boolean)
        .join(" "),
      strategy:
        "TwinMe is concentrating the statement in one place so the entire look feels intentional instead of overworked.",
      priority: "footwear",
    };
  }

  /**
   * EVENT POLISH
   */
  if (footwear.lane === "event-polished") {
    return {
      title:
        feeling === "Elegant"
          ? "Keep the line clean and deliberate."
          : "Polish the finish. Keep your personality.",
      body: [
        `You're aiming for ${feeling.toLowerCase()} energy.`,
        settingLine,
        footwear.move,
      ]
        .filter(Boolean)
        .join(" "),
      strategy:
        "TwinMe is respecting the event lane without turning the user into a generic dress-code template.",
      priority: "identity",
    };
  }

  /**
   * DEFAULT — USER IDENTITY WINS
   */
  return {
    title: feelingMove.title,
    body: [feelingMove.body, settingLine, footwear.move]
      .filter(Boolean)
      .join(" "),
    strategy:
      "No stronger constraint needs to override your normal swag, so TwinMe is keeping your desired feeling in control.",
    priority: "identity",
  };
}

export function buildFitIntelligence(context: TwinFitContext): TwinFitResult {
  const feelingMove = getFeelingMove(context.desiredFeeling);

  const rescueMove =
    context.mode === "rescue"
      ? getRescueMove(context.budget, context.timeWindow)
      : null;

  // TWINCORE_FINAL_SWAG_CONNECTION_R12_1
  const finalSwag = resolveFinalSwagMove(context);

  const hasDestination = Boolean(context.destination?.trim());

  const hasDressCode = Boolean(context.dressCode?.trim());

  const swagCheck: TwinFitSignal = {
    label: "Swag Check",
    value: context.mode === "check" ? "YOU FIRST" : "DNA READY",
    state: "strong",
    explanation:
      context.mode === "check"
        ? "TwinMe is evaluating the direction against the feeling you chose, not a generic beauty standard."
        : "TwinMe starts from your personal style direction rather than a universal outfit formula.",
  };

  const codeCheck: TwinFitSignal = hasDressCode
    ? {
        label: "Code Check",
        value: context.dressCode!,
        state: "ready",
        explanation: "TwinMe has dress-code context for the recommendation.",
      }
    : hasDestination
      ? {
          label: "Code Check",
          value: "VERIFYING",
          state: "attention",
          explanation:
            "TwinMe has the destination but still needs the dress-code layer before calling the look fully locked.",
        }
      : {
          label: "Code Check",
          value: "NEEDS DESTINATION",
          state: "unknown",
          explanation:
            "TwinMe will not pretend to know the dress code without knowing where or what the event is.",
        };

  const comfortCheck: TwinFitSignal = {
    label: "Comfort Check",
    value:
      context.desiredFeeling === "Comfortable" || context.mode === "rescue"
        ? "PRIORITY"
        : "PROTECTED",
    state: "ready",
    explanation:
      "Comfort remains part of the recommendation even when the goal is sexy, bold or elevated.",
  };

  const contextStrength = [
    Boolean(context.currentVibe),
    Boolean(context.desiredFeeling),
    Boolean(context.destination),
    Boolean(context.dressCode),
    Boolean(context.weatherSummary),
    Boolean(context.photoProvided),
  ].filter(Boolean).length;

  const confidence =
    contextStrength >= 5
      ? "strong"
      : contextStrength >= 3
        ? "contextual"
        : "developing";

  const why = [feelingMove.why, finalSwag.strategy];

  if (context.mode === "rescue") {
    why.push(
      rescueMove?.why ??
        "TwinMe is optimizing for the fastest useful solution.",
    );
  }

  if (context.currentVibe) {
    why.push(
      `Tonight's current vibe is ${context.currentVibe}, so the recommendation should support that energy without overwriting your normal swag.`,
    );
  }

  if (!hasDestination) {
    why.push(
      "Destination is still missing, so TwinMe is deliberately holding back any dress-code claim.",
    );
  }

  return {
    headline:
      context.mode === "rescue"
        ? "We can work with this."
        : context.mode === "build"
          ? "TwinMe has the direction."
          : "TwinMe sees where we're going.",

    summary:
      context.mode === "rescue"
        ? "Time, money and how you want to feel are now part of the same decision."
        : `You're aiming for ${context.desiredFeeling.toLowerCase()} energy. TwinMe is keeping the recommendation centered on you.`,

    swagCheck,
    codeCheck,
    comfortCheck,

    moveTitle: finalSwag.title,
    moveBody: finalSwag.body,

    why,

    nextNeed: !hasDestination
      ? "Where are we going? Add the destination or event next so TwinMe can complete Code Check."
      : !hasDressCode
        ? "Dress-code verification is the next missing context."
        : null,

    confidence,
  };
}
