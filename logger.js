import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFilePath = path.join(__dirname, "logs.json");


function logger(stack, level, packageName, message) {
  const logData = {
    logID: uuidv4(),
    timestamp: new Date().toISOString(),
    stack,
    level,
    package: packageName,
    message,
  };

 
  fs.appendFileSync(logFilePath, JSON.stringify(logData) + "\n");

  return {
    logID: logData.logID,
    message: "log created successfully",
  };
}

export default logger;
