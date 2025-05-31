import { NextResponse } from "next/server"

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.thestreetsmarts.org',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Cache-Control',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    
    // Use the webhook URL from Zapier
    const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL; // Add this to your Vercel env vars
    
    if (!zapierWebhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL not configured" }, 
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Map list IDs to newsletter names for better readability in Zapier
    const listIdToName: Record<string, string> = {
      '07936f78-662a-11eb-af0a-fa163e56c9b0': 'The Street Smarts',
      'wellness-wednesdays-list-id': 'Wellness Wednesdays' // Replace with actual list ID
    };
    
    // Convert list IDs to names
    const selectedNewsletters = requestData.list_memberships?.map(
      (listId: string) => listIdToName[listId] || listId
    ) || [];
    
    // Send data to Zapier
    const response = await fetch(zapierWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: requestData.email,
        name: requestData.name || '',
        source: "Webflow Form",
        timestamp: new Date().toISOString(),
        list_memberships: requestData.list_memberships || [],
        selected_newsletters: selectedNewsletters,
        permission_to_send: requestData.permission_to_send || "implicit"
      })
    });
    
    if (response.ok) {
      return NextResponse.json(
        { success: true, message: "Subscription successful" },
        { status: 200, headers: corsHeaders }
      );
    } else {
      const errorText = await response.text();
      console.error('Zapier webhook failed:', errorText);
      throw new Error(`Webhook failed: ${response.status}`);
    }
    
  } catch (error) {
    console.error("Webhook relay error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: "Failed to process subscription", details: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
} 