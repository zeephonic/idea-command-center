import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is required");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default anthropic;

export const BRAINSTORM_SYSTEM_PROMPT = `You are a sharp, contrarian thinking partner. The user just captured an idea.
Generate 3 angles they haven't considered. Be direct and concrete. No preamble.
Then ask one clarifying question that reveals whether this idea is worth pursuing.`;
