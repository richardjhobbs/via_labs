import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// ---------------------------------------------------------------------------
// Content definitions
// ---------------------------------------------------------------------------

const OVERVIEW_TEXT = `VIA Labs is an innovation-led company operating at the frontier of agentic commerce.

VIA is not building infrastructure. It makes existing agent protocols, payment frameworks, and trust standards accessible and commercially usable for real brands and real merchants.

The business model of this era is B2A: business to agent. Companies that are discoverable and transactable by AI agents will capture the next wave of commerce. VIA makes that possible.

Based in Singapore, focused initially on Southeast Asia and Greater China.

Website: https://getvia.xyz`;

const PROTOCOL_TEXT = `VIA is a set of software tools and services combined into a protocol.

Buyers and sellers are represented by agents that communicate directly, negotiate at speed, and resolve complexity so people can focus on decisions, not process.

How it works:
- Buyer agents broadcast intent through the VIA protocol to a relay.
- Seller agents respond only when they have a high probability of fulfilling the request.
- Supports ChatGPT, Claude, Gemini, and other MCP-compatible assistants.
- Designed for progressive delegation — human approval remains in the loop, but the system is built for full agent-to-agent transactions.

Technical stack:
- NOSTR relays for decentralised message routing
- ERC-8004 for trust and reputation
- x402 for payments
- Stablecoin payments supported via user-registered wallets`;

const BUYER_TEXT = `VIA for Buyers

VIA removes noise, endless searching, and wasted effort from the buying process.

- Plugs into AI tools the buyer already uses (ChatGPT, Claude, Gemini, and others).
- Buyer expresses intent; VIA broadcasts to seller agents who only respond with high-probability matches.
- Safety and control are built in — buyers set the limits on agent delegation.
- Currently focused on fashion, lifestyle, and luxury goods categories.

No more scrolling through irrelevant results. Your agent handles searching, filtering, and clarification so you don't have to.`;

const SELLER_TEXT = `VIA for Sellers

VIA allows sellers to respond only to genuine buying intent.

- No ad spend required to attract attention — agents engage when real need appears.
- Reduces wasted acquisition costs and low-quality enquiries.
- Seller agent handles enquiries, clarification, and negotiation.
- Registration available at https://getvia.xyz/join
- Early cohort access with preferential terms available now.

Instead of spending on ads or promotion just to attract attention, your agent engages when a real need appears. Negotiation and qualification happen before you spend any marketing budget.`;

const RRG_TEXT = `Real Real Genuine (RRG) — VIA Labs' First Product

Real Real Genuine is a fashion co-creation platform built on limited editions, collaborations, and on-chain verification.

Key features:
- Every item linked to an on-chain record via digital tokens (ERC-1155).
- Works identically for human users and AI agents.
- Heritage brand with 20 years of history in collaboration-led, limited edition menswear.
- The platform speaks the language of fashion and culture on the surface, while running on next-generation commerce infrastructure underneath.

Website: https://realrealgenuine.com
Agent endpoint: https://realrealgenuine.com/mcp`;

const CONTACT_TEXT = `VIA Labs — Contact & Links

- Register interest: https://getvia.xyz/join
- Follow on X: @via_labs_sg (https://x.com/via_labs_sg)
- Headquarters: Singapore
- Website: https://getvia.xyz
- Agent demo: https://demo.getvia.xyz
- Research paper: https://getvia.xyz/paper.html`;

const FAQ_TEXT = `VIA — Frequently Asked Questions

What is VIA?
VIA is a set of software tools and services combined into a protocol. At the front is an interface where people interact in familiar ways. Behind the scenes, VIA coordinates a series of processes that allow buyers and sellers, through their agents, to find each other, understand what is being asked for or offered, negotiate options, calculate outcomes, and eventually execute a transaction.

What is agentic commerce?
Agentic commerce is the next stage of digital commerce. We moved from websites, to search, to social commerce. Those systems are now noisy and inefficient. Agentic commerce replaces attention with intent. Buyers and sellers are represented by agents that communicate directly, negotiate at speed, and resolve complexity.

What problems does VIA solve?
For buyers, VIA removes noise, endless searching, and wasted effort. For sellers, it reduces high acquisition costs, inefficient marketing spend, and low-quality enquiries. VIA reorganises where work happens, shifting it from people to agents, so time and money are only spent where there is real intent.

How does VIA work for buyers?
VIA plugs into the AI tool you already use. You express intent, which is broadcast through the VIA protocol to a relay. Seller agents only respond if they have a very high probability of fulfilling the request. Your agent handles searching, filtering, and clarification so you do not have to.

Can my agent shop unsupervised?
No. VIA is designed around safety and control. You decide how much freedom your agent has and where the limits are set. Delegation is progressive, not reckless.

How does VIA work for sellers?
VIA allows sellers to respond only to genuine buying intent. Instead of spending on ads, your agent engages when a real need appears. Negotiation and qualification happen before you spend any marketing budget.

Who is behind VIA?
VIA Labs is founded by specialists from fashion, global commerce, and technology with experience building brands, platforms, and systems at scale.

Where is VIA Labs based?
VIA Labs operates as a global team with headquarters in Singapore. Initial focus is Southeast Asia and Greater China.`;

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

