"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* =======================
   TYPES (MATCH SUPABASE)
======================= */

type EventRow = {
  name: string;
  is_locked: boolean;
};

type FightRow = {
  id: string;
  fighter_red: string;
  fighter_blue: string;
  fight_order: number;
  events: EventRow[]; // Supabase returns relations as arrays
};

type PicksMap = Record<string, string>;
type AllPicksMap = Record<string, Record<string, string[]>>;

/* =======================
   PAGE
======================= */

export default function PicksPage() {
  const [user, setUser] = useState<any>(null);
  const [fights, setFights] = useState<FightRow[]>([]);
  const [picks, setPicks] = useState<PicksMap>({});
  const [allPicks, setAllPicks] = useState<AllPicksMap>({});
  const [loading, setLoading] = useState(true);

  /* =======================
     LOAD DATA
  ======================= */

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      /* ---- LOAD FIGHTS + EVENTS ---- */
      const { data: fightsData, error } = await supabase
        .from("fights")
        .select(
          `
          id,
          fighter_red,
          fighter_blue,
          fight_order,
          events (
            name,
            is_locked
          )
        `
        )
        .order("fight_order", { ascending: true });

      if (error) {
        console.error("Fight load error:", error);
        setLoading(false);
        return;
      }

      setFights((fightsData ?? []) as FightRow[]);

      /* ---- USER PICKS ---- */
      const { data: picksData } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter")
        .eq("user_id", user.id);

      const pickMap: PicksMap = {};
      picksData?.forEach((p) => {
        pickMap[p.fight_id] = p.picked_fighter;
      });
      setPicks(pickMap);

      /* ---- ALL PICKS ---- */
      const { data: allPicksData } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter, profiles(username)");

      const grouped: AllPicksMap = {};
      allPicksData?.forEach((p: any) => {
        if (!grouped[p.fight_id]) grouped[p.fight_id] = {};
        if (!grouped[p.fight_id][p.picked_fighter]) {
          grouped[p.fight_id][p.picked_fighter] = [];
        }
        if (p.profiles?.username) {
          grouped[p.fight_id][p.picked_fighter].push(p.profiles.username);
        }
      });
      setAllPicks(grouped);

      setLoading(false);
    };

    load();
  }, []);

  /* =======================
     PICK HANDLER
  ======================= */

  const handlePick = async (fightId: string, fighter: string) => {
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
  };

  /* =======================
     STATES
  ======================= */

  if (loading) return <main style={{ padding: 40 }}>Loading…</main>;
  if (!user) return <main style={{ padding: 40 }}>Please sign in</main>;

  /* =======================
     GROUP BY EVENT
  ======================= */

  const fightsByEvent = fights.reduce<Record<string, FightRow[]>>(
    (acc, fight) => {
      const event = fight.events?.[0];
      const eventName = event?.name ?? "Unknown Event";

      if (!acc[eventName]) acc[eventName] = [];
      acc[eventName].push(fight);
      return acc;
    },
    {}
  );

  /* =======================
     UI
  ======================= */

  return (
    <main style={{ padding: 40 }}>
      <h1>Fight Card</h1>

      {Object.entries(fightsByEvent).map(([eventName, eventFights]) => {
        const event = eventFights[0].events?.[0];
        const locked = event?.is_locked ?? false;

        return (
          <details
            key={eventName}
            open={!locked}
            style={{
              border: "2px solid #555",
              borderRadius: 8,
              marginBottom: 20,
              padding: 12,
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 18,
                listStyle: "none",
              }}
            >
              {eventName} {locked && "🔒"}
            </summary>

            <div style={{ marginTop: 12 }}>
              {eventFights.map((fight) => (
                <div
                  key={fight.id}
                  style={{
                    border: "1px solid #444",
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <p>
                    <strong>{fight.fighter_red}</strong> vs{" "}
                    <strong>{fight.fighter_blue}</strong>
                  </p>

                  {/* RED */}
                  <button
                    onClick={() =>
                      handlePick(fight.id, fight.fighter_red)
                    }
                    disabled={locked}
                    style={{
                      marginRight: 10,
                      padding: "8px 12px",
                      background:
                        picks[fight.id] === fight.fighter_red
                          ? "green"
                          : "#222",
                      color: "white",
                      border: "none",
                      cursor: locked ? "not-allowed" : "pointer",
                      opacity: locked ? 0.5 : 1,
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
                    onClick={() =>
                      handlePick(fight.id, fight.fighter_blue)
                    }
                    disabled={locked}
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background:
                        picks[fight.id] === fight.fighter_blue
                          ? "green"
                          : "#222",
                      color: "white",
                      border: "none",
                      cursor: locked ? "not-allowed" : "pointer",
                      opacity: locked ? 0.5 : 1,
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
            </div>
          </details>
        );
      })}
    </main>
  );
}

