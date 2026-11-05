import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding field test data...");

  // Create primary teams and roles
  async function upsertTeamByName(
    name: string,
    description: string,
    roleNames: string[]
  ) {
    const existingTeam = await prisma.team.findFirst({
      where: { name },
    });

    if (existingTeam) {
      return existingTeam;
    }

    return prisma.team.create({
      data: {
        name,
        description,
        roles: {
          create: roleNames.map((roleName) => ({ name: roleName })),
        },
      },
    });
  }

  const audioTeam = await upsertTeamByName("Audio & Production", "Front of House, Monitor Engineering, and Broadcast Sound", [
    "FOH Mix Engineer",
    "Monitor Engineer",
    "Broadcast Audio Tech",
  ]);

  const worshipTeam = await upsertTeamByName("Worship Ministry", "Vocalists and Band Members", [
    "Worship Leader",
    "Acoustic Guitar",
    "Keys / Piano",
    "Drums",
  ]);

  // Create sample service event
  const sundayService = await prisma.event.create({
    data: {
      title: "Sunday Morning Worship Service",
      eventDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
      callTime: new Date(Date.now() + 86400000 * 3 - 3600000 * 2), // 2 hours before
      description: "Main sanctuary morning service and livestream production.",
    },
  });

  console.log("Seeding complete!", { audioTeam, worshipTeam, sundayService });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });