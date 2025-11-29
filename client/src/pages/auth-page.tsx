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
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
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

          <Card className="border-0 shadow-none lg:border lg:shadow-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
              <CardDescription>
                Ingresa tus credenciales para acceder al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder="Nombre de usuario"
                              className="pl-10"
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
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <Lock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Contraseña"
                              className="pl-10 pr-10"
                              data-testid="input-password"
                              autoComplete="current-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
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
                    className="w-full"
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

              <div className="mt-6 pt-6 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Las credenciales son proporcionadas únicamente por el Administrador del sistema.
                  No está permitido el registro de usuarios externos.
                </p>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        
        {/* Abstract Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 border-2 border-white rounded-full" />
          <div className="absolute top-32 left-32 w-48 h-48 border-2 border-white rounded-full" />
          <div className="absolute bottom-20 right-10 w-72 h-72 border-2 border-white rounded-full" />
          <div className="absolute bottom-40 right-40 w-56 h-56 border-2 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/4 w-32 h-32 border-2 border-white transform -translate-y-1/2 rotate-45" />
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
