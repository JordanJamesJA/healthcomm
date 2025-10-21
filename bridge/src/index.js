import { detectAnomaly } from "./azureAnomalyClient.js";

// Example inside Kafka message handler:
const anomalyResult = await detectAnomaly(vitalsSeries);
