export interface Transaction {
  id: number;
  account_id: number;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
  
  // Дополнительные поля для UI
  formattedType?: string;
  formattedDate?: string;
  displayAmount?: string;
  isIncoming?: boolean;
  isOutgoing?: boolean;
  
  // Дополнительные поля, которые могут быть в ответе API
  recipient_name?: string;
  sender_name?: string;
  to_account_id?: number;
  from_account_id?: number;
}