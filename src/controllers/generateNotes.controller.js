import Notes from "../models/notes.model.js";
import cloudinary from "../utils/cloudinary.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import User from "../models/user.model.js";
import "dotenv/config";

export async function generateNotes(req, res) {
  try {
    const { url, fileName, userId, isFile } = req.body;

    let notesContent;

    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error("Google API key is not configured");
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Generate detailed and clean notes and make the headings bold for the following URL: ${url}`;
      const aiResponse = await model.generateContent(prompt);
      notesContent = aiResponse.response.text();

      if (!notesContent) {
        throw new Error("Failed to generate notes content");
      }

      notesContent = notesContent.replace(/[\*\#\-\_\=\+\~\!]/g, "");
    } catch (error) {
      console.error("AI content generation failed:", error);
      res.status(500).json({
        message: "failed to generate notes content",
        error: error.message,
      });
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, "_");
    let cloudinaryResponse;
    try {
      if (isFile) {
        cloudinaryResponse = await cloudinary.uploader.upload(
          `data:application/pdf;base64,${Buffer.from(notesContent).toString("base64")}`,
          {
            resource_type: "raw",
            format: "docx",
            folder: "notes",
            public_id: `${sanitizedFileName}_${Date.now()}`,
          }
        );
      } else {
        cloudinaryResponse = await cloudinary.uploader.upload(
          `data:application/pdf;base64,${Buffer.from(notesContent).toString("base64")}`,
          {
            resource_type: "raw",
            format: "txt",
            folder: "notes",
            public_id: `${sanitizedFileName}_${Date.now()}`,
          }
        );
      }
    } catch (uploadError) {
      console.error("Cloudinary upload failed:", uploadError);
      res.status(404).json({
        message: "failed to upload the file to cloudinary",
        success: false,
      });
    }
    // 5. Save to Database
    try {
      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({ message: "user not found" });
      }

      const newNote = await Notes.create({
        title: fileName,
        fileUrl: cloudinaryResponse.secure_url,
        userId: userId,
        isFile: isFile,
      });

      console.log("New Note ID", typeof newNote._id.toString());

      if (!cloudinaryResponse.secure_url || !newNote._id) {
        res
          .status(404)
          .json({ message: "Missing required fields for generateHistory" });
      }

      await User.findByIdAndUpdate(userId, {
        $push: {
          generateHistory: {
            fileUrl: cloudinaryResponse.secure_url,
            fileId: newNote._id.toString(),
            fileName: fileName,
          },
        },
      });

      // await User.save();
      return res.json({ success: true, note: newNote, user, status: 200 });
    } catch (dbSaveError) {
      // If database save fails, attempt to delete the uploaded file from Cloudinary
      try {
        await cloudinary.uploader.destroy(cloudinaryResponse.public_id);
      } catch (cleanupError) {
        console.error("Failed to cleanup Cloudinary file:", cleanupError);
      }

      throw dbSaveError;
    }
  } catch (error) {
    console.error("Error in notes generation process:", error);
    return res.json({ success: false, error: error.message, status: 500 });
  }
}
