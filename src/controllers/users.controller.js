import User from "../models/user.model.js";
import "dotenv/config";

export async function fetchUsers(req, res) {
  const { userId } = req.params;
  console.log(userId);
  try {
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "unable to find user" });
    }

    return res.status(200).json({ user: user.generateHistory });
  } catch (error) {
    console.log("error fetching user", error);
    return res.status(500).json({ message: error.message });
  }
}
