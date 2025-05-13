import { NextResponse } from "next/server"

// Constant Contact API endpoint
const CONSTANT_CONTACT_API_URL = "https://api.cc.email/v3/contacts"

export async function POST(request: Request) {
  try {
    // Get the authorization token from environment variables
    const authToken = process.env.CONSTANT_CONTACT_TOKEN

    if (!authToken) {
      return NextResponse.json({ error: "Authorization token not configured" }, { status: 500 })
    }

    // Parse the incoming request body
    const requestData = await request.json()

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
    const payload = {
      email_address: {
        address: email,
        permission_to_send: permissionToSend,
      },
      create_source: requestData.create_source || "Account",
      list_memberships: listMemberships,
    }

    // Set up headers for the Constant Contact API request
    const headers = {
      accept: "application/json",
      Authorization: `Bearer ${authToken}`,
      "content-type": "application/json",
    }

    // Make the request to Constant Contact API
    const response = await fetch(CONSTANT_CONTACT_API_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    })

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