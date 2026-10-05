export const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const STORES = [
  "Ahorramas carnicería",
  "Ahorramas pollería",
  "Ahorramas charcutería",
  "Ahorramas pescadería",
  "Mercadona",
  "Aldi",
] as const;

export const MEALS = ["comida", "cena"] as const;
export const COURSES = ["primero", "segundo"] as const;

export type Meal = (typeof MEALS)[number];
export type Course = (typeof COURSES)[number];

export type Ingredient = {
  nombre: string;
  cantidad_por_persona: number;
  unidad: string;
  tienda: string;
};

export type PlanItem = {
  day: string;
  meal: Meal;
  course: Course;
  name: string;
  main_type?: string | null;
  is_legume: boolean;
  is_fish: boolean;
  is_red_meat: boolean;
  is_pasta: boolean;
  batch_friendly: boolean;
  is_leftover?: boolean;
  ingredients: Ingredient[];
};

export type NoCookSlot = { weekday: number; meal: Meal };

/** Monday (ISO) of the week containing `date`, as YYYY-MM-DD. */
export function weekStartOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** YYYY-MM-DD shifted by `delta` days. */
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function formatDayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
  return `${DAY_NAMES[dow]} ${d.getUTCDate()}`;
}

/** Weekday index 1..7 (Monday..Sunday) for a YYYY-MM-DD date. */
export function weekdayOf(day: string): number {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function isNoCookSlot(day: string, meal: Meal, slots: NoCookSlot[]): boolean {
  const wd = weekdayOf(day);
  return slots.some((s) => s.weekday === wd && s.meal === meal);
}

/** Validates the household nutrition rules in code (not only in the AI prompt). */
export function validatePlan(
  items: PlanItem[],
  opts: { weekStart: string; noCookSlots: NoCookSlot[]; recentNames: string[]; dislikes: string[] },
): string[] {
  const errors: string[] = [];
  const days = weekDays(opts.weekStart);

  for (const day of days) {
    for (const meal of MEALS) {
      for (const course of COURSES) {
        const found = items.filter(
          (i) => i.day === day && i.meal === meal && i.course === course,
        );
        if (found.length !== 1) {
          errors.push(`Falta o se repite el ${course} de la ${meal} del ${day}.`);
        }
      }
    }
  }

  const legumeDays = new Set(items.filter((i) => i.is_legume).map((i) => i.day));
  if (legumeDays.size < 3) errors.push("Debe haber legumbres al menos 3 días distintos.");

  const fishCount = items.filter((i) => i.is_fish).length;
  if (fishCount < 2) errors.push("Debe haber pescado al menos 2 veces en la semana.");

  const redMeat = items.filter((i) => i.is_red_meat).length;
  if (redMeat > 2) errors.push("Como máximo 2 platos de carne roja por semana.");

  if (items.some((i) => i.meal === "cena" && i.is_pasta)) {
    errors.push("No puede haber pasta en las cenas.");
  }

  for (const item of items) {
    if (isNoCookSlot(item.day, item.meal, opts.noCookSlots) && !(item.is_leftover || item.batch_friendly)) {
      errors.push(
        `El ${item.course} de la ${item.meal} del ${item.day} no se cocina: debe ser sobras o batch cooking del domingo.`,
      );
    }
  }

  const lowerRecent = opts.recentNames.map((n) => n.toLowerCase().trim());
  for (const item of items) {
    if (lowerRecent.includes(item.name.toLowerCase().trim())) {
      errors.push(`"${item.name}" se ha comido en los últimos 15 días.`);
    }
  }

  const lowerDislikes = opts.dislikes.map((d) => d.toLowerCase().trim()).filter(Boolean);
  for (const item of items) {
    const hit = lowerDislikes.find((d) => item.name.toLowerCase().includes(d));
    if (hit) errors.push(`"${item.name}" incluye algo rechazado por la familia: ${hit}.`);
  }

  const seen = new Map<string, number>();
  for (const item of items) {
    const key = item.name.toLowerCase().trim();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [name, count] of seen) {
    if (count > 1) errors.push(`El plato "${name}" aparece ${count} veces en la misma semana.`);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Estadísticas y resumen CALCULADOS a partir de los platos reales de la semana.
// Así el texto "Por qué es saludable" nunca se queda desactualizado tras un "Cambiar".
// ---------------------------------------------------------------------------

export type PlanStats = {
  legumeDays: string[];
  fishCount: number;
  redMeatCount: number;
  pastaDinners: number;
};

export function computePlanStats(items: PlanItem[]): PlanStats {
  return {
    legumeDays: [...new Set(items.filter((i) => i.is_legume).map((i) => i.day))].sort(),
    fishCount: items.filter((i) => i.is_fish).length,
    redMeatCount: items.filter((i) => i.is_red_meat).length,
    pastaDinners: items.filter((i) => i.meal === "cena" && i.is_pasta).length,
  };
}

function joinEs(list: string[]): string {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Texto del recuadro "Por qué es saludable": primero los datos calculados y,
 * después, las notas cualitativas de la IA (que no contienen cifras ni días).
 */
export function summarizePlan(items: PlanItem[], notes = ""): string {
  const s = computePlanStats(items);
  const legumeLabel = joinEs(s.legumeDays.map((d) => DAY_NAMES[weekdayOf(d) - 1]!.toLowerCase()));
  const head = [
    s.legumeDays.length > 0
      ? `Legumbres ${plural(s.legumeDays.length, "día", "días")} (${legumeLabel}).`
      : "Sin legumbres esta semana.",
    `Pescado: ${plural(s.fishCount, "plato", "platos")}.`,
    `Carne roja: ${plural(s.redMeatCount, "plato", "platos")}.`,
    s.pastaDinners === 0 ? "Sin pasta en las cenas." : `Pasta en ${plural(s.pastaDinners, "cena", "cenas")}.`,
  ].join(" ");
  const extra = notes.trim();
  return extra ? `${head}\n\n${extra}` : head;
}

export type ShoppingLine = {
  name: string;
  quantity: number;
  unit: string;
  store: string;
};

/** Consolidates the week's ingredients in code and subtracts the pantry. */
export function buildShoppingList(
  items: PlanItem[],
  rations: number,
  pantry: { name: string; quantity: number; unit: string }[],
): ShoppingLine[] {
  const map = new Map<string, ShoppingLine>();

  for (const item of items) {
    for (const ing of item.ingredients ?? []) {
      const name = (ing.nombre ?? "").trim();
      if (!name) continue;
      const unit = (ing.unidad ?? "ud").trim() || "ud";
      const store = STORES.includes(ing.tienda as (typeof STORES)[number])
        ? ing.tienda
        : "Mercadona";
      const key = `${name.toLowerCase()}|${unit.toLowerCase()}|${store}`;
      const qty = Number(ing.cantidad_por_persona ?? 0) * rations;
      const existing = map.get(key);
      if (existing) existing.quantity += qty;
      else map.set(key, { name, quantity: qty, unit, store });
    }
  }

  // La despensa se consume una sola vez: si el mismo ingrediente aparece en varias
  // líneas (p. ej. tiendas distintas), lo que sobra de una pasa a la siguiente.
  for (const p of pantry) {
    let remaining = Number(p.quantity ?? 0);
    for (const [key, line] of map) {
      if (remaining <= 0) break;
      if (
        line.name.toLowerCase() === p.name.toLowerCase().trim() &&
        line.unit.toLowerCase() === (p.unit ?? "").toLowerCase()
      ) {
        const take = Math.min(line.quantity, remaining);
        line.quantity -= take;
        remaining -= take;
        if (line.quantity <= 0) map.delete(key);
      }
    }
  }

  return [...map.values()]
    .map((l) => ({ ...l, quantity: Math.round(l.quantity * 100) / 100 }))
    .sort((a, b) => a.store.localeCompare(b.store) || a.name.localeCompare(b.name));
}