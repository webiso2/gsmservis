import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Lock, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor.");
            return;
        }

        if (password.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            setSuccess(true);
            toast.success("Şifreniz başarıyla güncellendi.");

            setTimeout(() => {
                navigate("/");
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Şifre güncellenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Arkaplan Efektleri */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            <Card className="w-full max-w-md glass-card bg-black/40 border-white/10 relative z-10 animate-in fade-in zoom-in duration-500">
                <CardHeader className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/10 mb-2">
                        <Smartphone className="h-8 w-8 text-blue-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Şifre Sıfırlama</CardTitle>
                    <CardDescription className="text-gray-400">Yeni şifrenizi belirleyin.</CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>Başarılı</AlertTitle>
                            <AlertDescription>Şifreniz güncellendi. Giriş sayfasına yönlendiriliyorsunuz...</AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password" title="password" className="text-gray-400">Yeni Şifre</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="pl-10 h-11 bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" title="confirmPassword" className="text-gray-400">Şifre Tekrar</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-blue-400" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="pl-10 h-11 bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {error && (
                                <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-400">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Hata</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all" disabled={loading}>
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Şifreyi Güncelle"}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="justify-center">
                    <Button variant="link" onClick={() => navigate("/")} className="text-gray-500 hover:text-white text-xs">
                        Giriş Sayfasına Dön
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
