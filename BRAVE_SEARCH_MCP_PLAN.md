# Plan to Create Brave Search MCP Server

1.  **Project Setup:**
    *   Navigate to the standard MCP server directory: `C:\Users\wowca\AppData\Roaming\Roo-Code\MCP`.
    *   Use `npx @modelcontextprotocol/create-server brave-search-server` to bootstrap a new TypeScript MCP server project.
    *   Navigate into the newly created `brave-search-server` directory.
    *   Install the `axios` dependency (`npm install axios`) to make HTTP requests to the Brave Search API.

2.  **Server Implementation (`src/index.ts`):**
    *   Modify the generated `index.ts` file.
    *   Import necessary MCP SDK components and `axios`.
    *   Retrieve the Brave Search API key from the environment variable `BRAVE_SEARCH_API_KEY`.
    *   Define a tool named `brave_search` using `server.setRequestHandler(ListToolsRequestSchema, ...)`:
        *   **Description:** "Performs a web search using the Brave Search API."
        *   **Input Schema:** An object with a required `query` property (string).
    *   Implement the tool logic using `server.setRequestHandler(CallToolRequestSchema, ...)`:
        *   Check if the requested tool name is `brave_search`.
        *   Validate the input arguments against the schema.
        *   Construct the request to the Brave Search API endpoint (e.g., `https://api.search.brave.com/res/v1/web/search`).
        *   Include the API key in the request headers (e.g., `X-Subscription-Token`).
        *   Include the user's query as a parameter (e.g., `q`).
        *   Use `axios` to send the GET request.
        *   Handle the response: Format the search results into the MCP tool response format.
        *   Handle potential errors from the API or network issues, returning an appropriate MCP error.
    *   Ensure the server starts and connects using the `StdioServerTransport`.

3.  **Build the Server:**
    *   Run `npm run build` in the `brave-search-server` directory to compile the TypeScript code into JavaScript (`build/index.js`).

4.  **Configure MCP Settings:**
    *   Read the contents of the MCP settings file: `C:\Users\wowca\AppData\Roaming\Cursor\User\globalStorage\rooveterinaryinc.roo-cline\settings\mcp_settings.json`.
    *   Add a new entry to the `mcpServers` object for the Brave Search server:
        ```json
        "brave-search": {
          "command": "node",
          "args": ["C:/Users/wowca/AppData/Roaming/Roo-Code/MCP/brave-search-server/build/index.js"], // Use absolute path
          "env": {
            "BRAVE_SEARCH_API_KEY": "BSAu392iWUVIptXd4HQV6e61HWj5vlG"
          },
          "disabled": false, // Ensure it's enabled
          "alwaysAllow": []  // Default security
        }
        ```
    *   Write the updated content back to the `mcp_settings.json` file.

**Data Flow Diagram:**

```mermaid
graph LR
    A[Cline User] -- "Search Request" --> B(Architect Mode);
    B -- "use_mcp_tool('brave-search', {query: '...'})" --> C(MCP Host);
    C -- "Stdio Request" --> D[Brave Search MCP Server (Node.js)];
    D -- "API Key + Query" --> E(Brave Search API);
    E -- "Search Results" --> D;
    D -- "Stdio Response" --> C;
    C -- "Tool Result" --> B;
    B -- "Formatted Results" --> A;