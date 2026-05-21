import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Shield, FileText, Users, ClipboardList, CheckCircle } from "lucide-react";

const brandLogos = [
  {
    src: "/images/hsn14.svg",
    alt: "HSN14 logo",
    title: "HSN14",
    description: "Soluciones industriales y soporte avanzado para sistemas corporativos.",
  },
  {
    src: "/images/hgw.svg",
    alt: "HGW logo",
    title: "HGW",
    description: "Procesos avanzados y consultoría para manufactura inteligente.",
  },
];

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const features = [
    {
      icon: FileText,
      title: "Sincronización y Control Total",
      description: "Accede, visualiza, edita y renombra todas tus carpetas y archivos de OneDrive directamente desde esta plataforma. Centraliza tu información en tiempo real sin duplicar archivos ni perder el orden de tu estructura empresarial.",
    },
    {
      icon: Users,
      title: "Seguridad y Roles a tu Medida",
      description: "Protege la información crítica de la empresa. Define con precisión quién puede ver, editar o renombrar carpetas específicas, garantizando que cada miembro del equipo acceda solo a los documentos autorizados para su rol.",
    },
    {
      icon: ClipboardList,
      title: "Historial y Transparencia Absoluta",
      description: "Mantén un registro detallado de cada movimiento. El software rastrea automáticamente quién editó, renombró o eliminó cualquier archivo, ofreciendo un historial transparente para auditorías sin esfuerzo y un control total de cambios.",
    },
    {
      icon: CheckCircle,
      title: "Licitaciones y Cotizaciones",
      description: "Agiliza tus concursos y propuestas comerciales. Organiza, vincula y gestiona toda la documentación técnica, legal y financiera de tus licitaciones y cotizaciones en un solo lugar, facilitando el seguimiento y la toma de decisiones.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[1200px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(420px,520px)_1fr] gap-8 items-center">
          <div className="hidden lg:grid gap-4">
            {features.slice(0, 2).map((feature, index) => (
              <div key={index} className="group flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(56,189,248,0.10)] backdrop-blur-sm transition duration-300 hover:border-sky-400/30 hover:bg-slate-800/90 hover:shadow-[0_0_36px_rgba(56,189,248,0.18)] hover:-translate-y-0.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300 transition duration-300 group-hover:bg-blue-500/25 group-hover:text-blue-200">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 text-center">
                  <h3 className="text-white font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300 text-left">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-sky-500/10 bg-slate-900/90 p-10 lg:p-14 shadow-[0_0_80px_rgba(56,189,248,0.12)] text-center backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.08),_transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.98))]" />
            <div className="absolute left-6 top-6 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="absolute right-8 top-16 h-28 w-28 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute left-1/2 top-36 h-24 w-24 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative z-10 space-y-8">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 border border-white/15">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="mt-3 text-5xl md:text-6xl font-bold tracking-[0.02em] text-white">
                    <span className="text-sky-300 drop-shadow-[0_0_18px_rgba(56,189,248,0.45)]">CORELINK</span>
                    <span className="ml-2 text-white">Systems</span>
                  </h1>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-400 max-w-xl mx-auto">
                  Bienvenido a la plataforma multiempresa. Inicia sesión con tu cuenta corporativa para acceder a los controles centralizados, documentos y auditorías del ecosistema.
                </p>
                <div className="flex justify-center">
                  <div className="rounded-2xl bg-slate-800/80 px-4 py-3 text-center text-sm text-slate-300">
                    <p className="font-semibold text-white">Ecosistema</p>
                    <p>Gestión empresarial centralizada</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-md mx-auto">
                {brandLogos.map((brand) => (
                  <div key={brand.title} className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-4 text-center shadow-[0_0_28px_rgba(56,189,248,0.10)] transition duration-300 hover:border-sky-400/30 hover:bg-slate-800/90 hover:shadow-[0_0_36px_rgba(56,189,248,0.20)] hover:-translate-y-0.5">
                    <div className="flex items-center justify-center rounded-3xl bg-slate-950/80 p-3 transition duration-300 group-hover:-translate-y-1">
                      <img src={brand.src} alt={brand.alt} className="h-12 w-auto" />
                    </div>
                    <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-4 w-72 -translate-x-1/2 rounded-3xl border border-white/10 bg-slate-950/95 p-4 text-left text-sm text-slate-200 shadow-2xl backdrop-blur-xl opacity-0 transition duration-300 group-hover:opacity-100">
                      <p className="text-xs uppercase tracking-[0.2em] text-sky-300">{brand.title}</p>
                      <p className="mt-2 leading-5 text-slate-300">{brand.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => window.location.href = "/api/auth/microsoft"}
                className="w-full flex items-center justify-center gap-3 rounded-[28px] border border-sky-500/25 bg-slate-900/90 px-6 py-3 text-base font-semibold text-white shadow-[0_0_18px_rgba(56,189,248,0.14)] transition duration-300 hover:border-sky-400/40 hover:bg-slate-800/95 hover:shadow-[0_0_30px_rgba(56,189,248,0.24)]"
              >
                <svg className="h-5 w-5" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Iniciar sesión con Microsoft
              </Button>

              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Plataforma corporativa multiempresa
              </p>
            </div>
          </div>

          <div className="hidden lg:grid gap-4">
            {features.slice(2).map((feature, index) => (
              <div key={index} className="group flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(56,189,248,0.10)] backdrop-blur-sm transition duration-300 hover:border-sky-400/30 hover:bg-slate-800/90 hover:shadow-[0_0_36px_rgba(56,189,248,0.18)] hover:-translate-y-0.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 transition duration-300 group-hover:bg-sky-500/25 group-hover:text-sky-200">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 text-center">
                  <h3 className="text-white font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300 text-left">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}