function createServer() {
  const server = new McpServer({
    name: "via-labs",
    version: "1.0.0",
  });

  // -- Tools ----------------------------------------------------------------

  server.tool("get_via_overview", "Get an overview of VIA Labs — what it is, what it does, and the B2A thesis", {}, async () => ({
    content: [{ type: "text", text: OVERVIEW_TEXT }],
  }));

  server.tool("get_via_protocol", "Get a description of how the VIA protocol works for agents", {}, async () => ({
    content: [{ type: "text", text: PROTOCOL_TEXT }],
  }));

  server.tool("get_via_for_buyers", "Get buyer-facing information about VIA", {}, async () => ({
    content: [{ type: "text", text: BUYER_TEXT }],
  }));

  server.tool("get_via_for_sellers", "Get seller and merchant-facing information about VIA", {}, async () => ({
    content: [{ type: "text", text: SELLER_TEXT }],
  }));

  server.tool("get_rrg_overview", "Get information about Real Real Genuine — VIA Labs' first commercial product", {}, async () => ({
    content: [{ type: "text", text: RRG_TEXT }],
  }));

  server.tool("get_via_contact", "Get contact information and links for VIA Labs", {}, async () => ({
    content: [{ type: "text", text: CONTACT_TEXT }],
  }));

  // -- Resources ------------------------------------------------------------

  server.resource("overview", "via://overview", { description: "Full VIA Labs company overview" }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/plain", text: OVERVIEW_TEXT }],
  }));

  server.resource("protocol", "via://protocol", { description: "Technical VIA protocol description" }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/plain", text: PROTOCOL_TEXT }],
  }));

  server.resource("faq", "via://faq", { description: "VIA frequently asked questions" }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/plain", text: FAQ_TEXT }],
  }));

  server.resource("rrg", "via://rrg", { description: "Real Real Genuine product overview" }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/plain", text: RRG_TEXT }],
  }));

  return server;
}

// ---------------------------------------------------------------------------
// Vercel serverless handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // GET — agent instruction card
  if (req.method === "GET") {
    res.status(200).json({
      name: "via-labs",
      version: "1.0.0",
      description: "VIA Labs MCP server for agentic commerce. VIA connects buyer agents and seller agents through a decentralised protocol so they can discover each other, negotiate, and transact.",
      protocol: "MCP (Model Context Protocol) — Streamable HTTP transport",
      endpoint: "https://getvia.xyz/mcp",
      website: "https://getvia.xyz",

      instructions: "To use this server, send JSON-RPC POST requests to this endpoint. Start by calling the 'initialize' method, then use 'tools/list' to discover available tools, or call any tool directly via 'tools/call'. Set the header Accept: application/json, text/event-stream and Content-Type: application/json.",

      available_tools: [
        {
          name: "get_via_overview",
          description: "Get an overview of VIA Labs — what it is, what it does, and the business-to-agent (B2A) thesis.",
        },
        {
          name: "get_via_protocol",
          description: "Get a technical description of how the VIA protocol works — message routing, trust, payments, and agent coordination.",
        },
        {
          name: "get_via_for_buyers",
          description: "Get buyer-facing information — how VIA helps buyers find what they need through their AI agent.",
        },
        {
          name: "get_via_for_sellers",
          description: "Get seller and merchant-facing information — how VIA reduces acquisition costs and connects sellers to genuine intent.",
        },
        {
          name: "get_rrg_overview",
          description: "Get information about Real Real Genuine (RRG) — VIA Labs' first commercial product, a fashion co-creation platform with on-chain verification.",
        },
        {
          name: "get_via_contact",
          description: "Get contact information, registration links, social accounts, and other links for VIA Labs.",
        },
      ],

      available_resources: [
        { name: "overview", uri: "via://overview", description: "Full VIA Labs company overview" },
        { name: "protocol", uri: "via://protocol", description: "Technical VIA protocol description" },
        { name: "faq",      uri: "via://faq",      description: "VIA frequently asked questions" },
        { name: "rrg",      uri: "via://rrg",      description: "Real Real Genuine product overview" },
      ],

      quick_start: {
        step_1: "POST to this endpoint with: {\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-03-26\",\"capabilities\":{},\"clientInfo\":{\"name\":\"my-agent\",\"version\":\"1.0.0\"}}}",
        step_2: "Send: {\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\"}",
        step_3: "Call any tool, e.g.: {\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"get_via_overview\",\"arguments\":{}}}",
      },
    });
    return;
  }

  // Only POST and DELETE are valid MCP action methods
  if (!["POST", "DELETE"].includes(req.method)) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Ensure the Accept header includes both types the MCP SDK requires.
  // Many agents omit text/event-stream, which causes the transport to reject
  // the request. We normalise it here so the server is more accessible.
  if (req.method === "POST") {
    const accept = req.headers["accept"] || "";
    if (!accept.includes("text/event-stream") || !accept.includes("application/json")) {
      req.headers["accept"] = "application/json, text/event-stream";
    }
  }

  const server = createServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  await server.connect(transport);

  try {
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
