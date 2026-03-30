export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          payout_method: 'stripe' | 'amazon_gift_card' | 'cashapp' | null
          payout_destination: string | null
          stripe_account_id: string | null
          cashback_rate: number
          annual_cash_payout_cents: number
          w9_on_file: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          payout_method?: 'stripe' | 'amazon_gift_card' | 'cashapp' | null
          payout_destination?: string | null
          stripe_account_id?: string | null
          cashback_rate?: number
          annual_cash_payout_cents?: number
          w9_on_file?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          payout_method?: 'stripe' | 'amazon_gift_card' | 'cashapp' | null
          payout_destination?: string | null
          stripe_account_id?: string | null
          cashback_rate?: number
          annual_cash_payout_cents?: number
          w9_on_file?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string | null
          session_token: string | null
          product_name: string
          product_category: string | null
          retailer: string
          product_url: string
          affiliate_url: string
          price_cents: number
          commission_rate: number
          commission_cents: number
          processing_fee_cents: number
          user_payout_cents: number
          purchaser_payout_cents: number | null
          style_source_payout_cents: number | null
          style_source_user_id: string | null
          status: 'pending' | 'confirmed' | 'paid' | 'failed'
          link_clicked_at: string
          confirmed_at: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_token?: string | null
          product_name: string
          product_category?: string | null
          retailer: string
          product_url: string
          affiliate_url: string
          price_cents: number
          commission_rate: number
          commission_cents: number
          processing_fee_cents?: number
          user_payout_cents: number
          purchaser_payout_cents?: number | null
          style_source_payout_cents?: number | null
          style_source_user_id?: string | null
          status?: 'pending' | 'confirmed' | 'paid' | 'failed'
          link_clicked_at?: string
          confirmed_at?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_token?: string | null
          product_name?: string
          product_category?: string | null
          retailer?: string
          product_url?: string
          affiliate_url?: string
          price_cents?: number
          commission_rate?: number
          commission_cents?: number
          processing_fee_cents?: number
          user_payout_cents?: number
          purchaser_payout_cents?: number | null
          style_source_payout_cents?: number | null
          style_source_user_id?: string | null
          status?: 'pending' | 'confirmed' | 'paid' | 'failed'
          link_clicked_at?: string
          confirmed_at?: string | null
          paid_at?: string | null
          created_at?: string
        }
      }
      payouts: {
        Row: {
          id: string
          user_id: string
          transaction_id: string | null
          amount_cents: number
          method: 'stripe' | 'amazon_gift_card' | 'cashapp'
          status: 'pending' | 'processing' | 'completed' | 'failed'
          stripe_transfer_id: string | null
          cashapp_payment_id: string | null
          amazon_claim_code: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          transaction_id?: string | null
          amount_cents: number
          method: 'stripe' | 'amazon_gift_card' | 'cashapp'
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          stripe_transfer_id?: string | null
          cashapp_payment_id?: string | null
          amazon_claim_code?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          transaction_id?: string | null
          amount_cents?: number
          method?: 'stripe' | 'amazon_gift_card' | 'cashapp'
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          stripe_transfer_id?: string | null
          cashapp_payment_id?: string | null
          amazon_claim_code?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      audit_log: {
        Row: {
          id: string
          event_type: string
          user_id: string | null
          related_id: string | null
          metadata: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          user_id?: string | null
          related_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          user_id?: string | null
          related_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
