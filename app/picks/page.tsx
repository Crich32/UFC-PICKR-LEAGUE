"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ================= TYPES ================= */

type EventRow = {
  id: string;
  name: string;
  is_locked: boolean;
  event_date: string;
};

type FightRow = {
  id: string;
  fighter_red: string;
  fighter_blue: string;
  fight_order: number;
  event: EventRow | null;
};

type PicksMap = Record<string, string>;
type AllPicksMap = Record<string, Record<string, string[]>>;

/* ================= PAGE ================= */

export default function PicksPage() {
  const [user, setUser] = useState<any>(null);
  const [fights, setFights] = useState<FightRow[]>([]);
  const [picks, setPicks] = useState<PicksMap>({});
  const [allPicks, setAllPicks] = useState<AllPicksMap>({});
  const [loading, setLoading] = useState(true);

  /* ============ LOAD DATA ============ */

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      /* ---- LOAD FIGHTS + EVENT ---- */
      const { data: fightData } = await supabase
        .from("fights")
        .select(
          `
          id,
          fighter_red,
          fighter_blue,
          fight_order,
          event:events (
            id,
            name,
            is_locked,
            event_date
          )
        `
        )
        .order("event_date", { foreignTable: "events", ascending: false })
        .order("fight_order", { ascending: true });

      setFights((fightData as any) ?? []);

      /* ---- USER PICKS ---- */
      const { data: userPicks } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter")
        .eq("user_id", user.id);

      const pickMap: PicksMap = {};
      userPicks?.forEach((p) => {
        pickMap[p.fight_id] = p.picked_fighter;
      });
      setPicks(pickMap);

      /* ---- ALL PICKS ---- */
      const { data: all } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter, profiles(username)");

      const grouped: AllPicksMap = {};
      all?.forEach((p: any) => {
        if (!grouped[p.fight_id]) grouped[p.fight_id] = {};
        if (!grouped[p.fight_id][p.picked_fighter])
          grouped[p.fight_id][p.picked_fighter] = [];
        if (p.profiles?.username)
          grouped[p.fight_id][p.picked_fighter].push(p.profiles.username);
      });

      setAllPicks(grouped);
      setLoading(false);
    }

    load();
  }, []);

  /* ============ PICK HANDLER ============ */

  async function handlePick(fightId: string, fighter: string) {
    if (!user) return;

    setPicks((prev) => ({ ...prev, [fightId]: fighter }));

    await supabase.from("picks").upsert(
      {
        user_id: user.id,
        fight_id: fightId,
        picked_fighter: fighter,
      },
      { onConflict: "user_id,fight_id" }
    );
  }

  /* ============ STATES ============ */

  if (loading) return <main style={{ padding: 40 }}>Loading…</main>;
  if (!user) return <main style={{ padding: 40 }}>Please sign in</main>;

  /* ============ GROUP BY EVENT ============ */

  const fightsByEvent = fights.reduce<Record<string, FightRow[]>>((acc, fight) => {
    const eventName = fight.event?.name ?? "Unknown Event";
    if (!acc[eventName]) acc[eventName] = [];
    acc[eventName].push(fight);
    return acc;
  }, {});

  /* ============ UI ============ */

  return (
    <main style={{ padding: 20 }}>
      <h1>Fight Card</h1>

      {Object.entries(fightsByEvent).map(([eventName, eventFights]) => {
        const event = eventFights[0].event;
        const locked = event?.is_locked ?? false;

        return (
          <details
            key={eventName}
            open={!locked}
            style={{
              border: "1px solid #333",
              borderRadius: 8,
              marginBottom: 20,
              padding: 10,
            }}
          >
            <summary
              style={{
                fontWeight: "bold",
                fontSize: 18,
                cursor: "pointer",
                listStyle: "none",
              }}
            >
              {eventName} {locked && "🔒"}
            </summary>

            {eventFights.map((fight) => (
              <div
                key={fight.id}
                style={{
                  borderTop: "1px solid #333",
                  paddingTop: 12,
                  marginTop: 12,
                }}
              >
                <p style={{ fontWeight: "bold" }}>
                  {fight.fighter_red} vs {fight.fighter_blue}
                </p>

                {/* RED */}
                <button
                  disabled={locked}
                  onClick={() => handlePick(fight.id, fight.fighter_red)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginBottom: 8,
                    padding: "10px",
                    background:
                      picks[fight.id] === fight.fighter_red
                        ? "green"
                        : "#222",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                  }}
                >
                  Pick {fight.fighter_red}
                </button>

                {allPicks[fight.id]?.[fight.fighter_red]?.length > 0 && (
                  <div style={{ fontSize: 12, color: "#aaa" }}>
                    Picked by:{" "}
                    {allPicks[fight.id][fight.fighter_red].join(", ")}
                  </div>
                )}

                {/* BLUE */}
                <button
                  disabled={locked}
                  onClick={() => handlePick(fight.id, fight.fighter_blue)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 8,
                    padding: "10px",
                    background:
                      picks[fight.id] === fight.fighter_blue
                        ? "green"
                        : "#222",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                  }}
                >
                  Pick {fight.fighter_blue}
                </button>

                {allPicks[fight.id]?.[fight.fighter_blue]?.length > 0 && (
                  <div style={{ fontSize: 12, color: "#aaa" }}>
                    Picked by:{" "}
                    {allPicks[fight.id][fight.fighter_blue].join(", ")}
                  </div>
                )}
              </div>
            ))}
          </details>
        );
      })}
    </main>
  );
}

