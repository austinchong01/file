// app.js
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");
const { PrismaClient } = require("./generated/prisma");
const passport = require("./config/passport");

const app = express();
const prisma = new PrismaClient();

// Import routers
const indexRouter = require("./routes/indexRouter");
const authRouter = require("./routes/authRouter");

// View engine setup
app.set("view engine", "ejs");

// Body parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration with Prisma session store
app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, // 2 minutes
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);

// Flash messages
app.use(flash());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Global variables for templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

// Routes
app.use("/auth", authRouter);
app.use("/", indexRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Express app listening on port ${PORT}!`));