import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  
  if (!code) {
    return NextResponse.json({ error: "No code received" }, { status: 400 });
  }
  
  const clientId = process.env.CONSTANT_CONTACT_CLIENT_ID;
  const clientSecret = process.env.CONSTANT_CONTACT_CLIENT_SECRET;
  const redirectUri = "https://your-vercel-app.vercel.app/api/callback"; // Update this
  
  try {
    const response = await fetch("https://authz.constantcontact.com/oauth2/default/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });
    
    const tokens = await response.json();
    
    // Display tokens so you can copy them
    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 