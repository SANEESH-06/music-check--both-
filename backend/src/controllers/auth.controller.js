import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";

export async function login(req, reply) {
  const { email, password } = req.body;

  if (!email || !password) {
    return reply.code(400).send({
      message: "Email and password are required."
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  const isValidPassword = user && await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    return reply.code(401).send({
      message: "Invalid email or password."
    });
  }

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email, plan: user.plan },
    env.jwtSecret,
    { expiresIn: "1d" }
  );

  return reply.send({
    message: "Login successful.",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan
    }
  });
}

export async function register(req, reply) {
  const { name, email, password, plan } = req.body ?? {};

  if (!name || !email || !password) {
    return reply.code(400).send({
      message: "Name, email, and password are required."
    });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return reply.code(409).send({
      message: "A user with this email already exists."
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    plan: plan || "premium"
  });

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email, plan: user.plan },
    env.jwtSecret,
    { expiresIn: "1d" }
  );

  return reply.code(201).send({
    message: "Registration successful.",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan
    }
  });
}

export function me(req, reply) {
  return reply.send({
    user: req.user
  });
}

