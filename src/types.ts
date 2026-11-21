/**
 * Type definitions for the LLM chat application.
 */

export interface Env {\n\t/** D1 database for encrypted, client-side-encrypted device sync. */\n\tDB?: D1Database;
	/**
	 * Binding for the Workers AI API.
	 */
	AI: Ai;

	/**
	 * Binding for static assets.
	 */
	ASSETS: { fetch: (request: Request) => Promise<Response> };
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}
