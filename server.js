import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import http from 'http';
import { WebSocketServer } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kanban-dashboard';

// Fallback Mock Database in case MongoDB is not active
const MOCK_DB_FILE = path.join(__dirname, 'mock_db.json');
let useMockDb = false;

// Ensure Mock DB JSON file exists
if (!fs.existsSync(MOCK_DB_FILE)) {
  fs.writeFileSync(MOCK_DB_FILE, JSON.stringify({ users: [] }, null, 2));
}

const getMockData = () => {
  try {
    const data = fs.readFileSync(MOCK_DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.users) parsed.users = [];
    if (!parsed.chatMessages) parsed.chatMessages = [];
    if (!parsed.meetings) parsed.meetings = [];
    if (!parsed.documents) parsed.documents = [];
    return parsed;
  } catch {
    return { users: [], chatMessages: [], meetings: [], documents: [] };
  }
};

const saveMockData = (data) => {
  try {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
};

const getMockUsers = () => {
  return getMockData().users;
};

const saveMockUser = (user) => {
  const data = getMockData();
  data.users.push(user);
  return saveMockData(data);
};

app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// MongoDB Schema
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  orgName: { type: String, required: true },
  password: { type: String, required: true },
  roomCode: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  roomCode: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Ensure uniqueness of email per room code
teamMemberSchema.index({ email: 1, roomCode: 1 }, { unique: true });

const TeamMember = mongoose.model('TeamMember', teamMemberSchema);

const chatMessageSchema = new mongoose.Schema({
  senderName: { type: String, required: true },
  senderEmail: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  roomCode: { type: String, required: true }
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

const meetingSchema = new mongoose.Schema({
  meetingId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  scheduledTime: { type: Date, required: true },
  duration: { type: Number, default: 30 },
  status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
  hostName: { type: String, required: true },
  hostEmail: { type: String, required: true },
  roomCode: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Meeting = mongoose.model('Meeting', meetingSchema);

const documentSchema = new mongoose.Schema({
  docId: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, default: 'General' },
  description: { type: String },
  type: { type: String, enum: ['link', 'image', 'voice', 'file'], default: 'file' },
  content: { type: String, required: true },
  submittedBy: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  roomCode: { type: String, required: true }
});

const DocumentModel = mongoose.model('Document', documentSchema);

// Connect to MongoDB with graceful fallback
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
  })
  .catch(err => {
    console.warn('\n========================================================================');
    console.warn('WARNING: MongoDB is not running or connection failed.');
    console.warn('FALLING BACK to local JSON file storage (mock_db.json).');
    console.warn('Start a MongoDB service locally on port 27017 to enable real persistence.');
    console.warn('========================================================================\n');
    useMockDb = true;
  });

// Nodemailer Transporter Configuration (Ethereal test accounts fallback)
let testAccount = null;
const getTransporter = async () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  
  if (!testAccount) {
    try {
      testAccount = await nodemailer.createTestAccount();
      console.log(`[EMAIL] Generated Ethereal Test Account User: ${testAccount.user}`);
    } catch (e) {
      console.error('[EMAIL] Failed to create test account:', e);
    }
  }

  if (testAccount) {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return null;
};

// Send email notification helper
const sendLeaderNotification = async (leaderEmail, leaderName, memberName, roomCode) => {
  try {
    const transporter = await getTransporter();
    
    const mailOptions = {
      from: '"KanbanPro Alerts" <alerts@kanbanpro.com>',
      to: leaderEmail,
      subject: `⚠️ Alert: Member Entered Workspace - ${memberName}`,
      text: `Hello ${leaderName},\n\nThis is an alert notification. Team member "${memberName}" has logged into your workspace (Room Code: ${roomCode}).\n\nRegards,\nKanbanPro Team`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #4f46e5; margin-bottom: 16px;">Workspace Alert: Member Entry</h2>
          <p>Hello <strong>${leaderName}</strong>,</p>
          <p>This is a notification that team member <strong>${memberName}</strong> has successfully logged into your workspace.</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Member Name:</strong> ${memberName}</p>
            <p style="margin: 4px 0 0; font-size: 14px;"><strong>Room Code:</strong> ${roomCode}</p>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 32px;">This is an automated security alert sent from KanbanPro.</p>
        </div>
      `
    };

    if (!transporter) {
      console.log(`[EMAIL ALERT LOG] (No SMTP Configured) To: ${leaderEmail} | Alert: Member "${memberName}" has entered workspace "${roomCode}"`);
      return;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Notification sent to Leader: ${leaderEmail}. MessageId: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EMAIL] Preview URL: ${previewUrl}`);
    }
  } catch (error) {
    console.error('[EMAIL] Failed to send email alert to leader:', error);
  }
};

// Helper function to generate room code (6-digit numeric code)
const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// AUTHENTICATION API ROUTES

// Register API
app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, orgName, password } = req.body;

  if (!fullName || !email || !orgName || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const roomCode = generateRoomCode();

    if (useMockDb) {
      const users = getMockUsers();
      const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (userExists) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }

      const newUser = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        fullName,
        email,
        orgName,
        password: hashedPassword,
        roomCode,
        createdAt: new Date().toISOString()
      };

      saveMockUser(newUser);
      
      const { password: _, ...userWithoutPassword } = newUser;
      return res.status(201).json(userWithoutPassword);
    } else {
      const userExists = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
      if (userExists) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }

      const newUser = new User({
        fullName,
        email,
        orgName,
        password: hashedPassword,
        roomCode
      });

      await newUser.save();
      
      const userResponse = {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        orgName: newUser.orgName,
        roomCode: newUser.roomCode,
        createdAt: newUser.createdAt
      };
      
      return res.status(201).json(userResponse);
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'An error occurred during registration' });
  }
});

