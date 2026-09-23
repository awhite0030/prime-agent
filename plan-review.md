# Proposed Plan
Based on the bug report, we need to centralize model family detection and correct thinking/disable-thinking configurations for Gemini 3 and Gemma 4 models across both Google providers.

1. **`google-shared.ts` modifications:**
   - Change `getGeminiMajorVersion` regex to `/(?:^|\/|models\/)gemini(?:-live)?-(\d+)/`.
   - Add a union type: `export type GoogleThinkingLevel = "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";` (Wait, I need to check what `GoogleThinkingLevel` currently is in `google-shared.ts`. I will `grep` for it). Let's assume it exists.
   - Centralize model family detection helpers:
     ```typescript
     export function isGemma4Model(modelId: string): boolean {
         return /gemma-?4/.test(modelId.toLowerCase());
     }
     export function isGemini3ProModel(modelId: string): boolean {
         return /gemini-3(?:\.\d+)?-pro/.test(modelId.toLowerCase());
     }
     export function isGemini3FlashModel(modelId: string): boolean {
         return /gemini-3(?:\.\d+)?-flash/.test(modelId.toLowerCase());
     }
     export function isGemini3FlashLiteModel(modelId: string): boolean {
         return /gemini-3(?:\.\d+)?-flash-lite/.test(modelId.toLowerCase());
     }
     export function isGeminiThinkingLevelModel(modelId: string): boolean {
         return isGemini3ProModel(modelId) || isGemini3FlashModel(modelId) || isGemma4Model(modelId);
     }
     ```
   - Export `getDisabledThinkingConfig` and `getGoogleThinkingLevel`:
     ```typescript
     import type { GenerateContentConfig } from "@google/genai";
     // Note: `ThinkingConfig` comes from whatever typing we use. We will need to check the types.
     ```

Let's check the types and existing imports in `google-shared.ts` first.
