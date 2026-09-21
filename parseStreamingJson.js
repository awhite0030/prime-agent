// "Every chunk re-parses the full accumulated tool-call arguments (`JSON.parse` per chunk => O(L^2))"
// Yes! `parseStreamingJson(block.partialArgs)` is called for EVERY chunk of `toolCall.function.arguments`.
