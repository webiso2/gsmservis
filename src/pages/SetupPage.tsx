
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Copy, Database, Server, Key } from "lucide-react";
import { checkSupabaseConnection, saveSupabaseConfig, SUPABASE_URL_KEY, SUPABASE_KEY_KEY } from "@/integrations/supabase/client";
import { SCHEMA_SQL } from "@/utils/schema.sql";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export default function SetupPage() {
    const [step, setStep] = useState<1 | 2>(1);
    const [url, setUrl] = useState("");
    const [key, setKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        // Mevcut değerleri doldur (varsa)
        const storedUrl = localStorage.getItem(SUPABASE_URL_KEY) || import.meta.env.VITE_SUPABASE_URL || "";
        const storedKey = localStorage.getItem(SUPABASE_KEY_KEY) || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
        setUrl(storedUrl);
        setKey(storedKey);

        if (storedUrl && storedKey) {
            checkSchemaStatus();
        }
    }, []);

    const handleTestConnection = async () => {
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        // Geçici olarak kaydet ki client.ts okuyabilsin
        saveSupabaseConfig(url, key);

        // Sayfa yenilenmeden client'ın yeni config'i alması için 
        // client.ts içinde bir reload mekanizması yok, bu yüzden
        // en temiz yöntem sayfayı reload etmek ama state kaybolur.
        // Şimdilik client.ts'deki 'checkSupabaseConnection' fonksiyonunun
        // global 'supabase' nesnesini kullandığını unutmayalım.
        // DİKKAT: client.ts'de createClient sadece dosya yüklenirken çalışır.
        // Bu yüzden dinamik değişim için sayfayı yenilemek şart veya
        // createClient'ı bir fonksiyon içine almak gerekirdi.
        // Hızlı çözüm: localStorage'a yazıp sayfayı reload edeceğiz ama
        // o zaman da bu sayfa loop'a girebilir.
        // İYİLEŞTİRME: client.ts dosyasını "hot-swap" yapacak şekilde güncellemedik.
        // Bu yüzden kullanıcıdan bilgileri alıp bir kere reload atmamız gerekebilir.
        // AMA: Reload atarsak kullanıcı yine Setup sayfasına düşecek.

        // ÇÖZÜM: 'checkSupabaseConnection' testini yaparken
        // client.ts'deki instance'ı değil, yeni bir instance oluşturup test edebiliriz.
        // Ancak client.ts dışa "createClient" export etmiyor, "supabase" instance'ı export ediyor.

        // Şimdilik varsayım: Kullanıcı bilgileri girip "Kaydet ve Test Et" dediğinde
        // reload atarak test sonucunu göreceyiz.

        // ALTERNATİF: Basit bir fetch isteği ile test edelim, supabase-js kullanmadan.
        try {
            const testRes = await fetch(`${url}/rest/v1/`, {
                headers: {
                    apikey: key,
                    Authorization: `Bearer ${key}`
                }
            });

            if (testRes.status !== 200 && testRes.status !== 404) {
                // 404 dönebilir çünkü root path olmayabilir ama genelde rest/v1 swagger döner
                // Supabase genelde root rest/v1 isteğine JSON döner
                // Auth hatası ise 401 döner
                if (testRes.status === 401) throw new Error("Yetkisiz Erişim: API Anahtarı (Anon Key) yanlış.");
            }

            // Eğer buraya geldiysek URL ve Key muhtemelen doğrudur.
            // Şimdi Schema kontrolü yapalım.
            // Bunun için mecburen uygulamayı yeni config ile reload etmemiz sağlıklı olur.
            // Ancak kullanıcıya "Bağlantı Başarılı, şimdi veritabanını kontrol ediyorum..." diyip reload atabiliriz.

            setSuccessMsg("Bağlantı bilgileri geçerli görünüyor! Veritabanı kontrol ediliyor...");

            // 1.5 saniye sonra reload
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err: any) {
            setError(err.message || "Bağlantı sağlanamadı. URL veya Anahtarı kontrol edin.");
            setLoading(false);
        }
    };

    const checkSchemaStatus = async () => {
        setLoading(true); // Başlangıçta loading göster
        try {
            const { success, error } = await checkSupabaseConnection();

            if (!success) {
                // Kayıtlı config ile bağlantı kurulamadı
                console.error("Auto-check failed:", error);

                // Eğer kayıtlı bilgi varsa ama çalışmıyorsa hatayı gösterelim
                if (localStorage.getItem(SUPABASE_URL_KEY)) {
                    setError(`Kayıtlı bilgiler ile bağlantı kurulamadı: ${error}`);
                }
                setLoading(false);
                return;
            }

            // Bağlantı var, tablo kontrolü
            const { error: dbError } = await import("@/integrations/supabase/client").then(m => m.supabase.from('customers').select('id').limit(1));

            if (dbError && (
                dbError.code === '42P01' ||
                dbError.message.includes('relation "public.customers" does not exist') ||
                dbError.message.includes('Could not find the table')
            )) {
                // Tablolar EKSİK
                setStep(2);
            } else if (!dbError) {
                // Tablolar TAM
                toast.success("Kurulum zaten tamamlanmış! Yönlendiriliyorsunuz...");
                setTimeout(() => {
                    window.location.href = "/";
                }, 1000);
            } else {
                // Başka bir DB hatası
                console.error("DB Error check:", dbError);
                setError(`Veritabanı kontrol hatası: ${dbError.message}`);
            }
        } catch (e: any) {
            console.error("Unexpected error during check:", e);
            setError(`Beklenmedik hata: ${e.message}`);
        } finally {
            setLoading(false); // Her durumda loading kapat
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(SCHEMA_SQL);
        toast.success("SQL kodu panoya kopyalandı!");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <Card className="w-full max-w-3xl shadow-xl border-slate-200">
                <CardHeader className="bg-slate-900 text-white rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <Server className="h-6 w-6 text-blue-400" />
                        <CardTitle className="text-xl">GSM Servis Takip - Kurulum Sihirbazı</CardTitle>
                    </div>
                    <CardDescription className="text-slate-300">
                        Uygulamayı kendi veritabanınıza bağlamak için aşağıdaki adımları takip edin.
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-blue-800">
                                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold mb-1">Başlamadan önce:</p>
                                    <p>1. <a href="https://supabase.com" target="_blank" className="underline hover:text-blue-600">Supabase.com</a> üzerinde yeni bir proje oluşturun.</p>
                                    <p>2. Proje ayarlarından (Project Settings &gt; API) <strong>URL</strong> ve <strong>anon public</strong> anahtarlarını kopyalayın.</p>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="url" className="flex items-center gap-2">
                                        <Database className="h-4 w-4" /> Supabase URL
                                    </Label>
                                    <Input
                                        id="url"
                                        placeholder="https://your-project.supabase.co"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="font-mono bg-slate-50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="key" className="flex items-center gap-2">
                                        <Key className="h-4 w-4" /> Supabase Anon Key
                                    </Label>
                                    <Input
                                        id="key"
                                        type="password"
                                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                        value={key}
                                        onChange={(e) => setKey(e.target.value)}
                                        className="font-mono bg-slate-50"
                                    />
                                </div>
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Hata</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            {successMsg && (
                                <Alert className="bg-green-50 text-green-800 border-green-200">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertTitle>Başarılı</AlertTitle>
                                    <AlertDescription>{successMsg}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
                                <Database className="h-5 w-5 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold mb-1">Veritabanı Hazırlanıyor</p>
                                    <p>Bağlantı başarılı ancak gerekli tablolar bulunamadı.</p>
                                    <p className="mt-2">Lütfen aşağıdaki SQL kodunu kopyalayın ve Supabase panelindeki <strong>SQL Editor</strong> bölümünde çalıştırın.</p>
                                </div>
                            </div>

                            <div className="relative">
                                <Textarea
                                    readOnly
                                    value={SCHEMA_SQL}
                                    className="font-mono text-xs h-64 bg-slate-900 text-slate-300 p-4 resize-none"
                                />
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="absolute top-2 right-2 flex items-center gap-1 hover:bg-slate-700 hover:text-white"
                                    onClick={copyToClipboard}
                                >
                                    <Copy className="h-3 w-3" /> Kopyala
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-slate-50 border-t p-4 flex justify-between">
                    {step === 1 ? (
                        <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={handleTestConnection} disabled={loading}>
                            {loading ? "Test Ediliyor..." : "Bağlan ve Devam Et"}
                        </Button>
                    ) : (
                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => window.location.reload()}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Tabloları Oluşturdum, Kontrol Et
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
