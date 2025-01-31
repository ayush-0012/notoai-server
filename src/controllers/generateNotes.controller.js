import Notes from "../models/notes.model.js";
import cloudinary from "../utils/cloudinary.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import User from "../models/user.model.js";
import "dotenv/config";

export async function generateNotes(req, res) {
  try {
    const { url, fileName, userId, isFile } = req.body;

    if (!url || !fileName || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // generating ai content
    let notesContent;
    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({
          success: false,
          message: "Google API key is not configured",
        });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Generate detailed and clean notes and make the headings bold for the following URL: ${url}`;
      const aiResponse = await model.generateContent(prompt);
      notesContent = aiResponse.response.text();

      if (!notesContent) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate notes content",
        });
      }

      notesContent = notesContent.replace(/[\*\#\-\_\=\+\~\!]/g, "");
    } catch (error) {
      console.error("AI content generation failed:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate notes content",
        error: error.message,
      });
    }

    // uploading to cloudinary
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, "_");
    let cloudinaryResponse;
    try {
      const uploadConfig = {
        resource_type: "raw",
        format: isFile ? "docx" : "txt",
        folder: "notes",
        public_id: `${sanitizedFileName}_${Date.now()}`,
      };

      cloudinaryResponse = await cloudinary.uploader.upload(
        `data:application/pdf;base64,${Buffer.from(notesContent).toString("base64")}`,
        uploadConfig
      );

      if (!cloudinaryResponse || !cloudinaryResponse.secure_url) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload file to Cloudinary",
        });
      }
    } catch (uploadError) {
      console.error("Cloudinary upload failed:", uploadError);
      return res.status(500).json({
        success: false,
        message: "Failed to upload the file to Cloudinary",
        error: uploadError.message,
      });
    }

    // saving in db
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const newNote = await Notes.create({
        title: fileName,
        fileUrl: cloudinaryResponse.secure_url,
        userId: userId,
        isFile: isFile,
      });

      await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            generateHistory: {
              fileUrl: cloudinaryResponse.secure_url,
              fileId: newNote._id.toString(),
              fileName: fileName,
            },
          },
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        note: newNote,
        user,
      });
    } catch (dbError) {
      // cleaning up cloudinary file if db save fails
      try {
        await cloudinary.uploader.destroy(cloudinaryResponse.public_id);
      } catch (cleanupError) {
        console.error("Failed to cleanup Cloudinary file:", cleanupError);
      }

      return res.status(500).json({
        success: false,
        message: "Failed to save note to database",
        error: dbError.message,
      });
    }
  } catch (error) {
    console.error("Error in notes generation process:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
