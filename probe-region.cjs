const { PrismaClient } = require("@prisma/client");
const pw = encodeURIComponent("ferry@00909054815");
const ref = "czdywfrijtzgnakyiihi";
const regions = ["ap-south-1","ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2","us-east-1","us-east-2","us-west-1","eu-central-1","eu-west-1","eu-west-2","eu-west-3","sa-east-1","ca-central-1"];
(async () => {
  for (const r of regions) {
    for (const pre of ["aws-0","aws-1"]) {
      const host = `${pre}-${r}.pooler.supabase.com`;
      const url = `postgresql://postgres.${ref}:${pw}@${host}:5432/postgres?sslmode=require&connect_timeout=6`;
      const db = new PrismaClient({ datasourceUrl: url, log: [] });
      try {
        const [row] = await db.$queryRawUnsafe("select current_database() as d, inet_server_port() as p");
        console.log("MATCH", host, JSON.stringify(row));
        await db.$disconnect();
        process.exit(0);
      } catch (e) {
        const lines = (e.message || "").split("\n").filter(Boolean);
        const m = lines[lines.length - 1] || "";
        if (!/Can't reach|Not found|ENOTFOUND|P1001|timed out/i.test(m)) console.log("other", host, "->", m.slice(0, 90));
      }
      await db.$disconnect().catch(() => {});
    }
  }
  console.log("no region matched");
})();
