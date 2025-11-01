// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getUserData(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

export async function getResources() {
  const { data, error } = await supabase.from("resources").select();
  if (error || !data) {
    return [];
  }
  return data;
}

export async function getReservations() {
  const { data, error } = await supabase.from("reservations").select();
  if (error || !data) {
    return [];
  }
  return data;
}
