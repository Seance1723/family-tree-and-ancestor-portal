import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "family-tree-portal-secret";
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "family_tree_portal";

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
});

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// JWT middleware
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function isAdmin(req: express.Request): Promise<boolean> {
  const user = (req as any).user as { userId: string; email: string } | undefined;
  if (!user) return false;
  const [rows] = await pool.query("SELECT is_admin FROM users WHERE id = ?", [user.userId]) as any[];
  return rows.length > 0 && !!rows[0].is_admin;
}

// Helpers for JSON columns
function parseJson<T>(value: any): T | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as any;
    }
  }
  return value as T;
}

function stringifyJson(value: any): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

type SubscriptionData = {
  history?: any[];
  [key: string]: any;
};

function memberToFrontend(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    birthdate: row.birthdate,
    birthplace: row.birthplace,
    gender: row.gender,
    relationshipToRoot: row.relationship_to_root,
    parents: parseJson<string[]>(row.parents) || [],
    siblings: parseJson<string[]>(row.siblings) || [],
    children: parseJson<string[]>(row.children) || [],
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    address: row.address,
    privacy: row.privacy,
    isAncestor: !!row.is_ancestor,
    photos: parseJson<string[]>(row.photos) || [],
    notes: row.notes,
    createdAt: Number(row.created_at),
    access_controls: parseJson(row.access_controls),
    advanced_privacy: parseJson(row.advanced_privacy),
    synced: !!row.synced,
    pendingSync: row.pending_sync,
  };
}

function documentToFrontend(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    date: row.date,
    fileData: row.file_data,
    tags: parseJson<string[]>(row.tags) || [],
    linkedMemberIds: parseJson<string[]>(row.linked_member_ids) || [],
    createdAt: Number(row.created_at),
    synced: !!row.synced,
    pendingSync: row.pending_sync,
  };
}

function reminderToFrontend(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    memberId: row.member_id,
    title: row.title,
    date: row.date,
    type: row.type,
    remindDaysBefore: row.remind_days_before,
    createdAt: Number(row.created_at),
    synced: !!row.synced,
    pendingSync: row.pending_sync,
  };
}

