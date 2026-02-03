# GSM Servis ve Teknik Takip Sistemi

Modern, hızlı ve kullanıcı dostu bir GSM servis yönetim paneli. Bu uygulama, teknik servis süreçlerini, stok yönetimini, satışları ve müşteri ilişkilerini tek bir noktadan yönetmenizi sağlar.

## 🚀 Önemli Özellikler

-   **Teknik Servis Takibi:** Cihaz kabul, arıza teşhis, onarım süreci ve teslimat aşamalarını profesyonelce yönetin.
-   **Müşteri Yönetimi:** Müşteri kayıtları, borç/alacak takibi ve işlem geçmişi.
-   **Stok ve Ürün Yönetimi:** Parça stokları, aksesuar satışları, kritik stok uyarıları ve barkod desteği.
-   **Satış ve Kasa Modülü:** Günlük satışlar, gelir-gider takibi ve detaylı kasa raporları.
-   **Toptancı Yönetimi:** Tedarikçi borç takibi, alış faturaları ve ödemeler.
-   **Güvenli Erişim:** Supabase Auth ile kullanıcı bazlı giriş, kayıt olma ve şifre sıfırlama süreçleri.
-   **Modern Arayüz:** Karanlık mod destekli, responsive (mobil uyumlu) ve akıcı kullanıcı deneyimi.

## 🛠 Kullanılan Teknolojiler

-   **Frontend:** React, TypeScript, Vite
-   **Styling:** Tailwind CSS, Shadcn/UI
-   **Backend/Database:** Supabase (PostgreSQL)
-   **State Management:** TanStack Query (React Query)
-   **Icons:** Lucide React

## 📦 Kurulum ve Çalıştırma

### 1. Yerel Ortamda Başlatma

Projeyi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

### 2. Supabase Veritabanı Kurulumu

Uygulama kendi veritabanı şemanızı oluşturmanız için bir kurulum sihirbazı ile birlikte gelir:

1.  [Supabase](https://supabase.com) üzerinden yeni bir proje oluşturun.
2.  Uygulama ilk açıldığında sizi karşılayan **/setup** sayfasında Supabase `URL` ve `Anon Key` bilgilerinizi girin.
3.  Ekranda çıkan SQL kodunu kopyalayarak Supabase **SQL Editor** kısmında çalıştırın.
4.  Tablolar oluştuktan sonra "Tabloları Oluşturdum" butonuna basarak uygulamayı kullanmaya başlayabilirsiniz.

### 3. Authentication Ayarları

Kayıt olma ve şifre sıfırlamanın düzgün çalışması için:
- Supabase panelinde **Authentication > URL Configuration** kısmında **Site URL**'inizi (yerel için `http://localhost:5173`) tanımlayın.
- Şifre sıfırlama e-postaları için SMTP ayarlarınızı yapılandırabilir veya varsayılan ayarları kullanabilirsiniz.

## 📄 Lisans

Bu proje MIT lisansı ile lisanslanmıştır.
