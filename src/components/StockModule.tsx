// --- START OF FILE src/StockModule.tsx ---

import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { useProducts, useWholesalers } from "@/hooks/useAppData";
import { X, PackagePlus, FileEdit, PackageMinus, Plus, Minus, Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Save, Wand2, Package } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Product, Wholesaler } from "@/types/backup";
import { ScrollArea } from "@/components/ui/scroll-area";

type MainCategory = 'YP' | 'AK' | 'SR';
type SubCategory = | 'YP-EK' | 'YP-BT' | 'YP-SK' | 'YP-FL' | 'YP-KM' | 'YP-EN' | 'YP-KS' | 'YP-KP' | 'YP-DK' | 'YP-LN' | 'YP-DIGER' | 'AK-KLF' | 'AK-KRZ' | 'AK-DIGER' | 'SR-SARJ' | 'SR-KABLO' | 'SR-BASLIK' | 'SR-PWR' | 'SR-KULAK' | 'SR-DIGER';
const subCategoryMap: Record<MainCategory, { value: SubCategory; label: string }[]> = {
    'YP': [{ value: 'YP-EK', label: 'Ekran' }, { value: 'YP-BT', label: 'Batarya' }, { value: 'YP-SK', label: 'Soket' }, { value: 'YP-FL', label: 'Flex' }, { value: 'YP-KM', label: 'Kamera' }, { value: 'YP-EN', label: 'Entegre' }, { value: 'YP-KS', label: 'Kasa' }, { value: 'YP-KP', label: 'Kapak' }, { value: 'YP-DK', label: 'Dokunmatik' }, { value: 'YP-LN', label: 'Lens' }, { value: 'YP-DIGER', label: 'Diğer YP' }],
    'AK': [{ value: 'AK-KLF', label: 'Kılıf' }, { value: 'AK-KRZ', label: 'Koruyucu Cam' }, { value: 'AK-DIGER', label: 'Diğer Aksesuar' }],
    'SR': [{ value: 'SR-SARJ', label: 'Şarj Aleti (Set)' }, { value: 'SR-KABLO', label: 'Data Kablosu' }, { value: 'SR-BASLIK', label: 'Şarj Başlığı' }, { value: 'SR-PWR', label: 'Powerbank' }, { value: 'SR-KULAK', label: 'Kulaklık' }, { value: 'SR-DIGER', label: 'Diğer Sarf M.' }]
};

interface FormData { code: string; name: string; description: string; main_category: MainCategory | ''; sub_category: SubCategory | ''; brand: string; model: string; quantity: string; unit: string; purchase_price: string; selling_price: string; min_stock_level: string; supplier: string; custom_code_part: string; }
const initialFormData: FormData = { code: "", name: "", description: "", main_category: '', sub_category: '', brand: '', model: '', quantity: "0", unit: "adet", purchase_price: "0", selling_price: "0", min_stock_level: "0", supplier: "", custom_code_part: "" };

interface StockModuleProps { onClose: () => void; }
async function checkAndAddNeed(productId: string, productName: string, currentQuantity: number, minStockLevel: number, toastFn: (options: any) => void) { if (minStockLevel <= 0 || currentQuantity >= minStockLevel) return; try { const { count, error: checkError } = await supabase.from('needs').select('id', { count: 'exact', head: true }).eq('product_id', productId); if (checkError) { console.error("İhtiyaç Kontrol hatası:", checkError); return; } if (count === 0) { const quantityNeeded = minStockLevel - currentQuantity > 0 ? minStockLevel - currentQuantity : 1; const { error: insertError } = await supabase.from('needs').insert({ date: new Date().toISOString(), description: `${productName} (Stok Azaldı)`, quantity: quantityNeeded, product_id: productId, supplier: null }); if (insertError) { console.error("Otomatik ihtiyaç EKLEME hatası:", insertError); toastFn({ title: "Hata", description: `"${productName}" ihtiyaç listesine eklenemedi: ${insertError.message}`, variant: "destructive" }); } else { toastFn({ title: "Bilgi", description: `"${productName}" ihtiyaç listesine eklendi.` }); window.dispatchEvent(new CustomEvent('needs-updated')); } } } catch (error) { console.error("[checkAndAddNeed] İhtiyaç ekleme sırasında hata:", error); } }
type SortColumn = keyof Pick<Product, 'code' | 'name' | 'quantity' | 'selling_price' | 'main_category' | 'sub_category' | 'brand' | 'model'> | null;
type SortDirection = 'asc' | 'desc';

