import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  
  // Check for errors in the callback
  if (error) {
    return NextResponse.json({
      error,
      error_description: errorDescription
    }, { status: 400 });
  }
  
  // Verify the state parameter
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  
  if (!storedState || storedState !== state) {
    return NextResponse.json({ 
      error: "invalid_state", 
      error_description: "State parameter doesn't match. This could be a CSRF attempt."
    }, { status: 400 });
  }
  
  // Clear the state cookie
  cookieStore.delete("oauth_state");
  
  if (!code) {
    return NextResponse.json({ error: "No authorization code received" }, { status: 400 });
  }
  
  const clientId = process.env.CONSTANT_CONTACT_CLIENT_ID;
  const clientSecret = process.env.CONSTANT_CONTACT_CLIENT_SECRET;
  const redirectUri = "https://web-form-automation-ccapi.vercel.app/api/callback"; // Your correct Vercel URL
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://authz.constantcontact.com/oauth2/default/v1/token", {
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
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.json({ error: "Failed to exchange code for tokens", details: errorText }, { status: 500 });
    }
    
    const tokens = await tokenResponse.json();
    
    // Display tokens so you can copy them
    return NextResponse.json({
      message: "Authorization successful! Copy these tokens to your environment variables.",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in
    });
    
  } catch (error) {
    console.error("Error during token exchange:", error);
    return NextResponse.json({ error: "Failed to process authorization", details: String(error) }, { status: 500 });
  }
} 