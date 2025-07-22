const {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} = require("@aws-sdk/client-bedrock-runtime");

const bedrock = new BedrockRuntimeClient({ region: "us-west-2" }); // Hardcoded region

const queryBedrock = async (inputText) => {
  const params = {
    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0", // Hardcoded model ID
    inferenceConfiguration: {
      inferenceProfile:
        "arn:aws:bedrock:us-west-2:299335861593:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0", // Hardcoded inference profile ARN
    },
    contentType: "application/json", // Specify content type
    accept: "application/json", // Specify accept type
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31", // Required version
      max_tokens: 200, // Maximum tokens
      top_k: 250, // Top-k sampling
      stop_sequences: [], // Stop sequences
      temperature: 1, // Temperature for randomness
      top_p: 0.999, // Top-p sampling
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: inputText, // User input text
            },
          ],
        },
      ],
    }),
  };

  try {
    const command = new InvokeModelWithResponseStreamCommand(params); // Correctly instantiate the command
    const response = await bedrock.send(command); // Send the command

    // Process the streamed response
    const chunks = [];
    for await (const chunk of response.body) {
      const chunkString = Buffer.from(chunk.chunk.bytes).toString("utf-8"); // Convert chunk to string
      console.log("Chunk:", chunkString); // Debugging statement to log each chunk

      try {
        const parsedChunk = JSON.parse(chunkString); // Parse each chunk as JSON
        chunks.push(parsedChunk); // Add parsed chunk to the array
      } catch (error) {
        console.error("Error parsing chunk:", error); // Log parsing errors
      }
    }

    // Combine relevant content from chunks
    const contentBlocks = chunks
      .filter(
        (chunk) => chunk.type === "content_block_delta" && chunk.delta?.text
      )
      .map((chunk) => chunk.delta.text)
      .join(""); // Combine text deltas into a single string

    return {
      query: inputText,
      response: contentBlocks, // Return the combined response
    };
  } catch (error) {
    console.error("Error querying Bedrock:", error);
    throw error; // Rethrow the error for the handler to catch
  }
};

module.exports = { queryBedrock };
//hello
