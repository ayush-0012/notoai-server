import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import connectDB from "./src/utils/db.js";
import { userRoutes } from "./src/routes/user.route.js";
import { notesRoutes } from "./src/routes/notes.route.js";
import { authRoutes } from "./src/routes/auth.route.js";

dotenv.config({
  path: "./.env",
});

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "HEAD", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const app = express();
connectDB();

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/api/users", userRoutes);
app.use("/api/", notesRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
