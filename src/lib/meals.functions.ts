import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  COURSES,
  MEALS,
  STORES,
  addDays,
  buildShoppingList,
  isNoCookSlot,
  summarizePlan,
  validatePlan,
  weekDays,
  type Meal,
  type NoCookSlot,
  type PlanItem,
  type ShoppingLine,
} from "./plan-rules";

const SYSTEM_PROMPT =
  "Eres un nutricionista experto en dieta mediterránea tradicional y planificación familiar. " +
  "Genera el menú con recetas de toda la vida, sencillas entre semana, con productos frescos. " +
  "Cumple estrictamente las reglas y restricciones recibidas. Responde únicamente con JSON válido.";

type Member = {
  name: string;
  age: number | null;
  sport_level: string;
  ration_factor: number;
  diet_notes: string[];
  likes: string[];
  dislikes: string[];
};

async function askAi(prompt: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Falta la clave del servicio de IA.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions: SYSTEM_PROMPT,
      input: prompt,
      reasoning: { effort: "medium" },
      store: false,
      text: { format: { type: "json_object" } },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429) throw new Error("El servicio de IA está saturado. Inténtalo en un minuto.");
    if (res.status === 402) throw new Error("Se han agotado los créditos de IA del espacio de trabajo.");
    throw new Error(`Error del servicio de IA (${res.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    output?: { content?: { type?: string; text?: string }[] }[];
  };
  const text = (json.output ?? [])
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" || typeof c.text === "string")
    .map((c) => c.text ?? "")
    .join("");
  if (!text.trim()) throw new Error("La IA no devolvió ningún menú.");
  return text;
}

function parseJson<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned) as T;
}

function describeContext(opts: {
  members: Member[];
  equipment: string[];
  noCookSlots: NoCookSlot[];
  recentNames: string[];
  favorites: string[];
  pantry: { name: string; quantity: number; unit: string }[];
  badFeedback: string[];
  weekStart: string;
}): string {
  const days = weekDays(opts.weekStart);
  const noCook = days
    .flatMap((day) => MEALS.map((meal) => ({ day, meal })))
    .filter(({ day, meal }) => isNoCookSlot(day, meal, opts.noCookSlots))
    .map(({ day, meal }) => `${day} (${meal})`);

  return [
    `Semana del ${opts.weekStart} (lunes) al ${days[6]} (domingo).`,
    `Miembros de la familia: ${JSON.stringify(opts.members)}`,
    `Raciones totales = suma de factores de ración: ${opts.members
      .reduce((a, m) => a + Number(m.ration_factor ?? 1), 0)
      .toFixed(2)}`,
    `Equipo disponible: ${opts.equipment.join(", ") || "básico"}`,
    `Comidas en las que NO se cocina (usa sobras o batch cooking del domingo, marca is_leftover o batch_friendly): ${
      noCook.join("; ") || "ninguna"
    }`,
    `Platos comidos en los últimos 15 días (PROHIBIDO repetirlos): ${
      opts.recentNames.join("; ") || "ninguno"
    }`,
    `Recetas favoritas de la familia: ${opts.favorites.join("; ") || "ninguna"}`,
    `Despensa disponible: ${JSON.stringify(opts.pantry)}`,
    `Platos marcados como "no repetir" en el feedback: ${opts.badFeedback.join("; ") || "ninguno"}`,
    "",
    "REGLAS OBLIGATORIAS:",
    "- Comida y cena, cada una con dos platos: primero (verdura, sopa, gazpacho, salmorejo, crema, ensalada, legumbre) y segundo (huevos, pescado, carne, legumbre).",
    "- Verdura y fruta todos los días.",
    "- Legumbres al menos 3 días distintos; pescado al menos 2 veces; carne roja 1 o 2 como máximo.",
    "- Sin pasta en las cenas. Sin ultraprocesados.",
    "- Recetas sencillas de lunes a viernes; el fin de semana pueden ser más elaboradas.",
    "- Respeta gustos, rechazos y notas dietéticas de cada miembro (si alguien tiene poca_sal, cocina con poca sal para toda la familia).",
    `- Las tiendas de cada ingrediente deben ser una de: ${STORES.join(", ")}.`,
    "- No repitas ningún plato dentro de la semana.",
  ].join("\n");
}

const ITEM_FIELDS =
  '{"day":"YYYY-MM-DD","meal":"comida|cena","course":"primero|segundo",' +
  '"name":"...","main_type":"...","is_legume":bool,"is_fish":bool,"is_red_meat":bool,"is_pasta":bool,' +
  '"ingredients":[{"nombre":"...","cantidad_por_persona":0,"unidad":"g|ml|ud","tienda":"..."}],' +
  '"batch_friendly":bool,"is_leftover":bool}';

// "notes": solo valoración cualitativa. Las cifras (días de legumbre, nº de pescados...)
// se calculan en código (summarizePlan) para que no queden desactualizadas tras un cambio.
const WEEK_JSON_SHAPE =
  `Devuelve SOLO este JSON: {"items":[${ITEM_FIELDS}],` +
  '"notes":"2-3 frases sobre por qué el menú es saludable, SIN cifras ni días concretos",' +
  '"batch_cooking":["paso 1","paso 2"]}';

const SWAP_JSON_SHAPE = `Devuelve SOLO este JSON: {"items":[${ITEM_FIELDS}]} con UNA sola entrada.`;

function normalizeItems(raw: unknown): PlanItem[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      day: String(o["day"] ?? ""),
      meal: (MEALS.includes(o["meal"] as Meal) ? o["meal"] : "comida") as Meal,
      course: (COURSES.includes(o["course"] as "primero" | "segundo") ? o["course"] : "segundo") as
        | "primero"
        | "segundo",
      name: String(o["name"] ?? "").trim(),
      main_type: o["main_type"] ? String(o["main_type"]) : null,
      is_legume: Boolean(o["is_legume"]),
      is_fish: Boolean(o["is_fish"]),
      is_red_meat: Boolean(o["is_red_meat"]),
      is_pasta: Boolean(o["is_pasta"]),
      batch_friendly: Boolean(o["batch_friendly"]),
      is_leftover: Boolean(o["is_leftover"]),
      ingredients: Array.isArray(o["ingredients"])
        ? (o["ingredients"] as Record<string, unknown>[]).map((i) => ({
            nombre: String(i["nombre"] ?? ""),
            cantidad_por_persona: Number(i["cantidad_por_persona"] ?? 0),
            unidad: String(i["unidad"] ?? "ud"),
            tienda: String(i["tienda"] ?? "Mercadona"),
          }))
        : [],
    };
  });
}

type Ctx = {
  supabase: {
    from: (table: string) => any;
  };
  userId: string;
};

type DbPlanItem = PlanItem & { id: string };

async function loadContext(supabase: Ctx["supabase"], householdId: string, weekStart: string) {
  // Ventana de 15 días ANTERIORES al inicio de la semana que se genera
  // (antes se calculaba desde "hoy", lo que fallaba al planificar semanas futuras).
  const windowStart = addDays(weekStart, -15);

  const [household, members, recipes, pantry, feedback, recent] = await Promise.all([
    supabase.from("households").select("*").eq("id", householdId).maybeSingle(),
    supabase.from("family_members").select("*").eq("household_id", householdId),
    supabase.from("recipes").select("name,is_favorite").eq("household_id", householdId),
    supabase.from("pantry_items").select("name,quantity,unit").eq("household_id", householdId),
    supabase.from("feedback").select("recipe_name,do_not_repeat").eq("household_id", householdId),
    supabase
      .from("plan_items")
      .select("name,day")
      .eq("household_id", householdId)
      .gte("day", windowStart)
      .lt("day", weekStart),
  ]);

  if (!household.data) throw new Error("No se encuentra el hogar.");

  const memberList: Member[] = (members.data ?? []) as Member[];
  return {
    household: household.data as {
      id: string;
      name: string;
      no_cook_slots: NoCookSlot[];
      equipment: string[];
    },
    members: memberList,
    rations: memberList.reduce((a, m) => a + Number(m.ration_factor ?? 1), 0) || 1,
    dislikes: memberList.flatMap((m) => m.dislikes ?? []),
    favorites: ((recipes.data ?? []) as { name: string; is_favorite: boolean }[])
      .filter((r) => r.is_favorite)
      .map((r) => r.name),
    pantry: (pantry.data ?? []) as { name: string; quantity: number; unit: string }[],
    badFeedback: ((feedback.data ?? []) as { recipe_name: string; do_not_repeat: boolean }[])
      .filter((f) => f.do_not_repeat)
      .map((f) => f.recipe_name),
    recentNames: [...new Set(((recent.data ?? []) as { name: string }[]).map((r) => r.name))],
  };
}

/**
 * Sustituye la lista de compra del hogar sin dejarla vacía si algo falla:
 * primero inserta la nueva y, solo si ha ido bien, borra las líneas antiguas.
 */
async function replaceShopping(
  supabase: Ctx["supabase"],
  householdId: string,
  planId: string,
  lines: ShoppingLine[],
  checkedKeys: Set<string> = new Set(),
) {
  const { data: old, error: oldError } = await supabase
    .from("shopping_items")
    .select("id")
    .eq("household_id", householdId);
  if (oldError) throw new Error(oldError.message);
  const oldIds = ((old ?? []) as { id: string }[]).map((o) => o.id);

  if (lines.length > 0) {
    const { error } = await supabase.from("shopping_items").insert(
      lines.map((l) => ({
        household_id: householdId,
        plan_id: planId,
        name: l.name,
        quantity: l.quantity,
        unit: l.unit,
        store: l.store,
        is_checked: checkedKeys.has(`${l.name.toLowerCase()}|${l.unit}|${l.store}`),
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (oldIds.length > 0) {
    const { error } = await supabase.from("shopping_items").delete().in("id", oldIds);
    if (error) throw new Error(error.message);
  }
}

const planItemRow = (i: PlanItem) => ({
  name: i.name,
  main_type: i.main_type ?? null,
  is_legume: i.is_legume,
  is_fish: i.is_fish,
  is_red_meat: i.is_red_meat,
  is_pasta: i.is_pasta,
  batch_friendly: i.batch_friendly,
  is_leftover: Boolean(i.is_leftover),
  ingredients: i.ingredients,
});

export const generateWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { householdId: string; weekStart: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context as unknown as Ctx;
    const ctx = await loadContext(supabase, data.householdId, data.weekStart);

    if (ctx.members.length === 0) {
      throw new Error("Añade primero a los miembros de la familia.");
    }

    const base = describeContext({
      members: ctx.members,
      equipment: ctx.household.equipment ?? [],
      noCookSlots: ctx.household.no_cook_slots ?? [],
      recentNames: ctx.recentNames,
      favorites: ctx.favorites,
      pantry: ctx.pantry,
      badFeedback: ctx.badFeedback,
      weekStart: data.weekStart,
    });

    let prompt = `${base}\n\nGenera las 28 entradas (7 días x comida/cena x primero/segundo).\n${WEEK_JSON_SHAPE}`;
    let items: PlanItem[] = [];
    let notes = "";
    let batchCooking: string[] = [];
    let errors: string[] = [];

    for (let attempt = 0; attempt < 2; attempt++) {
      const parsed = parseJson<{
        items: unknown;
        notes?: string;
        summary?: string;
        batch_cooking?: string[];
      }>(await askAi(prompt));
      items = normalizeItems(parsed.items);
      notes = String(parsed.notes ?? parsed.summary ?? "");
      batchCooking = Array.isArray(parsed.batch_cooking) ? parsed.batch_cooking.map(String) : [];
      errors = validatePlan(items, {
        weekStart: data.weekStart,
        noCookSlots: ctx.household.no_cook_slots ?? [],
        recentNames: ctx.recentNames,
        dislikes: ctx.dislikes,
      });
      if (errors.length === 0) break;
      prompt = `${base}\n\nTu respuesta anterior incumplía estas reglas:\n- ${errors.join(
        "\n- ",
      )}\nCorrígelo y vuelve a generar las 28 entradas.\n${WEEK_JSON_SHAPE}`;
    }

    if (errors.length > 0) {
      throw new Error(`El menú generado no cumple las reglas: ${errors.slice(0, 3).join(" ")}`);
    }

    // --- Guardado sin pérdida de datos -------------------------------------
    // Antes: se borraba el plan existente y luego se insertaba el nuevo. Si la
    // inserción fallaba, la semana se perdía. Ahora: se actualiza el plan, se
    // insertan los platos nuevos y SOLO entonces se borran los antiguos.
    const planPayload = {
      summary: summarizePlan(items, notes),
      summary_notes: notes,
      batch_cooking: batchCooking,
    };

    const { data: existing } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("household_id", data.householdId)
      .eq("week_start", data.weekStart)
      .maybeSingle();

    let planId: string;
    let oldItemIds: string[] = [];

    if (existing) {
      planId = existing.id as string;
      const { data: oldItems } = await supabase.from("plan_items").select("id").eq("plan_id", planId);
      oldItemIds = ((oldItems ?? []) as { id: string }[]).map((o) => o.id);
      const { error: updError } = await supabase.from("meal_plans").update(planPayload).eq("id", planId);
      if (updError) throw new Error(updError.message);
    } else {
      const { data: plan, error: planError } = await supabase
        .from("meal_plans")
        .insert({ household_id: data.householdId, week_start: data.weekStart, ...planPayload })
        .select()
        .single();
      if (planError) throw new Error(planError.message);
      planId = plan.id as string;
    }

    const { error: itemsError } = await supabase.from("plan_items").insert(
      items.map((i) => ({
        plan_id: planId,
        household_id: data.householdId,
        day: i.day,
        meal: i.meal,
        course: i.course,
        ...planItemRow(i),
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    if (oldItemIds.length > 0) {
      const { error: delError } = await supabase.from("plan_items").delete().in("id", oldItemIds);
      if (delError) throw new Error(delError.message);
    }

    const lines = buildShoppingList(items, ctx.rations, ctx.pantry);
    await replaceShopping(supabase, data.householdId, planId, lines);

    return { ok: true, planId };
  });

export const swapDish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { householdId: string; planItemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context as unknown as Ctx;

    const { data: item, error } = await supabase
      .from("plan_items")
      .select("*")
      .eq("id", data.planItemId)
      .maybeSingle();
    if (error || !item) throw new Error("No se encuentra el plato.");
    if (item.household_id !== data.householdId) throw new Error("El plato no pertenece a este hogar.");

    const { data: plan } = await supabase
      .from("meal_plans")
      .select("id,week_start,summary_notes")
      .eq("id", item.plan_id)
      .maybeSingle();
    const weekStart: string = plan?.week_start ?? item.day;
    const ctx = await loadContext(supabase, data.householdId, weekStart);

    const { data: weekRows } = await supabase.from("plan_items").select("*").eq("plan_id", item.plan_id);
    const weekItems = (weekRows ?? []) as DbPlanItem[];
    const usedNames = weekItems.map((w) => w.name);

    const noCookSlots = ctx.household.no_cook_slots ?? [];
    const validateOpts = {
      weekStart,
      noCookSlots,
      recentNames: ctx.recentNames,
      dislikes: ctx.dislikes,
    };
    // Errores que el plan ya tenía antes del cambio: no deben bloquear la sustitución.
    const baseline = new Set(validatePlan(weekItems, validateOpts));

    const base = describeContext({
      members: ctx.members,
      equipment: ctx.household.equipment ?? [],
      noCookSlots,
      recentNames: [...ctx.recentNames, ...usedNames],
      favorites: ctx.favorites,
      pantry: ctx.pantry,
      badFeedback: ctx.badFeedback,
      weekStart,
    });

    const slotNote = isNoCookSlot(item.day, item.meal, noCookSlots)
      ? "Esa comida NO se cocina: el plato debe ser batch cooking del domingo o sobras (batch_friendly o is_leftover = true)."
      : "";
    const counts = [
      item.is_legume ? "legumbre" : "",
      item.is_fish ? "pescado" : "",
      item.is_red_meat ? "carne roja" : "",
    ].filter(Boolean);

    const basePrompt =
      `${base}\n\nSustituye únicamente el ${item.course} de la ${item.meal} del ${item.day} ` +
      `(actualmente "${item.name}") por otro plato distinto que cumpla todas las reglas, ` +
      "teniendo en cuenta el resto del menú de la semana: " +
      `${usedNames.join("; ")}. ` +
      (counts.length > 0
        ? `El plato actual cuenta como ${counts.join(" y ")} en las reglas semanales; si es posible, mantén esa categoría. `
        : "") +
      slotNote;

    let prompt = `${basePrompt}\n${SWAP_JSON_SHAPE}`;
    let replacement: PlanItem | null = null;
    let errors: string[] = [];
    const rejected: string[] = [];

    for (let attempt = 0; attempt < 2 && !replacement; attempt++) {
      const parsed = parseJson<{ items: unknown }>(await askAi(prompt));
      const [candidate] = normalizeItems(parsed.items);
      if (!candidate?.name) {
        errors = ["La IA no propuso ningún plato."];
        continue;
      }
      // El hueco (día, comida, tipo de plato) lo decide el servidor, no la IA.
      const proposed: PlanItem = { ...candidate, day: item.day, meal: item.meal, course: item.course };
      const hypothetical = weekItems.map((w) => (w.id === item.id ? proposed : w));
      errors = validatePlan(hypothetical, validateOpts).filter((e) => !baseline.has(e));
      if (errors.length === 0) {
        replacement = proposed;
      } else {
        rejected.push(proposed.name);
        prompt =
          `${basePrompt}\nYa se han descartado estos candidatos: ${rejected.join("; ")}.\n` +
          `Motivos:\n- ${errors.join("\n- ")}\nPropón otro distinto.\n${SWAP_JSON_SHAPE}`;
      }
    }

    if (!replacement) {
      throw new Error(
        `No he encontrado un sustituto que cumpla las reglas. ${errors.slice(0, 2).join(" ")}`.trim(),
      );
    }

    const { error: updateError } = await supabase
      .from("plan_items")
      .update(planItemRow(replacement))
      .eq("id", data.planItemId);
    if (updateError) throw new Error(updateError.message);

    const updated: PlanItem[] = weekItems.map((w) => (w.id === item.id ? replacement! : w));

    // El resumen se recalcula con los platos reales (ya no se queda desfasado).
    const { error: summaryError } = await supabase
      .from("meal_plans")
      .update({ summary: summarizePlan(updated, plan?.summary_notes ?? "") })
      .eq("id", item.plan_id);
    if (summaryError) throw new Error(summaryError.message);

    const lines = buildShoppingList(updated, ctx.rations, ctx.pantry);

    const { data: checked } = await supabase
      .from("shopping_items")
      .select("name,unit,store")
      .eq("household_id", data.householdId)
      .eq("is_checked", true);
    const checkedKeys = new Set(
      ((checked ?? []) as { name: string; unit: string; store: string }[]).map(
        (c) => `${c.name.toLowerCase()}|${c.unit}|${c.store}`,
      ),
    );

    await replaceShopping(supabase, data.householdId, item.plan_id, lines, checkedKeys);

    return { ok: true, name: replacement.name };
  });