const StockModule: React.FC<StockModuleProps> = ({ onClose }) => {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const { toast } = useToast();
    const [sortColumn, setSortColumn] = useState<SortColumn>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const queryClient = useQueryClient();
    const { data: productsData, isLoading: isProductsLoading } = useProducts();
    const { data: wholesalersData } = useWholesalers();

    const products = productsData || [];
    const wholesalers = wholesalersData || [];
    const isLoading = isProductsLoading;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };
    const handleSelectChange = (name: 'main_category' | 'sub_category', value: string) => { setFormData(p => ({ ...p, [name]: value, ...(name === 'main_category' && { sub_category: '', code: '', custom_code_part: '' }) })); };
    const handleProductSelect = (product: Product) => { if (isEditing) return; setSelectedProduct(product); setFormData({ code: product.code, name: product.name, description: product.description ?? '', main_category: (product.main_category as MainCategory) || '', sub_category: (product.sub_category as SubCategory) || '', brand: product.brand ?? '', model: product.model ?? '', quantity: product.quantity.toString(), unit: product.unit ?? 'adet', purchase_price: product.purchase_price.toString(), selling_price: product.selling_price.toString(), min_stock_level: product.min_stock_level.toString(), supplier: product.supplier ?? '', custom_code_part: '' }); };

    const generateProductCode = useCallback(async () => {
        const { main_category, sub_category, brand, model } = formData;
        if (!main_category || !sub_category) {
            toast({ title: "Uyarı", description: "Kod oluşturmak için Ana ve Alt Kategori seçilmelidir.", variant: "destructive" });
            return;
        }

        setIsGeneratingCode(true);
        try {
            const trimmedBrand = brand?.trim() || null;
            const trimmedModel = model?.trim() || null;

            let query = supabase.from('products').select('id', { count: 'exact', head: true })
                .eq('main_category', main_category)
                .eq('sub_category', sub_category);

            query = trimmedBrand ? query.eq('brand', trimmedBrand) : query.is('brand', null);
            query = trimmedModel ? query.eq('model', trimmedModel) : query.is('model', null);

            const { count, error } = await query;

            if (error) {
                throw new Error(`Mevcut ürün sayısı alınamadı: ${error.message}`);
            }

            const nextSequence = (count ?? 0) + 1;
            const formattedSequence = nextSequence.toString().padStart(3, '0');

            const brandPart = brand.substring(0, 3).toUpperCase() || 'BRD';
            const modelPart = model.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'MDL';
            const newCode = `${main_category}-${sub_category}-${brandPart}-${modelPart}-${formattedSequence}`;

            setFormData(p => ({ ...p, code: newCode, custom_code_part: formattedSequence }));
            toast({ title: "Kod Önerisi Oluşturuldu", description: newCode });

        } catch (error: any) {
            console.error("Kod oluşturma hatası:", error);
            toast({ title: "Hata", description: `Kod oluşturulamadı: ${error.message}`, variant: "destructive" });
            setFormData(p => ({ ...p, code: '', custom_code_part: '' }));
        } finally {
            setIsGeneratingCode(false);
        }
    }, [formData, toast]);


    const prepareDataForSupabase = (data: FormData, isNew: boolean = false) => { const code = data.code.trim(); const name = data.name.trim(); if (!code || !name) { toast({ title: "Uyarı", description: "Kod ve Ad zorunludur.", variant: "destructive" }); return null; } const quantity = parseInt(data.quantity) || 0; const purchasePrice = parseFloat(data.purchase_price) || 0; const sellingPrice = parseFloat(data.selling_price) || 0; const minStockLevel = parseInt(data.min_stock_level) || 0; if ((isNew && quantity < 0) || purchasePrice < 0 || sellingPrice < 0 || minStockLevel < 0) { toast({ title: "Uyarı", description: "Sayısal alanlar negatif olamaz.", variant: "destructive" }); return null; } let dbData: Partial<Product> = { code: code, name: name, description: data.description?.trim() || null, main_category: data.main_category || null, sub_category: data.sub_category || null, brand: data.brand?.trim() || null, model: data.model?.trim() || null, unit: data.unit?.trim() || 'adet', purchase_price: purchasePrice, selling_price: sellingPrice, min_stock_level: minStockLevel, supplier: data.supplier?.trim() || null, }; if (isNew) { dbData.quantity = quantity; } return dbData; };
    const handleAddProduct = async () => { if (isEditing) return; const productData = prepareDataForSupabase(formData, true); if (!productData) return; setIsSaving(true); try { const { count, error: cE } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('code', productData.code!); if (cE) throw new Error(`Kod kontrolü başarısız: ${cE.message}`); if (count !== null && count > 0) { toast({ title: "Hata", description: `"${productData.code}" kodu zaten kullanılıyor.`, variant: "destructive" }); setIsSaving(false); return; } const { data: newProduct, error: insertError } = await supabase.from('products').insert(productData as Product).select('id').single(); if (insertError) throw new Error(`Ürün eklenemedi: ${insertError.message}`); if (!newProduct) throw new Error("Ürün eklendi ancak ID alınamadı."); toast({ title: "Başarılı", description: `Ürün "${productData.name}" başarıyla eklendi.` }); await queryClient.invalidateQueries({ queryKey: ['products'] }); setFormData(initialFormData); setSelectedProduct(null); } catch (error: any) { console.error("Yeni ürün ekleme hatası:", error); toast({ title: "Hata", description: `Ürün eklenemedi: ${error.message}`, variant: "destructive" }); } finally { setIsSaving(false); } };
    const handleEditClick = () => { if (!isEditing) { if (!selectedProduct) { toast({ title: "Bilgi", description: "Lütfen düzenlemek için bir ürün seçin.", variant: "default" }); return; } setIsEditing(true); } else { handleUpdateProduct(); } };
    const handleCancelEdit = () => { setIsEditing(false); setSelectedProduct(null); setFormData(initialFormData); };
    const handleUpdateProduct = async () => { if (!selectedProduct || !isEditing) return; const productUpdateData = prepareDataForSupabase(formData, false); if (!productUpdateData) return; setIsSaving(true); try { if (productUpdateData.code !== selectedProduct.code) { const { count, error: checkError } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('code', productUpdateData.code!).neq('id', selectedProduct.id); if (checkError) throw checkError; if (count !== null && count > 0) { toast({ title: "Hata", description: `"${productUpdateData.code}" kodu başka bir ürüne ait.`, variant: "destructive" }); setIsSaving(false); return; } } const { data, error } = await supabase.from('products').update(productUpdateData).eq('id', selectedProduct.id).select().single(); if (error) throw error; toast({ title: "Başarılı", description: "Ürün bilgileri güncellendi." }); await queryClient.invalidateQueries({ queryKey: ['products'] }); setIsEditing(false); setSelectedProduct(null); setFormData(initialFormData); } catch (error: any) { console.error("Ürün Güncelleme Hatası:", error); toast({ title: "Hata", description: `Ürün güncellenemedi: ${error.message}`, variant: "destructive" }); } finally { setIsSaving(false); } };
    const handleDeleteProduct = async () => { if (!selectedProduct || isEditing) return; if (!window.confirm(`"${selectedProduct.name}" isimli ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return; try { const { error } = await supabase.from('products').delete().eq('id', selectedProduct.id); if (error) { if (error.code === '23503') { toast({ title: "Hata", description: "Bu ürünle ilişkili kayıtlar var, silinemez.", variant: "destructive", duration: 5000 }); } else { throw error; } } else { toast({ title: "Başarılı", description: "Ürün silindi." }); await queryClient.invalidateQueries({ queryKey: ['products'] }); setSelectedProduct(null); setFormData(initialFormData); setIsEditing(false); } } catch (e: any) { console.error("Ürün silme hatası:", e); toast({ title: "Hata", description: `Ürün silinemedi: ${e.message}`, variant: "destructive" }); } };
    const handleStockAdjustment = async (type: 'increase' | 'decrease') => { if (!selectedProduct || isEditing) return; const promptMessage = `${selectedProduct.name} için ${type === 'increase' ? 'düzeltme miktarı (artış)' : 'azaltılacak miktar'}:`; const amountStr = window.prompt(promptMessage, "1"); if (amountStr === null) return; const adjustmentAmount = parseInt(amountStr); if (isNaN(adjustmentAmount) || adjustmentAmount <= 0) { toast({ title: "Hata", description: "Lütfen geçerli pozitif bir miktar girin.", variant: "destructive" }); return; } let newQuantity: number; if (type === 'decrease') { if (adjustmentAmount > selectedProduct.quantity) { toast({ title: "Hata", description: "Stoktan fazla azaltma yapılamaz.", variant: "destructive" }); return; } newQuantity = selectedProduct.quantity - adjustmentAmount; } else { newQuantity = selectedProduct.quantity + adjustmentAmount; toast({ title: "Bilgi", description: "Stok düzeltmesi yapılıyor.", variant: "default" }); } try { const { data, error } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', selectedProduct.id).select('id, name, quantity, min_stock_level').single(); if (error) throw error; if (data) { toast({ title: "Başarılı", description: "Stok miktarı güncellendi." }); await queryClient.invalidateQueries({ queryKey: ['products'] }); await checkAndAddNeed(data.id, data.name, newQuantity, data.min_stock_level ?? 0, toast); setSelectedProduct(null); setFormData(initialFormData); setIsEditing(false); } else { toast({ title: "Uyarı", description: "Stok ayarlandı ancak veri doğrulanamadı.", variant: "default" }); await queryClient.invalidateQueries({ queryKey: ['products'] }); setSelectedProduct(null); setFormData(initialFormData); setIsEditing(false); } } catch (error: any) { console.error(`Stok ${type === 'increase' ? 'artırma (düzeltme)' : 'azaltma'} hatası:`, error); toast({ title: "Hata", description: `Stok ayarlanamadı: ${error.message}`, variant: "destructive" }); } };
    const handleSort = (column: SortColumn) => { if (!column) return; const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc'; setSortColumn(column); setSortDirection(newDirection); };
    const getSortIcon = (column: SortColumn) => { if (sortColumn !== column) { return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30 inline-block" />; } return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline-block" /> : <ArrowDown className="ml-1 h-3 w-3 inline-block" />; };
    const sortedAndFilteredProducts = useMemo(() => { if (!products || products.length === 0) { return []; } let filtered: Product[] = []; try { filtered = products.filter(p => { const searchTermLower = searchTerm.toLowerCase(); return (p.name?.toLowerCase().includes(searchTermLower) ?? false) || (p.code?.toLowerCase().includes(searchTermLower) ?? false) || (p.brand?.toLowerCase().includes(searchTermLower) ?? false) || (p.model?.toLowerCase().includes(searchTermLower) ?? false) || (p.main_category?.toLowerCase().includes(searchTermLower) ?? false) || (p.sub_category?.toLowerCase().includes(searchTermLower) ?? false); }); } catch (filterError) { console.error("Filtreleme hatası:", filterError); return []; } if (sortColumn) { try { filtered = [...filtered].sort((a, b) => { const valA = a[sortColumn] ?? (typeof a[sortColumn] === 'number' ? 0 : ''); const valB = b[sortColumn] ?? (typeof b[sortColumn] === 'number' ? 0 : ''); let comparison = 0; if (typeof valA === 'string' && typeof valB === 'string') { comparison = valA.localeCompare(valB, 'tr', { sensitivity: 'base' }); } else if (typeof valA === 'number' && typeof valB === 'number') { comparison = valA - valB; } else { comparison = String(valA).localeCompare(String(valB), 'tr', { sensitivity: 'base' }); } return sortDirection === 'asc' ? comparison : comparison * -1; }); } catch (sortError) { console.error("Sıralama hatası:", sortError); return filtered; } } return filtered; }, [products, searchTerm, sortColumn, sortDirection]);
    const availableSubCategories = useMemo(() => { if (!formData.main_category) return []; return subCategoryMap[formData.main_category] || []; }, [formData.main_category]);

    return (
        <div className="h-full p-2 sm:p-4 animate-in fade-in duration-300">
            <div className="glass-panel rounded-xl h-full flex flex-col border border-white/10 shadow-2xl overflow-hidden">
                <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center flex-shrink-0 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                            <Package className="h-5 w-5 text-orange-400" />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Stok Yönetim Sistemi</h1>
                    </div>
                    <Button variant="ghost" size="icon" className="hover:bg-red-500/20 hover:text-red-400 h-8 w-8 rounded-lg transition-colors" onClick={onClose} disabled={isLoading || isSaving || isGeneratingCode}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-3 sm:p-4 flex-1 flex flex-col gap-4 overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-hidden">
                            {/* Sol Panel (Form) */}
                            <div className="glass-card p-4 overflow-y-auto">
                                <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                                    {isEditing ? <FileEdit className="h-5 w-5 text-blue-400" /> : <PackagePlus className="h-5 w-5 text-green-400" />}
                                    {isEditing ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
                                </h2>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-main_category" className="text-xs font-medium text-gray-400">Ana Kategori *</Label>
                                            <Select value={formData.main_category} onValueChange={(v) => handleSelectChange('main_category', v)} disabled={isSaving || isEditing}>
                                                <SelectTrigger id="form-main_category" className="h-9 bg-white/5 border-white/10 text-white text-xs focus:ring-orange-500/50">
                                                    <SelectValue placeholder="Seçiniz..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                                    {Object.keys(subCategoryMap).map((key) => (<SelectItem key={key} value={key} className="focus:bg-gray-800 focus:text-white">{key}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-sub_category" className="text-xs font-medium text-gray-400">Alt Kategori</Label>
                                            <Select value={formData.sub_category} onValueChange={(v) => handleSelectChange('sub_category', v)} disabled={isSaving || isEditing || !formData.main_category}>
                                                <SelectTrigger id="form-sub_category" className="h-9 bg-white/5 border-white/10 text-white text-xs focus:ring-orange-500/50">
                                                    <SelectValue placeholder="Önce Ana Kat." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                                    {availableSubCategories.map((sub) => (<SelectItem key={sub.value} value={sub.value} className="focus:bg-gray-800 focus:text-white">{sub.label}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-brand" className="text-xs font-medium text-gray-400">Marka</Label>
                                            <Input id="form-brand" type="text" name="brand" value={formData.brand} onChange={handleInputChange} placeholder="Apple, Samsung..." className="h-9 bg-white/5 border-white/10 text-white text-xs focus:border-orange-500/50" disabled={isSaving} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-model" className="text-xs font-medium text-gray-400">Model</Label>
                                            <Input id="form-model" type="text" name="model" value={formData.model} onChange={handleInputChange} placeholder="iPhone 13, S21..." className="h-9 bg-white/5 border-white/10 text-white text-xs focus:border-orange-500/50" disabled={isSaving} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="form-name" className="text-xs font-medium text-gray-400">Ürün Adı *</Label>
                                        <Input id="form-name" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Ürün adını giriniz" className="h-9 bg-white/5 border-white/10 text-white text-xs focus:border-orange-500/50" disabled={isSaving} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="form-code" className="text-xs font-medium text-gray-400">Ürün Kodu *</Label>
                                        <div className="flex gap-2">
                                            <Input id="form-code" type="text" name="code" value={formData.code} onChange={handleInputChange} placeholder="Kod oluşturun veya manuel girin" className="flex-1 h-9 bg-white/5 border-white/10 text-white text-xs focus:border-orange-500/50 font-mono" disabled={isSaving || isEditing} readOnly={isEditing} />
                                            {!isEditing && (
                                                <Button type="button" size="sm" variant="outline" onClick={generateProductCode} className="h-9 text-xs bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30" disabled={isSaving || isGeneratingCode || !formData.main_category || !formData.sub_category} title="Otomatik Kod Oluştur">
                                                    {isGeneratingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                                </Button>
                                            )}
                                        </div>
                                        {!isEditing && <p className="text-[10px] text-gray-500 mt-1">Kod oluşturmak için Kategori, Marka, Model girin ve Sihirbaza tıklayın.</p>}
                                    </div>

                                    {!isEditing && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-custom_code_part" className="text-xs font-medium text-gray-400">Özel Kod Parçası (Otomatik Kod Sonu)</Label>
                                            <Input id="form-custom_code_part" type="text" name="custom_code_part" value={formData.custom_code_part} onChange={handleInputChange} placeholder="Renk, Kalite, No vb." className="h-9 bg-white/5 border-white/10 text-white text-xs focus:border-orange-500/50" disabled={isSaving} />
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label htmlFor="form-desc" className="text-xs font-medium text-gray-400">Açıklama</Label>
                                        <Textarea id="form-desc" name="description" value={formData.description} onChange={handleInputChange} placeholder="Ürün açıklaması giriniz" className="min-h-[60px] bg-white/5 border-white/10 text-white text-xs focus:border-orange-500/50 resize-none" disabled={isSaving} />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-quantity" className="text-xs font-medium text-gray-400">{isEditing ? 'Mevcut Miktar' : 'İlk Stok Miktarı'}</Label>
                                            <Input id="form-quantity" type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="0" min="0" step="any" className={cn("h-9 text-xs text-right bg-white/5 border-white/10 text-white focus:border-orange-500/50", isEditing && 'opacity-50 cursor-not-allowed')} disabled={isSaving || isEditing} readOnly={isEditing} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-unit" className="text-xs font-medium text-gray-400">Birim</Label>
                                            <Input id="form-unit" type="text" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="Adet, Kg, Lt" className="h-9 bg-white/5 border-white/10 text-white text-xs text-center focus:border-orange-500/50" disabled={isSaving} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-purchasep" className="text-xs font-medium text-gray-400">Vars. Alış Fiyatı (₺)</Label>
                                            <Input id="form-purchasep" type="number" name="purchase_price" value={formData.purchase_price} onChange={handleInputChange} placeholder="0.00" min="0" step="0.01" className="h-9 bg-white/5 border-white/10 text-white text-xs text-right focus:border-orange-500/50" disabled={isSaving} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-sellp" className="text-xs font-medium text-gray-400">Satış Fiyatı (₺)</Label>
                                            <Input id="form-sellp" type="number" name="selling_price" value={formData.selling_price} onChange={handleInputChange} placeholder="0.00" min="0" step="0.01" className="h-9 bg-white/5 border-white/10 text-white text-xs text-right focus:border-orange-500/50" disabled={isSaving} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-minstock" className="text-xs font-medium text-gray-400">Min. Stok</Label>
                                            <Input id="form-minstock" type="number" name="min_stock_level" value={formData.min_stock_level} onChange={handleInputChange} placeholder="0" min="0" className="h-9 bg-white/5 border-white/10 text-white text-xs text-right focus:border-orange-500/50" disabled={isSaving} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-supplier" className="text-xs font-medium text-gray-400">Vars. Tedarikçi</Label>
                                            <Select value={formData.supplier} onValueChange={(v) => setFormData(p => ({ ...p, supplier: v }))} disabled={isSaving}>
                                                <SelectTrigger id="form-supplier" className="h-9 bg-white/5 border-white/10 text-white text-xs focus:ring-orange-500/50">
                                                    <SelectValue placeholder="Tedarikçi Seçiniz" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                                    <SelectItem value="Bilinmiyor" className="focus:bg-gray-800 focus:text-white">Bilinmiyor</SelectItem>
                                                    {wholesalers.map((w) => (
                                                        <SelectItem key={w.id} value={w.name} className="focus:bg-gray-800 focus:text-white">{w.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-4 pt-2 border-t border-white/10">
                                        {isEditing ? (
                                            <>
                                                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleUpdateProduct} disabled={isSaving}>
                                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Güncelle
                                                </Button>
                                                <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10" onClick={handleCancelEdit} disabled={isSaving}>
                                                    <X className="mr-2 h-4 w-4" /> İptal
                                                </Button>
                                            </>
                                        ) : (
                                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleAddProduct} disabled={isSaving}>
                                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />} Yeni Ürün Ekle
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sağ Panel (Liste) */}
                            <div className="flex flex-col gap-4 h-full overflow-hidden">
                                <div className="glass-card p-3 flex-shrink-0">
                                    <Label htmlFor="search-product" className="text-xs font-medium mb-1.5 block text-gray-400">Ürün Ara</Label>
                                    <div className="relative">
                                        <Input
                                            id="search-product"
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Kod, Ad, Marka, Model, Kategori..."
                                            className="bg-black/40 border-white/10 text-white pl-10 h-10 text-sm focus:border-orange-500/50"
                                        />
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    </div>
                                </div>

                                <div className="glass-card flex-1 overflow-hidden flex flex-col min-h-0">
                                    <div className="overflow-auto flex-1">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                                            </div>
                                        ) : (
                                            <table className="w-full text-sm">
                                                <thead className="bg-white/5 text-gray-300 sticky top-0 z-10 backdrop-blur-md">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium">
                                                            <Button variant="ghost" onClick={() => handleSort('code')} className="px-1 py-0 h-auto text-gray-300 hover:text-white hover:bg-transparent text-xs font-medium">
                                                                Kod{getSortIcon('code')}
                                                            </Button>
                                                        </th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium">
                                                            <Button variant="ghost" onClick={() => handleSort('name')} className="px-1 py-0 h-auto text-gray-300 hover:text-white hover:bg-transparent text-xs font-medium">
                                                                Ad{getSortIcon('name')}
                                                            </Button>
                                                        </th>
                                                        <th className="hidden sm:table-cell px-3 py-2 text-left text-xs font-medium">
                                                            <Button variant="ghost" onClick={() => handleSort('brand')} className="px-1 py-0 h-auto text-gray-300 hover:text-white hover:bg-transparent text-xs font-medium">
                                                                Marka{getSortIcon('brand')}
                                                            </Button>
                                                        </th>
                                                        <th className="px-3 py-2 text-right text-xs font-medium">
                                                            <Button variant="ghost" onClick={() => handleSort('quantity')} className="px-1 py-0 h-auto text-gray-300 hover:text-white hover:bg-transparent text-xs font-medium">
                                                                Miktar{getSortIcon('quantity')}
                                                            </Button>
                                                        </th>
                                                        <th className="px-3 py-2 text-right text-xs font-medium">
                                                            <Button variant="ghost" onClick={() => handleSort('selling_price')} className="px-1 py-0 h-auto text-gray-300 hover:text-white hover:bg-transparent text-xs font-medium">
                                                                Satış F.{getSortIcon('selling_price')}
                                                            </Button>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {sortedAndFilteredProducts.length === 0 ? (
                                                        <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500 text-sm">{isLoading ? 'Yükleniyor...' : 'Ürün bulunamadı.'}</td></tr>
                                                    ) : (
                                                        sortedAndFilteredProducts.map((product) => (
                                                            <tr
                                                                key={product.id}
                                                                className={cn(
                                                                    "cursor-pointer transition-colors",
                                                                    selectedProduct?.id === product.id ? 'bg-orange-500/20 text-white' : 'hover:bg-white/5 text-gray-300 hover:text-white',
                                                                    isEditing ? 'opacity-50 cursor-not-allowed' : ''
                                                                )}
                                                                onClick={() => !isEditing && handleProductSelect(product)}
                                                                tabIndex={isEditing ? -1 : 0}
                                                                onKeyDown={(e) => { if (!isEditing && (e.key === 'Enter' || e.key === ' ')) handleProductSelect(product); }}
                                                            >
                                                                <td className="px-3 py-2 text-xs font-mono">{product.code}</td>
                                                                <td className="px-3 py-2 text-xs font-medium">{product.name}</td>
                                                                <td className="hidden sm:table-cell px-3 py-2 text-xs text-gray-400">{product.brand || '-'}</td>
                                                                <td className={cn("px-3 py-2 text-right text-xs font-mono", product.quantity <= 0 ? "text-red-400" : "text-emerald-400")}>
                                                                    {product.quantity} <span className="text-gray-500 text-[10px]">{product.unit}</span>
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-xs font-mono text-blue-400">{(product.selling_price ?? 0).toFixed(2)}₺</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>

                                    <div className="p-3 border-t border-white/10 space-y-2 bg-black/20">
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/30" onClick={() => handleStockAdjustment('increase')} disabled={!selectedProduct || isEditing || isLoading || isSaving}>
                                                <Plus className="mr-1 h-4 w-4" /><span className="text-xs">Stok Ekle</span>
                                            </Button>
                                            <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30" onClick={() => handleStockAdjustment('decrease')} disabled={!selectedProduct || (selectedProduct?.quantity ?? 0) <= 0 || isEditing || isLoading || isSaving}>
                                                <Minus className="mr-1 h-4 w-4" /><span className="text-xs">Stok Çıkar</span>
                                            </Button>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/30" onClick={handleEditClick} disabled={(!selectedProduct && !isEditing) || isSaving || isLoading}>
                                                <FileEdit className="mr-1 h-4 w-4" /><span className="text-xs">{isEditing ? 'Güncelle' : 'Düzenle'}</span>
                                            </Button>
                                            {isEditing && (
                                                <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10" onClick={handleCancelEdit} disabled={isSaving}>
                                                    <X className="mr-1 h-4 w-4" /><span className="text-xs">İptal</span>
                                                </Button>
                                            )}
                                            <Button variant="outline" className={cn("flex-1 border-white/10 text-white hover:bg-red-600 hover:text-white hover:border-red-600", isEditing && "hidden")} onClick={handleDeleteProduct} disabled={!selectedProduct || isEditing || isLoading || isSaving}>
                                                <PackageMinus className="mr-1 h-4 w-4" /><span className="text-xs">Sil</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockModule;
// --- END OF FILE src/StockModule.tsx ---