// Login API
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    if (useMockDb) {
      const users = getMockUsers();
      const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (userIndex === -1) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const user = users[userIndex];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      // Generate roomCode if it doesn't exist
      if (!user.roomCode) {
        user.roomCode = generateRoomCode();
        fs.writeFileSync(MOCK_DB_FILE, JSON.stringify({ users }, null, 2));
      }

      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json(userWithoutPassword);
    } else {
      const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
      if (!user) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      // Generate roomCode if it doesn't exist
      if (!user.roomCode) {
        user.roomCode = generateRoomCode();
        await user.save();
      }

      const userResponse = {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        orgName: user.orgName,
        roomCode: user.roomCode
      };

      return res.status(200).json(userResponse);
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Import Members API (Leader uploads excel list)
app.post('/api/leader/import-members', async (req, res) => {
  const { roomCode, members } = req.body;

  if (!roomCode || !Array.isArray(members)) {
    return res.status(400).json({ error: 'roomCode and members list are required' });
  }

  try {
    if (useMockDb) {
      const users = getMockUsers();
      const userIndex = users.findIndex(u => u.roomCode === roomCode);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Leader session not found with room code' });
      }

      users[userIndex].members = members.map(m => ({
        name: m.name,
        email: m.email
      }));

      fs.writeFileSync(MOCK_DB_FILE, JSON.stringify({ users }, null, 2));
      return res.status(200).json({ message: 'Members imported successfully', count: members.length });
    } else {
      const leader = await User.findOne({ roomCode });
      if (!leader) {
        return res.status(404).json({ error: 'Leader session not found with room code' });
      }

      // Delete existing team members for this room code before inserting new list
      await TeamMember.deleteMany({ roomCode });

      // Save imported members to the separate TeamMember collection
      const membersToInsert = members.map(m => ({
        name: m.name,
        email: m.email.toLowerCase(),
        roomCode
      }));

      await TeamMember.insertMany(membersToInsert);
      return res.status(200).json({ message: 'Members imported successfully', count: members.length });
    }
  } catch (error) {
    console.error('Import members error:', error);
    return res.status(500).json({ error: 'An error occurred during member import' });
  }
});

