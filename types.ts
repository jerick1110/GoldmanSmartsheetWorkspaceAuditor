export interface Workspace {
    id: number;
    name: string;
}

export interface Share {
    id: string;
    type: 'USER' | 'GROUP';
    email?: string;
    name?: string;
    accessLevel: 'VIEWER' | 'EDITOR' | 'EDITOR_SHARE' | 'ADMIN' | 'OWNER';
}

export interface WorkspaceDetails {
    workspaceName: string;
    owner: string;
    members: string;
    permissions: string;
}
