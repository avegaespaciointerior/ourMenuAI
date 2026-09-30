import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Household = {
  id: string;
  name: string;
  owner_id: string;
  no_cook_slots: { weekday: number; meal: "comida" | "cena" }[];
  equipment: string[];
};

async function getOrCreateHousehold(): Promise<Household> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Sin sesión");

  const { data: membership } = await supabase
    .from("household_users")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership?.household_id) {
    const { data, error } = await supabase
      .from("households")
      .select("*")
      .eq("id", membership.household_id)
      .single();
    if (error) throw error;
    return data as unknown as Household;
  }

  const { data: newId, error: createError } = await supabase.rpc("create_household", {
    _name: "Mi familia",
  });
  if (createError) throw createError;

  const { data, error } = await supabase
    .from("households")
    .select("*")
    .eq("id", newId as unknown as string)
    .single();
  if (error) throw error;

  return data as unknown as Household;
}


export function useHousehold() {
  return useQuery({
    queryKey: ["household"],
    queryFn: getOrCreateHousehold,
    staleTime: 60_000,
  });
}
