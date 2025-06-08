require("dotenv").config(); // Load environment variables from .env

const {
  BedrockClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock");

const bedrock = new BedrockClient({ region: process.env.AWS_REGION }); // Use region from .env

const queryBedrock = async (inputText) => {
  const params = {
    modelId: process.env.BEDROCK_MODEL_ID, // Use model ID from .env
    inputText: inputText,
  };

  const command = new InvokeModelCommand(params);
  const response = await bedrock.send(command);
  return response.outputText;
};

module.exports = { queryBedrock };
