import { NextResponse } from "next/server";

interface CurlRequest {
  curl: string;
}

// Handle OPTIONS requests (for CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request: Request) {
  try {
    // Add CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Parse the request body
    const body: CurlRequest = await request.json();
    const curlCommand = body.curl;

    if (!curlCommand) {
      return NextResponse.json({ error: "No curl command provided" }, { 
        status: 400,
        headers
      });
    }

    // Parse the curl command
    const parsedCommand = parseCurlCommand(curlCommand);
    
    if (!parsedCommand) {
      return NextResponse.json({ error: "Failed to parse curl command" }, { 
        status: 400,
        headers
      });
    }

    // Execute the request
    const response = await fetch(parsedCommand.url, {
      method: parsedCommand.method,
      headers: parsedCommand.headers,
      body: parsedCommand.body,
    });

    // Get response data
    let responseData;
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Return the response
    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    }, { headers });
  } catch (error) {
    console.error("Error executing curl command:", error);
    return NextResponse.json(
      { error: "Failed to execute request", details: String(error) }, 
      { 
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
      }
    );
  }
}

interface ParsedCommand {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function parseCurlCommand(curlCommand: string): ParsedCommand | null {
  try {
    // Extract URL - look specifically for http/https URLs
    const urlMatch = curlCommand.match(/(https?:\/\/[^\s"']+)/);
    if (!urlMatch) return null;
    const url = urlMatch[1];

    // Default method is GET
    let method = "GET";
    
    // Check for method flag
    if (curlCommand.includes("-X") || curlCommand.includes("--request")) {
      const methodMatch = curlCommand.match(/-X\s+([A-Z]+)|--request\s+([A-Z]+)/);
      if (methodMatch) {
        method = methodMatch[1] || methodMatch[2];
      }
    }

    // Extract headers
    const headers: Record<string, string> = {};
    const headerMatches = curlCommand.matchAll(/-H\s+["']([^:]+):\s*([^"']+)["']|--header\s+["']([^:]+):\s*([^"']+)["']/g);
    
    for (const match of headerMatches) {
      const key = match[1] || match[3];
      const value = match[2] || match[4];
      headers[key] = value;
    }

    // Extract body
    let body: string | undefined;
    const dataMatch = curlCommand.match(/-d\s+["'](.+?)["']|--data\s+["'](.+?)["']/);
    if (dataMatch) {
      body = dataMatch[1] || dataMatch[2];
      
      // If method is still GET but we have a body, change to POST
      if (method === "GET") {
        method = "POST";
      }
    }

    return { url, method, headers, body };
  } catch (error) {
    console.error("Error parsing curl command:", error);
    return null;
  }
} 