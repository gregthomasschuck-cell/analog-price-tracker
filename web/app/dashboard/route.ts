import { servePaid } from "@/lib/paidFile";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => servePaid("dashboard.html", req);
