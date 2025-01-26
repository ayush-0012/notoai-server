import express from "express";
import { generateNotes } from "../controllers/generateNotes.controller.js";
import { deleteNotes } from "../controllers/deleteNotes.controller.js";

const router = express.Router();

//route to generate notes
router.post("/generate-notes", generateNotes);

//route to delete a notes
router.delete("/delete-notes/:noteId/:userId", deleteNotes);

export const notesRoutes = router;
