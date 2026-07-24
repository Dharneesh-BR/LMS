import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { razorpay } from "../config/razorpay.js";
import { env } from "../config/env.js";
import { ApiError, asyncHandler } from "../middleware/error.middleware.js";
import { getCourseBySanityId } from "../services/course.service.js";

export const createOrder = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const sanityCourse = await getCourseBySanityId(courseId);

  if (!sanityCourse) {
    throw new ApiError(404, "Course not found");
  }

  const course = await prisma.course.findUnique({ where: { sanityId: sanityCourse._id } });
  const amount = Number(course.price || 0);

  if (amount <= 0) {
    throw new ApiError(400, "Course is free; use /api/enroll");
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `${req.auth.user.id}_${course.id}`.slice(0, 40),
    notes: { courseId: course.sanityId, userId: req.auth.user.id }
  });

  const order = await prisma.order.create({
    data: {
      userId: req.auth.user.id,
      courseId: course.id,
      razorpayOrderId: razorpayOrder.id,
      amount
    }
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: req.auth.user.id, courseId: course.id } },
    update: { paymentStatus: "PENDING" },
    create: { userId: req.auth.user.id, courseId: course.id, paymentStatus: "PENDING" }
  });

  res.status(201).json({
    order,
    razorpay: {
      key: env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    }
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    await prisma.order.update({
      where: { razorpayOrderId: razorpay_order_id },
      data: { status: "FAILED" }
    });
    throw new ApiError(400, "Invalid payment signature");
  }

  const order = await prisma.order.update({
    where: { razorpayOrderId: razorpay_order_id },
    data: {
      status: "PAID",
      razorpayPaymentId: razorpay_payment_id
    }
  });

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: order.userId, courseId: order.courseId } },
    update: { paymentStatus: "PAID" },
    create: { userId: order.userId, courseId: order.courseId, paymentStatus: "PAID" }
  });

  res.json({ order, enrollment });
});

