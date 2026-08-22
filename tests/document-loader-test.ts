import path from "path";
import { DocumentLoader } from "../src/loaders/DocumentLoader";

const documentLoader = new DocumentLoader();

const createSampleFiles = async () => {
  const sampleContent = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

  await Bun.write("sample.txt", sampleContent);
  console.log(`✅ Created sample.txt`);
};

const testLoader = async () => {
  console.log(`Starting DocumentLoader test...`);

  await createSampleFiles();

  const result = await documentLoader.loadFile("sample.txt");
  console.log(`✅ Loaded document:`, result);
  console.log(`Filename: ${result.metadata.filename}`);
  console.log(`File Type: ${result.metadata.fileType}`);
  console.log(`Word Count: ${result.metadata.wordCount}`);
  console.log(`Content: ${result.content}`);
  console.log(`✅ Document loader test passed`);

  await Bun.write("sample.txt", ""); // Clean up the sample file
  console.log(`✅ Cleaned up sample.txt`);
};

testLoader();
