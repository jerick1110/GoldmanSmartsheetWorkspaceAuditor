
import { Workspace, Share, WorkspaceDetails } from '../types';

/**
 * CORS Proxy Strategy:
 * Browser-based Smartsheet API calls require a proxy.
 * We use a primary and secondary proxy to handle network-level blockages.
 */
const PRIMARY_PROXY = 'https://api.allorigins.win/raw?url=';
const SECONDARY_PROXY = 'https://corsproxy.io/?';
const API_BASE_URL = 'https://api.smartsheet.com/2.0';

interface PaginatedResponse<T> {
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    data: T[];
}

/**
 * Robust fetcher that attempts to bypass CORS and network restrictions.
 */
async function smartsheetFetch<T>(url: string, apiKey: string, useFallback = false): Promise<T> {
    if (!apiKey) throw new Error('Smartsheet API Key is missing.');

    const proxy = useFallback ? SECONDARY_PROXY : PRIMARY_PROXY;
    const proxiedUrl = `${proxy}${encodeURIComponent(url)}`;
    
    try {
        const response = await fetch(proxiedUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Detailed handling for Forbidden (403)
            if (response.status === 403) {
                throw new Error(
                    'Forbidden (403): Smartsheet rejected the request. ' +
                    'This often means your API key lacks "Admin" permissions, or your Smartsheet account has ' +
                    'IP restrictions that block the proxy. Ensure your key has full access to the target resources.'
                );
            }
            
            if (response.status === 401) throw new Error('Unauthorized (401): Invalid Smartsheet API token.');
            if (response.status === 429) throw new Error('Rate Limit (429): Too many requests. Waiting 60s is recommended.');
            
            const errorText = await response.text().catch(() => 'No error body');
            throw new Error(`Smartsheet API Error (${response.status}): ${errorText || response.statusText}`);
        }

        return await response.json();
    } catch (err) {
        // If the primary proxy fails at the network level, try the secondary once
        if (!useFallback && err instanceof Error && (err.message.includes('fetch') || err.message.includes('Load failed'))) {
            console.warn('Primary proxy failed, attempting fallback...');
            return smartsheetFetch(url, apiKey, true);
        }

        console.error('Final fetch failure:', err);
        if (err instanceof Error) {
            if (err.message.includes('Failed to fetch') || err.message.includes('Load failed')) {
                throw new Error(
                    'Network Error: The CORS proxy is unreachable. This is almost certainly caused by ' +
                    'a browser extension (like uBlock Origin, AdBlock) or a corporate firewall blocking ' +
                    'known proxy domains. Please disable extensions and try again.'
                );
            }
            throw err;
        }
        throw new Error('An unexpected connection error occurred.');
    }
}

/**
 * Lists ALL workspaces using pagination logic.
 * Smartsheet limits results to 100 by default; we request 1000 and loop through all pages.
 */
async function listAllWorkspaces(apiKey: string): Promise<Workspace[]> {
    let allWorkspaces: Workspace[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
        // pageSize=1000 is the maximum allowed per page
        const url = `${API_BASE_URL}/workspaces?page=${currentPage}&pageSize=1000`;
        const response = await smartsheetFetch<PaginatedResponse<Workspace>>(url, apiKey);
        
        if (response && response.data) {
            allWorkspaces = [...allWorkspaces, ...response.data];
            totalPages = response.totalPages || 1;
            console.log(`Retrieved page ${currentPage} of ${totalPages} workspaces...`);
        } else {
            break;
        }
        
        currentPage++;
    } while (currentPage <= totalPages);

    return allWorkspaces;
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
 * Main logic to process all workspaces and their permissions.
 */
export async function processAllWorkspaces(
    apiKey: string, 
    onProgress?: (msg: string) => void
): Promise<WorkspaceDetails[]> {
    if (onProgress) onProgress('Connecting to Smartsheet API...');
    
    const workspaces = await listAllWorkspaces(apiKey);
    const details: WorkspaceDetails[] = [];
    const total = workspaces.length;

    if (total === 0) return [];
    if (onProgress) onProgress(`Discovered ${total} workspaces. Auditing permissions...`);

    // We use a small delay between items to stay safely under Smartsheet's 300 requests/minute limit
    for (let i = 0; i < total; i++) {
        const workspace = workspaces[i];
        if (onProgress) {
            onProgress(`Analyzing ${i + 1} of ${total}: ${workspace.name}`);
        }

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
                members: members.length > 0 ? members.join('\n') : 'Private (No other users)',
                permissions: permissions.length > 0 ? permissions.join('\n') : 'N/A'
            });
            
            // Wait 200ms between calls to avoid hitting rate limits for large lists
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
            console.warn(`Could not audit workspace "${workspace.name}":`, err);
            details.push({
                workspaceName: workspace.name,
                owner: 'Restricted Access',
                members: 'Check your API token permissions',
                permissions: 'N/A'
            });
        }
    }

    return details;
}
