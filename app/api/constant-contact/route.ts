import { NextResponse } from "next/server"

// Constant Contact API endpoint
const CONSTANT_CONTACT_API_URL = "https://api.cc.email/v3/contacts"

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

export async function POST(request: Request) {
  try {
    // Get the authorization token from environment variables
    const accessToken = process.env.CONSTANT_CONTACT_ACCESS_TOKEN
    const refreshToken = process.env.CONSTANT_CONTACT_REFRESH_TOKEN
    const clientId = process.env.CONSTANT_CONTACT_CLIENT_ID
    const clientSecret = process.env.CONSTANT_CONTACT_CLIENT_SECRET

    if (!accessToken || !refreshToken || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Authorization credentials not configured" }, { status: 500 })
    }

    // First try with the current access token
    let authToken = accessToken;
    let response;
    
    // Parse the incoming request body
    const requestData: RequestData = await request.json()

    // Extract email from request
    const email = requestData.email || requestData.email_address || ""

    if (!email) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 })
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

    // First attempt with current access token
    response = await makeConstantContactRequest(payload, authToken);
    
    // If unauthorized, try refreshing the token
    if (response.status === 401) {
      const newTokens = await refreshAccessToken(refreshToken, clientId, clientSecret);
      if (newTokens && newTokens.access_token) {
        // Try again with new token
        authToken = newTokens.access_token;
        response = await makeConstantContactRequest(payload, authToken);
        
        // Here you would also want to store the new tokens somewhere
        // This depends on your architecture (database, etc.)
      }
    }

    // Get the response data
    const responseData = await response.json()

    // Return the response from Constant Contact
    return NextResponse.json(
      {
        success: response.ok,
        status: response.status,
        data: responseData,
      },
      { status: response.status },
    )
  } catch (error) {
    console.error("Error relaying to Constant Contact:", error)
    return NextResponse.json({ error: "Failed to relay request to Constant Contact" }, { status: 500 })
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

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<TokenResponse | null> {
  try {
    const tokenEndpoint = "https://authz.constantcontact.com/oauth2/default/v1/token";
    
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: params
    });
    
    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }
    
    return await response.json() as TokenResponse;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}