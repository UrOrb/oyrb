import { Suspense } from "react";
import { RoomClient } from "./room-client";

export const metadata = {
  title: "The Room",
};

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="p-8 text-soft">Loading the room…</div>}>
      <RoomClient />
    </Suspense>
  );
}
