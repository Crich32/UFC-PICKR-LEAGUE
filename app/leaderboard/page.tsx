"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LeaderboardRow = {
  user_id: string;
  username: string;
  total_picks: number;
  correct_picks: number;
  correct_percentage: number;
};

type SortKey =
  | "rank"
  | "username"
  | "correct_picks"
  | "total_picks"
  | "correct_percentage";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>("correct_picks");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    setLoading(true);

    const { data, error } = await supabase
      .from("leaderboard")
      .select(
        "user_id, username, total_picks, correct_picks, correct_percentage"
      );

    if (!error && data) {
      setRows(data);
    } else {
      console.error(error);
    }

    setLoading(false);
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedRows = useMemo(() => {
    const copy = [...rows];

    copy.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortKey === "rank") {
        aVal = a.correct_picks;
        bVal = b.correct_picks;
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }

      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return copy;
  }, [rows, sortKey, sortDir]);

  function RankCell({ rank }: { rank: number }) {
    if (rank === 1) return <span title="1st">🥇</span>;
    if (rank === 2) return <span title="2nd">🥈</span>;
    if (rank === 3) return <span title="3rd">🥉</span>;
    return <span>{rank}</span>;
  }

  function SortHeader({
    label,
    column,
    align = "text-left",
  }: {
    label: string;
    column: SortKey;
    align?: string;
  }) {
    const active = sortKey === column;

    return (
      <th
        onClick={() => toggleSort(column)}
        className={`p-3 cursor-pointer select-none ${align} text-black`}
      >
        {label}
        {active && (sortDir === "asc" ? " ▲" : " ▼")}
      </th>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">
        🏆 Global Leaderboard
      </h1>

      {loading ? (
        <p className="text-center">Loading leaderboard…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border rounded-xl overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <SortHeader label="Rank" column="rank" />
                <SortHeader label="Username" column="username" />
                <SortHeader
                  label="Correct"
                  column="correct_picks"
                  align="text-center"
                />
                <SortHeader
                  label="Total"
                  column="total_picks"
                  align="text-center"
                />
                <SortHeader
                  label="%"
                  column="correct_percentage"
                  align="text-center"
                />
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((row, index) => {
                const isTop3 = index < 3;

                return (
                  <tr
                    key={row.user_id}
                    className={`border-t ${
                      index === 0
                        ? "bg-yellow-50"
                        : index === 1
                        ? "bg-gray-100"
                        : index === 2
                        ? "bg-orange-50"
                        : ""
                    } ${isTop3 ? "text-black" : ""}`}
                  >
                    <td className="p-3 text-lg font-semibold">
                      <RankCell rank={index + 1} />
                    </td>
                    <td className="p-3 font-medium">{row.username}</td>
                    <td className="p-3 text-center">
                      {row.correct_picks}
                    </td>
                    <td className="p-3 text-center">
                      {row.total_picks}
                    </td>
                    <td className="p-3 text-center">
                      {row.correct_percentage}%
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No picks yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

