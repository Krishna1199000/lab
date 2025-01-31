import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import session from "express-session"
import { labRoutes } from "./routes/labs.js"
import { authMiddleware } from "./middleware/auth.js"

const app = express()

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:3001", "http://localhost:3000"], // Allow both ports
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
)

// Basic middleware
app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session configuration
app.use(
  session({
    secret: process.env.NEXTAUTH_SECRET || "default-secret-key", // Use NextAuth secret
    resave: false,
    saveUninitialized: false,
    name: "next-auth.session-token", // Match NextAuth cookie name
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
      domain: process.env.NODE_ENV === "production" ? ".yourdomain.com" : "localhost",
    },
  }),
)

// Routes
app.use("/api/labs", authMiddleware, labRoutes)

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`)
})

// Error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error)
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
})

