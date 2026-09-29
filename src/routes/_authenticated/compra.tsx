import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/compra")({
  component: CompraPage,
});

type ShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  store: string;
  is_checked: boolean;
};

function CompraPage() {
  const { data: household } = useHousehold();
  const queryClient = useQueryClient();

  const items = useQuery({
    queryKey: ["shopping", household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("household_id", household!.id)
        .order("store")
        .order("name");
      if (error) throw error;
      return data as unknown as ShoppingItem[];
    },
  });

  const toggle = useMutation({
    mutationFn: async (item: ShoppingItem) => {
      const { error } = await supabase
        .from("shopping_items")
        .update({ is_checked: !item.is_checked })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopping"] }),
  });

  const list = items.data ?? [];
  const byStore = list.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    (acc[item.store] ??= []).push(item);
    return acc;
  }, {});
  const pending = list.filter((i) => !i.is_checked).length;

  return (
    <AppShell
      title="Lista de compra"
      subtitle={list.length ? `${pending} cosas por comprar` : "Genera la semana para tener lista"}
    >
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no hay lista. Genera el menú en la pantalla Semana y aquí aparecerán las
          cantidades de toda la semana, ya descontando la despensa.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byStore).map(([store, storeItems]) => (
            <Card key={store}>
              <CardHeader>
                <CardTitle className="font-display text-lg">{store}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {storeItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent/60"
                  >
                    <Checkbox
                      checked={item.is_checked}
                      onCheckedChange={() => toggle.mutate(item)}
                    />
                    <span className={item.is_checked ? "line-through opacity-60" : ""}>
                      {item.name}
                    </span>
                    <span className="ml-auto text-muted-foreground">
                      {item.quantity} {item.unit}
                    </span>
                  </label>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
