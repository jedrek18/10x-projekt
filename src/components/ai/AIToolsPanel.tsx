import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Languages, BookOpen, Edit3, Sparkles } from "lucide-react";
import { t } from "@/lib/i18n";

// ============================================================================
// TYPES
// ============================================================================

interface TranslationResult {
  translation: string;
  confidence: number;
  language: string;
  originalText: string;
}

interface GrammarCorrectionResult {
  original: string;
  corrected: string;
  corrections: {
    original: string;
    corrected: string;
    explanation: string;
    type: string;
  }[];
  confidence: number;
}

interface VocabularyResult {
  word: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  partOfSpeech: string;
  difficulty: string;
}

// ============================================================================
// LANGUAGE OPTIONS
// ============================================================================

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "pl", name: "Polski" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
  { code: "ar", name: "العربية" },
];

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult> {
  const response = await fetch("/api/ai/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      targetLanguage,
      sourceLanguage,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Translation failed");
  }

  return response.json();
}

async function correctGrammar(text: string, language?: string): Promise<GrammarCorrectionResult> {
  const response = await fetch("/api/ai/grammar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      language,
      includeExplanations: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Grammar correction failed");
  }

  return response.json();
}

async function explainVocabulary(word: string, context?: string): Promise<VocabularyResult> {
  const response = await fetch("/api/ai/vocabulary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      word,
      context,
      includeExamples: true,
      includeSynonyms: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Vocabulary explanation failed");
  }

  return response.json();
}

// ============================================================================
// COMPONENTS
// ============================================================================

function TranslationTab() {
  const [inputText, setInputText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const translation = await translateText(inputText, targetLanguage, sourceLanguage || undefined);
      setResult(translation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source-language">Source Language (Optional)</Label>
          <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
            <SelectTrigger>
              <SelectValue placeholder="Auto-detect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Auto-detect</SelectItem>
              {LANGUAGE_OPTIONS.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target-language">Target Language</Label>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="input-text">Text to Translate</Label>
        <Textarea
          id="input-text"
          placeholder="Enter text to translate..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={4}
          maxLength={5000}
        />
        <div className="text-sm text-muted-foreground">{inputText.length}/5000 characters</div>
      </div>

      <Button onClick={handleTranslate} disabled={!inputText.trim() || isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Translating...
          </>
        ) : (
          <>
            <Languages className="mr-2 h-4 w-4" />
            Translate
          </>
        )}
      </Button>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Translation Result
            </CardTitle>
            <CardDescription>Confidence: {Math.round(result.confidence * 100)}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Translation</Label>
              <div className="mt-1 p-3 bg-muted rounded-md">{result.translation}</div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{result.language}</Badge>
              <Badge variant="secondary">{Math.round(result.confidence * 100)}% confidence</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GrammarTab() {
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState("en");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GrammarCorrectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCorrect = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const correction = await correctGrammar(inputText, language);
      setResult(correction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grammar correction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="grammar-language">Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="grammar-text">Text to Correct</Label>
        <Textarea
          id="grammar-text"
          placeholder="Enter text with grammatical errors..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={4}
          maxLength={2000}
        />
        <div className="text-sm text-muted-foreground">{inputText.length}/2000 characters</div>
      </div>

      <Button onClick={handleCorrect} disabled={!inputText.trim() || isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Correcting...
          </>
        ) : (
          <>
            <Edit3 className="mr-2 h-4 w-4" />
            Correct Grammar
          </>
        )}
      </Button>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Grammar Correction
            </CardTitle>
            <CardDescription>Confidence: {Math.round(result.confidence * 100)}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Original</Label>
              <div className="mt-1 p-3 bg-muted rounded-md">{result.original}</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Corrected</Label>
              <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">{result.corrected}</div>
            </div>
            {result.corrections.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Corrections</Label>
                <div className="mt-2 space-y-2">
                  {result.corrections.map((correction, index) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex gap-2 mb-1">
                        <span className="line-through text-red-600">{correction.original}</span>
                        <span>→</span>
                        <span className="text-green-600 font-medium">{correction.corrected}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{correction.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VocabularyTab() {
  const [word, setWord] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VocabularyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    if (!word.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const explanation = await explainVocabulary(word, context || undefined);
      setResult(explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vocabulary explanation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vocabulary-word">Word or Phrase</Label>
        <Input
          id="vocabulary-word"
          placeholder="Enter a word or phrase to explain..."
          value={word}
          onChange={(e) => setWord(e.target.value)}
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="vocabulary-context">Context (Optional)</Label>
        <Textarea
          id="vocabulary-context"
          placeholder="Provide context for better explanation..."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
          maxLength={500}
        />
        <div className="text-sm text-muted-foreground">{context.length}/500 characters</div>
      </div>

      <Button onClick={handleExplain} disabled={!word.trim() || isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Explaining...
          </>
        ) : (
          <>
            <BookOpen className="mr-2 h-4 w-4" />
            Explain Vocabulary
          </>
        )}
      </Button>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {result.word}
            </CardTitle>
            <CardDescription>
              {result.partOfSpeech} • {result.difficulty} level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Definition</Label>
              <div className="mt-1 p-3 bg-muted rounded-md">{result.definition}</div>
            </div>

            {result.examples.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Examples</Label>
                <div className="mt-2 space-y-2">
                  {result.examples.map((example, index) => (
                    <div key={index} className="p-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                      "{example}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.synonyms.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Synonyms</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.synonyms.map((synonym, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {synonym}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.antonyms.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Antonyms</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.antonyms.map((antonym, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {antonym}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIToolsPanel() {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          AI Language Tools
        </CardTitle>
        <CardDescription>Translate text, correct grammar, and explore vocabulary with AI assistance</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="translation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="translation" className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Translation
            </TabsTrigger>
            <TabsTrigger value="grammar" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Grammar
            </TabsTrigger>
            <TabsTrigger value="vocabulary" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Vocabulary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="translation" className="mt-6">
            <TranslationTab />
          </TabsContent>

          <TabsContent value="grammar" className="mt-6">
            <GrammarTab />
          </TabsContent>

          <TabsContent value="vocabulary" className="mt-6">
            <VocabularyTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
