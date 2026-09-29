import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MEALS, DAY_NAMES } from "@/lib/plan-rules";

export const Route = createFileRoute("/_authenticated/familia")({
  component: FamiliaPage,
});

type Member = {
  id: string;
  name: string;
  age: number | null;
  sport_level: string;
  ration_factor: number;
  diet_notes: string[];
  likes: string[];
  dislikes: string[];
};

const EQUIPMENT = ["Horno", "Olla rápida", "Freidora de aire", "Batidora", "Vaporera", "Plancha"];

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function FamiliaPage() {
  const { data: household } = useHousehold();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    age: "",
    sport_level: "medio",
    ration_factor: "1",
    diet_notes: "",
    likes: "",
    dislikes: "",
  });

  const members = useQuery({
    queryKey: ["members", household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("household_id", household!.id)
        .order("created_at");
      if (error) throw error;
      return data as unknown as Member[];
    },
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("family_members").insert({
        household_id: household!.id,
        name: form.name,
        age: form.age ? Number(form.age) : null,
        sport_level: form.sport_level,
        ration_factor: Number(form.ration_factor) || 1,
        diet_notes: splitList(form.diet_notes),
        likes: splitList(form.likes),
        dislikes: splitList(form.dislikes),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({
        name: "",
        age: "",
        sport_level: "medio",
        ration_factor: "1",
        diet_notes: "",
        likes: "",
        dislikes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Miembro añadido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  const updateHousehold = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("households").update(patch).eq("id", household!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["household"] }),
  });

  const noCook = household?.no_cook_slots ?? [];
  const equipment = household?.equipment ?? [];
  const rations = (members.data ?? []).reduce((a, m) => a + Number(m.ration_factor ?? 1), 0);

  function toggleSlot(weekday: number, meal: "comida" | "cena") {
    const exists = noCook.some((s) => s.weekday === weekday && s.meal === meal);
    const next = exists
      ? noCook.filter((s) => !(s.weekday === weekday && s.meal === meal))
      : [...noCook, { weekday, meal }];
    updateHousehold.mutate({ no_cook_slots: next });
  }

  return (
    <AppShell
      title="Familia"
      subtitle={`${members.data?.length ?? 0} miembros · ${rations.toFixed(2)} raciones`}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Añadir miembro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edad">Edad</Label>
                <Input
                  id="edad"
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deporte">Nivel de deporte</Label>
                <select
                  id="deporte"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.sport_level}
                  onChange={(e) => setForm({ ...form, sport_level: e.target.value })}
                >
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="racion">Factor de ración</Label>
                <Input
                  id="racion"
                  type="number"
                  step="0.1"
                  value={form.ration_factor}
                  onChange={(e) => setForm({ ...form, ration_factor: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notas">Notas dietéticas (separadas por comas)</Label>
              <Input
                id="notas"
                placeholder="poca sal, más proteína"
                value={form.diet_notes}
                onChange={(e) => setForm({ ...form, diet_notes: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gustos">Le gusta</Label>
                <Input
                  id="gustos"
                  placeholder="lentejas, merluza"
                  value={form.likes}
                  onChange={(e) => setForm({ ...form, likes: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rechazos">No le gusta</Label>
                <Input
                  id="rechazos"
                  placeholder="salmón al horno"
                  value={form.dislikes}
                  onChange={(e) => setForm({ ...form, dislikes: e.target.value })}
                />
              </div>
            </div>
            <Button
              onClick={() => addMember.mutate()}
              disabled={!form.name || !household || addMember.isPending}
            >
              Guardar miembro
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {(members.data ?? []).map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-start justify-between gap-4 pt-6">
                <div className="space-y-2">
                  <p className="font-display text-lg">
                    {m.name}
                    {m.age ? <span className="text-muted-foreground"> · {m.age} años</span> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Deporte {m.sport_level} · ración ×{Number(m.ration_factor).toFixed(2)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.diet_notes.map((n) => (
                      <Badge key={n} variant="secondary">
                        {n}
                      </Badge>
                    ))}
                    {m.likes.map((n) => (
                      <Badge key={`l-${n}`} variant="outline">
                        👍 {n}
                      </Badge>
                    ))}
                    {m.dislikes.map((n) => (
                      <Badge key={`d-${n}`} variant="destructive">
                        👎 {n}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar ${m.name}`}
                  onClick={() => removeMember.mutate(m.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Reglas del hogar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Comidas en las que no se cocina</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {DAY_NAMES.map((dayName, index) =>
                  MEALS.map((meal) => {
                    const weekday = index + 1;
                    const checked = noCook.some(
                      (s) => s.weekday === weekday && s.meal === meal,
                    );
                    return (
                      <label
                        key={`${weekday}-${meal}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSlot(weekday, meal)}
                        />
                        {dayName} · {meal}
                      </label>
                    );
                  }),
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Equipo disponible</p>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT.map((item) => {
                  const active = equipment.includes(item);
                  return (
                    <Button
                      key={item}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() =>
                        updateHousehold.mutate({
                          equipment: active
                            ? equipment.filter((e) => e !== item)
                            : [...equipment, item],
                        })
                      }
                    >
                      {item}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
