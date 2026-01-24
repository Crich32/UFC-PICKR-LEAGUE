"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (data) setUsername(data.username);
      setLoading(false);
    };

    loadProfile();
  }, []);

  const saveUsername = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("profiles")
      .update({ username })
      .eq("id", user.id);

    alert("Username saved");
  };

  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "40px auto",
        background: "#0b0b0b",
        border: "1px solid #333",
        borderRadius: "10px",
        padding: "20px",
      }}
    >
      <h2 style={{ color: "white", marginBottom: "16px" }}>
        Edit Profile
      </h2>

      {/* Username box */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <label style={{ color: "#aaa", fontSize: "14px" }}>
          Username
        </label>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          style={{
            background: "#000",
            border: "1px solid #333",
            borderRadius: "6px",
            padding: "10px",
            color: "white",
            fontSize: "16px",
          }}
        />
      </div>

      <button
        onClick={saveUsername}
        style={{
          width: "100%",
          background: "#22c55e",
          color: "#000",
          border: "none",
          borderRadius: "6px",
          padding: "10px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Save Username
      </button>
    </div>
  );
}

