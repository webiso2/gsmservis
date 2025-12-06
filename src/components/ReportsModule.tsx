// --- START OF FILE src/components/ReportsModule.tsx ---

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { X, Printer, Calendar, Loader2, Tag, ListFilter, Star, BadgeDollarSign, TrendingUp, TrendingDown, CircleDollarSign, AlertCircle, MinusCircle, PieChart, Landmark, Smartphone, Wallet, CreditCard, FileDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, isValid, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type {
  Account, Sale, SaleItem, Product, AccountTransactionType
} from "@/types/backup";
import { useAccounts, useExpenseCategories, useAccountTransactions, useSales, useProducts } from "@/hooks/useAppData";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { ReportCharts } from "./reports/ReportCharts";

// --- Types ---
interface ReportSale extends Omit<Sale, 'items'> { items: SaleItem[]; }
interface ProductSalesReport { productId: string | null; code: string; name: string; category: string; totalQuantitySold: number; totalRevenueGenerated: number; }
interface UnifiedTransaction { id: string; created_at: string; date: string; source: "account"; accountId: string; accountName: string; accountType: Account['type']; originalType: AccountTransactionType; amount: number; description: string; balance_after?: number; related_sale_id?: string | null; related_service_id?: string | null; related_customer_tx_id?: string | null; transfer_pair_id?: string | null; expense_category_id?: string | null; expenseCategoryName?: string | null; related_wholesaler_transaction_id?: string | null; }
interface ReportsModuleProps { onClose: () => void; }
const initialTotals = { totalRevenue: 0, costOfGoodsSold: 0, grossProfit: 0, operatingExpenses: 0, otherIncome: 0, netProfit: 0, summaryIncome: 0, summaryExpense: 0, summaryBalance: 0, };
type SummaryFilterType = 'all' | 'summaryIncome' | 'summaryExpense' | 'totalRevenue' | 'operatingExpenses' | 'otherIncome';

const formatCurrency = (value: number | string | null | undefined): string => { if (value == null) return "0.00"; const num = typeof value === 'string' ? parseFloat(value) : value; return isNaN(num) ? "0.00" : num.toFixed(2); };
interface SummaryBoxProps { title: string; value: number; currency: string; description: string; filterType: SummaryFilterType | null; activeFilter: SummaryFilterType; onClick: (filter: SummaryFilterType) => void; icon?: React.ReactNode; color?: string; }
const SummaryBox: React.FC<SummaryBoxProps> = ({ title, value, currency, description, filterType, activeFilter, onClick, icon, color }) => { const isActive = filterType !== null && activeFilter === filterType; const isClickable = filterType !== null; return (<div role={isClickable ? "button" : undefined} tabIndex={isClickable ? 0 : undefined} onClick={() => isClickable && onClick(filterType)} onKeyDown={(e) => isClickable && (e.key === 'Enter' || e.key === ' ') && onClick(filterType)} className={cn("glass-card p-3 sm:p-4 border border-white/10 transition-all duration-200", isClickable && "cursor-pointer hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50", isActive && "ring-2 ring-blue-500/50 bg-blue-500/10")} aria-pressed={isActive} aria-label={`${title} özetini filtrele`}><h3 className={cn("font-bold text-sm sm:text-base mb-1 flex items-center", color)}> {icon && <span className="mr-1.5">{icon}</span>} {title} </h3><p className="text-lg sm:text-xl font-semibold text-white">{formatCurrency(value)}{currency}</p><p className="text-xs text-gray-400 mt-0.5">{description}</p></div>); }

const getAccountIcon = (type: Account['type']): React.ReactNode => {
  switch (type) {
    case 'cash': return <Wallet className="h-4 w-4 text-emerald-400 mr-1" />;
    case 'bank': return <Landmark className="h-4 w-4 text-blue-400 mr-1" />;
    case 'pos': return <Smartphone className="h-4 w-4 text-purple-400 mr-1" />;
    case 'credit_card': return <CreditCard className="h-4 w-4 text-red-400 mr-1" />;
    default: return <Wallet className="h-4 w-4 text-gray-400 mr-1" />;
  }
};

const ReportsModule: React.FC<ReportsModuleProps> = ({ onClose }) => {
  const { toast } = useToast();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const { data: accountsData, isLoading: isLoadingAccounts, error: errorAccounts } = useAccounts();
  const { data: expenseCategoriesData, isLoading: isLoadingCategories, error: errorCategories } = useExpenseCategories();
  const { data: transactionsData, isLoading: isLoadingTransactions, error: errorTransactions } = useAccountTransactions(startDate, endDate);
  const { data: salesData, isLoading: isLoadingSales, error: errorSales } = useSales(startDate, endDate);
  const { data: productsData, isLoading: isLoadingProducts } = useProducts();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("all");
  const [selectedSummaryFilter, setSelectedSummaryFilter] = useState<SummaryFilterType>('all');
  const [showCharts, setShowCharts] = useState(true);

  const isLoading = isLoadingAccounts || isLoadingCategories || isLoadingTransactions || isLoadingSales || isLoadingProducts;
  const error = errorAccounts?.message || errorCategories?.message || errorTransactions?.message || errorSales?.message || null;

  const accounts = useMemo(() => accountsData || [], [accountsData]);
  const expenseCategories = useMemo(() => expenseCategoriesData || [], [expenseCategoriesData]);
  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    (productsData || []).forEach(p => map.set(p.id, p));
    return map;
  }, [productsData]);

  const sales = useMemo(() => {
    return (salesData || []).map((s: any) => ({
      ...s,
      items: Array.isArray(s.items) ? s.items.map((item: any): SaleItem => ({
        product_id: item.product_id ?? null,
        id: item.id ?? null,
        code: item.code ?? `MAN-${item.name?.substring(0, 3) ?? '??'}`,
        name: item.name ?? '?',
        cartQuantity: item.cartQuantity ?? 0,
        unit: item.unit ?? 'adet',
        purchasePrice: item.purchasePrice ?? 0,
        sellingPrice: item.sellingPrice ?? 0,
      })) : [],
      total: s.total ?? 0,
      discount_amount: s.discount_amount ?? 0,
      net_total: s.net_total ?? ((s.total ?? 0) - (s.discount_amount ?? 0)),
      is_stockless: s.is_stockless ?? false,
    })) as ReportSale[];
  }, [salesData]);

  const unifiedTransactions = useMemo(() => {
    if (!transactionsData || !accountsData || !expenseCategoriesData) return [];

    const accountMap = new Map(accountsData.map(a => [a.id, { name: a.name, type: a.type }]));
    const categoryMap = new Map(expenseCategoriesData.map(c => [c.id, c.name]));

    return transactionsData.map((t): UnifiedTransaction => {
      const accInfo = accountMap.get(t.account_id);
      const categoryName = t.expense_category_id ? categoryMap.get(t.expense_category_id) ?? null : null;
      let signedAmount = t.amount ?? 0;

      return {
        id: t.id,
        created_at: t.created_at,
        date: t.date,
        source: "account",
        accountId: t.account_id,
        accountName: accInfo?.name ?? "?",
        accountType: accInfo?.type ?? "other",
        originalType: t.type,
        amount: signedAmount,
        description: t.description ?? "",
        balance_after: t.balance_after,
        related_sale_id: t.related_sale_id,
        related_service_id: t.related_service_id,
        related_customer_tx_id: t.related_customer_tx_id,
        transfer_pair_id: t.transfer_pair_id,
        expense_category_id: t.expense_category_id ?? null,
        expenseCategoryName: categoryName,
        related_wholesaler_transaction_id: t.related_wholesaler_transaction_id
      };
    });
  }, [transactionsData, accountsData, expenseCategoriesData]);

  const formatReportDate = (dateString: string | null | undefined): string => { if (!dateString) return "-"; try { const date = parseISO(dateString); if (!isValid(date)) { console.warn("Geçersiz tarih değeri:", dateString); return "Geçersiz T."; } return format(date, "dd.MM.yyyy HH:mm", { locale: tr }); } catch (e) { console.error("Tarih formatlama hatası:", e, " Değer:", dateString); return "Format H."; } };

  const totals = useMemo(() => {
    if (!Array.isArray(sales) || !Array.isArray(unifiedTransactions)) { return initialTotals; }

    let calculatedTotals = { ...initialTotals };

    sales.forEach((sale) => {
      calculatedTotals.totalRevenue += sale.net_total ?? 0;
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          const pp = item.purchasePrice ?? 0;
          const qty = item.cartQuantity ?? 0;
          calculatedTotals.costOfGoodsSold += (pp * qty);
        });
      }
    });

    unifiedTransactions.forEach((t) => {
      if (t.amount == null) return;
      const amount = t.amount;

      if (amount > 0 && t.originalType !== 'transfer_in') {
        calculatedTotals.summaryIncome += amount;
      }
      else if (amount < 0 && t.originalType !== 'transfer_out') {
        calculatedTotals.summaryExpense += Math.abs(amount);
      }

      if (t.originalType === 'income') {
        calculatedTotals.otherIncome += amount;
      } else if (t.originalType === 'expense' || t.originalType === 'supplier_payment') {
        calculatedTotals.operatingExpenses += Math.abs(amount);
      }
    });

    calculatedTotals.grossProfit = calculatedTotals.totalRevenue - calculatedTotals.costOfGoodsSold;
    calculatedTotals.netProfit = calculatedTotals.grossProfit + calculatedTotals.otherIncome - calculatedTotals.operatingExpenses;
    calculatedTotals.summaryBalance = calculatedTotals.summaryIncome - calculatedTotals.summaryExpense;

    return calculatedTotals;
  }, [unifiedTransactions, sales]);

  const filteredTransactions = useMemo(() => { if (!Array.isArray(unifiedTransactions)) { return []; } let filtered = unifiedTransactions.filter((t) => { const accountMatch = selectedAccountFilter === "all" || (selectedAccountFilter === "cash" && t.accountType === "cash") || (selectedAccountFilter !== "cash" && t.accountId === selectedAccountFilter); if (!accountMatch) return false; const categoryMatch = selectedCategoryFilter === "all" || ((t.originalType === "expense" || t.originalType === "supplier_payment") && t.expense_category_id === selectedCategoryFilter); if (!categoryMatch) return false; return true; }); if (selectedSummaryFilter !== 'all') { filtered = filtered.filter(t => { switch (selectedSummaryFilter) { case 'summaryIncome': return t.amount > 0 && t.originalType !== 'transfer_in'; case 'summaryExpense': return t.amount < 0 && t.originalType !== 'transfer_out'; case 'totalRevenue': return t.amount > 0 && (t.originalType === 'sale_payment' || t.originalType === 'service_payment'); case 'operatingExpenses': return t.amount < 0 && (t.originalType === 'expense' || t.originalType === 'supplier_payment'); case 'otherIncome': return t.amount > 0 && t.originalType === 'income'; default: return true; } }); } return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); }, [unifiedTransactions, selectedAccountFilter, selectedCategoryFilter, selectedSummaryFilter]);

  const topSellingProducts = useMemo(() => {
    const productSalesMap = new Map<string, ProductSalesReport>();
    sales.forEach(sale => {
      if (!Array.isArray(sale.items)) return;
      sale.items.forEach(item => {
        const key = item.product_id || `manual_${item.name}`;
        const productInfo = item.product_id ? productsMap.get(item.product_id) : null;
        const category = productInfo?.main_category || 'Genel';

        const quantitySold = item.cartQuantity ?? 0;
        const itemRevenue = (item.sellingPrice * quantitySold) * (sale.net_total / sale.total || 1);

        if (productSalesMap.has(key)) {
          const existing = productSalesMap.get(key)!;
          existing.totalQuantitySold += quantitySold;
          existing.totalRevenueGenerated += itemRevenue;
        } else {
          productSalesMap.set(key, {
            productId: item.product_id,
            code: item.code ?? 'MANUEL',
            name: item.name,
            category,
            totalQuantitySold: quantitySold,
            totalRevenueGenerated: itemRevenue,
          });
        }
      });
    });
    return Array.from(productSalesMap.values()).sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);
  }, [sales, productsMap]);

  const chartData = useMemo(() => {
    const dailyMap = new Map<string, { income: number, expense: number }>();
    unifiedTransactions.forEach(t => {
      const dateKey = format(parseISO(t.date), 'dd MMM', { locale: tr });
      if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { income: 0, expense: 0 });
      const entry = dailyMap.get(dateKey)!;
      if (t.amount > 0 && t.originalType !== 'transfer_in') entry.income += t.amount;
      else if (t.amount < 0 && t.originalType !== 'transfer_out') entry.expense += Math.abs(t.amount);
    });

    const dailyTrend = Array.from(dailyMap.entries()).map(([date, val]) => ({
      date,
      income: val.income,
      expense: val.expense,
      net: val.income - val.expense
    })).reverse();

    const expenseMap = new Map<string, number>();
    unifiedTransactions.filter(t => t.amount < 0 && t.originalType !== 'transfer_out').forEach(t => {
      const cat = t.expenseCategoryName || 'Genel / Diğer';
      expenseMap.set(cat, (expenseMap.get(cat) || 0) + Math.abs(t.amount));
    });
    const expenseByCategory = Array.from(expenseMap.entries()).map(([name, value]) => ({ name, value }));

    const salesCatMap = new Map<string, number>();
    sales.forEach(s => {
      s.items.forEach(item => {
        const prod = item.product_id ? productsMap.get(item.product_id) : null;
        const cat = prod?.main_category || 'Diğer';
        const totalItemPrice = item.sellingPrice * item.cartQuantity;
        const finalItemPrice = totalItemPrice * (s.net_total / s.total || 1);
        salesCatMap.set(cat, (salesCatMap.get(cat) || 0) + finalItemPrice);
      });
    });
    const salesByCategory = Array.from(salesCatMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { dailyTrend, expenseByCategory, salesByCategory };
  }, [unifiedTransactions, sales, productsMap]);


  const handleExportExcel = () => {
    if (filteredTransactions.length === 0 && sales.length === 0) {
      toast({ title: "Uyarı", description: "Dışa aktarılacak veri bulunamadı.", variant: "destructive" });
      return;
    }

    const wb = XLSX.utils.book_new();

    const summaryData = [
      ["Rapor Tarihi", `${startDate} - ${endDate}`],
      ["", ""],
      ["TOPLAM GELİR", totals.summaryIncome],
      ["TOPLAM GİDER", totals.summaryExpense],
      ["NET DURUM", totals.summaryBalance],
      ["", ""],
      ["Brüt Satış Kârı", totals.grossProfit],
      ["Net Faaliyet Kârı", totals.netProfit]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ozet");

    if (filteredTransactions.length > 0) {
      const txData = filteredTransactions.map(t => ({
        Tarih: formatReportDate(t.date),
        Hesap: t.accountName,
        Tip: t.originalType,
        Aciklama: t.description,
        Kategori: t.expenseCategoryName || '-',
        Gelir: t.amount > 0 ? t.amount : 0,
        Gider: t.amount < 0 ? Math.abs(t.amount) : 0
      }));
      const wsTx = XLSX.utils.json_to_sheet(txData);
      XLSX.utils.book_append_sheet(wb, wsTx, "Hesap Hareketleri");
    }

    if (topSellingProducts.length > 0) {
      const prodData = topSellingProducts.map(p => ({
        Kod: p.code,
        UrunAdi: p.name,
        Kategori: p.category,
        Adet: p.totalQuantitySold,
        Ciro: p.totalRevenueGenerated
      }));
      const wsProd = XLSX.utils.json_to_sheet(prodData);
      XLSX.utils.book_append_sheet(wb, wsProd, "Urun Satis Detayi");
    }

    const fileName = `Rapor_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({ title: "Başarılı", description: "Excel raporu indirildi." });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Hata", description: "Yazdırma penceresi açılamadı. Pop-up engelleyiciyi kontrol edin.", variant: "destructive" });
      return;
    }

    const title = getActiveFilterTitle();
    const dateRange = `${startDate ? format(parseISO(startDate), "dd.MM.yyyy") : '?'} - ${endDate ? format(parseISO(endDate), "dd.MM.yyyy") : '?'}`;

    let tableContent = '';

    if (filteredTransactions.length > 0) {
      tableContent = `
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-gray-100">
              <th class="border p-2 text-left">Tarih</th>
              <th class="border p-2 text-left">Hesap</th>
              <th class="border p-2 text-left">Açıklama</th>
              <th class="border p-2 text-left">Kategori</th>
              <th class="border p-2 text-right">Gelir</th>
              <th class="border p-2 text-right">Gider</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTransactions.map(t => {
        const income = t.amount > 0 ? formatCurrency(t.amount) : '-';
        const expense = t.amount < 0 ? formatCurrency(Math.abs(t.amount)) : '-';
        return `
                <tr>
                  <td class="border p-2">${formatReportDate(t.date)}</td>
                  <td class="border p-2">${t.accountName ?? '-'}</td>
                  <td class="border p-2">${t.description}</td>
                  <td class="border p-2">${t.expenseCategoryName ?? '-'}</td>
                  <td class="border p-2 text-right">${income}</td>
                  <td class="border p-2 text-right">${expense}</td>
                </tr>
              `;
      }).join('')}
          </tbody>
          <tfoot>
            <tr class="font-bold bg-gray-50">
              <td class="border p-2" colspan="4">TOPLAM</td>
              <td class="border p-2 text-right">${formatCurrency(filteredTransactions.reduce((acc, t) => acc + (t.amount > 0 ? t.amount : 0), 0))}</td>
              <td class="border p-2 text-right">${formatCurrency(filteredTransactions.reduce((acc, t) => acc + (t.amount < 0 ? Math.abs(t.amount) : 0), 0))}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else {
      tableContent = '<p class="text-center p-4">Bu tarih aralığında ve kriterlerde işlem bulunamadı.</p>';
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapor Yazdır</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .text-right { text-align: right; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="subtitle">${dateRange}</div>
        
        <div class="summary-section" style="display: flex; justify-content: space-between; margin-bottom: 20px; border: 1px solid #ddd; padding: 10px;">
          <div><strong>Toplam Gelir:</strong> ${formatCurrency(totals.summaryIncome)}₺</div>
          <div><strong>Toplam Gider:</strong> ${formatCurrency(totals.summaryExpense)}₺</div>
          <div><strong>Net Durum:</strong> ${formatCurrency(totals.summaryBalance)}₺</div>
        </div>

        ${tableContent}

        <div style="margin-top: 30px; text-align: right; font-size: 12px; color: #888;">
          Rapor Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };
  const getActiveFilterTitle = () => { switch (selectedSummaryFilter) { case 'summaryIncome': return 'Toplam Gelir Detayları'; case 'summaryExpense': return 'Toplam Gider Detayları'; case 'totalRevenue': return 'Satış Geliri Detayları'; case 'operatingExpenses': return 'Faaliyet Giderleri Detayları'; case 'otherIncome': return 'Diğer Gelirler Detayları'; default: return `İşlem Geçmişi (${selectedAccountFilter === 'all' ? 'Tüm Hesaplar' : accounts.find(a => a.id === selectedAccountFilter)?.name ?? 'Nakit Kasa'} / ${selectedCategoryFilter === 'all' ? 'Tüm Gider Kat.' : expenseCategories.find(c => c.id === selectedCategoryFilter)?.name})`; } };

  return (
    <div className="h-full p-2 sm:p-4 animate-in fade-in duration-300 print:p-0">
      <div className="glass-panel rounded-xl h-full flex flex-col border border-white/10 shadow-2xl overflow-hidden">
        <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center flex-shrink-0 backdrop-blur-md print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-400" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Finansal Raporlar & Analiz</h1>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-red-500/20 hover:text-red-400 h-8 w-8 rounded-lg transition-colors" onClick={onClose} disabled={isLoading}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 sm:p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap print:hidden glass-card p-4 border border-white/10">
                <div className="space-y-1.5">
                  <Label htmlFor="report-start-date" className="text-xs font-medium text-gray-400">Başlangıç</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <input id="report-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-9 bg-white/5 border border-white/10 rounded-md p-1.5 h-9 text-xs text-white focus:border-blue-500/50 focus:outline-none" disabled={isLoading} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="report-end-date" className="text-xs font-medium text-gray-400">Bitiş</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <input id="report-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="w-full pl-9 bg-white/5 border border-white/10 rounded-md p-1.5 h-9 text-xs text-white focus:border-blue-500/50 focus:outline-none" disabled={isLoading} />
                  </div>
                </div>
                <div className="flex-grow min-w-[140px] space-y-1.5">
                  <Label htmlFor="accountFilter" className="text-xs font-medium text-gray-400">Hesap</Label>
                  <Select value={selectedAccountFilter} onValueChange={setSelectedAccountFilter} disabled={isLoading}>
                    <SelectTrigger id="accountFilter" className="h-9 text-xs bg-white/5 border-white/10 text-white focus:ring-blue-500/50">
                      <ListFilter className="h-3.5 w-3.5 mr-2 text-gray-400 flex-shrink-0" />
                      <SelectValue placeholder="Tümü" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-800 text-white">
                      <SelectItem value="all" className="focus:bg-gray-800 focus:text-white">Tüm Hesaplar</SelectItem>
                      <SelectItem value="cash" className="focus:bg-gray-800 focus:text-white">Nakit Kasa</SelectItem>
                      {accounts.filter(acc => acc.type !== 'cash').map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="focus:bg-gray-800 focus:text-white">{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-grow min-w-[140px] space-y-1.5">
                  <Label htmlFor="categoryFilter" className="text-xs font-medium text-gray-400">Gider Kat.</Label>
                  <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter} disabled={isLoading}>
                    <SelectTrigger id="categoryFilter" className="h-9 text-xs bg-white/5 border-white/10 text-white focus:ring-blue-500/50">
                      <Tag className="h-3.5 w-3.5 mr-2 text-gray-400 flex-shrink-0" />
                      <SelectValue placeholder="Tümü" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-800 text-white">
                      <SelectItem value="all" className="focus:bg-gray-800 focus:text-white">Tüm Kategoriler</SelectItem>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="focus:bg-gray-800 focus:text-white">{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pt-1">
                  <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-9 px-3 text-xs" onClick={handlePrint} disabled={isLoading || !!error}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" />Yazdır
                  </Button>
                  <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-9 px-3 text-xs" onClick={handleExportExcel} disabled={isLoading || !!error}>
                    <FileDown className="mr-1.5 h-3.5 w-3.5" />Excel
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" onClick={() => setShowCharts(!showCharts)}>
                    {showCharts ? "Grafikleri Gizle" : "Grafikleri Göster"}
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                  <p className="ml-4 text-gray-400">Rapor verileri yükleniyor...</p>
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="font-bold">Hata:</span> {error}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">
                    <SummaryBox title="Toplam Gelir" value={totals.summaryIncome} currency="₺" description="(Hesap Girişleri)" filterType="summaryIncome" activeFilter={selectedSummaryFilter} onClick={setSelectedSummaryFilter} icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} color="text-emerald-400" />
                    <SummaryBox title="Toplam Gider" value={totals.summaryExpense} currency="₺" description="(Hesap Çıkışları)" filterType="summaryExpense" activeFilter={selectedSummaryFilter} onClick={setSelectedSummaryFilter} icon={<TrendingDown className="h-5 w-5 text-red-400" />} color="text-red-400" />
                    <SummaryBox title="Net Değişim" value={totals.summaryBalance} currency="₺" description="(Gelir - Gider)" filterType="all" activeFilter={selectedSummaryFilter} onClick={setSelectedSummaryFilter} icon={<BadgeDollarSign className="h-5 w-5 text-blue-400" />} color="text-blue-400" />
                    <SummaryBox title="Gelir - SMM" value={totals.summaryIncome - totals.costOfGoodsSold} currency="₺" description="(Tüm Gelirler - Mal Maly.)" filterType={null} activeFilter={selectedSummaryFilter} onClick={() => { }} icon={<MinusCircle className="h-5 w-5 text-orange-400" />} color="text-orange-400" />
                    <SummaryBox title="Brüt Satış Kârı" value={totals.grossProfit} currency="₺" description="Satış Geliri - SMM" filterType={null} activeFilter={selectedSummaryFilter} onClick={() => { }} icon={<PieChart className="h-5 w-5 text-teal-400" />} color="text-teal-400" />
                    <SummaryBox title="Net Kâr (Faaliyet)" value={totals.netProfit} currency="₺" description="Brüt Kâr + Diğ.Gelir - Gider" filterType={null} activeFilter={selectedSummaryFilter} onClick={() => { }} icon={<CircleDollarSign className="h-5 w-5 text-purple-400" />} color="text-purple-400" />
                    <SummaryBox title="SMM" value={totals.costOfGoodsSold} currency="₺" description="Satılan Malın Maliyeti" filterType={null} activeFilter={selectedSummaryFilter} onClick={() => { }} icon={<CircleDollarSign className="h-5 w-5 text-gray-400" />} color="text-gray-400" />
                  </div>

                  {/* GRAFİKLER */}
                  {showCharts && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      <ReportCharts
                        dailyTrend={chartData.dailyTrend}
                        expenseByCategory={chartData.expenseByCategory}
                        salesByCategory={chartData.salesByCategory}
                      />
                    </div>
                  )}

                  {/* Hesap Bakiyeleri */}
                  <details className="glass-card p-4 border border-white/10 group print:hidden" open>
                    <summary className="font-bold text-sm sm:text-base cursor-pointer group-open:mb-4 list-none flex items-center text-white">
                      <span className="mr-2 transition-transform group-open:rotate-90">▶</span> Güncel Hesap Durumları
                    </summary>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm pl-4">
                      {accounts.sort((a, b) => {
                        const typeOrder = { cash: 1, bank: 2, pos: 3, credit_card: 4, other: 5 };
                        const typeComparison = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
                        if (typeComparison !== 0) return typeComparison;
                        return a.name.localeCompare(b.name, 'tr');
                      }).map((acc) => {
                        const isCreditCard = acc.type === 'credit_card';
                        const currentBalanceOrDebt = acc.current_balance ?? 0;
                        const creditLimit = acc.credit_limit ?? 0;
                        const availableLimit = isCreditCard ? creditLimit - currentBalanceOrDebt : null;

                        return (
                          <div key={acc.id} className="border border-white/10 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center font-medium mb-2 text-gray-200">
                              {getAccountIcon(acc.type)}
                              <span>{acc.name}</span>
                              {acc.is_default && <span className="text-[10px] italic ml-1 text-blue-400">(Vars.)</span>}
                            </div>
                            {isCreditCard ? (
                              <div className="text-xs space-y-1 text-gray-400">
                                <div className="flex justify-between"><span>Limit:</span> <span className="text-gray-300">{formatCurrency(creditLimit)}₺</span></div>
                                <div className="flex justify-between"><span className="text-red-400">Borç:</span> <span className="text-red-400 font-semibold">{formatCurrency(currentBalanceOrDebt)}₺</span></div>
                                <div className="flex justify-between border-t border-white/10 mt-1 pt-1"><span>Knl. Limit:</span> <span className={cn("font-semibold", availableLimit !== null && availableLimit < 0 ? 'text-orange-400' : 'text-emerald-400')}>{availableLimit !== null ? formatCurrency(availableLimit) : '-'}₺</span></div>
                              </div>
                            ) : (
                              <div className="flex justify-between text-xs text-gray-400">
                                <span>Bakiye:</span>
                                <span className={`font-semibold ${currentBalanceOrDebt < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatCurrency(currentBalanceOrDebt)}₺</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {!isLoading && accounts.length === 0 && (
                        <p className="text-sm text-gray-500 col-span-full">Hesap bulunamadı.</p>
                      )}
                    </div>
                  </details>

                  {/* En Çok Satılan Ürünler */}
                  <div className="mt-6 glass-card p-4 border border-white/10">
                    <h3 className="text-lg font-bold mb-4 flex items-center text-white">
                      <Star className="h-5 w-5 mr-2 text-yellow-400" /> En Çok Satılan Ürünler ({startDate ? format(parseISO(startDate), "dd.MM") : '?'}-{endDate ? format(parseISO(endDate), "dd.MM") : '?'})
                    </h3>
                    <div className="bg-black/20 rounded-lg overflow-hidden border border-white/5 max-h-[400px] overflow-y-auto">
                      <table className="w-full text-xs sm:text-sm table-fixed">
                        <thead className="bg-white/5 text-gray-300 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="px-3 py-2 text-left w-[15%] font-medium">Kod</th>
                            <th className="px-3 py-2 text-left w-[30%] font-medium">Ürün Adı</th>
                            <th className="px-3 py-2 text-left w-[15%] font-medium">Kategori</th>
                            <th className="px-3 py-2 text-right w-[20%] font-medium">Toplam Satış Adedi</th>
                            <th className="px-3 py-2 text-right w-[20%] font-medium">Toplam Ciro (Net)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {topSellingProducts.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-gray-500">Belirtilen tarih aralığında satış bulunamadı.</td>
                            </tr>
                          ) : (
                            topSellingProducts.slice(0, 20).map((product) => (
                              <tr key={product.productId || product.name} className="hover:bg-white/5 transition-colors text-gray-300">
                                <td className="px-3 py-2 truncate font-mono text-xs">{product.code}</td>
                                <td className="px-3 py-2 truncate">{product.name}</td>
                                <td className="px-3 py-2 truncate text-gray-500 text-xs">{product.category}</td>
                                <td className="px-3 py-2 text-right font-medium text-emerald-400">{product.totalQuantitySold}</td>
                                <td className="px-3 py-2 text-right font-semibold text-blue-400">{formatCurrency(product.totalRevenueGenerated)}₺</td>
                              </tr>
                            ))
                          )}
                          {topSellingProducts.length > 20 && (
                            <tr>
                              <td colSpan={5} className="p-2 text-center text-xs text-gray-500 italic">... ve daha fazla ürün</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* İşlem Tablosu */}
                  <div className="mt-6 glass-card p-4 border border-white/10">
                    <h3 className="text-lg font-bold mb-2 text-white">{getActiveFilterTitle()}</h3>
                    {selectedSummaryFilter !== 'all' && (
                      <Button variant="link" size="sm" className="mb-2 text-xs h-auto p-0 text-blue-400 hover:text-blue-300 hover:no-underline" onClick={() => setSelectedSummaryFilter('all')}>
                        <ListFilter className="h-3 w-3 mr-1" /> Tüm İşlemleri Göster
                      </Button>
                    )}
                    <div className="bg-black/20 rounded-lg overflow-hidden border border-white/5 max-h-[500px] overflow-y-auto">
                      <table className="w-full text-xs sm:text-sm table-fixed">
                        <thead className="bg-white/5 text-gray-300 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="px-3 py-2 text-left w-[130px] font-medium">Tarih</th>
                            <th className="px-3 py-2 text-left w-[150px] font-medium">Kaynak/Hesap</th>
                            <th className="px-3 py-2 text-left w-auto font-medium">Açıklama</th>
                            <th className="px-3 py-2 text-left w-[120px] font-medium">Kategori</th>
                            <th className="px-3 py-2 text-right w-[90px] font-medium">Gelir</th>
                            <th className="px-3 py-2 text-right w-[90px] font-medium">Gider</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                {selectedSummaryFilter !== 'all' ? 'Bu filtreye uygun işlem bulunamadı.' : 'Seçilen kriterlere uygun işlem bulunamadı.'}
                              </td>
                            </tr>
                          ) : (
                            filteredTransactions.map((transaction) => {
                              const displayIncome = transaction.amount > 0;
                              const displayExpense = transaction.amount < 0;
                              return (
                                <tr key={transaction.id + transaction.source} className="hover:bg-white/5 transition-colors text-gray-300">
                                  <td className="px-3 py-2 whitespace-nowrap text-gray-400">{formatReportDate(transaction.date)}</td>
                                  <td className="px-3 py-2 truncate">{transaction.accountName ?? "Nakit Kasa"}</td>
                                  <td className="px-3 py-2 truncate" title={transaction.description}>{transaction.description}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    {transaction.expenseCategoryName ? (
                                      <span className="inline-flex items-center bg-white/10 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/5">
                                        <Tag className="h-2.5 w-2.5 mr-1" />{transaction.expenseCategoryName}
                                      </span>
                                    ) : ("-")}
                                  </td>
                                  <td className={`px-3 py-2 text-right font-mono ${displayIncome ? "text-emerald-400" : "text-gray-600"}`}>
                                    {displayIncome ? formatCurrency(transaction.amount) : "-"}
                                  </td>
                                  <td className={`px-3 py-2 text-right font-mono ${displayExpense ? "text-red-400" : "text-gray-600"}`}>
                                    {displayExpense ? formatCurrency(Math.abs(transaction.amount)) : "-"}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;
// --- END OF FILE src/components/ReportsModule.tsx ---