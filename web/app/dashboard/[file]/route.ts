import { servePaid } from "@/lib/paidFile";

export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  return servePaid(file === "dashboard.html" ? "" : file, req);
}
