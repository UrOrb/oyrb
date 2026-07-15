import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { analystRun } from "@/inngest/functions/analyst";
import { bridgeMap } from "@/inngest/functions/bridge";
import { chronicleNightly, chronicleReply } from "@/inngest/functions/chronicle";
import { coachSession } from "@/inngest/functions/coach";
import { curatorGap } from "@/inngest/functions/curator";
import { envoyDraft, envoySend } from "@/inngest/functions/envoy";
import { gatekeeperMarket, gatekeeperScreen } from "@/inngest/functions/gatekeeper";
import { pulseListen } from "@/inngest/functions/pulse";
import { scoutRun } from "@/inngest/functions/scout";
import { sleuthRun } from "@/inngest/functions/sleuth";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scoutRun,
    analystRun,
    gatekeeperScreen,
    gatekeeperMarket,
    bridgeMap,
    sleuthRun,
    envoyDraft,
    envoySend,
    chronicleReply,
    chronicleNightly,
    pulseListen,
    curatorGap,
    coachSession,
  ],
});
