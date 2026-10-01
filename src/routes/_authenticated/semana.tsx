import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateWeek, swapDish } from "@/lib/meals.functions";
import {
  COURSES,
  MEALS,
  formatDayLabel,
  isNoCookSlot,
  weekDays,
  weekStartOf,
  type Course,
  type Meal,
} from "@/lib/plan-rules";

export const Route = createFileRoute("/_authenticated/semana")({
  head: () => ({
    meta: [
      { title: "Mi semana — OurMenuIA" },
      { name: "description", content: "Consulta y genera el menú semanal de tu familia." },
      { property: "og:title", content: "Mi semana — OurMenuIA" },
      { property: "og:description", content: "Consulta y genera el menú semanal de tu familia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SemanaPage,
});

type PlanRow = {
  id: string;
  day: string;
  meal: Meal;
  course: Course;
  name: string;
  is_legume: boolean;
  is_fish: boolean;
  is_red_meat: boolean;
  is_leftover: boolean;
  batch_friendly: boolean;
};

function SemanaPage() {
  const { data: household } = useHousehold();
  const queryClient = useQueryClient();
  const callGenerate = useServerFn(generateWeek);
  const callSwap = useServerFn(swapDish);
  const [swapping, setSwapping] = useState<string | null>(null);
  const weekStart = weekStartOf(new Date());

  const plan = useQuery({
    queryKey: ["plan", household?.id, weekStart],
    enabled: !!household,
    queryFn: async () => {
      const { data: planRow } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("household_id", household!.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (!planRow) return null;
      const { data: items, error } = await supabase
        .from("plan_items")
        .select("*")
        .eq("plan_id", planRow.id)
        .order("day");
      if (error) throw error;
      return {
        summary: (planRow.summary ?? "") as string,
        batchCooking: (planRow.batch_cooking ?? []) as string[],
        items: (items ?? []) as unknown as PlanRow[],
      };
    },
  });

  const generate = useMutation({
    mutationFn: () => callGenerate({ data: { householdId: household!.id, weekStart } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["shopping"] });
      toast.success("Semana generada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleSwap(itemId: string) {
    setSwapping(itemId);
    try {
      const result = await callSwap({ data: { householdId: household!.id, planItemId: itemId } });
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["shopping"] });
      toast.success(`Nuevo plato: ${result.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido cambiar el plato.");
    } finally {
      setSwapping(null);
    }
  }

  const items = plan.data?.items ?? [];
  const noCook = household?.no_cook_slots ?? [];

  function dish(day: string, meal: Meal, course: Course) {
    return items.find((i) => i.day === day && i.meal === meal && i.course === course);
  }

  return (
    <AppShell title="Semana" subtitle={`Menú del ${formatDayLabel(weekStart)}`}>
      <div className="space-y-5">
        <Button
          className="w-full"
          size="lg"
          onClick={() => generate.mutate()}
          disabled={!household || generate.isPending}
        >
          {generate.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Generando el menú…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" /> Generar semana
            </>
          )}
        </Button>

        {plan.data?.summary ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="font-display text-lg">Por qué es saludable</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              {plan.data.summary}
            </CardContent>
          </Card>
        ) : null}

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aún no hay menú para esta semana. Revisa la pantalla Familia y pulsa "Generar semana".
          </p>
        ) : (
          weekDays(weekStart).map((day) => (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="font-display text-lg">{formatDayLabel(day)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {MEALS.map((meal) => (
                  <div key={meal} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {meal}
                      </p>
                      {isNoCookSlot(day, meal, noCook) ? (
                        <Badge variant="secondary">no se cocina</Badge>
                      ) : null}
                    </div>
                    {COURSES.map((course) => {
                      const item = dish(day, meal, course);
                      return (
                        <div
                          key={course}
                          className="flex items-start justify-between gap-3 rounded-lg bg-secondary/50 px-3 py-2"
                        >
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{course}</p>
                            <p className="text-sm font-medium">{item?.name ?? "—"}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {item?.is_legume ? <Badge variant="outline">legumbre</Badge> : null}
                              {item?.is_fish ? <Badge variant="outline">pescado</Badge> : null}
                              {item?.is_red_meat ? (
                                <Badge variant="outline">carne roja</Badge>
                              ) : null}
                              {item?.is_leftover ? <Badge variant="outline">sobras</Badge> : null}
                              {item?.batch_friendly ? (
                                <Badge variant="outline">batch cooking</Badge>
                              ) : null}
                            </div>
                          </div>
                          {item ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Cambiar este plato"
                              onClick={() => handleSwap(item.id)}
                              disabled={swapping === item.id}
                            >

                              {swapping === item.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <RefreshCw className="size-4" />
                              )}
                              <span className="ml-1 hidden sm:inline">Cambiar</span>
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}

        {plan.data?.batchCooking?.length ? (
          <Card className="border-accent/40 bg-accent/10">
            <CardHeader>
              <CardTitle className="font-display text-lg">Batch cooking del domingo</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                {plan.data.batchCooking.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
