import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, Lock, Eye, EyeOff, User, Loader2, FileText, Users, ClipboardList, CheckCircle } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

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
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        {/* Watermark Background - Clearly Visible */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url('/images/watermark-seal.svg')`,
            backgroundPosition: 'center 40%',
            backgroundSize: '500px 500px',
            backgroundRepeat: 'no-repeat',
            opacity: 0.05,
          }}
        />
        
        {/* Light overlay for readability - more transparent to show watermark */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/55 to-white/65 pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl">Azal Mechanical</h1>
              <p className="text-sm text-muted-foreground">Supports</p>
            </div>
          </div>

          <Card className="border border-[#E2E8F0] shadow-lg bg-white/98 backdrop-blur-sm rounded-lg">
            <CardHeader className="space-y-1 pb-6 border-b border-[#E2E8F0]">
              <CardTitle className="text-2xl font-bold text-black">Iniciar Sesión</CardTitle>
              <CardDescription className="text-black">
                Ingresa tus credenciales para acceder al sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-black">Usuario</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                            <Input
                              {...field}
                              placeholder="Nombre de usuario"
                              className="pl-10 border border-[#E2E8F0] rounded-lg focus:border-[#1E40AF] focus:ring-[#1E40AF]/20 bg-white text-black placeholder-[#94A3B8] transition-all duration-300"
                              data-testid="input-username"
                              autoComplete="username"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-black">Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <Lock className="absolute left-3 h-4 w-4 text-[#64748B] pointer-events-none" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Contraseña"
                              className="pl-10 pr-10 border border-[#E2E8F0] rounded-lg focus:border-[#1E40AF] focus:ring-[#1E40AF]/20 bg-white text-black placeholder-[#94A3B8] transition-all duration-300"
                              data-testid="input-password"
                              autoComplete="current-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 h-full px-3 hover:bg-transparent hover:text-primary"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-black" />
                              ) : (
                                <Eye className="h-4 w-4 text-black" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white border border-[#2563EB] shadow-md hover:shadow-lg transition-all"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Iniciar Sesión
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
                <p className="text-xs text-[#64748B] text-center">
                  Las credenciales son proporcionadas únicamente por el Administrador del sistema.
                  No está permitido el registro de usuarios externos.
                </p>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#64748B]">
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>TLS 1.2+</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>ISO 27001</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Hero Section */}
      <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB] via-[#1e40af] to-[#1d4ed8]" />
        
        {/* Large Watermark Background - Main Focus */}
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

          <h2 className="text-2xl font-semibold mb-4">
            Gestión Documental Segura
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-md">
            Sistema empresarial de gestión de archivos en la nube para el suministro de materiales electromecánicos.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-lg">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{feature.title}</h3>
                  <p className="text-xs text-primary-foreground/70 mt-1">
                    {feature.description}
                  </p>
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
