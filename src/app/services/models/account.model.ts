export interface Account {
    id: number;
    user_id: number;
    balance: string;
    account_number: string;
    created_at: string;
    account_type: string;
    displayName?: string; 
    formattedType?: string;
    numericBalance?: number;
}