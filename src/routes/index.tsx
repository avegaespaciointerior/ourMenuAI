import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CalendarDays, Leaf, ShoppingBasket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OurMenuIA — comidas y cenas de la semana" },
      {
        name: "description",
        content:
          "Planifica las comidas y cenas semanales de tu familia con recetas mediterráneas de siempre y lista de compra por tienda.",
      },
      { property: "og:title", content: "OurMenuIA" },
      {
        property: "og:description",
        content:
          "Menús semanales mediterráneos, adaptados a tu familia, con lista de compra por tienda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Semana completa",
    text: "Comida y cena de lunes a domingo, con primero y segundo en cada una.",
  },
  {
    icon: Leaf,
    title: "Reglas de casa",
    text: "Legumbres 3 veces, pescado 2, sin pasta en las cenas y sin repetir en 15 días.",
  },
  {
    icon: ShoppingBasket,
    title: "Compra por tienda",
    text: "Cantidades sumadas de toda la semana y agrupadas por carnicería, pescadería o súper.",
  },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/semana" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-5 pt-12 pb-12 text-center">
        <div className="mb-8 flex justify-center">
          <BrandLogo />
        </div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Dieta mediterránea de siempre
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight text-foreground sm:text-5xl">
          OurMenuIA
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          El menú de la semana de tu familia, resuelto con recetas sencillas, verdura y fruta a
          diario y la lista de compra lista para salir de casa.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg">
            <Link to="/auth">Empezar</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl gap-4 px-5 pb-20 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-5 text-left">
            <Icon className="size-6 text-primary" />
            <h2 className="mt-3 font-display text-lg text-foreground">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border/70 px-5 py-8 text-center text-xs text-muted-foreground">
        Los menús son orientativos y no sustituyen el consejo de un profesional sanitario.
      </footer>
    </div>
  );
}
