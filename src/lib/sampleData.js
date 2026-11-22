import { addDays, format, toISODate, todayISO, DAYS, uid } from "../lib/utils";

const courses = [
  "Database Systems (CSC 3021)",
  "Operating Systems (CSC 3012)",
  "Linear Algebra (MAT 2104)",
  "Software Engineering (CSC 3041)",
  "Technical Writing (ENG 2102)",
];

const d = (offset) => toISODate(addDays(new Date(), offset));
const dayName = (offset) => DAYS[(new Date().getDay() + 6 + offset) % 7];
const t = (offset) => new Date(Date.now() + offset * 3600000).toISOString();
const due = (offset) => d(offset);

export const DEFAULT_SETTINGS = {
  theme: "light",
  accentColor: "#6366F1",
  timezone: "Africa/Kigali",
  weekStart: "monday",
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  notificationsEnabled: true,
  browserNotifications: false,
  soundEnabled: true,
  defaultReminderMinutes: 15,
  autoBackupEnabled: true,
  maxBackups: 5,
  dailyStudyGoal: 180,
  timetableMode: "weekly",
  activeWeekStart: "",
  sampleData: true,
};

export function emptyData(settings = {}) {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    tasks: [],
    events: [],
    timetable: [],
    studySessions: [],
    academicItems: [],
    assignments: [],
    exams: [],
    weeklyTimetables: [],
    permanentTimetable: [],
    notes: [],
    notifications: [],
    focusSessions: [],
    backups: [],
    settings: { ...DEFAULT_SETTINGS, sampleData: false, ...settings },
  };
}

