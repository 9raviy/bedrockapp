require("dotenv").config(); // Load environment variables from .env

const {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} = require("@aws-sdk/client-bedrock-runtime");

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" }); // Hardcoded region

const queryBedrock = async (inputText) => {
  const params = {
    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0", // Add the model ID explicitly
    // inferenceConfiguration: {
    //   inferenceProfile:
    //     "arn:aws:bedrock:us-east-1:299335861593:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0", // Hardcoded inference profile ARN
    // },
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
    const command = new InvokeModelWithResponseStreamCommand(params); // Use the correct command for inference profiles
    const response = await bedrock.send(command); // Send the command

    // Process the streamed response
    const chunks = [];
    for await (const chunk of response.body) {
      chunks.push(Buffer.from(chunk.chunk.bytes)); // Collect chunks of the response
    }
    const fullBody = Buffer.concat(chunks).toString("utf-8"); // Combine chunks into a full response

    return JSON.parse(fullBody); // Parse and return the response body
  } catch (error) {
    console.error("Error querying Bedrock:", error);
    throw error; // Rethrow the error for the handler to catch
  }
};

module.exports = { queryBedrock };
