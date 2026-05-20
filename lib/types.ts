export interface Session {
  id: string;
  created_at: string;
  status: 'open' | 'calculated';
  restaurant_name: string | null;
  currency: string;
  total: number | null;
}

export interface SessionItem {
  id: string;
  session_id: string;
  name: string;
  price: number;
  shared: boolean;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  created_at: string;
}

export interface ItemClaim {
  id: string;
  item_id: string;
  participant_id: string;
  session_id: string;
}

export interface SessionData {
  session: Session;
  items: SessionItem[];
  participants: Participant[];
  claims: ItemClaim[];
}

export interface ParsedBill {
  restaurant_name: string | null;
  currency: string;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  total: number;
}

export interface CalculationResult {
  participant_id: string;
  name: string;
  line_items: { item_name: string; amount: number }[];
  subtotal: number;
  shared_cost: number;
  total: number;
}

export type OcrProvider = 'claude' | 'gemini' | 'local';