export function createSampleData() {
  const timetable = [
    {
      id: uid("cls"), courseName: "Database Systems", courseCode: "CSC 3021", lecturer: "Dr. A. Mukamana",
      classroom: "Block B · Room 204", day: dayName(0), startTime: "09:00", endTime: "10:30", color: "#6366F1",
      notes: "Bring the normalization worksheet.", reminderMinutes: 15, createdAt: t(-720), updatedAt: t(-720),
    },
    {
      id: uid("cls"), courseName: "Operating Systems", courseCode: "CSC 3012", lecturer: "Prof. E. Nkurunziza",
      classroom: "Block C · Lab 3", day: dayName(0), startTime: "13:00", endTime: "14:30", color: "#0EA5E9",
      notes: "Lab session: process scheduling.", reminderMinutes: 10, createdAt: t(-700), updatedAt: t(-700),
    },
    {
      id: uid("cls"), courseName: "Software Engineering", courseCode: "CSC 3041", lecturer: "Dr. L. Habimana",
      classroom: "Block A · Room 101", day: dayName(1), startTime: "08:00", endTime: "10:00", color: "#8B5CF6",
      notes: "Sprint review with the client team.", reminderMinutes: 15, createdAt: t(-690), updatedAt: t(-690),
    },
    {
      id: uid("cls"), courseName: "Linear Algebra", courseCode: "MAT 2104", lecturer: "Dr. P. Uwase",
      classroom: "Science Hall · 12", day: dayName(2), startTime: "11:00", endTime: "12:30", color: "#F59E0B",
      notes: "Eigenvalues and diagonalization.", reminderMinutes: 15, createdAt: t(-680), updatedAt: t(-680),
    },
    {
      id: uid("cls"), courseName: "Technical Writing", courseCode: "ENG 2102", lecturer: "Ms. C. Keza",
      classroom: "Block D · Room 08", day: dayName(3), startTime: "15:00", endTime: "16:30", color: "#10B981",
      notes: "Peer review of literature review drafts.", reminderMinutes: 10, createdAt: t(-670), updatedAt: t(-670),
    },
    {
      id: uid("cls"), courseName: "Database Systems Lab", courseCode: "CSC 3021", lecturer: "Mr. J. Rwigema",
      classroom: "Block C · Lab 1", day: dayName(4), startTime: "10:00", endTime: "12:00", color: "#6366F1",
      notes: "Query tuning exercises.", reminderMinutes: 15, createdAt: t(-660), updatedAt: t(-660),
    },
  ];

  const tasks = [
    {
      id: uid("tsk"), title: "Finish ER diagram for project", description: "Complete entities, relationships and cardinalities for the library management system.",
      course: courses[0], priority: "High", status: "In Progress", dueDate: due(2), dueTime: "17:00",
      category: "Project", tags: ["project", "er-model"], reminderMinutes: 60,
      createdAt: t(-50), updatedAt: t(-4), completedAt: null,
    },
    {
      id: uid("tsk"), title: "Read OS chapter 6", description: "Deadlocks, detection and recovery. Take notes on the banker's algorithm.",
      course: courses[1], priority: "Medium", status: "Pending", dueDate: todayISO(), dueTime: "18:00",
      category: "Reading", tags: ["reading"], reminderMinutes: 30, createdAt: t(-40), updatedAt: t(-40), completedAt: null,
    },
    {
      id: uid("tsk"), title: "Problem set 4", description: "Exercises 3.1 – 3.12 on matrix transformations.",
      course: courses[2], priority: "Urgent", status: "Pending", dueDate: due(3), dueTime: "10:00",
      category: "Problem set", tags: ["math"], reminderMinutes: 1440, createdAt: t(-38), updatedAt: t(-38), completedAt: null,
    },
    {
      id: uid("tsk"), title: "Submit group proposal", description: "Merge the team sections and submit the PDF on the course portal.",
      course: courses[3], priority: "High", status: "Pending", dueDate: due(-1), dueTime: "16:00",
      category: "Submission", tags: ["team"], reminderMinutes: 60, createdAt: t(-80), updatedAt: t(-20), completedAt: null,
    },
    {
      id: uid("tsk"), title: "Review lecture notes", description: "Summarize the week's database lectures into one page.",
      course: courses[0], priority: "Low", status: "Completed", dueDate: todayISO(), dueTime: "12:00",
      category: "Revision", tags: ["review"], reminderMinutes: 15, createdAt: t(-30), updatedAt: t(-6), completedAt: t(-6),
    },
    {
      id: uid("tsk"), title: "Prepare for database quiz", description: "Practice normalization questions and review the CAT 1 feedback.",
      course: courses[0], priority: "High", status: "Pending", dueDate: due(1), dueTime: "20:00",
      category: "Revision", tags: ["quiz"], reminderMinutes: 120, createdAt: t(-26), updatedAt: t(-26), completedAt: null,
    },
    {
      id: uid("tsk"), title: "Update CV with internship", description: "Add the summer data internship and refresh the skills section.",
      course: "Personal", priority: "Low", status: "Pending", dueDate: due(6), dueTime: "18:00",
      category: "Personal", tags: ["career"], reminderMinutes: 15, createdAt: t(-24), updatedAt: t(-24), completedAt: null,
    },
    {
      id: uid("tsk"), title: "Set up CI pipeline", description: "Add the GitHub Actions workflow for tests and deployment preview.",
      course: courses[3], priority: "Medium", status: "In Progress", dueDate: due(5), dueTime: "22:00",
      category: "Project", tags: ["devops"], reminderMinutes: 60, createdAt: t(-22), updatedAt: t(-8), completedAt: null,
    },
    {
      id: uid("tsk"), title: "Write abstract", description: "250-word abstract for the technical writing essay.",
      course: courses[4], priority: "Medium", status: "Completed", dueDate: due(-2), dueTime: "17:00",
      category: "Writing", tags: ["essay"], reminderMinutes: 15, createdAt: t(-60), updatedAt: t(-48), completedAt: t(-48),
    },
    {
      id: uid("tsk"), title: "Meet study group", description: "Compare solutions for problem set 4 in the library.",
      course: courses[2], priority: "Low", status: "Pending", dueDate: due(2), dueTime: "15:00",
      category: "Meeting", tags: ["team"], reminderMinutes: 30, createdAt: t(-20), updatedAt: t(-20), completedAt: null,
    },
  ];

  const events = [
    {
      id: uid("evt"), title: "Database project clinic", description: "Drop-in session with the teaching assistant for schema feedback.",
      category: "Class", date: todayISO(), startTime: "16:00", endTime: "17:00", location: "Block B · Room 204",
      reminderMinutes: 15, color: "#6366F1", status: "Confirmed", repeat: "none", createdAt: t(-60), updatedAt: t(-60),
    },
    {
      id: uid("evt"), title: "Study group: linear algebra", description: "Work through eigenvalues and past paper questions together.",
      category: "Study session", date: due(1), startTime: "18:00", endTime: "19:30", location: "Main library · 2nd floor",
      reminderMinutes: 30, color: "#10B981", status: "Confirmed", repeat: "weekly", createdAt: t(-58), updatedAt: t(-58),
    },
    {
      id: uid("evt"), title: "Mid-semester briefing", description: "Faculty briefing on assessment schedule and academic support.",
      category: "Meeting", date: due(2), startTime: "11:00", endTime: "12:00", location: "Auditorium",
      reminderMinutes: 60, color: "#0EA5E9", status: "Confirmed", repeat: "none", createdAt: t(-54), updatedAt: t(-54),
    },
    {
      id: uid("evt"), title: "Career fair", description: "Meet recruiters from regional tech companies. Bring printed CVs.",
      category: "Personal", date: due(4), startTime: "09:00", endTime: "15:00", location: "University pavilion",
      reminderMinutes: 1440, color: "#8B5CF6", status: "Confirmed", repeat: "none", createdAt: t(-50), updatedAt: t(-50),
    },
    {
      id: uid("evt"), title: "Sprint review", description: "Present the second sprint increment to the project client.",
      category: "Meeting", date: due(3), startTime: "14:00", endTime: "15:00", location: "Block A · Room 101",
      reminderMinutes: 15, color: "#0EA5E9", status: "Confirmed", repeat: "none", createdAt: t(-46), updatedAt: t(-46),
    },
    {
      id: uid("evt"), title: "Library deep work", description: "Two focused hours on the OS report.",
      category: "Study session", date: due(5), startTime: "08:00", endTime: "10:00", location: "Main library",
      reminderMinutes: 10, color: "#10B981", status: "Confirmed", repeat: "none", createdAt: t(-42), updatedAt: t(-42),
    },
    {
      id: uid("evt"), title: "Football with friends", description: "Unwind after the week's classes.",
      category: "Personal", date: due(6), startTime: "16:30", endTime: "18:00", location: "Campus field",
      reminderMinutes: 60, color: "#8B5CF6", status: "Confirmed", repeat: "none", createdAt: t(-38), updatedAt: t(-38),
    },
  ];

  const academicItems = [
    {
      id: uid("acd"), type: "assignment", title: "Normalization exercise", course: courses[0],
      description: "Normalize the supplied relational schema to 3NF and justify every decomposition.",
      dueDate: due(2), dueTime: "23:59", status: "In Progress", priority: "High", marks: 20, score: "",
      reminderMinutes: 1440, notes: "Submit through the LMS as a single PDF.",
      createdAt: t(-72), updatedAt: t(-18),
    },
    {
      id: uid("acd"), type: "assignment", title: "Process scheduling report", course: courses[1],
      description: "Compare FCFS, SJF and round-robin using the provided trace and report average waiting time.",
      dueDate: due(4), dueTime: "17:00", status: "Not Started", priority: "High", marks: 30, score: "",
      reminderMinutes: 1440, notes: "Include the Gantt charts.",
      createdAt: t(-70), updatedAt: t(-70),
    },
    {
      id: uid("acd"), type: "assignment", title: "Sprint 2 deliverable", course: courses[3],
      description: "Deploy the working increment and attach the retrospective and testing evidence.",
      dueDate: due(6), dueTime: "12:00", status: "In Progress", priority: "Urgent", marks: 40, score: "",
      reminderMinutes: 1440, notes: "Team submission — confirm everyone's contribution.",
      createdAt: t(-68), updatedAt: t(-10),
    },
    {
      id: uid("acd"), type: "assignment", title: "Essay: academic integrity", course: courses[4],
      description: "1,200-word argumentative essay with at least six peer-reviewed sources.",
      dueDate: due(-1), dueTime: "23:59", status: "Not Started", priority: "Medium", marks: 15, score: "",
      reminderMinutes: 2880, notes: "Ask for an extension if needed.",
      createdAt: t(-90), updatedAt: t(-90),
    },
    {
      id: uid("acd"), type: "assignment", title: "Matrix transformations", course: courses[2],
      description: "Problem set covering linear maps, kernels and change of basis.",
      dueDate: due(8), dueTime: "10:00", status: "Submitted", priority: "Medium", marks: 25, score: 22,
      reminderMinutes: 1440, notes: "Feedback expected next week.",
      createdAt: t(-100), updatedAt: t(-24),
    },
    {
      id: uid("acd"), type: "exam", title: "Database Systems CAT 2", course: courses[0],
      description: "Covers normalization, transactions, indexing and SQL optimisation.",
      dueDate: due(5), dueTime: "09:00", status: "Upcoming", priority: "High", marks: 30, score: "",
      reminderMinutes: 1440, notes: "Venue: Block B exam hall. Student ID required.",
      createdAt: t(-66), updatedAt: t(-66),
    },
    {
      id: uid("acd"), type: "exam", title: "Linear Algebra final", course: courses[2],
      description: "Comprehensive final assessment across all eight chapters.",
      dueDate: due(12), dueTime: "08:30", status: "Upcoming", priority: "Urgent", marks: 60, score: "",
      reminderMinutes: 2880, notes: "Formula sheet will be provided.",
      createdAt: t(-64), updatedAt: t(-64),
    },
    {
      id: uid("acd"), type: "exam", title: "Operating Systems quiz", course: courses[1],
      description: "Short quiz on concurrency, semaphores and memory management.",
      dueDate: due(2), dueTime: "14:00", status: "Prepared", priority: "High", marks: 20, score: "",
      reminderMinutes: 1440, notes: "Review the past quiz solutions.",
      createdAt: t(-62), updatedAt: t(-16),
    },
  ];

  const studySessions = [
    {
      id: uid("std"), subject: courses[0], topic: "Indexing & query performance", date: todayISO(),
      startTime: "18:00", endTime: "19:30", plannedMinutes: 90, actualMinutes: 0, goal: "Understand B-tree indexes and run EXPLAIN on three queries.",
      status: "Planned", notes: "", reminderMinutes: 15, createdAt: t(-30), updatedAt: t(-30),
    },
    {
      id: uid("std"), subject: courses[2], topic: "Eigenvalues practice", date: todayISO(),
      startTime: "20:30", endTime: "21:30", plannedMinutes: 60, actualMinutes: 0, goal: "Solve eight eigenvalue problems without notes.",
      status: "Planned", notes: "", reminderMinutes: 10, createdAt: t(-28), updatedAt: t(-28),
    },
    {
      id: uid("std"), subject: courses[1], topic: "Deadlocks & recovery", date: due(-1),
      startTime: "19:00", endTime: "20:30", plannedMinutes: 90, actualMinutes: 82, goal: "Summarize deadlock prevention strategies.",
      status: "Completed", notes: "Banker's algorithm still needs practice.", reminderMinutes: 15, createdAt: t(-54), updatedAt: t(-22),
    },
    {
      id: uid("std"), subject: courses[3], topic: "Sprint review preparation", date: due(-2),
      startTime: "16:00", endTime: "17:00", plannedMinutes: 60, actualMinutes: 55, goal: "Prepare demo flow and talking points.",
      status: "Completed", notes: "", reminderMinutes: 15, createdAt: t(-78), updatedAt: t(-52),
    },
    {
      id: uid("std"), subject: courses[0], topic: "Normalization drills", date: due(-3),
      startTime: "10:00", endTime: "11:30", plannedMinutes: 90, actualMinutes: 95, goal: "Complete ten normalization exercises.",
      status: "Completed", notes: "", reminderMinutes: 15, createdAt: t(-100), updatedAt: t(-70),
    },
    {
      id: uid("std"), subject: courses[4], topic: "Essay outlining", date: due(-4),
      startTime: "15:00", endTime: "16:00", plannedMinutes: 60, actualMinutes: 40, goal: "Draft thesis and section outline.",
      status: "Completed", notes: "Outline finished; sources still needed.", reminderMinutes: 15, createdAt: t(-126), updatedAt: t(-96),
    },
    {
      id: uid("std"), subject: courses[2], topic: "Past paper revision", date: due(-5),
      startTime: "09:00", endTime: "11:00", plannedMinutes: 120, actualMinutes: 115, goal: "Complete the 2024 past paper under exam conditions.",
      status: "Completed", notes: "", reminderMinutes: 15, createdAt: t(-150), updatedAt: t(-120),
    },
    {
      id: uid("std"), subject: courses[1], topic: "Scheduling algorithms", date: due(-6),
      startTime: "18:00", endTime: "19:00", plannedMinutes: 60, actualMinutes: 64, goal: "Compare three scheduling algorithms.",
      status: "Completed", notes: "", reminderMinutes: 15, createdAt: t(-174), updatedAt: t(-144),
    },
    {
      id: uid("std"), subject: courses[3], topic: "Testing evidence review", date: due(1),
      startTime: "17:30", endTime: "18:30", plannedMinutes: 60, actualMinutes: 0, goal: "Verify all acceptance tests pass and capture evidence.",
      status: "Planned", notes: "", reminderMinutes: 15, createdAt: t(-24), updatedAt: t(-24),
    },
  ];

  const focusSessions = [
    { id: uid("foc"), subject: courses[0], taskId: null, mode: "Focus", minutes: 25, date: todayISO(), completedAt: t(-6) },
    { id: uid("foc"), subject: courses[0], taskId: null, mode: "Focus", minutes: 25, date: todayISO(), completedAt: t(-5) },
    { id: uid("foc"), subject: courses[1], taskId: null, mode: "Focus", minutes: 25, date: todayISO(), completedAt: t(-3) },
    { id: uid("foc"), subject: courses[2], taskId: null, mode: "Focus", minutes: 25, date: due(-1), completedAt: t(-25) },
    { id: uid("foc"), subject: courses[0], taskId: null, mode: "Focus", minutes: 25, date: due(-2), completedAt: t(-52) },
    { id: uid("foc"), subject: courses[3], taskId: null, mode: "Focus", minutes: 50, date: due(-3), completedAt: t(-72) },
    { id: uid("foc"), subject: courses[0], taskId: null, mode: "Focus", minutes: 25, date: due(-4), completedAt: t(-98) },
    { id: uid("foc"), subject: courses[4], taskId: null, mode: "Focus", minutes: 25, date: due(-5), completedAt: t(-122) },
    { id: uid("foc"), subject: courses[2], taskId: null, mode: "Focus", minutes: 50, date: due(-6), completedAt: t(-146) },
  ];

  const notes = [
    {
      id: uid("not"), title: "ER modelling cheat sheet", course: courses[0], category: "Summary", pinned: true,
      content: "## Core constructs\n- **Entity**: an object with independent existence (Student, Course).\n- **Relationship**: association between entities (Enrols).\n- **Cardinality**: 1:1, 1:N, M:N.\n\n### Weak entities\nA weak entity depends on an identifying owner and uses a partial key. Example: `Payment` identified by `(LoanID, PaymentNo)`.\n\n## Normal forms\n1. **1NF** — atomic values, no repeating groups.\n2. **2NF** — 1NF + no partial dependency on a candidate key.\n3. **3NF** — 2NF + no transitive dependency.\n\n> Remember: decompose, then verify an armstrong test for lossless joins.",
      tags: ["database", "exam"], createdAt: t(-120), updatedAt: t(-12),
    },
    {
      id: uid("not"), title: "OS scheduling algorithms", course: courses[1], category: "Lecture", pinned: true,
      content: "## Comparison\n| Algorithm | Preemptive | Starvation |\n| --- | --- | --- |\n| FCFS | No | No |\n| SJF | No | Yes |\n| Round Robin | Yes | No |\n\n**Key formulas**\n- Turnaround = completion − arrival\n- Waiting = turnaround − burst\n\nRound robin performance depends heavily on the time quantum. A quantum that is too large degrades to FCFS; too small increases context-switch overhead.",
      tags: ["operating-systems", "quiz"], createdAt: t(-96), updatedAt: t(-30),
    },
    {
      id: uid("not"), title: "Sprint retrospective notes", course: courses[3], category: "Meeting", pinned: false,
      content: "## What went well\n- Pair programming reduced integration bugs.\n- Daily stand-ups stayed under 15 minutes.\n\n## What to improve\n- Acceptance criteria were vague for two stories.\n- Need a definition-of-done checklist.\n\n## Actions\n1. Refine stories with the client before sprint planning.\n2. Add a pull-request template with a test checklist.\n3. Rotate the scrum master role.",
      tags: ["team", "sprint"], createdAt: t(-70), updatedAt: t(-26),
    },
    {
      id: uid("not"), title: "Exam study plan", course: "Personal", category: "Plan", pinned: false,
      content: "## Two-week plan\n- **Days 1–3:** Normalization + transactions (90 min daily).\n- **Days 4–6:** Process scheduling, memory management (60 min).\n- **Days 7–9:** Linear algebra past papers (90 min).\n- **Days 10–12:** Mixed retrieval practice and mock exams.\n\nUse active recall, not rereading. Review mistakes in a separate error log.",
      tags: ["planning", "exams"], createdAt: t(-52), updatedAt: t(-8),
    },
    {
      id: uid("not"), title: "APA citation quick guide", course: courses[4], category: "Reference", pinned: false,
      content: "## Journal article\nAuthor, A. A. (Year). Title of article. *Journal Name, volume*(issue), pages. https://doi.org/xxxx\n\n## Book\nAuthor, A. A. (Year). *Title of work*. Publisher.\n\n## In-text\n- Citation: (Author, Year)\n- Narrative: Author (Year) argues that…\n\nRemember to alphabetize the reference list by author surname and use a hanging indent.",
      tags: ["writing", "citation"], createdAt: t(-44), updatedAt: t(-44),
    },
  ];

  const notifications = [
    {
      id: uid("ntf"), title: "Assignment due in 2 days", message: "Normalization exercise (Database Systems) is due in 2 days at 11:59 PM.",
      type: "deadline", sourceType: "academicItems", sourceId: academicItems[0].id, createdAt: t(-3), readAt: null,
    },
    {
      id: uid("ntf"), title: "Class begins in 30 minutes", message: "Database Systems starts at 9:00 AM in Block B · Room 204.",
      type: "class", sourceType: "timetable", sourceId: timetable[0].id, createdAt: t(-5), readAt: null,
    },
    {
      id: uid("ntf"), title: "Operating Systems quiz", message: "The Operating Systems quiz is scheduled for " + format(addDays(new Date(), 2), "dd MMM") + ".",
      type: "exam", sourceType: "academicItems", sourceId: academicItems[7].id, createdAt: t(-20), readAt: t(-18),
    },
    {
      id: uid("ntf"), title: "Study goal progress", message: "You completed 75 focus minutes today. 105 minutes remain to reach your daily goal.",
      type: "system", sourceType: null, sourceId: null, createdAt: t(-22), readAt: null,
    },
    {
      id: uid("ntf"), title: "Automatic backup created", message: "Your workspace was saved automatically. Open Settings → Data to view backup history.",
      type: "system", sourceType: null, sourceId: null, createdAt: t(-30), readAt: t(-29),
    },
  ];

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    tasks, events, timetable, studySessions, academicItems, notes, notifications, focusSessions,
    backups: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
