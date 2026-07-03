"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

type NameDataColumn = "history" | "saved";
type NameDataInsert = Database["public"]["Tables"]["user_name_data"]["Insert"];

export async function loadNameDataColumn(
  supabase: SupabaseClient<Database>,
  userId: string,
  column: NameDataColumn,
): Promise<unknown> {
  const { data, error } = await supabase
    .from("user_name_data")
    .select(column)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const row = data as Record<NameDataColumn, unknown> | null;
  return row?.[column];
}

export async function saveNameDataColumn(
  supabase: SupabaseClient<Database>,
  userId: string,
  column: NameDataColumn,
  value: unknown,
): Promise<void> {
  const payload = {
    user_id: userId,
    [column]: value as Json,
    updated_at: new Date().toISOString(),
  } as NameDataInsert;

  const { error } = await supabase
    .from("user_name_data")
    .upsert(payload, { onConflict: "user_id" });

  if (error) throw error;
}
