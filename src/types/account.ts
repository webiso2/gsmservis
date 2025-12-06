// src/types/account.ts

export type AccountType = 'Kasa' | 'Banka' | 'Kart';

export interface Account {
  id: number | string; // API'den gelince string olabilir, şimdilik number kullanabiliriz
  name: string;
  type: AccountType;
  balance: number;
  currency: string; // Örneğin 'TRY', 'USD', 'EUR'
  createdAt?: Date; // İsteğe bağlı
  updatedAt?: Date; // İsteğe bağlı
}

export interface AccountTransaction {
    id: number | string;
    accountId: number | string; // Hangi hesaba ait olduğu
    type: 'Gelir' | 'Gider' | 'TransferGiden' | 'TransferGelen';
    amount: number;
    description: string;
    transactionDate: Date;
    relatedAccountId?: number | string; // Transfer ise diğer hesabın ID'si
    createdAt?: Date;
    updatedAt?: Date;
}