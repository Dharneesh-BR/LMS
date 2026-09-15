import ExcelJS from "exceljs";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { ApiError } from "../middleware/error.middleware.js";

const reportDefinitions = {
  all: "All LMS Reports",
  learners: "Learners",
  courses: "Courses",
  progress: "Lesson Progress",
  completions: "Course Completions",
  assessments: "Assessment Attempts",
  certificates: "Certificates",
  enrollments: "Enrollments",
  orders: "Orders"
};

function sortByCountDesc(items) {
  return [...items].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function countByLabel(items, key) {
  const counts = new Map();
  items.forEach((item) => {
    const label = item[key]?.trim() || "Not set";
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return sortByCountDesc([...counts.entries()].map(([label, count]) => ({ label, count })));
}

function uniqueCount(items, key) {
  return new Set(items.map((item) => item[key]).filter(Boolean)).size;
}

function getLatestDate(dates) {
  return dates
    .filter(Boolean)
    .map((date) => new Date(date))
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
}

function formatReportDate(value) {
  if (!value) return "";
  return new Date(value).toISOString();
}

function safeSheetName(name) {
  return name.replace(/[\\/*?:[\]]/g, "").slice(0, 31);
}

function addWorksheet(workbook, name, columns, rows) {
  const worksheet = workbook.addWorksheet(safeSheetName(name));
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || Math.max(14, column.header.length + 2)
  }));
  worksheet.addRows(rows);

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF050052" }
  };
  worksheet.getRow(1).alignment = { vertical: "middle" };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  };

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } }
      };
    });
  });

  return worksheet;
}

async function getReportData() {
  const [
    users,
    courses,
    progressRows,
    courseCompletions,
    assessmentAttempts,
    certificates,
    enrollments,
    orders
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        progress: { select: { courseId: true, completed: true } },
        courseCompletions: { select: { id: true } },
        certificates: { select: { id: true } },
        assessmentAttempts: { select: { id: true, passed: true } }
      }
    }),
    prisma.course.findMany({
      orderBy: { title: "asc" },
      include: {
        progress: { select: { userId: true, completed: true } },
        courseCompletions: { select: { id: true } },
        certificates: { select: { id: true } },
        enrollments: { select: { id: true } },
        assessmentAttempts: { select: { id: true, passed: true } }
      }
    }),
    prisma.progress.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { name: true, email: true, companyName: true, phoneNumber: true, department: true, designation: true } },
        course: { select: { title: true, sanityId: true } }
      }
    }),
    prisma.courseCompletion.findMany({
      orderBy: { completedAt: "desc" },
      include: {
        user: { select: { name: true, email: true, companyName: true, phoneNumber: true, department: true, designation: true } },
        course: { select: { title: true, sanityId: true } },
        certificate: { select: { certificateNumber: true, issuedAt: true } }
      }
    }),
    prisma.assessmentAttempt.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, companyName: true, phoneNumber: true, department: true, designation: true } },
        course: { select: { title: true, sanityId: true } }
      }
    }),
    prisma.certificate.findMany({
      orderBy: { issuedAt: "desc" },
      include: {
        user: { select: { name: true, email: true, companyName: true, phoneNumber: true, department: true, designation: true } },
        course: { select: { title: true, sanityId: true } }
      }
    }),
    prisma.enrollment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, companyName: true, phoneNumber: true, department: true, designation: true } },
        course: { select: { title: true, sanityId: true } }
      }
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, companyName: true, phoneNumber: true, department: true, designation: true } },
        course: { select: { title: true, sanityId: true } }
      }
    })
  ]);

  return { users, courses, progressRows, courseCompletions, assessmentAttempts, certificates, enrollments, orders };
}

function addLearnersReport(workbook, users) {
  addWorksheet(
    workbook,
    reportDefinitions.learners,
    [
      { header: "Name", key: "name", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Company Name", key: "companyName", width: 28 },
      { header: "Phone Number", key: "phoneNumber", width: 18 },
      { header: "Role", key: "role", width: 14 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Started Courses", key: "startedCourses", width: 18 },
      { header: "Completed Lessons", key: "completedLessons", width: 20 },
      { header: "Course Completions", key: "courseCompletions", width: 20 },
      { header: "Certificates", key: "certificates", width: 14 },
      { header: "Assessment Attempts", key: "assessmentAttempts", width: 22 },
      { header: "Passed Assessments", key: "passedAssessments", width: 22 },
      { header: "Created At", key: "createdAt", width: 24 }
    ],
    users.map((user) => ({
      name: user.name || "",
      email: user.email,
      companyName: user.companyName || "",
      phoneNumber: user.phoneNumber || "",
      role: user.role,
      department: user.department || "",
      designation: user.designation || "",
      startedCourses: uniqueCount(user.progress, "courseId"),
      completedLessons: user.progress.filter((item) => item.completed).length,
      courseCompletions: user.courseCompletions.length,
      certificates: user.certificates.length,
      assessmentAttempts: user.assessmentAttempts.length,
      passedAssessments: user.assessmentAttempts.filter((item) => item.passed).length,
      createdAt: formatReportDate(user.createdAt)
    }))
  );
}

function addCoursesReport(workbook, courses) {
  addWorksheet(
    workbook,
    reportDefinitions.courses,
    [
      { header: "Course Title", key: "title", width: 36 },
      { header: "Sanity ID", key: "sanityId", width: 40 },
      { header: "Learners Started", key: "learnersStarted", width: 18 },
      { header: "Completed Lessons", key: "completedLessons", width: 20 },
      { header: "Course Completions", key: "courseCompletions", width: 20 },
      { header: "Certificates", key: "certificates", width: 14 },
      { header: "Enrollments", key: "enrollments", width: 14 },
      { header: "Assessment Attempts", key: "assessmentAttempts", width: 22 },
      { header: "Passed Assessments", key: "passedAssessments", width: 22 },
      { header: "Created At", key: "createdAt", width: 24 }
    ],
    courses.map((course) => ({
      title: course.title,
      sanityId: course.sanityId,
      learnersStarted: uniqueCount(course.progress, "userId"),
      completedLessons: course.progress.filter((item) => item.completed).length,
      courseCompletions: course.courseCompletions.length,
      certificates: course.certificates.length,
      enrollments: course.enrollments.length,
      assessmentAttempts: course.assessmentAttempts.length,
      passedAssessments: course.assessmentAttempts.filter((item) => item.passed).length,
      createdAt: formatReportDate(course.createdAt)
    }))
  );
}

function addProgressReport(workbook, progressRows) {
  addWorksheet(
    workbook,
    reportDefinitions.progress,
    [
      { header: "Learner Name", key: "name", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Company Name", key: "companyName", width: 28 },
      { header: "Phone Number", key: "phoneNumber", width: 18 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Course", key: "course", width: 36 },
      { header: "Course Sanity ID", key: "courseSanityId", width: 40 },
      { header: "Lesson ID", key: "lessonId", width: 40 },
      { header: "Watched Seconds", key: "watchedSeconds", width: 18 },
      { header: "Duration Seconds", key: "durationSeconds", width: 18 },
      { header: "Content Completed", key: "contentCompleted", width: 20 },
      { header: "Lesson Completed", key: "completed", width: 18 },
      { header: "Updated At", key: "updatedAt", width: 24 }
    ],
    progressRows.map((progress) => ({
      name: progress.user.name || "",
      email: progress.user.email,
      companyName: progress.user.companyName || "",
      phoneNumber: progress.user.phoneNumber || "",
      department: progress.user.department || "",
      designation: progress.user.designation || "",
      course: progress.course.title,
      courseSanityId: progress.course.sanityId,
      lessonId: progress.lessonId,
      watchedSeconds: progress.watchedSeconds,
      durationSeconds: progress.durationSeconds,
      contentCompleted: progress.contentCompleted ? "Yes" : "No",
      completed: progress.completed ? "Yes" : "No",
      updatedAt: formatReportDate(progress.updatedAt)
    }))
  );
}

function addCompletionsReport(workbook, courseCompletions) {
  addWorksheet(
    workbook,
    reportDefinitions.completions,
    [
      { header: "Learner Name", key: "name", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Company Name", key: "companyName", width: 28 },
      { header: "Phone Number", key: "phoneNumber", width: 18 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Course", key: "course", width: 36 },
      { header: "Course Sanity ID", key: "courseSanityId", width: 40 },
      { header: "Completed At", key: "completedAt", width: 24 },
      { header: "Certificate Number", key: "certificateNumber", width: 26 },
      { header: "Certificate Issued At", key: "certificateIssuedAt", width: 24 }
    ],
    courseCompletions.map((completion) => ({
      name: completion.user.name || "",
      email: completion.user.email,
      companyName: completion.user.companyName || "",
      phoneNumber: completion.user.phoneNumber || "",
      department: completion.user.department || "",
      designation: completion.user.designation || "",
      course: completion.course.title,
      courseSanityId: completion.course.sanityId,
      completedAt: formatReportDate(completion.completedAt),
      certificateNumber: completion.certificate?.certificateNumber || "",
      certificateIssuedAt: formatReportDate(completion.certificate?.issuedAt)
    }))
  );
}

function addAssessmentsReport(workbook, assessmentAttempts) {
  addWorksheet(
    workbook,
    reportDefinitions.assessments,
    [
      { header: "Learner Name", key: "name", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Company Name", key: "companyName", width: 28 },
      { header: "Phone Number", key: "phoneNumber", width: 18 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Course", key: "course", width: 36 },
      { header: "Assessment ID", key: "assessmentId", width: 40 },
      { header: "Lesson ID", key: "lessonId", width: 40 },
      { header: "Type", key: "type", width: 14 },
      { header: "Score", key: "score", width: 12 },
      { header: "Passing Percentage", key: "passingPercentage", width: 22 },
      { header: "Passed", key: "passed", width: 12 },
      { header: "Attempt Number", key: "attemptNumber", width: 18 },
      { header: "Created At", key: "createdAt", width: 24 }
    ],
    assessmentAttempts.map((attempt) => ({
      name: attempt.user.name || "",
      email: attempt.user.email,
      companyName: attempt.user.companyName || "",
      phoneNumber: attempt.user.phoneNumber || "",
      department: attempt.user.department || "",
      designation: attempt.user.designation || "",
      course: attempt.course.title,
      assessmentId: attempt.assessmentId,
      lessonId: attempt.lessonId || "",
      type: attempt.type,
      score: attempt.score,
      passingPercentage: attempt.passingPercentage,
      passed: attempt.passed ? "Yes" : "No",
      attemptNumber: attempt.attemptNumber,
      createdAt: formatReportDate(attempt.createdAt)
    }))
  );
}

function addCertificatesReport(workbook, certificates) {
  addWorksheet(
    workbook,
    reportDefinitions.certificates,
    [
      { header: "Certificate Number", key: "certificateNumber", width: 28 },
      { header: "Recipient Name", key: "recipientName", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Company Name", key: "companyName", width: 28 },
      { header: "Phone Number", key: "phoneNumber", width: 18 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Course", key: "course", width: 36 },
      { header: "Course Sanity ID", key: "courseSanityId", width: 40 },
      { header: "Completed At", key: "completedAt", width: 24 },
      { header: "Issued At", key: "issuedAt", width: 24 },
      { header: "LinkedIn Shared At", key: "linkedinSharedAt", width: 24 },
      { header: "Template ID", key: "templateId", width: 28 },
      { header: "Template Version", key: "templateVersion", width: 18 }
    ],
    certificates.map((certificate) => ({
      certificateNumber: certificate.certificateNumber,
      recipientName: certificate.recipientName,
      email: certificate.user.email,
      companyName: certificate.user.companyName || "",
      phoneNumber: certificate.user.phoneNumber || "",
      department: certificate.user.department || "",
      designation: certificate.user.designation || "",
      course: certificate.course.title,
      courseSanityId: certificate.course.sanityId,
      completedAt: formatReportDate(certificate.completedAt),
      issuedAt: formatReportDate(certificate.issuedAt),
      linkedinSharedAt: formatReportDate(certificate.linkedinSharedAt),
      templateId: certificate.templateId,
      templateVersion: certificate.templateVersion
    }))
  );
}

function addEnrollmentsReport(workbook, enrollments) {
  addWorksheet(
    workbook,
    reportDefinitions.enrollments,
    [
      { header: "Learner Name", key: "name", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Company Name", key: "companyName", width: 28 },
      { header: "Phone Number", key: "phoneNumber", width: 18 },
      { header: "Department", key: "department", width: 20 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Course", key: "course", width: 36 },
      { header: "Course Sanity ID", key: "courseSanityId", width: 40 },
      { header: "Payment Status", key: "paymentStatus", width: 18 },
      { header: "Created At", key: "createdAt", width: 24 },
      { header: "Updated At", key: "updatedAt", width: 24 }
    ],
    enrollments.map((enrollment) => ({
      name: enrollment.user.name || "",
      email: enrollment.user.email,
      companyName: enrollment.user.companyName || "",
      phoneNumber: enrollment.user.phoneNumber || "",
      department: enrollment.user.department || "",
      designation: enrollment.user.designation || "",
      course: enrollment.course.title,
      courseSanityId: enrollment.course.sanityId,
      paymentStatus: enrollment.paymentStatus,
      createdAt: formatReportDate(enrollment.createdAt),
      updatedAt: formatReportDate(enrollment.updatedAt)
    }))
  );
}

function addOrdersReport(workbook, orders) {
  addWorksheet(
    workbook,
    reportDefinitions.orders,
    [
      { header: "Learner Name", key: "name", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Company Name", key: "companyName", width: 28 },
      { header: "Phone Number", key: "phoneNumber", width: 18 },
      { header: "Course", key: "course", width: 36 },
      { header: "Course Sanity ID", key: "courseSanityId", width: 40 },
      { header: "Status", key: "status", width: 14 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Razorpay Order ID", key: "razorpayOrderId", width: 30 },
      { header: "Razorpay Payment ID", key: "razorpayPaymentId", width: 30 },
      { header: "Created At", key: "createdAt", width: 24 },
      { header: "Updated At", key: "updatedAt", width: 24 }
    ],
    orders.map((order) => ({
      name: order.user.name || "",
      email: order.user.email,
      companyName: order.user.companyName || "",
      phoneNumber: order.user.phoneNumber || "",
      course: order.course.title,
      courseSanityId: order.course.sanityId,
      status: order.status,
      amount: order.amount,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId || "",
      createdAt: formatReportDate(order.createdAt),
      updatedAt: formatReportDate(order.updatedAt)
    }))
  );
}

function buildWorkbook(type, data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Magnafic LMS";
  workbook.created = new Date();
  workbook.modified = new Date();

  const adders = {
    learners: () => addLearnersReport(workbook, data.users),
    courses: () => addCoursesReport(workbook, data.courses),
    progress: () => addProgressReport(workbook, data.progressRows),
    completions: () => addCompletionsReport(workbook, data.courseCompletions),
    assessments: () => addAssessmentsReport(workbook, data.assessmentAttempts),
    certificates: () => addCertificatesReport(workbook, data.certificates),
    enrollments: () => addEnrollmentsReport(workbook, data.enrollments),
    orders: () => addOrdersReport(workbook, data.orders)
  };

  if (type === "all") {
    Object.values(adders).forEach((add) => add());
    return workbook;
  }

  adders[type]();
  return workbook;
}

export const getAnalytics = asyncHandler(async (_req, res) => {
  const [
    users,
    courses,
    progressRows,
    completedLessons,
    courseCompletions,
    certificates,
    assessmentAttempts,
    recentActivity,
    recentUsers
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        phoneNumber: true,
        department: true,
        designation: true,
        role: true,
        createdAt: true
      }
    }),
    prisma.course.findMany({
      orderBy: { title: "asc" },
      include: {
        progress: {
          select: {
            userId: true,
            completed: true,
            updatedAt: true
          }
        },
        courseCompletions: {
          select: {
            completedAt: true
          }
        },
        certificates: {
          select: {
            id: true,
            issuedAt: true
          }
        }
      }
    }),
    prisma.progress.findMany({
      select: {
        userId: true,
        courseId: true,
        completed: true,
        updatedAt: true
      }
    }),
    prisma.progress.count({ where: { completed: true } }),
    prisma.courseCompletion.count(),
    prisma.certificate.count(),
    prisma.assessmentAttempt.findMany({
      select: {
        passed: true,
        type: true
      }
    }),
    prisma.progress.findMany({
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { name: true, email: true, companyName: true, phoneNumber: true, department: true, designation: true } },
        course: { select: { title: true, sanityId: true } }
      }
    }),
    prisma.user.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        phoneNumber: true,
        department: true,
        designation: true,
        role: true,
        createdAt: true
      }
    })
  ]);

  const finalAttempts = assessmentAttempts.filter((attempt) => attempt.type === "FINAL");
  const activeLearners = uniqueCount(progressRows, "userId");
  const startedCourses = uniqueCount(progressRows, "courseId");
  const coursePerformance = courses.map((course) => {
    const latestActivityAt = getLatestDate([
      ...course.progress.map((item) => item.updatedAt),
      ...course.courseCompletions.map((item) => item.completedAt),
      ...course.certificates.map((item) => item.issuedAt)
    ]);

    return {
      id: course.id,
      sanityId: course.sanityId,
      title: course.title,
      learnerCount: uniqueCount(course.progress, "userId"),
      completedLessons: course.progress.filter((item) => item.completed).length,
      completions: course.courseCompletions.length,
      certificates: course.certificates.length,
      latestActivityAt
    };
  });

  res.json({
    totals: {
      users: users.length,
      courses: courses.length,
      activeLearners,
      startedCourses,
      completedLessons,
      completedCourses: courseCompletions,
      certificates,
      assessmentAttempts: assessmentAttempts.length,
      passedAssessments: assessmentAttempts.filter((attempt) => attempt.passed).length,
      finalPasses: finalAttempts.filter((attempt) => attempt.passed).length
    },
    breakdowns: {
      departments: countByLabel(users, "department"),
      designations: countByLabel(users, "designation")
    },
    coursePerformance,
    recentActivity,
    recentUsers
  });
});

export const downloadReport = asyncHandler(async (req, res) => {
  const type = req.params.type;
  if (!reportDefinitions[type]) {
    throw new ApiError(404, "Report type not found");
  }

  const workbook = buildWorkbook(type, await getReportData());
  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `magnafic-lms-${type}-report-${stamp}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
});
