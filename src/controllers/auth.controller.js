import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

console.log("Environment Variables Check:", {
  clientId: process.env.GOOGLE_CLIENT_ID ? "Present" : "Missing",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "Present" : "Missing",
  backendUrl: process.env.BACKEND_URL ? "Present" : "Missing",
  frontendUrl: process.env.FRONTEND_URL ? "Present" : "Missing",
});

//initializing google oauth client
const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${process.env.BACKEND_URL}/api/auth/callback/google`,
});

//google auth
export function googleAuth(req, res) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
  res.json({ url: authUrl });
}

//callback function for creating session
export async function googleCallback(req, res) {
  try {
    const { code } = req.query;
    console.log("Received code:", code ? "Present" : "Missing");
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const userInfoResponse = await oauth2Client.request({
      url: "https://www.googleapis.com/oauth2/v3/userinfo",
    });

    const userInfo = userInfoResponse.data;
    console.log("userinfo", userInfo);

    let user = await User.findOne({ email: userInfo.email });

    if (!user) {
      user = await User.create({
        email: userInfo.email,
        userName: userInfo.name,
        profilePic: userInfo.picture,
      });
    }

    // Create session token
    const sessionToken = jwt.sign(
      {
        user: {
          id: user._id,
          email: user.email,
          name: user.userName,
          picture: user.profilePic,
        },
        accessToken: tokens.access_token,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set session cookie
    res.cookie("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.redirect(`${process.env.FRONTEND_URL}/generate`);
  } catch (error) {
    console.error("Auth error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/`);
  }
}

//function for session fetching
export function getSession(req, res) {
  try {
    const token = req.cookies.session;
    if (!token) {
      return res.status(401).json({ error: "No session found" });
    }

    const session = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: session.user, accessToken: session.accessToken });
  } catch (error) {
    res.status(401).json({ error: "Invalid session" });
  }
}

//function for handling logout
export function handleLogout(req, res) {
  res.clearCookie("session");
  res.json({ message: "Signed out successfully" });
}
