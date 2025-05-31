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
    
    // Map list IDs to newsletter names for better readability in Zapier
    const listIdToName: { [key: string]: string } = {
      '07936f78-662a-11eb-af0a-fa163e56c9b0': 'The Street Smarts',
      'wellness-wednesdays-list-id': 'Wellness Wednesdays' // Replace with actual list ID
    };
    
    const listMemberships = requestData.list_memberships || [];
    
    if (listMemberships.length === 0) {
      return NextResponse.json(
        { error: "No list memberships provided" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Make a separate request for each list ID
    const webhookPromises = listMemberships.map(async (listId: string) => {
      const newsletterName = listIdToName[listId] || listId;
      
      const payload = {
        email: requestData.email,
        name: requestData.name || '',
        source: "Webflow Form",
        timestamp: new Date().toISOString(),
        list_id: listId,
        newsletter_name: newsletterName,
        permission_to_send: requestData.permission_to_send || "implicit"
      };
      
      return fetch(zapierWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    });
    
    // Wait for all webhook requests to complete
    const responses = await Promise.all(webhookPromises);
    
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