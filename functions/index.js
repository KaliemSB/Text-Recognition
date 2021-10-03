const functions = require("firebase-functions");
const vision = require("@google-cloud/vision").v1;
const admin = require("firebase-admin");
const path = require("path");

admin.initializeApp();

exports.textDetection = functions.region("southamerica-east1").storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;
  const outFolder = 'results';
  const gcsSourceUri = `gs://${fileBucket}/${filePath}`;
  const gcsDestinationUri = `gs://${fileBucket}/${outFolder}/`;
  const fileName = path.basename(filePath);
  const features = [{type: "DOCUMENT_TEXT_DETECTION"}];

  if (!contentType.startsWith("application/")) {
    return functions.logger.log("This is not an PDF.");
  };

  if (fileName.startsWith("output")) {
    return functions.logger.log("Already a Detection.");
  };

  const client = new vision.ImageAnnotatorClient({
    keyFilename: "key.json",
  });

  const inputConfig = {
    mimeType: "application/pdf",
    gcsSource: {
        uri: gcsSourceUri,
    },
  };

  const outputConfig = {
    gcsDestination: {
        uri: gcsDestinationUri,
    },
  };

  const request = {
    requests: [
        {
        inputConfig: inputConfig,
        features: features,
        outputConfig: outputConfig,
        },
    ],
  };

  (async function () {
    const [operation] = await client.asyncBatchAnnotateFiles(request);
    const [filesResponse] = await operation.promise();
    const destinationUri =
        filesResponse.responses[0].outputConfig.gcsDestination.uri;
    functions.logger.log(`Json saved to: ${destinationUri}`);
  })();
});