function requestToFrontend(row: any) {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    fromUserEmail: row.from_user_email,
    toUserId: row.to_user_id,
    memberId: row.member_id,
    memberName: row.member_name,
    status: row.status,
    allowedFields: parseJson<string[]>(row.allowed_fields) || [],
    createdAt: Number(row.created_at),
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Run schema migration checks
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_active'") as any[];
    if (columns.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE");
      console.log("[db] Added column 'is_active' to 'users' table.");
    }
  } catch (error) {
    console.error("[db] Migration error checking 'is_active' column:", error);
  }
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_admin'") as any[];
    if (columns.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE");
      console.log("[db] Added column 'is_admin' to 'users' table.");
    }
  } catch (error) {
    console.error("[db] Migration error checking 'is_admin' column:", error);
  }
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM contact_messages LIKE 'name'") as any[];
    if (columns.length === 0) {
      await pool.query("ALTER TABLE contact_messages ADD COLUMN name VARCHAR(255) DEFAULT NULL AFTER user_id");
      console.log("[db] Added column 'name' to 'contact_messages' table.");
    }
  } catch (error) {
    console.error("[db] Migration error checking 'name' column:", error);
  }
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'dob'") as any[];
    if (columns.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN dob VARCHAR(128) DEFAULT NULL");
      console.log("[db] Added column 'dob' to 'users' table.");
    }
  } catch (error) {
    console.error("[db] Migration error checking 'dob' column:", error);
  }
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'gender'") as any[];
    if (columns.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN gender VARCHAR(64) DEFAULT NULL");
      console.log("[db] Added column 'gender' to 'users' table.");
    }
  } catch (error) {
    console.error("[db] Migration error checking 'gender' column:", error);
  }
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM family_members LIKE 'linked_user_id'") as any[];
    if (columns.length === 0) {
      await pool.query("ALTER TABLE family_members ADD COLUMN linked_user_id VARCHAR(128) DEFAULT NULL");
      console.log("[db] Added column 'linked_user_id' to 'family_members' table.");
    }
  } catch (error) {
    console.error("[db] Migration error checking 'linked_user_id' column:", error);
  }
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_verified'") as any[];
    if (columns.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE");
      console.log("[db] Added column 'is_verified' to 'users' table.");
    }
  } catch (error) {
    console.error("[db] Migration error checking 'is_verified' column:", error);
  }
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'verification_otp'") as any[];
    if (columns.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN verification_otp VARCHAR(6) DEFAULT NULL");
      console.log("[db] Added column 'verification_otp' to 'users' table.");
    }
  } catch (error) {
    console.error("[db] Migration error checking 'verification_otp' column:", error);
  }
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'reset_token'") as any[];
    if (columns.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL");
      await pool.query("ALTER TABLE users ADD COLUMN reset_token_expires BIGINT DEFAULT NULL");
      console.log("[db] Added column 'reset_token' and 'reset_token_expires' to 'users' table.");
    }
  } catch (error) {
    console.error("[db] Migration error checking 'reset_token' column:", error);
  }
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'mfa_enabled'") as any[];
    if (columns.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE");
      await pool.query("ALTER TABLE users ADD COLUMN mfa_code VARCHAR(6) DEFAULT NULL");
      await pool.query("ALTER TABLE users ADD COLUMN mfa_expires BIGINT DEFAULT NULL");
      console.log("[db] Added column 'mfa_enabled', 'mfa_code', and 'mfa_expires' to 'users' table.");
    }
  } catch (error) {
    console.error("[db] Migration error checking 'mfa_enabled' column:", error);
  }

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Health Check
  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch (e: any) {
      res.status(500).json({ status: "error", database: e.message });
    }
  });

  // ---------------------------------------------------------------------------
  // AUTH & SPAM PROTECTION
  // ---------------------------------------------------------------------------
  const registrationLimiter = new Map<string, number[]>();
  const DISPOSABLE_DOMAINS = [
    "tempmail.com",
    "yopmail.com",
    "mailinator.com",
    "trashmail.com",
    "10minutemail.com",
    "temp-mail.org",
    "fakeinbox.com"
  ];

  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const attempts = registrationLimiter.get(ip) || [];
    const recent = attempts.filter((t) => now - t < 120000); // 2 minutes window
    recent.push(now);
    registrationLimiter.set(ip, recent);
    return recent.length <= 5; // limit to 5 requests per 2 mins
  }

  function isDisposableEmail(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase();
    return DISPOSABLE_DOMAINS.includes(domain);
  }

  app.post("/api/auth/register", async (req, res) => {
    try {
      const ip = req.ip || "unknown";
      if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: "Too many requests. Please try again after 2 minutes." });
      }

      const { email, password, displayName, dob, gender } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Format validation regex check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address format" });
      }

      // Spam blacklist domain check
      if (isDisposableEmail(email)) {
        return res.status(400).json({ error: "Registration blocked: This email provider is flagged for spam/abuse." });
      }

      const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]) as any[];
      if (existing.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const id = uuidv4();
      const hash = await bcrypt.hash(password, 10);
      const now = Date.now();
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      await pool.query(
        "INSERT INTO users (id, email, password_hash, display_name, dob, gender, created_at, is_verified, verification_otp) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?)",
        [id, email, hash, displayName || null, dob || null, gender || null, now, otp]
      );

      console.log(`[AUTH] Verification OTP for ${email} is: ${otp}`);

      res.json({
        requiresVerification: true,
        email,
        devOtpCode: otp
      });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const ip = req.ip || "unknown";
      if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: "Too many login attempts. Please wait 2 minutes." });
      }

      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]) as any[];
      if (rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const user = rows[0];
      if (!user.is_active) {
        return res.status(403).json({ error: "Account deactivated. Please contact support." });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if user has verified email
      if (!user.is_verified) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.query("UPDATE users SET verification_otp = ? WHERE id = ?", [otp, user.id]);
        console.log(`[AUTH] Verification OTP for unverified user ${email} is: ${otp}`);
        return res.json({
          requiresVerification: true,
          email,
          devOtpCode: otp
        });
      }

      // Check if MFA is enabled
      if (user.mfa_enabled) {
        const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
        const mfaExpires = Date.now() + 5 * 60 * 1000;
        await pool.query("UPDATE users SET mfa_code = ?, mfa_expires = ? WHERE id = ?", [mfaCode, mfaExpires, user.id]);
        console.log(`[AUTH] Login MFA Code for ${email} is: ${mfaCode}`);
        return res.json({
          requiresMfa: true,
          email,
          devMfaCode: mfaCode
        });
      }

      await pool.query("UPDATE family_members SET linked_user_id = ? WHERE contact_email = ?", [user.id, email]);
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({
        user: { id: user.id, email: user.email, displayName: user.display_name, isAdmin: !!user.is_admin, isActive: true, dob: user.dob, gender: user.gender, mfaEnabled: !!user.mfa_enabled },
        token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP code are required" });
      }
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]) as any[];
      if (rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = rows[0];
      if (user.verification_otp !== otp) {
        return res.status(400).json({ error: "Invalid verification code. Please try again." });
      }

      await pool.query("UPDATE users SET is_verified = TRUE, verification_otp = NULL WHERE id = ?", [user.id]);
      await pool.query("UPDATE family_members SET linked_user_id = ? WHERE contact_email = ?", [user.id, email]);

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          isAdmin: !!user.is_admin,
          isActive: true,
          dob: user.dob,
          gender: user.gender
        },
        token
      });
    } catch (error: any) {
      console.error("Verification error:", error);
      res.status(500).json({ error: error.message || "Verification process failed" });
    }
  });

  function parseJwt(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  app.post("/api/auth/google-login", async (req, res) => {
    try {
      let { googleId, email, displayName, dob, gender, credentialToken } = req.body;

      if (credentialToken) {
        const decoded = parseJwt(credentialToken);
        if (decoded) {
          googleId = `google_${decoded.sub}`;
          email = decoded.email;
          displayName = decoded.name || decoded.given_name || email.split("@")[0];
        } else {
          return res.status(400).json({ error: "Invalid google credential token payload format" });
        }
      }

      if (!googleId || !email) {
        return res.status(400).json({ error: "googleId and email are required" });
      }

      // Check if disposable email used
      if (isDisposableEmail(email)) {
        return res.status(400).json({ error: "Signup blocked: Google account email provider is flagged for spam/abuse." });
      }

      let [rows] = await pool.query("SELECT * FROM users WHERE google_id = ?", [googleId]) as any[];
      let userId: string;
      let userRecord: any;
      const isMockAccount = email === "tanvi@gmail.com" || email === "jane@kinly.com";

      if (rows.length > 0) {
        userRecord = rows[0];
        userId = userRecord.id;
        if (dob || gender || displayName) {
          await pool.query(
            "UPDATE users SET dob = COALESCE(?, dob), gender = COALESCE(?, gender), display_name = COALESCE(?, display_name) WHERE id = ?",
            [dob || null, gender || null, displayName || null, userId]
          );
          const [updatedRows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]) as any[];
          userRecord = updatedRows[0];
        }
      } else {
        const [emailRows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]) as any[];
        if (emailRows.length > 0) {
          userRecord = emailRows[0];
          userId = userRecord.id;
          await pool.query(
            "UPDATE users SET google_id = ?, dob = COALESCE(?, dob), gender = COALESCE(?, gender), display_name = COALESCE(?, display_name) WHERE id = ?",
            [googleId, dob || null, gender || null, displayName || null, userId]
          );
          const [updatedRows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]) as any[];
          userRecord = updatedRows[0];
        } else {
          userId = uuidv4();
          const now = Date.now();
          const isVerified = isMockAccount ? 1 : 0;
          const otp = isMockAccount ? null : Math.floor(100000 + Math.random() * 900000).toString();

          await pool.query(
            "INSERT INTO users (id, email, display_name, google_id, dob, gender, created_at, is_verified, verification_otp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [userId, email, displayName || null, googleId, dob || null, gender || null, now, isVerified, otp]
          );

          if (!isMockAccount) {
            console.log(`[AUTH] Verification OTP for custom Google user ${email} is: ${otp}`);
          }

          const [newRows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]) as any[];
          userRecord = newRows[0];
        }
      }

      if (!userRecord.is_active) {
        return res.status(403).json({ error: "Account deactivated. Please contact support." });
      }

      // Check if custom Google account user is verified
      if (!userRecord.is_verified && !isMockAccount) {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.query("UPDATE users SET verification_otp = ? WHERE id = ?", [otpCode, userId]);
        console.log(`[AUTH] Google verification OTP for ${email} is: ${otpCode}`);
        return res.json({
          requiresVerification: true,
          email,
          devOtpCode: otpCode
        });
      }

      // Check if MFA is enabled
      if (userRecord.mfa_enabled) {
        const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
        const mfaExpires = Date.now() + 5 * 60 * 1000;
        await pool.query("UPDATE users SET mfa_code = ?, mfa_expires = ? WHERE id = ?", [mfaCode, mfaExpires, userId]);
        console.log(`[AUTH] Google Login MFA Code for ${email} is: ${mfaCode}`);
        return res.json({
          requiresMfa: true,
          email,
          devMfaCode: mfaCode
        });
      }

      await pool.query("UPDATE family_members SET linked_user_id = ? WHERE contact_email = ?", [userId, email]);
      const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({
        user: {
          id: userId,
          email: userRecord.email,
          displayName: userRecord.display_name,
          isAdmin: !!userRecord.is_admin,
          isActive: !!userRecord.is_active,
          dob: userRecord.dob,
          gender: userRecord.gender,
          mfaEnabled: !!userRecord.mfa_enabled
        },
        token
      });
    } catch (error: any) {
      console.error("Google login error:", error);
      res.status(500).json({ error: error.message || "Google login failed" });
    }
  });

  app.post("/api/auth/profile", authenticate, async (req, res) => {
    try {
      const user = (req as any).user as { userId: string; email: string };
      const { dob, gender, displayName } = req.body;
      await pool.query(
        "UPDATE users SET dob = ?, gender = ?, display_name = ? WHERE id = ?",
        [dob || null, gender || null, displayName || null, user.userId]
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update profile" });
    }
  });

  app.get("/api/users/linked-members", authenticate, async (req, res) => {
    try {
      const user = (req as any).user as { userId: string; email: string };
      const [rows] = await pool.query(
        `SELECT fm.id, fm.user_id as ownerId, fm.name, fm.gender, fm.birthdate, u.display_name as ownerName, u.email as ownerEmail 
         FROM family_members fm 
         JOIN users u ON fm.user_id = u.id 
         WHERE fm.linked_user_id = ? AND fm.user_id != ?`,
        [user.userId, user.userId]
      ) as any[];
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch linked members" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const user = (req as any).user as { userId: string; email: string };
      const [rows] = await pool.query("SELECT id, email, display_name, is_admin, is_active, dob, gender, mfa_enabled FROM users WHERE id = ?", [user.userId]) as any[];
      if (rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const dbUser = rows[0];
      if (!dbUser.is_active) {
        return res.status(403).json({ error: "Account deactivated" });
      }
      res.json({ id: dbUser.id, email: dbUser.email, displayName: dbUser.display_name, isAdmin: !!dbUser.is_admin, isActive: !!dbUser.is_active, dob: dbUser.dob, gender: dbUser.gender, mfaEnabled: !!dbUser.mfa_enabled });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch user" });
    }
  });

  // Verify MFA code on login
  app.post("/api/auth/verify-mfa", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "Email and MFA verification code are required" });
      }
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]) as any[];
      if (rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = rows[0];
      if (user.mfa_code !== code) {
        return res.status(400).json({ error: "Invalid MFA code. Please try again." });
      }
      if (user.mfa_expires < Date.now()) {
        return res.status(400).json({ error: "MFA code has expired. Please log in again." });
      }

      // Clear mfa code and complete login!
      await pool.query("UPDATE users SET mfa_code = NULL, mfa_expires = NULL WHERE id = ?", [user.id]);
      await pool.query("UPDATE family_members SET linked_user_id = ? WHERE contact_email = ?", [user.id, email]);

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          isAdmin: !!user.is_admin,
          isActive: true,
          dob: user.dob,
          gender: user.gender,
          mfaEnabled: !!user.mfa_enabled
        },
        token
      });
    } catch (error: any) {
      console.error("MFA verify error:", error);
      res.status(500).json({ error: error.message || "MFA validation failed" });
    }
  });

  // Toggle MFA status inside user settings
  app.post("/api/auth/mfa/toggle", authenticate, async (req, res) => {
    try {
      const user = (req as any).user as { userId: string; email: string };
      const { enabled } = req.body;
      await pool.query("UPDATE users SET mfa_enabled = ? WHERE id = ?", [enabled ? 1 : 0, user.userId]);
      res.json({ success: true, mfaEnabled: !!enabled });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to toggle MFA status" });
    }
  });

  // Forgot password request
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]) as any[];
      if (rows.length === 0) {
        return res.status(404).json({ error: "No account registered with this email address." });
      }
      const user = rows[0];
      const token = Math.floor(100000 + Math.random() * 900000).toString(); // Secure 6-digit reset token
      const expires = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

      await pool.query("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?", [token, expires, user.id]);
      console.log(`[AUTH] Password Reset Token for ${email} is: ${token}`);

      res.json({
        success: true,
        email,
        devResetToken: token
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to request password reset" });
    }
  });

  // Execute password reset
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;
      if (!email || !token || !newPassword) {
        return res.status(400).json({ error: "Email, reset token, and new password are required." });
      }
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]) as any[];
      if (rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = rows[0];
      if (user.reset_token !== token) {
        return res.status(400).json({ error: "Invalid password reset token code." });
      }
      if (user.reset_token_expires < Date.now()) {
        return res.status(400).json({ error: "Password reset token has expired. Please request a new one." });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await pool.query(
        "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
        [hash, user.id]
      );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to reset password" });
    }
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ---------------------------------------------------------------------------
  // FAMILY MEMBERS
  // ---------------------------------------------------------------------------
  app.get("/api/members", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const [rows] = await pool.query("SELECT * FROM family_members WHERE user_id = ?", [userId]) as any[];
      res.json(rows.map(memberToFrontend));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch members" });
    }
  });

  app.get("/api/members/public", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const [rows] = await pool.query("SELECT * FROM family_members WHERE user_id != ?", [userId]) as any[];
      const publicMembers = rows.map(memberToFrontend).filter((m: any) => {
        const adv = m.advanced_privacy?.profileVisibility;
        if (adv) return adv !== "private";
        return m.privacy !== "private";
      });
      res.json(publicMembers);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch public members" });
    }
  });

  app.get("/api/members/:id", authenticate, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM family_members WHERE id = ?", [req.params.id]) as any[];
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(memberToFrontend(rows[0]));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch member" });
    }
  });

  app.post("/api/members/:id", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const m = req.body;
      await pool.query(
        `INSERT INTO family_members (
          id, user_id, name, birthdate, birthplace, gender, relationship_to_root,
          parents, siblings, children, contact_phone, contact_email, address,
          privacy, is_ancestor, photos, notes, created_at, access_controls, advanced_privacy, synced, pending_sync
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name), birthdate = VALUES(birthdate), birthplace = VALUES(birthplace),
          gender = VALUES(gender), relationship_to_root = VALUES(relationship_to_root),
          parents = VALUES(parents), siblings = VALUES(siblings), children = VALUES(children),
          contact_phone = VALUES(contact_phone), contact_email = VALUES(contact_email),
          address = VALUES(address), privacy = VALUES(privacy), is_ancestor = VALUES(is_ancestor),
          photos = VALUES(photos), notes = VALUES(notes), created_at = VALUES(created_at),
          access_controls = VALUES(access_controls), advanced_privacy = VALUES(advanced_privacy),
          synced = VALUES(synced), pending_sync = VALUES(pending_sync)`,
        [
          req.params.id, userId, m.name, m.birthdate, m.birthplace, m.gender, m.relationshipToRoot,
          stringifyJson(m.parents), stringifyJson(m.siblings), stringifyJson(m.children),
          m.contactPhone, m.contactEmail, m.address, m.privacy, m.isAncestor, stringifyJson(m.photos),
          m.notes, m.createdAt, stringifyJson(m.access_controls), stringifyJson(m.advanced_privacy),
          m.synced ?? true, m.pendingSync ?? null,
        ]
      );
      res.json({ id: req.params.id, synced: true });
    } catch (error: any) {
      console.error("Upsert member error:", error);
      res.status(500).json({ error: error.message || "Failed to save member" });
    }
  });

  app.delete("/api/members/:id", authenticate, async (req, res) => {
    try {
      await pool.query("DELETE FROM family_members WHERE id = ? AND user_id = ?", [req.params.id, (req as any).user.userId]);
      res.json({ id: req.params.id, deleted: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete member" });
    }
  });

  // ---------------------------------------------------------------------------
  // HISTORICAL DOCUMENTS
  // ---------------------------------------------------------------------------
  app.get("/api/documents", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const [rows] = await pool.query("SELECT * FROM historical_documents WHERE user_id = ?", [userId]) as any[];
      res.json(rows.map(documentToFrontend));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch documents" });
    }
  });

  app.post("/api/documents/:id", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const d = req.body;
      await pool.query(
        `INSERT INTO historical_documents (
          id, user_id, title, description, date, file_data, tags, linked_member_ids, created_at, synced, pending_sync
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title), description = VALUES(description), date = VALUES(date),
          file_data = VALUES(file_data), tags = VALUES(tags), linked_member_ids = VALUES(linked_member_ids),
          created_at = VALUES(created_at), synced = VALUES(synced), pending_sync = VALUES(pending_sync)`,
        [
          req.params.id, userId, d.title, d.description, d.date, d.fileData,
          stringifyJson(d.tags), stringifyJson(d.linkedMemberIds), d.createdAt,
          d.synced ?? true, d.pendingSync ?? null,
        ]
      );
      res.json({ id: req.params.id, synced: true });
    } catch (error: any) {
      console.error("Upsert document error:", error);
      res.status(500).json({ error: error.message || "Failed to save document" });
    }
  });

  app.delete("/api/documents/:id", authenticate, async (req, res) => {
    try {
      await pool.query("DELETE FROM historical_documents WHERE id = ? AND user_id = ?", [req.params.id, (req as any).user.userId]);
      res.json({ id: req.params.id, deleted: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete document" });
    }
  });

  // ---------------------------------------------------------------------------
  // REMINDERS
  // ---------------------------------------------------------------------------
  app.get("/api/reminders", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const [rows] = await pool.query("SELECT * FROM anniversary_reminders WHERE user_id = ?", [userId]) as any[];
      res.json(rows.map(reminderToFrontend));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch reminders" });
    }
  });

  app.post("/api/reminders/:id", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const r = req.body;
      await pool.query(
        `INSERT INTO anniversary_reminders (
          id, user_id, member_id, title, date, type, remind_days_before, created_at, synced, pending_sync
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          member_id = VALUES(member_id), title = VALUES(title), date = VALUES(date),
          type = VALUES(type), remind_days_before = VALUES(remind_days_before),
          created_at = VALUES(created_at), synced = VALUES(synced), pending_sync = VALUES(pending_sync)`,
        [
          req.params.id, userId, r.memberId, r.title, r.date, r.type, r.remindDaysBefore,
          r.createdAt, r.synced ?? true, r.pendingSync ?? null,
        ]
      );
      res.json({ id: req.params.id, synced: true });
    } catch (error: any) {
      console.error("Upsert reminder error:", error);
      res.status(500).json({ error: error.message || "Failed to save reminder" });
    }
  });

  app.delete("/api/reminders/:id", authenticate, async (req, res) => {
    try {
      await pool.query("DELETE FROM anniversary_reminders WHERE id = ? AND user_id = ?", [req.params.id, (req as any).user.userId]);
      res.json({ id: req.params.id, deleted: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete reminder" });
    }
  });

  // ---------------------------------------------------------------------------
  // LINEAGE ACCESS REQUESTS
  // ---------------------------------------------------------------------------
  app.get("/api/requests/incoming", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const [rows] = await pool.query("SELECT * FROM lineage_access_requests WHERE to_user_id = ? ORDER BY created_at DESC", [userId]) as any[];
      res.json(rows.map(requestToFrontend));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch incoming requests" });
    }
  });

  app.get("/api/requests/outgoing", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const [rows] = await pool.query("SELECT * FROM lineage_access_requests WHERE from_user_id = ? ORDER BY created_at DESC", [userId]) as any[];
      res.json(rows.map(requestToFrontend));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch outgoing requests" });
    }
  });

  app.post("/api/requests/:id", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const r = req.body;
      await pool.query(
        `INSERT INTO lineage_access_requests (
          id, from_user_id, from_user_email, to_user_id, member_id, member_name, status, allowed_fields, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status), allowed_fields = VALUES(allowed_fields), member_name = VALUES(member_name)`,
        [
          req.params.id, userId, r.fromUserEmail || (req as any).user.email, r.toUserId,
          r.memberId, r.memberName, r.status, stringifyJson(r.allowedFields), r.createdAt,
        ]
      );
      res.json({ id: req.params.id, saved: true });
    } catch (error: any) {
      console.error("Upsert request error:", error);
      res.status(500).json({ error: error.message || "Failed to save request" });
    }
  });

  // ---------------------------------------------------------------------------
  // BATCH SYNC (replaces the Firestore push/pull flow)
  // ---------------------------------------------------------------------------
  app.post("/api/sync", authenticate, async (req, res) => {
    const userId = (req as any).user.userId;
    const result = { pushed: 0, pulled: 0, errors: [] as string[] };
    try {
      const { members, documents, reminders } = req.body;

      // Push members
      if (Array.isArray(members)) {
        for (const m of members) {
          if (m.userId !== userId) continue;
          try {
            if (m.pendingSync === "delete") {
              await pool.query("DELETE FROM family_members WHERE id = ? AND user_id = ?", [m.id, userId]);
            } else {
              await pool.query(
                `INSERT INTO family_members (
                  id, user_id, name, birthdate, birthplace, gender, relationship_to_root,
                  parents, siblings, children, contact_phone, contact_email, address,
                  privacy, is_ancestor, photos, notes, created_at, access_controls, advanced_privacy, synced, pending_sync
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  name = VALUES(name), birthdate = VALUES(birthdate), birthplace = VALUES(birthplace),
                  gender = VALUES(gender), relationship_to_root = VALUES(relationship_to_root),
                  parents = VALUES(parents), siblings = VALUES(siblings), children = VALUES(children),
                  contact_phone = VALUES(contact_phone), contact_email = VALUES(contact_email),
                  address = VALUES(address), privacy = VALUES(privacy), is_ancestor = VALUES(is_ancestor),
                  photos = VALUES(photos), notes = VALUES(notes), created_at = VALUES(created_at),
                  access_controls = VALUES(access_controls), advanced_privacy = VALUES(advanced_privacy),
                  synced = TRUE, pending_sync = NULL`,
                [
                  m.id, userId, m.name, m.birthdate, m.birthplace, m.gender, m.relationshipToRoot,
                  stringifyJson(m.parents), stringifyJson(m.siblings), stringifyJson(m.children),
                  m.contactPhone, m.contactEmail, m.address, m.privacy, m.isAncestor, stringifyJson(m.photos),
                  m.notes, m.createdAt, stringifyJson(m.access_controls), stringifyJson(m.advanced_privacy),
                  true, null,
                ]
              );
            }
            result.pushed++;
          } catch (err: any) {
            result.errors.push(`Member ${m.id}: ${err.message}`);
          }
        }
      }

      // Push documents
      if (Array.isArray(documents)) {
        for (const d of documents) {
          if (d.userId !== userId) continue;
          try {
            if (d.pendingSync === "delete") {
              await pool.query("DELETE FROM historical_documents WHERE id = ? AND user_id = ?", [d.id, userId]);
            } else {
              await pool.query(
                `INSERT INTO historical_documents (
                  id, user_id, title, description, date, file_data, tags, linked_member_ids, created_at, synced, pending_sync
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  title = VALUES(title), description = VALUES(description), date = VALUES(date),
                  file_data = VALUES(file_data), tags = VALUES(tags), linked_member_ids = VALUES(linked_member_ids),
                  created_at = VALUES(created_at), synced = TRUE, pending_sync = NULL`,
                [
                  d.id, userId, d.title, d.description, d.date, d.fileData,
                  stringifyJson(d.tags), stringifyJson(d.linkedMemberIds), d.createdAt, true, null,
                ]
              );
            }
            result.pushed++;
          } catch (err: any) {
            result.errors.push(`Document ${d.id}: ${err.message}`);
          }
        }
      }

      // Push reminders
      if (Array.isArray(reminders)) {
        for (const r of reminders) {
          if (r.userId !== userId) continue;
          try {
            if (r.pendingSync === "delete") {
              await pool.query("DELETE FROM anniversary_reminders WHERE id = ? AND user_id = ?", [r.id, userId]);
            } else {
              await pool.query(
                `INSERT INTO anniversary_reminders (
                  id, user_id, member_id, title, date, type, remind_days_before, created_at, synced, pending_sync
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  member_id = VALUES(member_id), title = VALUES(title), date = VALUES(date),
                  type = VALUES(type), remind_days_before = VALUES(remind_days_before),
                  created_at = VALUES(created_at), synced = TRUE, pending_sync = NULL`,
                [
                  r.id, userId, r.memberId, r.title, r.date, r.type, r.remindDaysBefore,
                  r.createdAt, true, null,
                ]
              );
            }
            result.pushed++;
          } catch (err: any) {
            result.errors.push(`Reminder ${r.id}: ${err.message}`);
          }
        }
      }

      // Pull all server records back to the client
      const [memberRows] = await pool.query("SELECT * FROM family_members WHERE user_id = ?", [userId]) as any[];
      const [docRows] = await pool.query("SELECT * FROM historical_documents WHERE user_id = ?", [userId]) as any[];
      const [remRows] = await pool.query("SELECT * FROM anniversary_reminders WHERE user_id = ?", [userId]) as any[];

      res.json({
        ...result,
        members: memberRows.map(memberToFrontend),
        documents: docRows.map(documentToFrontend),
        reminders: remRows.map(reminderToFrontend),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Sync failed", errors: result.errors });
    }
  });

  // ---------------------------------------------------------------------------
  // SYSTEM SETTINGS & SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  app.get("/api/system-settings/:id", authenticate, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM system_settings WHERE id = ?", [req.params.id]) as any[];
      if (rows.length === 0) {
        if (req.params.id === "config") {
          return res.json({
            exists: true,
            data: {
              supportFlowEnabled: true,
              upgradeFlowEnabled: false,
              maxMembersIfUpgradeEnabled: 50,
              freeTierLimit: 3,
              premiumPriceMonthly: 99,
              premiumPriceYearly: 799,
              coupons: [],
              googleClientId: process.env.GOOGLE_CLIENT_ID || ""
            }
          });
        }
        return res.json({ exists: false });
      }
      const data = parseJson(rows[0].data);
      if (req.params.id === "config" && (!data.googleClientId || data.googleClientId === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com")) {
        data.googleClientId = process.env.GOOGLE_CLIENT_ID || "";
      }
      res.json({ exists: true, data });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load settings" });
    }
  });

  app.post("/api/system-settings/:id", authenticate, async (req, res) => {
    try {
      const data = req.body;
      const now = Date.now();
      await pool.query(
        `INSERT INTO system_settings (id, data, updated_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)`,
        [req.params.id, stringifyJson(data), now]
      );
      res.json({ saved: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to save settings" });
    }
  });

  app.get("/api/user-subscriptions/:userId", authenticate, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM user_subscriptions WHERE user_id = ?", [req.params.userId]) as any[];
      if (rows.length === 0) return res.json({ exists: false });
      res.json({ exists: true, data: parseJson(rows[0].data) });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load subscription" });
    }
  });

  app.post("/api/user-subscriptions/:userId", authenticate, async (req, res) => {
    try {
      const userId = req.params.userId;
      const newData = req.body;
      const now = Date.now();

      // Load existing subscription to preserve history
      const [existing] = await pool.query("SELECT data FROM user_subscriptions WHERE user_id = ?", [userId]) as any[];
      let history: any[] = [];
      if (existing.length > 0) {
        const oldData = parseJson<SubscriptionData>(existing[0].data);
        if (oldData && Array.isArray(oldData.history)) {
          history = oldData.history;
        }
      }

      // If it is a successful payment, log transaction in history
      if (newData.paymentStatus === "paid" && newData.razorpayPaymentId) {
        const exists = history.some((h: any) => h.razorpayPaymentId === newData.razorpayPaymentId);
        if (!exists) {
          const invoiceId = `INV-SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          history.push({
            invoiceId,
            amount: Number(newData.amountPaid),
            slots: newData.slots,
            date: now,
            razorpayOrderId: newData.razorpayOrderId,
            razorpayPaymentId: newData.razorpayPaymentId,
            status: newData.paymentStatus
          });
        }
      }

      newData.history = history;

      await pool.query(
        `INSERT INTO user_subscriptions (user_id, data, updated_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)`,
        [userId, stringifyJson(newData), now]
      );
      res.json({ saved: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to save subscription" });
    }
  });

  // ---------------------------------------------------------------------------
  // CONTACT & DONATIONS
  // ---------------------------------------------------------------------------
  app.post("/api/contact", async (req, res) => {
    try {
      const { email, subject, message, userId, name } = req.body;
      if (!email || !message) {
        return res.status(400).json({ error: "Email and message are required" });
      }
      const id = uuidv4();
      const now = Date.now();
      await pool.query(
        "INSERT INTO contact_messages (id, user_id, name, email, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, userId || null, name || null, email, subject || null, message, "open", now]
      );
      res.json({ id, saved: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });

  app.get("/api/donations", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const [rows] = await pool.query(
        "SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC",
        [userId]
      ) as any[];
      res.json(rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        email: r.email,
        amount: Number(r.amount),
        currency: r.currency,
        status: r.status,
        razorpayOrderId: r.razorpay_order_id,
        razorpayPaymentId: r.razorpay_payment_id,
        createdAt: Number(r.created_at)
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch user donations" });
    }
  });

  app.post("/api/donations", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const email = (req as any).user.email;
      const { amount, currency, status, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const id = uuidv4();
      const now = Date.now();
      await pool.query(
        "INSERT INTO donations (id, user_id, email, amount, currency, status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, userId, email, amount, currency || "INR", status || "completed", razorpayOrderId || null, razorpayPaymentId || null, razorpaySignature || null, now]
      );
      res.json({ id, saved: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to record donation" });
    }
  });

  // ---------------------------------------------------------------------------
  // ADMIN DASHBOARD
  // ---------------------------------------------------------------------------
  app.get("/api/admin/stats", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const [[usersCount]] = await pool.query("SELECT COUNT(*) as cnt FROM users") as any[];
      const [[adminsCount]] = await pool.query("SELECT COUNT(*) as cnt FROM users WHERE is_admin = 1") as any[];
      const [[activeCount]] = await pool.query("SELECT COUNT(*) as cnt FROM users WHERE is_active = 1") as any[];
      const [[membersCount]] = await pool.query("SELECT COUNT(*) as cnt FROM family_members") as any[];
      const [[docsCount]] = await pool.query("SELECT COUNT(*) as cnt FROM historical_documents") as any[];
      const [[messagesCount]] = await pool.query("SELECT COUNT(*) as cnt FROM contact_messages") as any[];
      const [[openMessagesCount]] = await pool.query("SELECT COUNT(*) as cnt FROM contact_messages WHERE status = 'open'") as any[];
      const [[donationsSum]] = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE status = 'completed'") as any[];
      const [[donationsCount]] = await pool.query("SELECT COUNT(*) as cnt FROM donations") as any[];
      const [[subsCount]] = await pool.query("SELECT COUNT(*) as cnt FROM user_subscriptions") as any[];
      const [[privPub]] = await pool.query("SELECT COUNT(*) as cnt FROM family_members WHERE privacy = 'public'") as any[];
      const [[privFam]] = await pool.query("SELECT COUNT(*) as cnt FROM family_members WHERE privacy = 'family'") as any[];
      const [[privPriv]] = await pool.query("SELECT COUNT(*) as cnt FROM family_members WHERE privacy = 'private'") as any[];

      res.json({
        totalUsers: Number(usersCount.cnt),
        totalAdmins: Number(adminsCount.cnt),
        activeUsers: Number(activeCount.cnt),
        totalMembers: Number(membersCount.cnt),
        totalDocuments: Number(docsCount.cnt),
        totalMessages: Number(messagesCount.cnt),
        openMessages: Number(openMessagesCount.cnt),
        totalRevenue: Number(donationsSum.total),
        totalDonations: Number(donationsCount.cnt),
        totalSubscriptions: Number(subsCount.cnt),
        privacyDistribution: {
          public: Number(privPub.cnt),
          family: Number(privFam.cnt),
          private: Number(privPriv.cnt),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load stats" });
    }
  });

  app.get("/api/admin/contact-messages", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const [rows] = await pool.query("SELECT * FROM contact_messages ORDER BY created_at DESC") as any[];
      res.json(rows.map((r: any) => ({ id: r.id, name: r.name || 'Anonymous', email: r.email, subject: r.subject, message: r.message, status: r.status, createdAt: Number(r.created_at) })));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load messages" });
    }
  });

  app.post("/api/admin/contact-messages/:id/status", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const { status } = req.body;
      await pool.query("UPDATE contact_messages SET status = ? WHERE id = ?", [status, req.params.id]);
      res.json({ updated: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update status" });
    }
  });

  app.delete("/api/admin/contact-messages/:id", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      await pool.query("DELETE FROM contact_messages WHERE id = ?", [req.params.id]);
      res.json({ deleted: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete message" });
    }
  });

  app.get("/api/admin/members", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const [rows] = await pool.query("SELECT * FROM family_members") as any[];
      res.json(rows.map(memberToFrontend));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load members" });
    }
  });

  app.delete("/api/admin/members/:id", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      await pool.query("DELETE FROM family_members WHERE id = ?", [req.params.id]);
      res.json({ deleted: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete member" });
    }
  });

  app.get("/api/admin/subscriptions", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const [rows] = await pool.query("SELECT user_id, data, updated_at FROM user_subscriptions") as any[];
      res.json(rows.map((r: any) => ({ userId: r.user_id, data: parseJson(r.data), updatedAt: Number(r.updated_at) })));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load subscriptions" });
    }
  });

  app.get("/api/admin/donations", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const [rows] = await pool.query("SELECT * FROM donations ORDER BY created_at DESC") as any[];
      res.json(rows.map((r: any) => ({ id: r.id, userId: r.user_id, email: r.email, amount: r.amount, currency: r.currency, status: r.status, createdAt: Number(r.created_at) })));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load donations" });
    }
  });

  app.get("/api/admin/users", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const [rows] = await pool.query(
        "SELECT id, email, display_name AS displayName, google_id AS googleId, created_at AS createdAt, is_admin AS isAdmin, is_active AS isActive FROM users ORDER BY created_at DESC"
      ) as any[];
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load users" });
    }
  });

  app.post("/api/admin/users/:id/admin", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const { isAdmin } = req.body;
      await pool.query("UPDATE users SET is_admin = ? WHERE id = ?", [isAdmin ? 1 : 0, req.params.id]);
      res.json({ updated: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update role" });
    }
  });

  app.post("/api/admin/users/:id/status", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const { isActive } = req.body;
      await pool.query("UPDATE users SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, req.params.id]);
      res.json({ updated: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update status" });
    }
  });

  app.get("/api/admin/db-health", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const tables = ["users", "family_members", "historical_documents", "anniversary_reminders", "lineage_access_requests", "system_settings", "user_subscriptions", "contact_messages", "donations"];
      const results: any[] = [];
      for (const table of tables) {
        try {
          const [[row]] = await pool.query(`SELECT COUNT(*) as cnt FROM ${table}`) as any[];
          results.push({ table, rows: Number(row.cnt), status: "ok" });
        } catch {
          results.push({ table, rows: 0, status: "error" });
        }
      }
      res.json({ status: "healthy", tables: results, timestamp: Date.now() });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Health check failed" });
    }
  });

  app.get("/api/admin/activity", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      // Get recent users
      const [recentUsers] = await pool.query(
        "SELECT id, email, display_name, created_at FROM users ORDER BY created_at DESC LIMIT 10"
      ) as any[];
      // Get recent members
      const [recentMembers] = await pool.query(
        "SELECT fm.id, fm.name, fm.created_at, u.email as owner_email FROM family_members fm LEFT JOIN users u ON fm.user_id = u.id ORDER BY fm.created_at DESC LIMIT 10"
      ) as any[];
      // Get recent donations
      const [recentDonations] = await pool.query(
        "SELECT id, email, amount, currency, status, created_at FROM donations ORDER BY created_at DESC LIMIT 10"
      ) as any[];

      const activity: any[] = [];
      for (const u of recentUsers) {
        activity.push({ type: "user_registered", description: `${u.email} registered`, timestamp: Number(u.created_at) });
      }
      for (const m of recentMembers) {
        activity.push({ type: "member_added", description: `"${m.name}" added by ${m.owner_email || "unknown"}`, timestamp: Number(m.created_at) });
      }
      for (const d of recentDonations) {
        activity.push({ type: "donation", description: `${d.email} donated ${d.amount} ${d.currency} (${d.status})`, timestamp: Number(d.created_at) });
      }
      activity.sort((a: any, b: any) => b.timestamp - a.timestamp);
      res.json(activity.slice(0, 20));
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load activity" });
    }
  });

  // AI-Powered Ancestral Match Checker
  app.post("/api/match-ancestors", async (req, res) => {
    try {
      const { userMembers, publicMembers } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "Gemini API key is not configured on the server. Please add it in Settings.",
        });
      }

      if (!userMembers || !Array.isArray(userMembers) || userMembers.length === 0) {
        return res.json({ matches: [], hasMatches: false, message: "No user family members provided for scanning." });
      }

      if (!publicMembers || !Array.isArray(publicMembers) || publicMembers.length === 0) {
        return res.json({ matches: [], hasMatches: false, message: "No public records available in other trees to compare against." });
      }

      const userSummary = userMembers.map((m: any) => ({
        id: m.id,
        name: m.name,
        birthdate: m.birthdate || "Unknown",
        birthplace: m.birthplace || "Unknown",
        gender: m.gender || "Unknown",
        relationship: m.relationshipToRoot || "Relative",
        notes: m.notes || "",
        isAncestor: m.isAncestor || false,
      }));

      const publicSummary = publicMembers.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        name: m.name,
        birthdate: m.birthdate || "Unknown",
        birthplace: m.birthplace || "Unknown",
        gender: m.gender || "Unknown",
        notes: m.notes || "",
        isAncestor: m.isAncestor || false,
      }));

      const prompt = `You are an expert genealogical matching engine and historical archivist.
Analyze the following two lists of family tree members to discover potential connections, distant relatives, or shared ancestors (highlighting potential DNA matches or ancestral network connections).

List 1: User's Family Tree (Your current user)
${JSON.stringify(userSummary, null, 2)}

List 2: Public Family Tree Database Records (From other users)
${JSON.stringify(publicSummary, null, 2)}

Compare records looking for:
1. Direct matching names (with minor spelling variations, e.g. "John Smith" vs "Jon Smith") born in a similar year (+/- 5 years) and similar birthplace.
2. Identifiable ancestral links (e.g. the user's great-grandfather seems to be the same person as another user's grandfather or grand-uncle).
3. Distant cousins or unknown relatives where multiple details align.

Formulate your response strictly as a JSON object with the following schema:
{
  "hasMatches": boolean,
  "matches": [
    {
      "userMemberId": "string",
      "matchedMemberId": "string",
      "matchedUserId": "string",
      "relationshipType": "string (e.g., 'Great-Grandfather match', 'Distant 3rd Cousin', 'Grand-Uncle match')",
      "confidence": number (integer between 0 and 100),
      "explanation": "string explaining the connection clearly and detail the match metrics",
      "connectionPath": "string tracing how they are connected"
    }
  ],
  "summary": "string summarizing the scanning results and general insights"
}

Provide ONLY the valid JSON, no markdown blocks or surrounding text. It must be directly parseable.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());

      res.json(result);
    } catch (error: any) {
      console.error("Error matching ancestors with Gemini API:", error);
      res.status(500).json({ error: error.message || "Failed to process ancestral matching request." });
    }
  });

  // Vite or Static file serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
