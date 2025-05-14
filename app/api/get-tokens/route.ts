import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function GET(request: Request) {
  const clientId = process.env.CONSTANT_CONTACT_CLIENT_ID;
  const redirectUri = "https://web-form-automation-ccapi.vercel.app/api/callback"; // Your correct Vercel URL
  
  // Generate a random state value
  const state = randomBytes(16).toString("hex");
  
  // Store the state in a cookie
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });
  
  const authUrl = `https://authz.constantcontact.com/oauth2/default/v1/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=contact_data&state=${state}`;
  
  return NextResponse.redirect(authUrl);
} 