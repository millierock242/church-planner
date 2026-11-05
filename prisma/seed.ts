import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.serviceAssignment.deleteMany();
  await prisma.teamRole.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.event.deleteMany();

  const worshipTeam = await prisma.team.create({
    data: {
      name: "Worship Team",
      description: "Vocals and band",
      roles: {
        create: [
          { name: "Worship Leader" },
          { name: "Acoustic Guitar" },
          { name: "Keys" },
        ],
      },
    },
  });

  const roles = await prisma.teamRole.findMany({ where: { teamId: worshipTeam.id } });

  const user2 = await prisma.user.create({
    data: {
      fullName: "Jane Smith",
      email: "jane@example.com",
      role: "volunteer",
    },
  });

  const sundayEvent = await prisma.event.create({
    data: {
      title: "Sunday Morning Worship",
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      description: "Standard Sunday morning service",
    },
  });

  if (roles.length > 0) {
    await prisma.serviceAssignment.create({
      data: {
        eventId: sundayEvent.id,
        userId: user2.id,
        roleId: roles[0].id,
        status: "confirmed",
      },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });