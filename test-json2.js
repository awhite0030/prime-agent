// If we want to defer JSON.stringify until stream end...
// `matchingToolCall.thoughtSignature = JSON.stringify(detailRecord);`
// How does `thoughtSignature` get used during the stream?
// It probably isn't. So we can just wait until `[DONE]` or the end of the generator.
// Wait, `detailRecord` is mutated in place? `reasoningDetailsByIndex.set(index, mergedDetail);`
// `mergedDetail` is the same object `detailRecord`.
// Yes! So at the end we can stringify them.
