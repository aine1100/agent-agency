const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");
const schema = require("./schema");

async function seed() {
    console.log("Seeding workflows...");
    
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not set in .env");
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
    const db = drizzle(pool, { schema });

    const workflows = [
        {
            id: "wf_1",
            name: "Enterprise Lead Gen",
            slug: "lead-gen",
            description: "Automated multi-step agent pipeline for lead qualification",
            objectiveTemplate: "Task: {{objective}}",
            defaultDomainAgent: "Nexus",
            defaultProvider: "OPENAI",
            defaultModel: "gpt-4o-mini",
            includeMarketing: true,
            active: true,
            updatedAt: new Date(),
        },
        {
            id: "wf_2",
            name: "Customer Support Agent",
            slug: "support",
            description: "First-line response agent with RAG capabilities",
            objectiveTemplate: "Task: {{objective}}",
            defaultDomainAgent: "Nexus",
            defaultProvider: "OPENAI",
            defaultModel: "gpt-4o-mini",
            includeMarketing: true,
            active: true,
            updatedAt: new Date(),
        },
        {
            id: "wf_3",
            name: "Social Media Manager",
            slug: "social",
            description: "Content creator and scheduler for multiple platforms",
            objectiveTemplate: "Task: {{objective}}",
            defaultDomainAgent: "Nexus",
            defaultProvider: "OPENAI",
            defaultModel: "gpt-4o-mini",
            includeMarketing: true,
            active: false,
            updatedAt: new Date(),
        },
        {
            id: "wf_4",
            name: "Market Analysis",
            slug: "market",
            description: "Real-time competitor tracking and reporting",
            objectiveTemplate: "Task: {{objective}}",
            defaultDomainAgent: "Nexus",
            defaultProvider: "OPENAI",
            defaultModel: "gpt-4o-mini",
            includeMarketing: true,
            active: true,
            updatedAt: new Date(),
        },
        {
            id: "wf_5",
            name: "Onboarding Specialist",
            slug: "onboarding",
            description: "Customer success automation for new signups",
            objectiveTemplate: "Task: {{objective}}",
            defaultDomainAgent: "Nexus",
            defaultProvider: "OPENAI",
            defaultModel: "gpt-4o-mini",
            includeMarketing: true,
            active: true,
            updatedAt: new Date(),
        },
    ];

    for (const wf of workflows) {
        await db.insert(schema.workflow).values(wf).onConflictDoUpdate({
            target: schema.workflow.id,
            set: wf,
        });
    }

    console.log("Seeding completed successfully.");
    await pool.end();
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
