export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          pdf_path: string | null
          status: "pending" | "paid" | "failed" | null
          updated_at: string | null
          user_id: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          pdf_path?: string | null
          status?: "pending" | "paid" | "failed" | null
          updated_at?: string | null
          user_id: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          pdf_path?: string | null
          status?: "pending" | "paid" | "failed" | null
          updated_at?: string | null
          user_id?: string
          vendor_id?: string
        }
      }
      users: {
        Row: {
          business_name: string | null
          created_at: string | null
          gstin: string | null
          id: string
          phone: string
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          phone: string
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          phone?: string
          updated_at?: string | null
        }
      }
      vendors: {
        Row: {
          bank_account: string | null
          category_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
          upi_id: string | null
          user_id: string
        }
        Insert: {
          bank_account?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
          upi_id?: string | null
          user_id: string
        }
        Update: {
          bank_account?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          upi_id?: string | null
          user_id?: string
        }
      }
      vendor_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
      }
    }
    Enums: {
      invoice_status: "pending" | "paid" | "failed"
      payment_method: "card" | "upi"
      payment_status: "initiated" | "succeeded" | "failed"
    }
  }
}
