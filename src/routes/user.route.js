import express from "express";
import { fetchUsers } from "../controllers/users.controller.js";

const router = express.Router();

//route to fetch all users
router.get("/:userId", fetchUsers);

export const userRoutes = router;
