import { Workspace, Share, WorkspaceDetails } from '../types';

// Using a CORS proxy to bypass the browser's same-origin policy for client-side API calls.
// Public proxies can be unreliable. If you continue to experience network errors,
// it is likely due to the proxy service. A dedicated server-side proxy is the most robust solution.
const PROXY_URL_PREFIX = 'https://cors.eu.org/';
const API_BASE_URL = 'https://api.smartsheet.com/2.0';

// A helper function to handle API requests
async function smartsheetFetch<T>(url: string, apiKey: string): Promise<T> {
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };

    const proxiedUrl = `${PROXY_URL_PREFIX}${url}`;

    const response = await fetch(proxiedUrl, { headers });

    if (!response.ok) {
        try {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch (e) {
            throw new Error(`HTTP error! status: ${response.status}. The response from the server was not valid JSON.`);
        }
    }
    
    return response.json();
}

// Function to list all workspaces
async function listWorkspaces(apiKey: string): Promise<Workspace[]> {
    const url = `${API_BASE_URL}/workspaces`;
    const response = await smartsheetFetch<{ data: Workspace[] }>(url, apiKey);
    return response.data || [];
}

// Function to get shares for a single workspace
async function getWorkspaceShares(apiKey: string, workspaceId: number): Promise<Share[]> {
    const url = `${API_BASE_URL}/workspaces/${workspaceId}/shares`;
    const response = await smartsheetFetch<{ data: Share[] }>(url, apiKey);
    return response.data || [];
}

// Main function to process all workspaces
export async function processAllWorkspaces(apiKey: string): Promise<WorkspaceDetails[]> {
    const workspaces = await listWorkspaces(apiKey);

    // Process requests in parallel to improve performance
    const allDetailsPromises = workspaces.map(async (workspace) => {
        const shares = await getWorkspaceShares(apiKey, workspace.id);
        
        let owner = "N/A";
        const members: string[] = [];
        const permissions: string[] = [];

        for (const share of shares) {
            const identity = share.email || share.name || 'Unknown';
            if (share.accessLevel === 'OWNER') {
                owner = identity;
            } else {
                members.push(identity);
                permissions.push(share.accessLevel);
            }
        }

        return {
            workspaceName: workspace.name,
            owner: owner,
            members: members.join('\n'),
            permissions: permissions.join('\n')
        };
    });

    return Promise.all(allDetailsPromises);
}