import User from "../models/user.model.js";
import Notes from "../models/notes.model.js";

export async function deleteNotes(req, res) {
  try {
    const { noteId, userId } = req.params;

    const note = await Notes.findById(noteId);
    const user = await User.findById(userId);

    if (!note) {
      return res.json({ message: "no note found", status: 404 });
    }

    if (!user) {
      return res.json({ message: "no user found", status: 404 });
    }

    //deletes note using the instance, preventing addtional db call
    await note.deleteOne();

    //using user instance to delete the note
    user.generateHistory = user.generateHistory.filter(
      (history) => history.fileId !== noteId
    );
    await user.save(); //saving changes

    return res.json({ message: "note deleted successfully", status: 200 });
  } catch (error) {
    return res.json({ message: error.message, status: 500 });
  }
}
