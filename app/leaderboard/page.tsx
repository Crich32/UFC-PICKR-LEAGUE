// Leaderboard page using Next.js (App Router) + Supabase
// Shows global rankings by total points

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LeaderboardRow = {
  user_id: string;
  username: string;
  total_points: number;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    setLoading(true);

    const { data, error } = await supabase
      .from("leaderboard")
      .select("user_id, username, total_points")
      .order("total_points", { ascending: false });

    if (!error && data) {
      setRows(data);
    }

    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">🏆 Global Leaderboard</h1>

      {loading ? (
        <p className="text-center">Loading leaderboard…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border rounded-xl overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Rank</th>
                <th className="p-3 text-left">Username</th>
                <th className="p-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.user_id} className="border-t">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3 font-medium">{row.username}</td>
                  <td className="p-3 text-right">{row.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/*
===========================
SUPABASE TABLES (SQL)
===========================

-- Users profile table
create table profiles (
  id uuid references auth.users on delete cascade,
  username text unique not null,
  primary key (id)
);

-- Picks table (1 row per fight pick)
create table picks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  fight_id uuid,
  picked_fighter text,
  is_correct boolean default false
);

-- Leaderboard view (auto-updating)
create view leaderboard as
select
  p.id as user_id,
  p.username,
  coalesce(sum(case when k.is_correct then 1 else 0 end), 0) as total_points
from profiles p
left join picks k on k.user_id = p.id
group by p.id, p.username;

*/

