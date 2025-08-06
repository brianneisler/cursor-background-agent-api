export interface Composer {
  id?: string;
  name?: string;
  status?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  bcId?: string;
  createdAtMs?: number;
}

export interface BackgroundComposer {
  bcId: string;
  name: string;
  status: string;
  createdAtMs: number;
  updatedAtMs: number;
  source: string;
  repoUrl?: string;
}

export interface DetailedComposerResponse {
  bcId: string;
  name: string;
  status: string;
  createdAtMs: number;
  updatedAtMs: number;
  source: string;
  repoUrl?: string;
  diff?: any;
  teamWide?: boolean;
}

export interface DiffDetailsResponse {
  bcId: string;
  diff: any;
}

export interface ChangesHashResponse {
  bcId: string;
  hash: string;
}

export interface OpenPrResponse {
  success: boolean;
  prUrl?: string;
}

export interface PauseComposerResponse {
  success: boolean;
}

export interface RevertFileResponse {
  success: boolean;
}

export interface AttachBackgroundComposerResponse {
  success: boolean;
}

export interface CreateBackgroundComposerOptions {
  repositoryUrl: string;
  taskDescription: string;
  branch?: string;
  model?: string;
}

export interface CreateBackgroundComposerResponse {
  composer?: {
    bcId: string;
    createdAtMs: number;
    updatedAtMs: number;
    workspaceRootPath: string;
    repoUrl: string;
    source: string;
  };
  wasSwappedToDefault?: boolean;
}

export interface FollowupMessage {
  text: string;
  type: 'MESSAGE_TYPE_HUMAN';
}

export interface AddFollowupMessageOptions {
  bcId: string;
  synchronous: boolean;
  followupMessage: FollowupMessage;
  followupSource: 'BACKGROUND_COMPOSER_SOURCE_WEBSITE';
}

export interface AddFollowupMessageResponse {
  success: boolean;
}   