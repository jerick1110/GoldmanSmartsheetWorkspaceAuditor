
import { Workspace, Share, WorkspaceDetails } from '../types';

/**
 * We use a CORS proxy to bypass the browser's Same-Origin Policy since the Smartsheet API
 * does not currently support CORS requests directly from the browser.
 * corsproxy.io is generally reliable for passing through Authorization headers.
 */
const PROXY_URL_PREFIX = 'https://corsproxy.io/?';
const API_BASE_URL = 'https://api.smartsheet.com/2.0';

/**
 * Helper function to handle Smartsheet API requests via a CORS proxy.
 */
async function smartsheetFetch<T>(url: string, apiKey: string): Promise<T> {
    if (!apiKey) {
        throw new Error('Smartsheet API Key is missing.');
    }

    // Standard Smartsheet headers
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    const proxiedUrl = `${PROXY_URL_PREFIX}${encodeURIComponent(url)}`;

    try {
        console.debug(`Fetching: ${url} via proxy...`);
        const response = await fetch(proxiedUrl, { 
            headers,
            method: 'GET',
            mode: 'cors'
        });

        if (!response.ok) {
            // Detailed status code handling
            if (response.status === 401) {
                throw new Error('Unauthorized: Please verify your Smartsheet API token.');
            }
            if (response.status === 403) {
                throw new Error('Forbidden: Your token lacks permission to view these workspaces.');
            }
            if (response.status === 404) {
                throw new Error('Resource not found: The Smartsheet API endpoint is invalid.');
            }
            if (response.status === 429) {
                throw new Error('Rate limit exceeded: Too many requests. Please wait a minute and try again.');
            }
            
            let errorBody = '';
            try {
                errorBody = await response.text();
            } catch (e) {
                errorBody = response.statusText;
            }
            throw new Error(`Smartsheet API Error (${response.status}): ${errorBody}`);
        }
        
        const data = await response.json();
        
        // Some proxies might return a successful status code but include an error message in the JSON
        if (data && data.errorCode !== undefined) {
            throw new Error(`Smartsheet API Error (${data.errorCode}): ${data.message}`);
        }

        return data;
    } catch (err) {
        console.error('Smartsheet fetch error details:', err);
        if (err instanceof Error) {
            // Check for common fetch failure scenarios
            if (err.message.includes('Failed to fetch') || err.message.includes('Load failed')) {
                throw new Error('Connection failed. This is usually caused by the CORS proxy being temporarily unavailable or blocked by your network/ad-blocker. Please check your internet or try again in a moment.');
            }
            throw err;
        }
        throw new Error('An unexpected network error occurred. Please check your browser console for more details.');
    }
}

/**
 * Lists all workspaces accessible by the user.
 */
async function listWorkspaces(apiKey: string): Promise<Workspace[]> {
    const url = `${API_BASE_URL}/workspaces`;
    const response = await smartsheetFetch<{ data: Workspace[] }>(url, apiKey);
    return response.data || [];
}

/**
 * Gets sharing details for a specific workspace.
 */
async function getWorkspaceShares(apiKey: string, workspaceId: number): Promise<Share[]> {
    const url = `${API_BASE_URL}/workspaces/${workspaceId}/shares`;
    const response = await smartsheetFetch<{ data: Share[] }>(url, apiKey);
    return response.data || [];
}

/**
 * Main entry point: Fetches all workspaces and their corresponding sharing details.
 * We process items sequentially to be respectful of Smartsheet API rate limits.
 */
export async function processAllWorkspaces(apiKey: string): Promise<WorkspaceDetails[]> {
    console.debug('Starting workspace processing...');
    const workspaces = await listWorkspaces(apiKey);
    console.debug(`Found ${workspaces.length} workspaces.`);
    
    const details: WorkspaceDetails[] = [];

    // Process sequentially to prevent overwhelming the proxy and Smartsheet's rate limits
    for (const workspace of workspaces) {
        try {
            const shares = await getWorkspaceShares(apiKey, workspace.id);
            
            let owner = "N/A";
            const members: string[] = [];
            const permissions: string[] = [];

            for (const share of shares) {
                const identity = share.email || share.name || 'Unknown User';
                if (share.accessLevel === 'OWNER') {
                    owner = identity;
                } else {
                    members.push(identity);
                    permissions.push(share.accessLevel);
                }
            }

            details.push({
                workspaceName: workspace.name,
                owner: owner,
                members: members.length > 0 ? members.join('\n') : 'No members found',
                permissions: permissions.length > 0 ? permissions.join('\n') : 'N/A'
            });
            
            // Add a small delay between requests (100ms) to ensure we stay under the burst rate limit
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
            console.warn(`Could not retrieve shares for workspace: ${workspace.name}`, err);
            // Append the workspace with an error state instead of failing the entire process
            details.push({
                workspaceName: workspace.name,
                owner: 'Restricted access',
                members: 'Could not fetch list',
                permissions: 'Check your permissions'
            });
        }
    }

    return details;
}
