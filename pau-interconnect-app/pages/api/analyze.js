// pages/api/analyze.js
import formidable from "formidable";
import fs from "fs";
import pdf from "pdf-parse";

export const config = {
  api: { bodyParser: false }, // Important: to handle file uploads
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload failed" });

    const file = files.resume;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const buffer = fs.readFileSync(file.filepath);
    const data = await pdf(buffer);
    const text = data.text.slice(0, 2500); // limit length for API call

    // Call NVIDIA API
    try {
      const response = await fetch(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-70b-instruct",
            messages: [
              {
                role: "user",
                content: `You are an HR assistant. Analyze this CV and score it out of 100 with short feedback:\n\n${text}`,
              },
            ],
          }),
        }
      );

      const result = await response.json();
      const analysis = result.choices?.[0]?.message?.content || "No response";

      res.status(200).json({ analysis });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error analyzing CV" });
    }
  });
}
