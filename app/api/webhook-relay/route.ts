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
    const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    
    if (!zapierWebhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL not configured" }, 
        { status: 500, headers: corsHeaders }
      );
    }
    
    const listMemberships = requestData.list_memberships || [];
    
    if (listMemberships.length === 0) {
      return NextResponse.json(
        { error: "No list memberships provided" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Make requests sequentially with a small delay
    const responses = [];
    for (let i = 0; i < listMemberships.length; i++) {
      const listId = listMemberships[i];
      const payload = {
        email: requestData.email,
        name: requestData.name || '',
        source: "Webflow Form",
        timestamp: new Date().toISOString(),
        list_id: listId,
        permission_to_send: requestData.permission_to_send || "implicit"
      };
      
      const response = await fetch(zapierWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      responses.push(response);
      
      // Add a small delay between requests (except for the last one)
      if (i < listMemberships.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }
    }
    
    // Check if all requests were successful
    const failedRequests = responses.filter(response => !response.ok);
    
    if (failedRequests.length > 0) {
      console.error(`${failedRequests.length} webhook requests failed`);
      
      // Log details of failed requests
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          const errorText = await responses[i].text();
          console.error(`Failed request for list ${listMemberships[i]}:`, errorText);
        }
      }
      
      return NextResponse.json(
        { 
          error: "Some subscriptions failed", 
          successful: responses.length - failedRequests.length,
          failed: failedRequests.length,
          total: responses.length
        },
        { status: 207, headers: corsHeaders } // 207 Multi-Status
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: "All subscriptions successful",
        subscriptions_processed: responses.length
      },
      { status: 200, headers: corsHeaders }
    );
    
  } catch (error) {
    console.error("Webhook relay error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: "Failed to process subscription", details: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
} 