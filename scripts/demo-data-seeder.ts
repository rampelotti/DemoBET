import { runDemoDataSeeder } from "../src/lib/seed/demo-data-seeder";

runDemoDataSeeder()
  .then((result) => {
    console.log("DemoDataSeeder concluído:");
    console.log(JSON.stringify(result, null, 2));
    console.log("\nLogin demo: demo.apostador.01@demoscore.com / demo123");
  })
  .catch((error) => {
    console.error("Falha no seed:", error);
    process.exit(1);
  });
