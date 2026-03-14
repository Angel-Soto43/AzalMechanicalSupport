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
    <div className="min-h-screen flex bg-background login-page-theme">

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `url('/images/watermark-seal.svg')`,
            backgroundPosition: 'center 40%',
            backgroundSize: '500px 500px',
            backgroundRepeat: 'no-repeat',
          }}
        />

        <div className="z-10 w-full max-w-sm space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">Iniciar Sesión</h1>
            <p className="text-sm text-gray-400">Acceso exclusivo: Azal Mechanical Supports</p>
          </div>

          <Button
            onClick={() => window.location.href = "/api/auth/microsoft"}
            className="w-full flex items-center justify-center gap-3 bg-[#2f2f2f] hover:bg-[#00a4ef] text-white py-8 text-lg font-bold rounded-xl shadow-2xl border border-gray-700 transition-all"
          >
            <svg className="h-6 w-6" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/>
              <path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
            Iniciar sesión con Microsoft
          </Button>

          <p className="text-[10px] text-gray-500 uppercase tracking-widest pt-4">
            Suministro de materiales electromecánicos
          </p>
        </div>
      </div>


      <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB] via-[#1e40af] to-[#1d4ed8]" />

        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <img src="/images/watermark-seal.svg" alt="" className="w-full h-full object-contain" style={{maxWidth: '800px', maxHeight: '800px'}} />
        </div>

        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-bold text-3xl">Azal Mechanical</h1>
              <p className="text-lg text-primary-foreground/80">Supports</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-4 text-white">Gestión Documental Segura</h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-md">
            Sistema empresarial de gestión de archivos en la nube para el suministro de materiales electromecánicos.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-lg">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-white">{feature.title}</h3>
                  <p className="text-xs text-primary-foreground/70 mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-12">
            <div className="flex items-center gap-6 text-sm text-primary-foreground/60">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>ISO/IEC 27001 Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>Encriptación AES-256</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}