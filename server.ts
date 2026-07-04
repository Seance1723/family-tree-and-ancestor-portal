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
  return rows.length > 0 && rows[0].is_admin === 1;
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
  // AUTH
  // ---------------------------------------------------------------------------
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]) as any[];
      if (existing.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const id = uuidv4();
      const hash = await bcrypt.hash(password, 10);
      const now = Date.now();
      await pool.query(
        "INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)",
        [id, email, hash, displayName || null, now]
      );
      const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ user: { id, email, displayName: displayName || null }, token });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]) as any[];
      if (rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({
        user: { id: user.id, email: user.email, displayName: user.display_name },
        token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const user = (req as any).user as { userId: string; email: string };
      const [rows] = await pool.query("SELECT id, email, display_name FROM users WHERE id = ?", [user.userId]) as any[];
      if (rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ id: rows[0].id, email: rows[0].email, displayName: rows[0].display_name });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch user" });
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
      if (rows.length === 0) return res.json({ exists: false });
      res.json({ exists: true, data: parseJson(rows[0].data) });
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
      const data = req.body;
      const now = Date.now();
      await pool.query(
        `INSERT INTO user_subscriptions (user_id, data, updated_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)`,
        [userId, stringifyJson(data), now]
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
      const { email, subject, message, userId } = req.body;
      if (!email || !message) {
        return res.status(400).json({ error: "Email and message are required" });
      }
      const id = uuidv4();
      const now = Date.now();
      await pool.query(
        "INSERT INTO contact_messages (id, user_id, email, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, userId || null, email, subject || null, message, "open", now]
      );
      res.json({ id, saved: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to send message" });
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
  app.get("/api/admin/contact-messages", authenticate, async (req, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
    try {
      const [rows] = await pool.query("SELECT * FROM contact_messages ORDER BY created_at DESC") as any[];
      res.json(rows.map((r: any) => ({ id: r.id, email: r.email, subject: r.subject, message: r.message, status: r.status, createdAt: Number(r.created_at) })));
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
