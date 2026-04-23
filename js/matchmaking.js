/**
 * Client-side battle queue: Firestore battle_queue + player_slots + battle_matches.
 * Pairing uses deterministic "executor" (lexicographically smallest queue doc id of the pair)
 * so only one client commits the batch.
 */
(function () {
  "use strict";
  const QUEUE_HEARTBEAT_SEC = 5;
  const QUEUE_STALE_SEC = 20;

  function joinedMs(d) {
    const j = d.data().joinedAt;
    if (j && typeof j.toMillis === "function") return j.toMillis();
    return 0;
  }

  function aliveMs(d) {
    const ls = d.data().lastSeen;
    if (ls && typeof ls.toMillis === "function") return ls.toMillis();
    return joinedMs(d);
  }

  function getDb() {
    if (typeof firebase === "undefined" || !firebase.apps.length) {
      throw new Error(
        "Firebase is not initialized. Check that gstatic.com scripts load (disable ad/shield blocking), then refresh.",
      );
    }
    return firebase.firestore();
  }

  function guestId() {
    let g = sessionStorage.getItem("na_guest");
    if (!g) {
      g = crypto.randomUUID();
      sessionStorage.setItem("na_guest", g);
    }
    return g;
  }

  /**
   * @param {(info: { matchId: string; guestId: string }) => void} onMatch
   * @param {(status: string) => void} onStatus
   * @returns {Promise<() => Promise<void>>}
   */
  async function joinBattleQueue(onMatch, onStatus) {
    const db = getDb();
    const gid = guestId();
    onStatus("Connecting…");

    const slotRef = db.collection("player_slots").doc(gid);
    await slotRef.set({ matchId: firebase.firestore.FieldValue.delete() }, { merge: true });

    // Cleanup stale queue docs for this same guest before enqueuing again.
    try {
      const stale = await db.collection("battle_queue").where("guestId", "==", gid).get();
      const dels = [];
      stale.forEach((d) => dels.push(d.ref.delete()));
      if (dels.length) await Promise.all(dels);
    } catch (_) {
      /* best-effort cleanup */
    }

    const qref = await db.collection("battle_queue").add({
      guestId: gid,
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      state: "waiting",
    });

    let matchedOnce = false;
    let matchingInFlight = false;
    function fireMatch(matchId) {
      if (matchedOnce) return;
      matchedOnce = true;
      onMatch({ matchId, guestId: gid });
    }

    async function tryMatchTwo() {
      if (matchedOnce || matchingInFlight) return;
      matchingInFlight = true;
      try {
        const now = Date.now();
        const raw = await db.collection("battle_queue").where("state", "==", "waiting").get();
        const waitingRaw = raw.docs
          .filter((d) => now - aliveMs(d) <= QUEUE_STALE_SEC * 1000)
          .sort((a, b) => {
            const am = joinedMs(a);
            const bm = joinedMs(b);
            if (am !== bm) return am - bm;
            return a.id.localeCompare(b.id);
          });
        const seenGuests = new Set();
        const waiting = [];
        for (const d of waitingRaw) {
          const g = d.data()?.guestId;
          if (!g || seenGuests.has(g)) continue;
          seenGuests.add(g);
          waiting.push(d);
        }
        if (waiting.length < 2) return;

        const d0 = waiting[0];
        const d1 = waiting[1];

        const g0 = d0.data().guestId;
        const g1 = d1.data().guestId;
        await db.runTransaction(async (tx) => {
          const s0 = await tx.get(d0.ref);
          const s1 = await tx.get(d1.ref);
          if (!s0.exists || !s1.exists) return;
          if (s0.data()?.state !== "waiting" || s1.data()?.state !== "waiting") return;
          const matchRef = db.collection("battle_matches").doc();
          tx.set(matchRef, {
            players: [g0, g1],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          tx.set(db.collection("player_slots").doc(g0), { matchId: matchRef.id }, { merge: true });
          tx.set(db.collection("player_slots").doc(g1), { matchId: matchRef.id }, { merge: true });
          tx.delete(d0.ref);
          tx.delete(d1.ref);
        });

        // Best-effort duplicate cleanup for the two matched guests.
        try {
          const dup0 = await db.collection("battle_queue").where("guestId", "==", g0).get();
          const dup1 = await db.collection("battle_queue").where("guestId", "==", g1).get();
          const dels = [];
          dup0.forEach((d) => dels.push(d.ref.delete()));
          dup1.forEach((d) => dels.push(d.ref.delete()));
          if (dels.length) await Promise.all(dels);
        } catch (_) {
          /* cleanup best-effort */
        }
      } catch (_) {
        /* transient conflict or race; next snapshot retries */
      } finally {
        matchingInFlight = false;
      }
    }

    const unsubSlot = slotRef.onSnapshot((snap) => {
      const mid = snap.data()?.matchId;
      if (mid) {
        onStatus("Match found");
        fireMatch(mid);
      }
    });

    const hbTimer = setInterval(() => {
      qref.set(
        {
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
          state: "waiting",
        },
        { merge: true },
      ).catch(() => {});
    }, QUEUE_HEARTBEAT_SEC * 1000);

    const unsubQueue = db.collection("battle_queue").onSnapshot((snap) => {
      const now = Date.now();
      const waitingRaw = snap.docs
        .filter((d) => d.data().state === "waiting" && now - aliveMs(d) <= QUEUE_STALE_SEC * 1000)
        .sort((a, b) => {
          const am = joinedMs(a);
          const bm = joinedMs(b);
          if (am !== bm) return am - bm;
          return a.id.localeCompare(b.id);
        });

      // De-dupe by guestId so one user cannot appear multiple times.
      const seenGuests = new Set();
      const waiting = [];
      for (const d of waitingRaw) {
        const g = d.data()?.guestId;
        if (!g || seenGuests.has(g)) continue;
        seenGuests.add(g);
        waiting.push(d);
      }

      onStatus(`In queue… (${waiting.length} waiting)`);

      if (waiting.length >= 2) void tryMatchTwo();
    });

    return async function cancel() {
      clearInterval(hbTimer);
      unsubQueue();
      unsubSlot();
      try {
        await qref.delete();
      } catch (_) {
        /* already removed when matched */
      }
    };
  }

  window.NightArenaMatchmaking = { joinBattleQueue, guestId };
})();
