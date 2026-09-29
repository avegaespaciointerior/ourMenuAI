CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Mi hogar',
  owner_id uuid NOT NULL,
  no_cook_slots jsonb NOT NULL DEFAULT '[{"weekday":1,"meal":"comida"},{"weekday":2,"meal":"comida"}]'::jsonb,
  equipment text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.household_users (
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_household_member(_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_users
    WHERE household_id = _household_id AND user_id = auth.uid()
  );
$$;

CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  age integer,
  sport_level text NOT NULL DEFAULT 'medio',
  ration_factor numeric NOT NULL DEFAULT 1,
  diet_notes text[] NOT NULL DEFAULT '{}',
  likes text[] NOT NULL DEFAULT '{}',
  dislikes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  course text NOT NULL DEFAULT 'segundo',
  main_type text,
  is_legume boolean NOT NULL DEFAULT false,
  is_fish boolean NOT NULL DEFAULT false,
  is_red_meat boolean NOT NULL DEFAULT false,
  is_pasta boolean NOT NULL DEFAULT false,
  batch_friendly boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  summary text,
  batch_cooking jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, week_start)
);

CREATE TABLE public.plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  day date NOT NULL,
  meal text NOT NULL,
  course text NOT NULL,
  name text NOT NULL,
  main_type text,
  is_legume boolean NOT NULL DEFAULT false,
  is_fish boolean NOT NULL DEFAULT false,
  is_red_meat boolean NOT NULL DEFAULT false,
  is_pasta boolean NOT NULL DEFAULT false,
  batch_friendly boolean NOT NULL DEFAULT false,
  is_leftover boolean NOT NULL DEFAULT false,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'ud',
  store text NOT NULL DEFAULT 'Mercadona',
  is_checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'ud',
  location text,
  expires_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  plan_item_id uuid REFERENCES public.plan_items(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  recipe_name text NOT NULL,
  rating integer NOT NULL DEFAULT 3,
  do_not_repeat boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.households TO service_role;
GRANT ALL ON public.household_users TO service_role;
GRANT ALL ON public.family_members TO service_role;
GRANT ALL ON public.recipes TO service_role;
GRANT ALL ON public.meal_plans TO service_role;
GRANT ALL ON public.plan_items TO service_role;
GRANT ALL ON public.shopping_items TO service_role;
GRANT ALL ON public.pantry_items TO service_role;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "households_select" ON public.households FOR SELECT TO authenticated USING (public.is_household_member(id));
CREATE POLICY "households_insert" ON public.households FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "households_update" ON public.households FOR UPDATE TO authenticated USING (public.is_household_member(id)) WITH CHECK (public.is_household_member(id));
CREATE POLICY "households_delete" ON public.households FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "household_users_select" ON public.household_users FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_household_member(household_id));
CREATE POLICY "household_users_insert" ON public.household_users FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "household_users_delete" ON public.household_users FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "family_members_all" ON public.family_members FOR ALL TO authenticated USING (public.is_household_member(household_id)) WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "recipes_all" ON public.recipes FOR ALL TO authenticated USING (public.is_household_member(household_id)) WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "meal_plans_all" ON public.meal_plans FOR ALL TO authenticated USING (public.is_household_member(household_id)) WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "plan_items_all" ON public.plan_items FOR ALL TO authenticated USING (public.is_household_member(household_id)) WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "shopping_items_all" ON public.shopping_items FOR ALL TO authenticated USING (public.is_household_member(household_id)) WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "pantry_items_all" ON public.pantry_items FOR ALL TO authenticated USING (public.is_household_member(household_id)) WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "feedback_all" ON public.feedback FOR ALL TO authenticated USING (public.is_household_member(household_id)) WITH CHECK (public.is_household_member(household_id));

CREATE INDEX idx_plan_items_household_day ON public.plan_items (household_id, day);
CREATE INDEX idx_shopping_items_household ON public.shopping_items (household_id);
