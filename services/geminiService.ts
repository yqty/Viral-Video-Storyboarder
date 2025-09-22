import { GoogleGenAI, Type } from "@google/genai";
import { Scene, Character } from "../types";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function describeCharacterImage(imageBase64: string, mimeType: string): Promise<string> {
  const prompt = "Provide a detailed, descriptive paragraph about this character for use in a text-to-image AI prompt. Focus on visual attributes like clothing, art style, colors, hair, species, and unique features. Describe it as if you were instructing an artist.";
  try {
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error describing character image:", error);
    throw new Error("Failed to analyze character image.");
  }
}


export async function generateScript(videoDescription: string, characters: Character[]): Promise<Scene[]> {
  const characterDescriptions = characters
    .filter(c => c.description)
    .map(c => `- ${c.name}: ${c.description}`)
    .join('\n');

  const prompt = `
    Analyze the story structure of the following viral video description: "${videoDescription}".

    Based on that analysis, create a new, original short video script starring the following characters:
    ${characterDescriptions}

    The script must be broken down into exactly 3 short, distinct scenes. For each scene, provide:
    1. A concise 'description' for the user to read.
    2. A detailed 'videoPrompt' for a text-to-video AI. This prompt should vividly describe the scene, the environment, and the actions of the characters involved. Incorporate the character descriptions provided above to ensure visual consistency.

    Ensure the final output is a valid JSON array of scenes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNumber: { type: Type.INTEGER },
              description: { type: Type.STRING },
              videoPrompt: { type: Type.STRING },
            },
            required: ["sceneNumber", "description", "videoPrompt"],
          },
        },
      },
    });

    const jsonString = response.text;
    const scenes = JSON.parse(jsonString);
    
    if (Array.isArray(scenes)) {
        return scenes as Scene[];
    } else {
        throw new Error("AI did not return a valid array of scenes.");
    }

  } catch (error) {
    console.error("Error generating script:", error);
    throw new Error("Failed to generate video script.");
  }
}

export async function generateStoryboardImage(scenePrompt: string): Promise<{ url: string, base64: string }> {
  const fullPrompt = `${scenePrompt}. Cinematic, high-quality, 4K, detailed, vibrant colors, trending on social media.`;
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '16:9',
      },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

    return { url: imageUrl, base64: base64ImageBytes };

  } catch (error) {
    console.error(`Error generating storyboard for prompt "${scenePrompt}":`, error);
    throw new Error("Failed to generate a storyboard image.");
  }
}


export async function generateVideoForScene(scenePrompt: string, imageBase64: string): Promise<string> {
    const fullPrompt = `${scenePrompt}. Cinematic, high-quality, 4K, trending on social media.`;
    
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: fullPrompt,
            image: {
              imageBytes: imageBase64,
              mimeType: 'image/png'
            },
            config: {
              numberOfVideos: 1
            }
        });

        // Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was found.");
        }

        // Fetch the video data
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video data: ${videoResponse.statusText}`);
        }

        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error(`Error generating video for prompt "${scenePrompt}":`, error);
        throw new Error("Failed to generate a video clip.");
    }
}