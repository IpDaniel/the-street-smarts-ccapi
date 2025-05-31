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
        timestamp: new Date().toISOString()
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