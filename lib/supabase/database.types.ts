export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserNameDataRow = {
  user_id: string;
  history: Json;
  saved: Json;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  username: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageDailyRow = {
  subject: string;
  day: string;
  count: number;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      user_name_data: {
        Row: UserNameDataRow;
        Insert: {
          user_id: string;
          history?: Json;
          saved?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          history?: Json;
          saved?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          username: string;
          plan?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          plan?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      usage_daily: {
        Row: UsageDailyRow;
        Insert: {
          subject: string;
          day?: string;
          count?: number;
          updated_at?: string;
        };
        Update: {
          subject?: string;
          day?: string;
          count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      username_available: {
        Args: { candidate: string };
        Returns: boolean;
      };
      consume_quota: {
        Args: { p_subject: string; p_limit: number; p_units: number };
        Returns: { granted: number; used: number; quota_limit: number }[];
      };
      release_quota: {
        Args: { p_subject: string; p_units: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
