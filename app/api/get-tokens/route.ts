import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.CONSTANT_CONTACT_CLIENT_ID;
  const redirectUri = "https://your-vercel-app.vercel.app/api/callback"; // Update this
  
  const authUrl = `https://authz.constantcontact.com/oauth2/default/v1/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=contact_data`;
  
  return NextResponse.redirect(authUrl);
} 