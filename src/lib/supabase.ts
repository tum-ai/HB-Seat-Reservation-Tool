// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getUserData(userId: string) {
  const { data, error } = await supabase.rpc("get_user_data", {
    user_id: userId,
  });

  if (error || !data || data.length === 0) {
    return null;
  }
  return data[0];
}

export async function getResources() {
  const { data, error } = await supabase.rpc("get_resources");

  if (error || !data) {
    return [];
  }
  return data;
}

export async function getReservations() {
  const { data, error } = await supabase.rpc("get_reservations");

  if (error || !data) {
    return [];
  }
  return data;
}
