import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Shield, Lock, FileText, Users, ClipboardList, CheckCircle } from "lucide-react";

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
      title: "Gestión Documental",
      description: "Almacena y organiza contratos y documentos de forma segura",
    },
    {
      icon: Users,
      title: "Control de Acceso",
      description: "Administración centralizada de usuarios y permisos",
    },
    {
      icon: ClipboardList,
      title: "Auditoría Completa",
      description: "Registro detallado de todas las acciones del sistema",
    },
    {
      icon: CheckCircle,
      title: "Cumplimiento ISO",
      description: "Certificado ISO/IEC 27001 y 27002",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[1200px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(420px,520px)_1fr] gap-8 items-center">
          <div className="hidden lg:grid gap-4">
            {features.slice(0, 2).map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative bg-slate-900/95 border border-white/10 shadow-2xl rounded-[32px] p-10 lg:p-14 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.95))]" />
            <div className="relative z-10 space-y-8">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 border border-white/15">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-sky-300/90">Azal Mechanical Supports</p>
                  <h1 className="mt-3 text-4xl font-bold text-white">Acceso al sistema</h1>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-400 max-w-xl mx-auto">
                  Bienvenido al portal de gestión documental. Inicia sesión con tu cuenta corporativa para acceder a los contratos, auditorías y controles de acceso.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                  <div className="rounded-2xl bg-slate-800/80 px-4 py-3 text-left text-sm text-slate-300">
                    <p className="font-semibold text-white">Empresa</p>
                    <p>Azal Mechanical Supports</p>
                  </div>
                  <div className="rounded-2xl bg-slate-800/80 px-4 py-3 text-left text-sm text-slate-300">
                    <p className="font-semibold text-white">Unidad</p>
                    <p>Gestión Documental</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => window.location.href = "/api/auth/microsoft"}
                className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-sky-500 text-white py-4 text-lg font-semibold rounded-2xl transition-all"
              >
                <svg className="h-6 w-6" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Iniciar sesión con Microsoft
              </Button>

              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Suministro de materiales electromecánicos
              </p>
            </div>
          </div>

          <div className="hidden lg:grid gap-4">
            {features.slice(2).map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}