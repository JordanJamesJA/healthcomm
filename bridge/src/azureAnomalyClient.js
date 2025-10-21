import axios from "axios";

export async function detectAnomaly(series, granularity = "minutely") {
  const payload = { series, granularity };
  const resp = await axios.post(
    `${process.env.AZURE_ENDPOINT}/anomalydetector/v1.1/timeseries/entire/detect`,
    payload,
    {
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_KEY,
        "Content-Type": "application/json",
      },
    }
  );
  return resp.data;
}
