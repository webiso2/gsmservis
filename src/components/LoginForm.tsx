// --- START OF FILE src/components/LoginForm.tsx ---

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, Lock, Mail, Smartphone, UserPlus, HelpCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const { toast } = useToast();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                toast({ title: "Başarılı", description: "Giriş yapıldı." });
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                });
                if (error) throw error;
                toast({
                    title: "Kayıt Başarılı",
                    description: "E-postanızı kontrol edin (Onay gerekebilir).",
                });
            }
        } catch (error: any) {
            toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            toast({ title: "Uyarı", description: "Lütfen e-posta adresinizi girin.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            toast({ title: "Şifre Sıfırlama", description: "Sıfırlama bağlantısı e-postanıza gönderildi." });
        } catch (error: any) {
            toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-black relative overflow-hidden">
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
                        <p className="text-gray-400 text-sm font-medium tracking-wide uppercase opacity-80">
                            {mode === 'login' ? 'Yönetim Paneli Girişi' : 'Yeni Kayıt Oluştur'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6">
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
                                    disabled={loading}
                                    className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="password" title="password" className="text-xs font-medium text-gray-400 ml-1">Şifre</Label>
                                {mode === 'login' && (
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        Şifremi Unuttum
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all duration-300 rounded-lg" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (mode === 'login' ? <LogIn className="mr-2 h-5 w-5" /> : <UserPlus className="mr-2 h-5 w-5" />)}
                                {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-gray-400 hover:text-white"
                                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                                disabled={loading}
                            >
                                {mode === 'login' ? 'Hesabınız yok mu? Kayıt Olun' : 'Zaten hesabınız var mı? Giriş Yapın'}
                            </Button>
                        </div>
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