// Member Login API (Authenticate with email and roomCode)
app.post('/api/auth/member-login', async (req, res) => {
  const { email, roomCode } = req.body;

  if (!email || !roomCode) {
    return res.status(400).json({ error: 'Email and room code are required' });
  }

  try {
    if (useMockDb) {
      const users = getMockUsers();
      const leader = users.find(u => u.roomCode === roomCode);
      if (!leader) {
        return res.status(400).json({ error: 'Invalid room code' });
      }

      const member = (leader.members || []).find(m => m.email.toLowerCase() === email.toLowerCase());
      if (!member) {
        return res.status(400).json({ error: 'Email is not registered under this room code' });
      }

      // Notify Leader via Email
      sendLeaderNotification(leader.email, leader.fullName, member.name, roomCode);

      return res.status(200).json({
        fullName: member.name,
        email: member.email,
        role: 'member',
        orgName: leader.orgName,
        roomCode: roomCode
      });
    } else {
      const leader = await User.findOne({ roomCode });
      if (!leader) {
        return res.status(400).json({ error: 'Invalid room code' });
      }

      // Look up in the separate TeamMember collection
      const member = await TeamMember.findOne({ 
        roomCode, 
        email: new RegExp(`^${email}$`, 'i') 
      });

      if (!member) {
        return res.status(400).json({ error: 'Email is not registered under this room code' });
      }

      // Notify Leader via Email
      sendLeaderNotification(leader.email, leader.fullName, member.name, roomCode);

      return res.status(200).json({
        fullName: member.name,
        email: member.email,
        role: 'member',
        orgName: leader.orgName,
        roomCode: roomCode
      });
    }
  } catch (error) {
    console.error('Member login error:', error);
    return res.status(500).json({ error: 'An error occurred during member login' });
  }
});


