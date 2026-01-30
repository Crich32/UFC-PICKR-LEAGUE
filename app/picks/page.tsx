"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ================= TYPES ================= */

type Event = {
  id: string;
  name: string;
  is_locked: boolean;
};

type Fight = {
  id: string;
  fighter_red: string;
  fighter_blue: string;
  fight_order: number;
  events: Event[] | null;
};

type FightPickMap = Record<string, Record<string, string[]>>;

/* ================= PAGE ================= */

export default function PicksPage() {
  const [user, setUser] = useState<any>(null);
  const [fights, setFights] = useState<Fight[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [allPicks, setAllPicks] = useState<FightPickMap>({});
  const [loading, setLoading] = useState(true);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      /* ✅ LOAD FIGHTS + EVENTS */
      const { data: fightsData, error } = await supabase
        .from("fights")
        .select(`
          id,
          fighter_red,
          fighter_blue,
          fight_order,
          events (
            id,
            name,
            is_locked
          )
        `)
        .order("fight_order", { ascending: true });

      if (error) {
        console.error("Fight load error:", error);
      }

      setFights(fightsData ?? []);

      /* ✅ USER PICKS */
      const { data: picksData } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter")
        .eq("user_id", user.id);

      if (picksData) {
        const map: Record<string, string> = {};
        picksData.forEach((p: any) => {
          map[p.fight_id] = p.picked_fighter;
        });
        setPicks(map);
      }

      /* ✅ ALL PICKS */
      const { data: allPicksData } = await supabase
        .from("picks")
        .select("fight_id, picked_fighter, profiles ( username )");

      if (allPicksData) {
        const grouped: FightPickMap = {};

        allPicksData.forEach((pick: any) => {
          if (!grouped[pick.fight_id]) grouped[pick.fight_id] = {};
          if (!grouped[pick.fight_id][pick.picked_fighter]) {
            grouped[pick.fight_id][pick.picked_fighter] = [];
          }

          if (pick.profiles?.username) {
            grouped[pick.fight_id][pick.picked_fighter].push(
              pick.profiles.username
            );
          }
        });

        setAllPicks(grouped);
      }

      setLoading(false);
    }

    loadPage();
  }, []);

  /* ================= PICK HANDLER ================= */

  async function handlePick(fightId: string, fighter: string) {
    if (!user) return;

    setPicks((prev) => ({
      ...prev,
      [fightId]: fighter,
    }));

    await supabase.from("picks").upsert(
      {
        user_id: user.id,
        fight_id: fightId,
        picked_fighter: fighter,
      },
      { onConflict: "user_id,fight_id" }
    );
  }

  /* ================= STATES ================= */

  if (loading) return <main style={{ padding: 40 }}>Loading…</main>;
  if (!user) return <main style={{ padding: 40 }}>Please sign in</main>;

  /* ================= GROUP BY EVENT ================= */

  const fightsByEvent = fights.reduce<
    Record<string, { event: Event; fights: Fight[] }>
  >((acc, fight) => {
    const event = fight.events?.[0];
    if (!event) return acc;

    if (!acc[event.name]) {
      acc[event.name] = { event, fights: [] };
    }

    acc[event.name].fights.push(fight);
    return acc;
  }, {});

  /* ================= UI ================= */

  return (
    <main style={{ padding: 40 }}>
      <h1>Fight Card</h1>

      {Object.entries(fightsByEvent).map(([eventName, data]) => (
        <details
          key={eventName}
          open={!data.event.is_locked} // ✅ OPEN CURRENT, COLLAPSE OLD
          style={{
            border: "2px solid #666",
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
            {eventName}
          </summary>

          <div style={{ marginTop: 12 }}>
            {data.fights.map((fight) => {
              const locked = data.event.is_locked;

              return (
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
                    onClick={() => handlePick(fight.id, fight.fighter_red)}
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
                    onClick={() => handlePick(fight.id, fight.fighter_blue)}
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
              );
            })}
          </div>
        </details>
      ))}
    </main>
  );
}

