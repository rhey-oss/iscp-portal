import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const now = new Date();

function at(dayOffset: number, hour: number, minute = 0) {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + dayOffset,
    hour,
    minute,
    0,
    0,
  );
}

function qr() {
  return randomBytes(9).toString("hex");
}

async function main() {
  console.log("Clearing existing data…");

  await prisma.announcementRead.deleteMany();
  await prisma.announcementMedia.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.tuitionPayment.deleteMany();
  await prisma.tuitionFee.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.parentLink.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.media.deleteMany();
  await prisma.user.deleteMany();

  console.log("Hashing demo passwords…");
  const adminHash = await hash("Admin@12345", 12);
  const principalHash = await hash("Dean@12345", 12);
  const teacherHash = await hash("Instructor@12345", 12);
  const studentHash = await hash("Student@12345", 12);
  const parentHash = await hash("Parent@12345", 12);
  const cashierHash = await hash("Cashier@12345", 12);

  console.log("Creating accounts…");
  const admin = await prisma.user.create({
    data: {
      email: "admin@iscp.edu.ph",
      passwordHash: adminHash,
      name: "Ana Villanueva",
      role: "ADMIN",
      phone: "0917 000 0001",
    },
  });

  const principal = await prisma.user.create({
    data: {
      email: "dean@iscp.edu.ph",
      passwordHash: principalHash,
      name: "Ramon Cruz",
      role: "PRINCIPAL",
      phone: "0917 000 0002",
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: "instructor@iscp.edu.ph",
      passwordHash: teacherHash,
      name: "Maria Santos",
      role: "TEACHER",
      phone: "0917 000 0003",
    },
  });

  const teacher2User = await prisma.user.create({
    data: {
      email: "teacher2@iscp.edu.ph",
      passwordHash: teacherHash,
      name: "Jose Bautista",
      role: "TEACHER",
      phone: "0917 000 0004",
    },
  });

  const parentUser = await prisma.user.create({
    data: {
      email: "parent@iscp.edu.ph",
      passwordHash: parentHash,
      name: "Rosa Dela Cruz",
      role: "PARENT",
      phone: "0917 000 0005",
    },
  });

  const cashierUser = await prisma.user.create({
    data: {
      email: "cashier@iscp.edu.ph",
      passwordHash: cashierHash,
      name: "Fe Santos",
      role: "CASHIER",
      phone: "0917 000 0007",
    },
  });

  const parent2User = await prisma.user.create({
    data: {
      email: "parent2@iscp.edu.ph",
      passwordHash: parentHash,
      name: "Elena Reyes",
      role: "PARENT",
      phone: "0917 000 0006",
    },
  });

  console.log("Creating teacher profiles, classes, and subjects…");
  const teacher = await prisma.teacherProfile.create({
    data: { userId: teacherUser.id, employeeNo: "T-001", department: "Computer Studies" },
  });
  const teacher2 = await prisma.teacherProfile.create({
    data: { userId: teacher2User.id, employeeNo: "T-002", department: "Computer Studies" },
  });

  const schoolYear = "2026-2027";

  const g7 = await prisma.class.create({
    data: {
      name: "1st Year – Pokemon Science A",
      gradeLevel: "1st Year",
      section: "Pokemon Science A",
      schoolYear,
      room: "Moon Campus 201",
      adviserId: teacher.id,
    },
  });
  const g8 = await prisma.class.create({
    data: {
      name: "2nd Year – Streaming B",
      gradeLevel: "2nd Year",
      section: "Streaming B",
      schoolYear,
      room: "Atlantis 204",
      adviserId: teacher2.id,
    },
  });

  const g7Math = await prisma.subject.create({
    data: { name: "Pokemon Science", code: "POKE101", units: 3, classId: g7.id, teacherId: teacher.id },
  });
  const g7Science = await prisma.subject.create({
    data: { name: "Tech Support (Sarcasm)", code: "TECH101", units: 3, classId: g7.id, teacherId: teacher.id },
  });
  const g7English = await prisma.subject.create({
    data: { name: "Matanglawin", code: "MAT101", units: 2, classId: g7.id, teacherId: teacher2.id },
  });
  const g8Math = await prisma.subject.create({
    data: { name: "Pyrotechnics", code: "PYRO102", units: 3, classId: g8.id, teacherId: teacher2.id },
  });
  await prisma.subject.create({
    data: { name: "Marine Biology", code: "MARBIO102", units: 3, classId: g8.id, teacherId: teacher2.id },
  });

  console.log("Creating class schedule…");
  await prisma.scheduleEntry.createMany({
    data: [
      { classId: g7.id, subjectId: g7Math.id, dayOfWeek: 1, startTime: "08:00", endTime: "09:00", room: "201", createdById: teacherUser.id },
      { classId: g7.id, subjectId: g7English.id, dayOfWeek: 1, startTime: "09:00", endTime: "10:00", room: "201", createdById: teacherUser.id },
      { classId: g7.id, subjectId: g7Science.id, dayOfWeek: 2, startTime: "08:00", endTime: "09:00", room: "201", createdById: teacherUser.id },
      { classId: g7.id, subjectId: g7Math.id, dayOfWeek: 3, startTime: "08:00", endTime: "09:00", room: "201", createdById: teacherUser.id },
      { classId: g7.id, subjectId: g7English.id, dayOfWeek: 4, startTime: "09:00", endTime: "10:00", room: "201", createdById: teacherUser.id },
      { classId: g7.id, subjectId: g7Science.id, dayOfWeek: 5, startTime: "08:00", endTime: "09:00", room: "201", createdById: teacherUser.id },
    ],
  });

  console.log("Creating students…");
  const studentSeeds = [
    { first: "Juan", last: "Dela Cruz", no: "2026-0001", classId: g7.id, email: "student@iscp.edu.ph", account: true },
    { first: "Maria", last: "Reyes", no: "2026-0002", classId: g7.id, email: "student2@iscp.edu.ph", account: true },
    { first: "Kyle", last: "Lim", no: "2026-0003", classId: g7.id, email: "student3@iscp.edu.ph", account: true },
    { first: "Andrea", last: "Garcia", no: "2026-0004", classId: g7.id, email: null, account: false },
    { first: "Paolo", last: "Mendoza", no: "2026-0005", classId: g7.id, email: null, account: false },
    { first: "Sofia", last: "Torres", no: "2026-0006", classId: g7.id, email: null, account: false },
    { first: "Liam", last: "Navarro", no: "2026-0011", classId: g8.id, email: null, account: false },
    { first: "Bea", last: "Aquino", no: "2026-0012", classId: g8.id, email: null, account: false },
  ];

  const students: { id: string; no: string; first: string; last: string; classId: string }[] = [];

  for (const seed of studentSeeds) {
    let userId: string | null = null;
    if (seed.account && seed.email) {
      const user = await prisma.user.create({
        data: {
          email: seed.email,
          passwordHash: studentHash,
          name: `${seed.first} ${seed.last}`,
          role: "STUDENT",
        },
      });
      userId = user.id;
    }

    const student = await prisma.student.create({
      data: {
        studentNo: seed.no,
        firstName: seed.first,
        lastName: seed.last,
        classId: seed.classId,
        userId,
        qrToken: qr(),
        sex: null,
        photoConsent: false,
        guardianName: seed.last === "Dela Cruz" ? "Rosa Dela Cruz" : null,
        guardianPhone: seed.last === "Dela Cruz" ? "0917 000 0005" : null,
      },
    });

    students.push({
      id: student.id,
      no: student.studentNo,
      first: seed.first,
      last: seed.last,
      classId: seed.classId,
    });
  }

  const juan = students.find((s) => s.no === "2026-0001")!;
  const maria = students.find((s) => s.no === "2026-0002")!;
  const kyle = students.find((s) => s.no === "2026-0003")!;

  console.log("Linking parents…");
  await prisma.parentLink.createMany({
    data: [
      { parentUserId: parentUser.id, studentId: juan.id, relation: "Mother", isPrimary: true },
      { parentUserId: parentUser.id, studentId: kyle.id, relation: "Guardian" },
      { parentUserId: parent2User.id, studentId: maria.id, relation: "Mother", isPrimary: true },
    ],
  });

  console.log("Creating grades…");
  const gradePlan = [
    { student: juan, subjects: [g7Math, g7Science, g7English], scores: [92, 88, 90] },
    { student: maria, subjects: [g7Math, g7Science, g7English], scores: [85, 91, 89] },
    { student: kyle, subjects: [g7Math, g7Science, g7English], scores: [74, 78, 80] },
  ];

  for (const plan of gradePlan) {
    for (let index = 0; index < plan.subjects.length; index += 1) {
      await prisma.grade.create({
        data: {
          studentId: plan.student.id,
          subjectId: plan.subjects[index].id,
          term: "Quarter 1",
          score: plan.scores[index],
          maxScore: 100,
          enteredById: teacherUser.id,
          publishedAt: at(-5, 10, 0),
        },
      });
    }
  }

  for (const student of students.filter((s) => s.classId === g8.id)) {
    await prisma.grade.create({
      data: {
        studentId: student.id,
        subjectId: g8Math.id,
        term: "Quarter 1",
        score: 86,
        maxScore: 100,
        enteredById: teacher2User.id,
        publishedAt: at(-5, 10, 0),
      },
    });
  }

  console.log("Creating attendance…");

  const makeSession = async (
    classId: string,
    dayOffset: number,
    label: string,
    records: { studentId: string; status: string; hour: number; minute: number; method?: string }[],
  ) => {
    const session = await prisma.attendanceSession.create({
      data: {
        classId,
        label,
        date: at(dayOffset, 7, 30),
        pin: String(Math.floor(100000 + Math.random() * 900000)),
        qrToken: qr(),
        expiresAt: at(dayOffset, 12, 0),
        isOpen: dayOffset === 0,
        createdById: teacherUser.id,
        records: {
          create: records.map((record) => ({
            studentId: record.studentId,
            status: record.status,
            method: record.method ?? "QR",
            timeIn: record.status === "ABSENT" ? null : at(dayOffset, record.hour, record.minute),
            recordedById: teacherUser.id,
          })),
        },
      },
    });
    return session;
  };

  const g7Students = students.filter((s) => s.classId === g7.id);

  await makeSession(g7.id, 0, "Morning", [
    { studentId: juan.id, status: "PRESENT", hour: 7, minute: 42 },
    { studentId: maria.id, status: "PRESENT", hour: 7, minute: 44 },
    { studentId: kyle.id, status: "ABSENT", hour: 0, minute: 0 },
    { studentId: g7Students[3].id, status: "PRESENT", hour: 7, minute: 51 },
    { studentId: g7Students[4].id, status: "LATE", hour: 8, minute: 11 },
    { studentId: g7Students[5].id, status: "PRESENT", hour: 7, minute: 39 },
  ]);

  for (const offset of [-7, -14, -21]) {
    await makeSession(
      g7.id,
      offset,
      "Morning",
      g7Students.map((student) =>
        student.id === kyle.id
          ? { studentId: student.id, status: "ABSENT", hour: 0, minute: 0 }
          : { studentId: student.id, status: "PRESENT", hour: 7, minute: 45 },
      ),
    );
  }

  await makeSession(g8.id, 0, "Morning", [
    { studentId: students.filter((s) => s.classId === g8.id)[0].id, status: "PRESENT", hour: 7, minute: 48 },
    { studentId: students.filter((s) => s.classId === g8.id)[1].id, status: "LATE", hour: 8, minute: 5 },
  ]);

  console.log("Creating tasks…");
  const mathTask = await prisma.task.create({
    data: {
      classId: g7.id,
      subjectId: g7Math.id,
      title: "Problem Set 3 – Linear Equations",
      description: "Answer pages 44–46. Show complete solutions.",
      dueAt: at(1, 16, 0),
      createdById: teacherUser.id,
    },
  });
  const scienceTask = await prisma.task.create({
    data: {
      classId: g7.id,
      subjectId: g7Science.id,
      title: "Lab report – Water filtration",
      description: "Submit a two-page report with observations and conclusion.",
      dueAt: at(3, 16, 0),
      createdById: teacherUser.id,
    },
  });
  const g8Task = await prisma.task.create({
    data: {
      classId: g8.id,
      subjectId: g8Math.id,
      title: "Worksheet 1 – Factoring",
      dueAt: at(2, 16, 0),
      createdById: teacher2User.id,
    },
  });

  const taskStatus = (studentNo: string) => {
    if (studentNo === "2026-0003") return "MISSING";
    if (studentNo === "2026-0002") return "NEEDED";
    return "PENDING";
  };

  for (const student of g7Students) {
    await prisma.taskAssignment.create({
      data: { taskId: mathTask.id, studentId: student.id, status: taskStatus(student.no) },
    });
    await prisma.taskAssignment.create({
      data: { taskId: scienceTask.id, studentId: student.id, status: "PENDING" },
    });
  }

  for (const student of students.filter((s) => s.classId === g8.id)) {
    await prisma.taskAssignment.create({
      data: { taskId: g8Task.id, studentId: student.id, status: "PENDING" },
    });
  }

  console.log("Creating announcements…");
  const intramurals = await prisma.announcement.create({
    data: {
      title: "Intramurals 2026",
      body: "Our annual intramurals will run from December 8 to 10 at the school gymnasium.\n\nStudents should report to their assigned teams by 7:30 AM. Parents are welcome to watch the closing ceremony.",
      authorId: admin.id,
      audience: "SCHOOL",
      category: "EVENT",
      priority: "IMPORTANT",
      isPinned: true,
      eventStartsAt: at(15, 7, 30),
      eventEndsAt: at(17, 17, 0),
      location: "Galactic Sports Complex",
      publishAt: at(-2, 9, 0),
    },
  });

  await prisma.announcement.create({
    data: {
      title: "Second quarter examination schedule",
      body: "Examinations begin on December 1. Please review the posted schedule per year level.\n\nBring your own writing materials. No calculators for 1st Year Pokemon Science.",
      authorId: principal.id,
      audience: "SCHOOL",
      category: "ACADEMIC",
      priority: "NORMAL",
      publishAt: at(-4, 10, 0),
    },
  });

  await prisma.announcement.create({
    data: {
      title: "Class suspension – Typhoon signal no. 2",
      body: "Classes are suspended today due to Typhoon Signal No. 2. Stay safe and monitor official advisories.\n\nMake-up sessions will be announced.",
      authorId: principal.id,
      audience: "SCHOOL",
      category: "EMERGENCY",
      priority: "URGENT",
      publishAt: at(0, 6, 0),
    },
  });

  await prisma.announcement.create({
    data: {
      title: "1st Year – Pokemon Science A field trip",
      body: "Our class field trip to Moon Campus is scheduled for November 28. Free shuttle from the Philippines (60% chance of survival). Please return the consent form by Friday.",
      authorId: teacherUser.id,
      audience: "CLASS",
      classId: g7.id,
      category: "EVENT",
      priority: "NORMAL",
      publishAt: at(-1, 14, 0),
      eventStartsAt: at(5, 7, 0),
      location: "Moon Campus",
    },
  });

  await prisma.announcement.create({
    data: {
      title: "Parent–teacher conference",
      body: "Parents are invited to discuss second quarter performance with the class advisers on December 5, 1:00–4:00 PM.",
      authorId: principal.id,
      audience: "ROLE",
      targetRole: "PARENT",
      category: "GENERAL",
      priority: "NORMAL",
      publishAt: at(-3, 8, 0),
      location: "Respective classrooms",
    },
  });

  console.log("Creating notifications…");
  await prisma.notification.createMany({
    data: [
      {
        userId: parentUser.id,
        studentId: juan.id,
        type: "ATTENDANCE_ARRIVAL",
        title: "Juan Dela Cruz arrived at campus",
        body: "Checked in at 7:42 AM for 1st Year – BSCS A.",
        link: "/parent/children",
        createdAt: at(0, 7, 42),
      },
      {
        userId: parentUser.id,
        studentId: kyle.id,
        type: "ATTENDANCE_ABSENT",
        title: "Kyle Lim was marked absent",
        body: "No check-in recorded today for 1st Year – BSCS A.",
        link: "/parent/children",
        createdAt: at(0, 8, 30),
      },
      {
        userId: parent2User.id,
        studentId: maria.id,
        type: "ATTENDANCE_ARRIVAL",
        title: "Maria Reyes arrived at campus",
        body: "Checked in at 7:44 AM for 1st Year – BSCS A.",
        link: "/parent/children",
        createdAt: at(0, 7, 44),
      },
      {
        userId: parentUser.id,
        studentId: juan.id,
        type: "ANNOUNCEMENT",
        title: "Intramurals 2026",
        body: "Our annual intramurals will run from December 8 to 10.",
        link: `/announcements/${intramurals.id}`,
        createdAt: at(-2, 9, 5),
        readAt: at(-1, 8, 0),
      },
    ],
  });

  console.log("Creating audit trail…");
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: "Created",
        entity: "Class",
        entityId: g7.id,
        after: JSON.stringify({ name: g7.name }),
        createdAt: at(-10, 9, 0),
      },
      {
        actorId: admin.id,
        action: "Created",
        entity: "Class",
        entityId: g8.id,
        after: JSON.stringify({ name: g8.name }),
        createdAt: at(-10, 9, 5),
      },
      {
        actorId: teacherUser.id,
        action: "Started attendance session",
        entity: "AttendanceSession",
        entityId: "demo-session",
        after: JSON.stringify({ class: g7.name, label: "Morning" }),
        createdAt: at(0, 7, 30),
      },
    ],
  });

  await prisma.setting.upsert({
    where: { key: "schoolYear" },
    update: { value: schoolYear },
    create: { key: "schoolYear", value: schoolYear },
  });

  await prisma.branding.upsert({
    where: { id: "school" },
    update: {},
    create: {
      id: "school",
      schoolName: process.env.NEXT_PUBLIC_ISCP_NAME ?? "International State College of the Philippines",
      shortName: process.env.NEXT_PUBLIC_ISCP_SHORT_NAME ?? "ISCP",
      tagline: "One of the most prestigious colleges in the universe. Home of the Blue Aspins.",
      theme: "ocean",
    },
  });

  console.log("Creating tuition fees and payments…");
  const tuition = await prisma.tuitionFee.create({
    data: {
      name: "Tuition Fee – 1st Semester 2026-2027",
      category: "TUITION",
      amount: 15000,
      schoolYear,
      dueAt: at(30, 17),
      description: "Semester tuition, payable in full or by instalment. Shuttle to Moon Campus not included.",
      createdById: admin.id,
    },
  });
  const fieldTrip = await prisma.tuitionFee.create({
    data: {
      name: "Moon Campus field trip",
      category: "OTHER",
      amount: 750,
      schoolYear,
      classId: g7.id,
      dueAt: at(10, 17),
      description: "Free shuttle service from the Philippines to the Moon (60% chance of survival).",
      createdById: teacherUser.id,
    },
  });

  await prisma.tuitionPayment.createMany({
    data: [
      {
        feeId: tuition.id,
        studentId: juan.id,
        amountPaid: 15000,
        paidAt: at(-3, 9, 15),
        reference: "OR-2026-1001",
        method: "BANK_TRANSFER",
        recordedById: admin.id,
      },
      {
        feeId: fieldTrip.id,
        studentId: juan.id,
        amountPaid: 400,
        reference: "OR-2026-1002",
        method: "CASH",
        recordedById: cashierUser.id,
      },
      {
        feeId: tuition.id,
        studentId: maria.id,
        amountPaid: 5000,
        reference: "OR-2026-1003",
        method: "GCASH",
        recordedById: cashierUser.id,
      },
    ],
  });

  console.log("\nSeed complete.");
  console.log("Demo sign-ins:");
  console.log("  Admin      admin@iscp.edu.ph      / Admin@12345");
  console.log("  Dean       dean@iscp.edu.ph       / Dean@12345");
  console.log("  Instructor instructor@iscp.edu.ph / Instructor@12345");
  console.log("  Cashier    cashier@iscp.edu.ph    / Cashier@12345");
  console.log("  Student    student@iscp.edu.ph    / Student@12345");
  console.log("  Parent     parent@iscp.edu.ph     / Parent@12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
