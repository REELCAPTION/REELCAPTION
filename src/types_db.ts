// src/types_db.ts <-- Ensure this file exists in your project (e.g., in the src/ folder)

// Standard JSON type definition used by Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// The main Database interface
export interface Database {
  public: {
    Tables: {
      // Definition for the 'user_profiles' table
      user_profiles: {
        Row: { // The shape of data as it exists in the database
          id: string // uuid, primary key, references auth.users
          email: string // text, not null
          credits: number // integer, default 20, check >= 0
          name: string | null // text, nullable
          country: string | null // text, nullable
          created_at: string // timestamp with time zone, default now(), not null
        }
        Insert: { // The shape of data required for inserting a new row
          id: string // uuid, must provide the user's auth.users id
          email: string // text, must provide email
          credits?: number | null // integer, optional (has default), nullable allowed by DB? (Default makes it non-null after insert)
          name?: string | null // text, optional
          country?: string | null // text, optional
          created_at?: string | null // timestamp, optional (has default)
        }
        Update: { // The shape of data allowed for updating a row (all fields optional)
          id?: string // uuid, primary key - typically not updated directly
          email?: string | null // text
          credits?: number | null // integer
          name?: string | null // text
          country?: string | null // text
          created_at?: string | null // timestamp
        }
        Relationships: [
          {
            // Relationship linking user_profiles.id to auth.users.id
            foreignKeyName: "user_profiles_id_fkey" // Constraint name might vary slightly
            columns: ["id"]
            isOneToOne: true // Typically one-to-one with auth.users
            referencedRelation: "users" // Referenced table in auth schema
            referencedColumns: ["id"]
          }
        ]
      }
      // Definition for the 'payments' table
      payments: {
        Row: { // The shape of data as it exists in the database
          id: string // uuid, primary key, default uuid_generate_v4()
          user_id: string // uuid, not null, references user_profiles
          provider: string // text, not null
          amount: number // integer, not null (e.g., cents)
          credits_added: number // integer, not null, check > 0
          status: string // text, not null (e.g., 'succeeded', 'pending')
          provider_payment_id: string | null // text, nullable (e.g., Stripe Charge ID)
          created_at: string // timestamp with time zone, default now(), not null
        }
        Insert: { // The shape of data required for inserting a new row
          id?: string | null // uuid, optional (has default)
          user_id: string // uuid, must provide the user profile ID
          provider: string // text, required
          amount: number // integer, required
          credits_added: number // integer, required
          status: string // text, required
          provider_payment_id?: string | null // text, optional
          created_at?: string | null // timestamp, optional (has default)
        }
        Update: { // The shape of data allowed for updating a row (all fields optional)
          id?: string // uuid, primary key - typically not updated
          user_id?: string | null // uuid
          provider?: string | null // text
          amount?: number | null // integer
          credits_added?: number | null // integer
          status?: string | null // text
          provider_payment_id?: string | null // text
          created_at?: string | null // timestamp
        }
        Relationships: [
          {
            // Relationship linking payments.user_id to user_profiles.id
            foreignKeyName: "payments_user_id_fkey" // Constraint name might vary slightly
            columns: ["user_id"]
            isOneToOne: false // One profile can have many payments
            referencedRelation: "user_profiles" // Referenced table
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: { // Placeholder for any views you might create
      [_ in never]: never
    }
    Functions: { // Definition for the trigger function (less critical for client-side typing but often included)
      handle_new_user: {
        Args: Record<string, unknown> // Triggers don't usually take direct args via RPC
        Returns: Record<string, unknown> // Returns TRIGGER type, simplified here
      }
      // Add other RPC functions here if you create them
    }
    Enums: { // Placeholder for any enums you might create
      [_ in never]: never
    }
    CompositeTypes: { // Placeholder for composite types
      [_ in never]: never
    }
  }
}

// Optional: Define PublicSchema and Table types for convenience
export type PublicSchema = Database[Extract<keyof Database, "public">]
export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
    > = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
        ? R
        : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
        ? (PublicSchema["Tables"] &
            PublicSchema["Views"])[PublicTableNameOrOptions] extends {
                Row: infer R
            }
            ? R
            : never
        : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
    > = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
            Insert: infer I
        }
        ? I
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
        ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
            Insert: infer I
        }
        ? I
        : never
        : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
    > = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
            Update: infer U
        }
        ? U
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
        ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
            Update: infer U
        }
        ? U
        : never
        : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
    > = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
        ? PublicSchema["Enums"][PublicEnumNameOrOptions]
        : never