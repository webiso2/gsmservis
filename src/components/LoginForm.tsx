// --- START OF FILE src/components/LoginForm.tsx ---

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, Lock, Mail, Smartphone } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            toast({ title: "Giriş Hatası", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Başarılı", description: "Giriş yapıldı." });
            setEmail('');
            setPassword('');
        }
        setLoginLoading(false);
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-black relative overflow-hidden">
            {/* Arkaplan Efektleri */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="glass-card border border-white/10 p-8 rounded-2xl shadow-2xl backdrop-blur-xl bg-black/40">
                    <div className="text-center mb-8 space-y-2">
                        <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/10 mb-4 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                            <Smartphone className="h-10 w-10 text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">GSM Servis</h1>
                        <p className="text-gray-400 text-sm font-medium tracking-wide uppercase opacity-80">Yönetim Paneli Girişi</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-medium text-gray-400 ml-1">E-posta Adresi</Label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="ornek@gsmservis.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loginLoading}
                                    className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-medium text-gray-400 ml-1">Şifre</Label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loginLoading}
                                    className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all rounded-lg"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all duration-300 rounded-lg mt-2" disabled={loginLoading}>
                            {loginLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                            Giriş Yap
                        </Button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-600">
                            &copy; {new Date().getFullYear()} GSM Servis Yönetim Sistemi
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;
// --- END OF FILE src/components/LoginForm.tsx ---
