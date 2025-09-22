import React, { useState, useEffect, useCallback } from 'react';
import { describeCharacterImage, generateScript, generateStoryboardImage, generateVideoForScene } from './services/geminiService';
import { Scene, VideoResult, Character, StoryboardImage } from './types';
import { LOADING_MESSAGES } from './constants';

const Header: React.FC = () => (
  <header className="w-full text-center p-4 md:p-6">
    <div className="flex items-center justify-center gap-4">
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-keal-pink bg-gray-800 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 text-keal-pink" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-keal-pink via-keal-blue to-keal-green">
          Viral Video Storyboarder
        </h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">Bring your characters to life in a viral video format!</p>
      </div>
    </div>
  </header>
);

const SetupForm: React.FC<{
  onSubmit: (description: string, characters: Character[]) => void;
  isLoading: boolean;
}> = ({ onSubmit, isLoading }) => {
  const [description, setDescription] = useState('');
  const [characters, setCharacters] = useState<Character[]>(() =>
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      name: `Character ${i + 1}`,
      file: null,
      imageBase64: null,
      description: null,
    }))
  );

  const handleCharacterNameChange = (id: number, name: string) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };
  
  const handleCharacterImageChange = (id: number, file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setCharacters(prev => prev.map(c => c.id === id ? { ...c, file, imageBase64: base64String } : c));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeCharacters = characters.filter(c => c.file);
    if (description.trim() && activeCharacters.length > 0 && !isLoading) {
      onSubmit(description.trim(), activeCharacters);
    }
  };
  
  const canSubmit = description.trim() && characters.some(c => c.file) && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <label className="text-lg font-semibold text-gray-200">1. Describe the Viral Video Idea</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., 'A cat surprisingly jumps out of a box to scare its owner'"
          className="w-full h-24 p-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-keal-blue transition-all"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
         <label className="text-lg font-semibold text-gray-200">2. Upload Your Characters (at least 1)</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {characters.map(char => (
            <div key={char.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-2">
              <input type="text" value={char.name} onChange={e => handleCharacterNameChange(char.id, e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-keal-blue"
                disabled={isLoading} />
              <label className="w-full aspect-square bg-gray-700 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-600 relative">
                <input type="file" accept="image/*" className="hidden" onChange={e => handleCharacterImageChange(char.id, e.target.files?.[0] || null)} disabled={isLoading} />
                {char.file ? <img src={URL.createObjectURL(char.file)} alt={char.name} className="w-full h-full object-cover rounded-md"/> : 
                <span className="text-gray-400 text-xs text-center">Click to upload</span>}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-3 px-6 bg-keal-pink text-white font-bold rounded-lg hover:bg-opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-105"
      >
        {isLoading ? 'Generating...' : 'Create My Video!'}
      </button>
    </form>
  );
};

const LoadingIndicator: React.FC<{ message: string }> = ({ message }) => (
    <div className="text-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-keal-blue mx-auto"></div>
        <p className="text-gray-300 text-lg font-medium">{message}</p>
        <p className="text-sm text-gray-500">This multi-step process can take several minutes. Please be patient.</p>
    </div>
);

const ResultsDisplay: React.FC<{
  scenes: Scene[];
  storyboardImages: StoryboardImage[];
  videoResults: VideoResult[];
}> = ({ scenes, storyboardImages, videoResults }) => {
  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-8">
      {scenes.map((scene) => {
        const storyboard = storyboardImages.find(s => s.sceneNumber === scene.sceneNumber);
        const videoResult = videoResults.find(v => v.sceneNumber === scene.sceneNumber);
        return (
          <div key={scene.sceneNumber} className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <h3 className="text-xl font-bold text-keal-green mb-2">Scene {scene.sceneNumber}</h3>
            <p className="text-gray-400 italic mb-4">"{scene.description}"</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="aspect-video bg-gray-900 rounded-md flex flex-col items-center justify-center p-2">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Storyboard</h4>
                {storyboard ? (
                  <img src={storyboard.url} alt={`Storyboard for scene ${scene.sceneNumber}`} className="w-full h-full object-contain rounded-md" />
                ) : (
                  <div className="text-center text-gray-500 animate-pulse-fast">Generating...</div>
                )}
              </div>
              <div className="aspect-video bg-gray-900 rounded-md flex flex-col items-center justify-center p-2">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Video</h4>
                {videoResult ? (
                  <video src={videoResult.url} controls className="w-full h-full rounded-md" />
                ) : (
                  <div className={`text-center text-gray-500 ${storyboard ? 'animate-pulse-fast' : ''}`}>
                    {storyboard ? "Generating..." : "Waiting for storyboard..."}
                  </div>
                )}
              </div>
            </div>
            {videoResult && (
               <a
                href={videoResult.url}
                download={`scene_${scene.sceneNumber}.mp4`}
                className="mt-4 inline-flex items-center gap-2 py-2 px-4 bg-keal-blue text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                Download Scene {scene.sceneNumber}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
};


export default function App() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [storyboardImages, setStoryboardImages] = useState<StoryboardImage[]>([]);
  const [videoResults, setVideoResults] = useState<VideoResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fix: Replaced NodeJS.Timeout with inferred browser type for setInterval and improved conditional effect logic.
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleGenerate = useCallback(async (desc: string, characters: Character[]) => {
    setIsLoading(true);
    setError(null);
    setScenes([]);
    setStoryboardImages([]);
    setVideoResults([]);
    
    try {
      setLoadingMessage('Analyzing characters...');
      const charactersWithDescriptions = await Promise.all(
        characters.map(async (char) => {
          if (!char.imageBase64 || !char.file) return char;
          const description = await describeCharacterImage(char.imageBase64, char.file.type);
          return { ...char, description };
        })
      );

      setLoadingMessage('Creating script...');
      const generatedScenes = await generateScript(desc, charactersWithDescriptions);
      if(!generatedScenes || generatedScenes.length === 0) {
        throw new Error("The AI failed to generate a script. Please try a different description.");
      }
      setScenes(generatedScenes);

      for (const scene of generatedScenes) {
        setLoadingMessage(`Generating storyboard for scene ${scene.sceneNumber}...`);
        const { url: sbUrl, base64: sbBase64 } = await generateStoryboardImage(scene.videoPrompt);
        setStoryboardImages(prev => [...prev, { sceneNumber: scene.sceneNumber, url: sbUrl, base64: sbBase64 }]);
        
        setLoadingMessage(`Generating video for scene ${scene.sceneNumber}...`);
        const videoUrl = await generateVideoForScene(scene.videoPrompt, sbBase64);
        setVideoResults(prev => [...prev, { sceneNumber: scene.sceneNumber, url: videoUrl }]);
      }

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
      <div className="container mx-auto">
        <Header />
        <div className="mt-8">
          <SetupForm onSubmit={handleGenerate} isLoading={isLoading} />
        </div>
        
        {error && (
          <div className="mt-8 max-w-2xl mx-auto p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg text-center">
            <p className="font-bold">An Error Occurred</p>
            <p>{error}</p>
          </div>
        )}

        {isLoading && <LoadingIndicator message={loadingMessage} />}
        
        {!isLoading && scenes.length > 0 && (
          <ResultsDisplay scenes={scenes} storyboardImages={storyboardImages} videoResults={videoResults} />
        )}
      </div>
    </main>
  );
}