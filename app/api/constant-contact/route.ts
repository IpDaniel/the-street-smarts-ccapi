import { NextResponse } from "next/server"

// Constant Contact API endpoint
const CONSTANT_CONTACT_API_URL = "https://api.cc.email/v3/contacts"

// CORS headers - be specific about your Webflow domain
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.thestreetsmarts.org', // Your Webflow domain
  // Or use '*' for all origins (less secure): 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Cache-Control',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Handle OPTIONS requests (preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Define types for our payloads and responses
interface ContactPayload {
  email_address: {
    address: string;
    permission_to_send: string;
  };
  create_source: string;
  list_memberships: string[];
}

interface RequestData {
  email?: string;
  email_address?: string;
  list_memberships?: string[];
  permission_to_send?: string;
  create_source?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// Function to refresh the access token
async function refreshAccessToken(): Promise<string | null> {
  const clientId = process.env.CONSTANT_CONTACT_CLIENT_ID;
  const clientSecret = process.env.CONSTANT_CONTACT_CLIENT_SECRET;
  const refreshToken = process.env.CONSTANT_CONTACT_REFRESH_TOKEN;
  
  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Missing OAuth credentials for token refresh');
    return null;
  }
  
  try {
    const response = await fetch("https://authz.constantcontact.com/oauth2/default/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token refresh failed:", errorText);
      return null;
    }
    
    const tokens = await response.json();
    console.log('Token refreshed successfully');
    
    // Note: In a production environment, you would want to store this new token
    // For now, we'll just return it to use for this request
    return tokens.access_token;
    
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // Get the authorization token from environment variables
    let accessToken = process.env.CONSTANT_CONTACT_ACCESS_TOKEN;
    const clientId = process.env.CONSTANT_CONTACT_CLIENT_ID;
    const clientSecret = process.env.CONSTANT_CONTACT_CLIENT_SECRET;

    if (!accessToken || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Authorization credentials not configured" }, 
        { status: 500, headers: corsHeaders }
      )
    }

    // Parse the incoming request body
    const requestData: RequestData = await request.json()
    console.log('Received request data:', requestData);

    // Extract email from request
    const email = requestData.email || requestData.email_address || ""

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" }, 
        { status: 400, headers: corsHeaders }
      )
    }

    // Allow custom list memberships or use default
    const listMemberships = requestData.list_memberships || ["07936f78-662a-11eb-af0a-fa163e56c9b0"]

    // Allow custom permission setting or use default
    const permissionToSend = requestData.permission_to_send || "implicit"

    // Prepare the payload for Constant Contact API
    const payload: ContactPayload = {
      email_address: {
        address: email,
        permission_to_send: permissionToSend,
      },
      create_source: requestData.create_source || "Account",
      list_memberships: listMemberships,
    }

    console.log('Sending to Constant Contact:', payload);

    // First attempt with current access token
    let response = await makeConstantContactRequest(payload, accessToken);
    
    // If unauthorized, try to refresh the token and retry
    if (response.status === 401) {
      console.log('Access token expired, attempting to refresh...');
      
      const newAccessToken = await refreshAccessToken();
      
      if (newAccessToken) {
        console.log('Token refreshed successfully, retrying request...');
        accessToken = newAccessToken;
        
        // Retry the request with the new token
        response = await makeConstantContactRequest(payload, accessToken);
      } else {
        console.error('Failed to refresh access token');
        return NextResponse.json({ 
          error: "Authorization failed", 
          message: "Unable to refresh access token. Please re-authorize the application."
        }, { status: 401, headers: corsHeaders });
      }
    }

    // Get the response data
    const responseData = await response.json()
    console.log('Constant Contact response:', responseData);

    // Return the response from Constant Contact
    return NextResponse.json(
      {
        success: response.ok,
        status: response.status,
        data: responseData,
      },
      { status: response.ok ? 200 : response.status, headers: corsHeaders },
    )
  } catch (error) {
    console.error("Error relaying to Constant Contact:", error)
    return NextResponse.json(
      { error: "Failed to relay request to Constant Contact", details: String(error) }, 
      { status: 500, headers: corsHeaders }
    )
  }
}

async function makeConstantContactRequest(payload: ContactPayload, authToken: string): Promise<Response> {
  const headers = {
    accept: "application/json",
    Authorization: `Bearer ${authToken}`,
    "content-type": "application/json",
  }

  return fetch(CONSTANT_CONTACT_API_URL, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  });
}