// Get Chat History
app.get('/api/collaboration/chat', async (req, res) => {
  const { roomCode } = req.query;
  if (!roomCode) {
    return res.status(400).json({ error: 'roomCode is required' });
  }

  try {
    if (useMockDb) {
      const data = getMockData();
      const chats = data.chatMessages.filter(m => m.roomCode === roomCode);
      return res.status(200).json(chats);
    } else {
      const chats = await ChatMessage.find({ roomCode }).sort({ timestamp: 1 });
      return res.status(200).json(chats);
    }
  } catch (error) {
    console.error('Fetch chat error:', error);
    return res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Get Scheduled Meetings
app.get('/api/collaboration/meetings', async (req, res) => {
  const { roomCode } = req.query;
  if (!roomCode) {
    return res.status(400).json({ error: 'roomCode is required' });
  }

  try {
    if (useMockDb) {
      const data = getMockData();
      const meetings = data.meetings.filter(m => m.roomCode === roomCode);
      return res.status(200).json(meetings);
    } else {
      const meetings = await Meeting.find({ roomCode }).sort({ scheduledTime: 1 });
      return res.status(200).json(meetings);
    }
  } catch (error) {
    console.error('Fetch meetings error:', error);
    return res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Schedule a new Meeting
app.post('/api/collaboration/meetings', async (req, res) => {
  const { meetingId, title, description, scheduledTime, duration, hostName, hostEmail, roomCode } = req.body;

  if (!meetingId || !title || !scheduledTime || !hostName || !hostEmail || !roomCode) {
    return res.status(400).json({ error: 'Missing required meeting details' });
  }

  const meetingData = {
    meetingId,
    title,
    description: description || '',
    scheduledTime: new Date(scheduledTime).toISOString(),
    duration: parseInt(duration || '30'),
    status: 'upcoming',
    hostName,
    hostEmail,
    roomCode,
    createdAt: new Date().toISOString()
  };

  try {
    if (useMockDb) {
      const data = getMockData();
      data.meetings.push(meetingData);
      saveMockData(data);
      return res.status(201).json(meetingData);
    } else {
      const newMeeting = new Meeting(meetingData);
      await newMeeting.save();
      return res.status(201).json(newMeeting);
    }
  } catch (error) {
    console.error('Schedule meeting error:', error);
    return res.status(500).json({ error: 'Failed to schedule meeting' });
  }
});

// Update Meeting Status
app.post('/api/collaboration/meetings/status', async (req, res) => {
  const { meetingId, status } = req.body;
  if (!meetingId || !status) {
    return res.status(400).json({ error: 'meetingId and status are required' });
  }

  try {
    if (useMockDb) {
      const data = getMockData();
      const meetingIdx = data.meetings.findIndex(m => m.meetingId === meetingId);
      if (meetingIdx === -1) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      data.meetings[meetingIdx].status = status;
      saveMockData(data);
      return res.status(200).json(data.meetings[meetingIdx]);
    } else {
      const meeting = await Meeting.findOneAndUpdate({ meetingId }, { status }, { new: true });
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      return res.status(200).json(meeting);
    }
  } catch (error) {
    console.error('Update meeting status error:', error);
    return res.status(500).json({ error: 'Failed to update meeting status' });
  }
});

// Get Submitted Documents
app.get('/api/collaboration/documents', async (req, res) => {
  const { roomCode } = req.query;
  if (!roomCode) {
    return res.status(400).json({ error: 'roomCode is required' });
  }

  try {
    if (useMockDb) {
      const data = getMockData();
      const documents = data.documents.filter(d => d.roomCode === roomCode);
      return res.status(200).json(documents);
    } else {
      const documents = await DocumentModel.find({ roomCode }).sort({ submittedAt: -1 });
      return res.status(200).json(documents);
    }
  } catch (error) {
    console.error('Fetch documents error:', error);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Submit a new Document
app.post('/api/collaboration/documents', async (req, res) => {
  const { docId, title, category, description, type, content, submittedBy, roomCode } = req.body;

  if (!docId || !title || !content || !submittedBy || !roomCode) {
    return res.status(400).json({ error: 'Missing required document details' });
  }

  const docData = {
    docId,
    title,
    category: category || 'General',
    description: description || '',
    type: type || 'file',
    content,
    submittedBy,
    roomCode,
    submittedAt: new Date().toISOString()
  };

  try {
    if (useMockDb) {
      const data = getMockData();
      data.documents.push(docData);
      saveMockData(data);
      return res.status(201).json(docData);
    } else {
      const newDoc = new DocumentModel(docData);
      await newDoc.save();
      return res.status(201).json(newDoc);
    }
  } catch (error) {
    console.error('Submit document error:', error);
    return res.status(500).json({ error: 'Failed to submit document' });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Keep track of active clients by roomCode
const activeRooms = new Map();

wss.on('connection', (ws) => {
  let userContext = null;

  ws.on('message', async (messageData) => {
    try {
      const parsed = JSON.parse(messageData.toString());
      
      if (parsed.type === 'join') {
        const { roomCode, user } = parsed;
        ws.roomCode = roomCode;
        ws.user = user;
        userContext = { roomCode, user };

        if (!activeRooms.has(roomCode)) {
          activeRooms.set(roomCode, new Set());
        }
        activeRooms.get(roomCode).add(ws);

        // Broadcast user joined / active user list update
        broadcastActiveUsers(roomCode);
      }

      else if (parsed.type === 'chat') {
        const { roomCode, senderName, senderEmail, content } = parsed;
        const chatMsg = {
          senderName,
          senderEmail,
          content,
          roomCode,
          timestamp: new Date().toISOString()
        };

        // Save to DB / Mock DB
        if (useMockDb) {
          const data = getMockData();
          data.chatMessages.push(chatMsg);
          saveMockData(data);
        } else {
          const newMsg = new ChatMessage(chatMsg);
          await newMsg.save();
        }

        // Broadcast to everyone in the room
        broadcastToRoom(roomCode, {
          type: 'chat',
          message: chatMsg
        });
      }

      else if (parsed.type === 'signal') {
        const { roomCode, targetEmail, signal, senderEmail } = parsed;
        const clients = activeRooms.get(roomCode);
        if (clients) {
          clients.forEach(client => {
            if (client !== ws && (!targetEmail || client.user?.email === targetEmail)) {
              client.send(JSON.stringify({
                type: 'signal',
                senderEmail,
                signal
              }));
            }
          });
        }
      }

      else if (parsed.type === 'meeting_update') {
        const { roomCode } = parsed;
        broadcastToRoom(roomCode, {
          type: 'meeting_update'
        });
      }

      else if (parsed.type === 'document_update') {
        const { roomCode } = parsed;
        broadcastToRoom(roomCode, {
          type: 'document_update'
        });
      }

    } catch (e) {
      console.error('WS message handler error:', e);
    }
  });

  ws.on('close', () => {
    if (userContext) {
      const { roomCode } = userContext;
      const clients = activeRooms.get(roomCode);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          activeRooms.delete(roomCode);
        } else {
          broadcastActiveUsers(roomCode);
        }
      }
    }
  });
});

function broadcastToRoom(roomCode, payload) {
  const clients = activeRooms.get(roomCode);
  if (clients) {
    const dataStr = JSON.stringify(payload);
    clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(dataStr);
      }
    });
  }
}

function broadcastActiveUsers(roomCode) {
  const clients = activeRooms.get(roomCode);
  if (clients) {
    const users = Array.from(clients).map(client => client.user).filter(Boolean);
    const uniqueUsers = [];
    const seen = new Set();
    for (const u of users) {
      if (!seen.has(u.email)) {
        seen.add(u.email);
        uniqueUsers.push(u);
      }
    }
    broadcastToRoom(roomCode, {
      type: 'active_users',
      users: uniqueUsers
    });
  }
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
