export interface Scene {
  sceneNumber: number;
  description: string;
  videoPrompt: string;
}

export interface VideoResult {
  sceneNumber: number;
  url: string;
}

export interface Character {
  id: number;
  name: string;
  file: File | null;
  imageBase64: string | null;
  description: string | null;
}

export interface StoryboardImage {
  sceneNumber: number;
  url: string;
  base64: string;
}
