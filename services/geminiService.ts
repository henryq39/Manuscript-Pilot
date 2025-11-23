import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";
import { AnalysisType, CoverLetterParams, JournalEvaluationResult, JournalGuidelines } from "../types";

// Helper to get a fresh AI client instance with the latest API key
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Use Preview Pro for complex scientific text analysis
const TEXT_MODEL = 'gemini-3-pro-preview';
// Use Flash Image (Nano Banana) for editing existing images AND standard generation
const FLASH_IMAGE_MODEL = 'gemini-2.5-flash-image';
// Use Pro Image (Nano Banana Pro) for high-fidelity (2K) generation (Text-to-Image only)
const PRO_IMAGE_MODEL = 'gemini-3-pro-image-preview';

const getJournalStyleParams = (journal: string) => {
  const j = journal.toLowerCase();
  if (j.includes('nature') || j.includes('science')) {
    return {
      focus: "Broad conceptual advance, accessibility to non-specialists, and 'punchy' concise writing.",
      tone: "Authoritative, high-impact, and devoid of unnecessary jargon."
    };
  }
  if (j.includes('cell') || j.includes('molecular cell')) {
    return {
      focus: "Deep mechanistic insight, logical completeness, and a structured, comprehensive narrative.",
      tone: "Scholarly, detailed, and logically rigorous."
    };
  }
  if (j.includes('journal of cell biology') || j.includes('jcb') || j.includes('current biology')) {
    return {
      focus: "Solid experimental data, clear cell biological mechanisms, and avoiding over-interpretation.",
      tone: "Measured, precise, and data-driven."
    };
  }
  return {
    focus: "Clarity, novelty within the specific field, and methodological soundness.",
    tone: "Professional and constructive."
  };
};

export const analyzeManuscriptText = async (text: string, type: AnalysisType, targetJournal: string): Promise<string> => {
  const ai = getAiClient();
  const style = getJournalStyleParams(targetJournal);
  
  const systemInstruction = `
    You are a Senior Editor at ${targetJournal}. 
    Your role is to assist researchers in refining their manuscripts to meet the specific standards of ${targetJournal}.
    
    Journal Style Priorities:
    1. ${style.focus}
    2. Tone: ${style.tone}
    
    When providing output:
    - If asking for a rewrite, provide the rewritten text clearly.
    - Provide a bulleted list of "Editor's Notes" explaining *why* changes were made to fit ${targetJournal}.
  `;

  let prompt = "";

  switch (type) {
    case AnalysisType.IMPACT_POLISH:
      prompt = `
      Please polish the following text specifically for submission to **${targetJournal}**. 
      
      Goals:
      - Enhance the flow and readability.
      - Ensure the significance is communicated in a way that suits ${targetJournal}'s audience.
      - Use active voice.
      
      Text to Polish:
      "${text}"
      `;
      break;
    case AnalysisType.LOGIC_CHECK:
      prompt = `
      Analyze the scientific logic of the following text as a reviewer for **${targetJournal}**. 
      Identify potential gaps in reasoning, over-interpretation of data, or places where more experimental evidence might be requested by ${targetJournal} reviewers.
      
      Text to Analyze:
      "${text}"
      `;
      break;
    case AnalysisType.CONCISENESS:
      prompt = `
      Significantly shorten the following text while retaining all key scientific meaning.
      Aim for a word count reduction suitable for **${targetJournal}**'s strict formatting limits.
      
      Text to Shorten:
      "${text}"
      `;
      break;
    case AnalysisType.REBUTTAL:
        prompt = `
        The user has provided a draft response to a reviewer or a specific reviewer comment for a manuscript submitted to **${targetJournal}**.
        Refine this response to be polite, professional, firm yet conciliatory, adhering to standard conventions.
        
        Draft Response/Comment:
        "${text}"
        `;
        break;
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      }
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Error analyzing text:", error);
    return "Error: Unable to analyze text at this time. Please check your input and try again.";
  }
};

export const generateCoverLetter = async (params: CoverLetterParams, targetJournal: string): Promise<string> => {
  const ai = getAiClient();
  const style = getJournalStyleParams(targetJournal);

  const prompt = `
  Act as a Senior Editor helping to draft a high-impact Cover Letter for submission to **${targetJournal}**.
  
  Manuscript Details:
  - Title: ${params.title}
  - Corresponding Author: ${params.authorName}
  - Affiliation: ${params.affiliation}
  - Editor Name: ${params.editorName || "the Editor"}
  
  Abstract:
  "${params.abstract}"

  Manuscript Content (Intro/Results/Discussion):
  "${params.manuscriptText.substring(0, 50000)}"

  Task:
  1. Analyze the provided Abstract and Manuscript Content to extract the core novelty and conceptual advance.
  2. Write a compelling cover letter that pitches this specific advance to **${targetJournal}**.
  
  Style Guide for ${targetJournal}:
  - Focus: ${style.focus}
  - Tone: ${style.tone}
  
  Structure:
  - Standard professional opening.
  - A strong "Hook" paragraph stating the major discovery immediately.
  - A concise summary of the key findings and why they matter.
  - A closing statement on why this fits ${targetJournal}'s scope.
  - Standard sign-off.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.6,
      }
    });
    return response.text || "Could not generate cover letter.";
  } catch (error) {
    console.error("Error generating cover letter:", error);
    return "Error generating cover letter.";
  }
};

/**
 * Interactively generates or edits a figure.
 * - Uses gemini-2.5-flash-image (Nano Banana) for ALL EDITING (Image Input).
 * - Uses gemini-3-pro-image-preview (Nano Banana Pro) ONLY for PURE GENERATION (Text Input + 2K).
 */
export const generateOrEditFigure = async (
  prompt: string, 
  targetJournal: string,
  aspectRatio: string,
  imageSize: string, 
  base64Image?: string, 
  mimeType?: string
): Promise<{ text: string, modifiedImage?: string }> => {
  const ai = getAiClient();
  try {
    const hasInputImage = !!(base64Image && mimeType);
    
    // CRITICAL FIX: Pro model does NOT support input images (inlineData) for editing.
    // We must force Flash (Nano Banana) if an image is provided, regardless of requested resolution.
    const usePro = imageSize === '2K' && !hasInputImage;
    const model = usePro ? PRO_IMAGE_MODEL : FLASH_IMAGE_MODEL;
    
    const parts: any[] = [];
    let config = {};

    // 1. Handle Input Image (Edit Context)
    if (hasInputImage) {
      parts.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      });
    }

    // 2. Handle Prompt & Instructions
    if (usePro) {
      // --- PRO PATH (Text-to-Image Generation 2K) ---
      const proPrompt = `
        You are an expert scientific illustrator for **${targetJournal}**. 
        You specialize in creating figures that meet strict academic publication standards.
        
        Task: Generate a high-resolution (2K), publication-quality scientific figure.
        User Request: "${prompt}"

        ACADEMIC STANDARDS for ${targetJournal}:
        - **Visual Style**: Flat, vector-graphic aesthetic (like Adobe Illustrator/BioRender).
        - **Background**: Pure WHITE background. No gradients or textures.
        - **Typography**: Clean, sans-serif fonts (Arial/Helvetica style). High contrast and legible.
        - **Color Palette**: Professional, colorblind-safe palettes (e.g., Viridis, Okabe-Ito, or muted journal colors).
        - **Rigor**: Scientific accuracy is paramount. Diagrams should be schematic and logical.
      `;

      parts.push({ text: proPrompt });
      
      // Pro supports structured config
      config = {
        imageConfig: {
          aspectRatio: aspectRatio, 
          imageSize: imageSize, 
        }
      };

    } else {
      // --- FLASH PATH (Edits OR Standard Gen) ---
      let flashPrompt = `You are an expert scientific illustrator for **${targetJournal}**.`;
      
      if (hasInputImage) {
        // EDITING MODE
        flashPrompt += `\nUser Request to EDIT/MODIFY this image: "${prompt}"
        \nInstructions:
        - Modify the provided image to satisfy the user's request.
        - Maintain strict scientific accuracy and academic style.
        - Ensure the background remains clean (preferably white).
        - Provide a brief text summary of changes.`;
        
        if (imageSize === '2K') {
            flashPrompt += `\nNote: The user requested High Resolution. Please generate the highest quality output possible with clear details.`;
        }
      } else {
        // GENERATION MODE (1K / Fast)
        flashPrompt += `\nUser Request to GENERATE a scientific figure: "${prompt}"
        \nACADEMIC REQUIREMENTS:
        - Style: Professional scientific illustration.
        - Background: Pure WHITE.
        - Content: accurate schematic or clear data visualization.
        - Font: Sans-serif, legible.
        - No artistic distortions.`;

        // Flash (Nano Banana) does NOT support imageConfig. Bake into prompt.
        const ratioMap: Record<string, string> = {
          "1:1": "square (1:1 aspect ratio)",
          "4:3": "standard landscape (4:3 aspect ratio)",
          "16:9": "wide landscape (16:9 aspect ratio)"
        };
        flashPrompt += `\nOutput Format: Please generate a ${ratioMap[aspectRatio] || "square"} image.`;
      }
      
      parts.push({ text: flashPrompt });
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: config
    });

    let textOutput = "";
    let imageOutput = undefined;

    // Iterate parts to find text and image
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) textOutput += part.text;
        if (part.inlineData) imageOutput = part.inlineData.data;
      }
    }
    
    if (!textOutput) {
      textOutput = hasInputImage && !imageOutput 
        ? "I analyzed the image but did not generate a modification." 
        : `Processed figure for ${targetJournal}.`;
    }

    return { text: textOutput, modifiedImage: imageOutput };

  } catch (error) {
    console.error("Error processing figure:", error);
    return { text: "Error processing figure request. Please ensure you have selected a valid API key." };
  }
};

export const getJournalGuidelines = async (journalName: string): Promise<JournalGuidelines | null> => {
  const ai = getAiClient();
  const prompt = `
    Provide a structured summary of the submission guidelines for the academic journal: **${journalName}**.
    
    Focus on:
    1. Typical Word Counts (Abstract, Article).
    2. Figure/Formatting rules (Fonts, Panels).
    3. Editorial Criteria (Scope, Novelty).

    Return a JSON object adhering to the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            journalName: { type: Type.STRING },
            wordCounts: {
              type: Type.OBJECT,
              properties: {
                article: { type: Type.STRING },
                abstract: { type: Type.STRING },
                methods: { type: Type.STRING },
              }
            },
            formatting: {
              type: Type.OBJECT,
              properties: {
                figures: { type: Type.STRING },
                references: { type: Type.STRING },
                fonts: { type: Type.STRING },
              }
            },
            editorialCriteria: {
              type: Type.OBJECT,
              properties: {
                scope: { type: Type.STRING },
                novelty: { type: Type.STRING },
                dataRigor: { type: Type.STRING },
              }
            }
          },
          required: ["journalName", "wordCounts", "formatting", "editorialCriteria"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as JournalGuidelines;
    }
    return null;
  } catch (error) {
    console.error("Error fetching guidelines:", error);
    return null;
  }
};

export const createChatSession = (): Chat => {
  const ai = getAiClient();
  return ai.chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction: `You are an intelligent research assistant for scientists submitting to top-tier biological journals.
      You can answer questions about:
      - Statistical analysis methods suitable for cell biology.
      - Experimental design and controls (e.g., rescue experiments, validation).
      - Clarifications on standard reviewer comments.
      - General scientific writing advice.
      
      Maintain a helpful, scholarly, and precise tone.`,
    }
  });
};

export const createRefinementChat = (original: string, result: string, type: string, targetJournal: string): Chat => {
  const ai = getAiClient();
  return ai.chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction: `You are discussing a specific text revision for a manuscript targeted at **${targetJournal}**.
      
      Context:
      - Analysis Type: ${type}
      - Original User Text: "${original}"
      - Your Previous Output/Revision: "${result}"
      
      The user will ask questions about your revision or ask for further adjustments.
      Answer specifically about this text snippet and how it fits the style of ${targetJournal}. Be concise and helpful.`,
    }
  });
};

export const suggestTargetJournals = async (title: string, abstract: string, fullText: string): Promise<any[]> => {
  const ai = getAiClient();
  const prompt = `
    You are a Senior Editor and Strategic Publication Consultant.
    
    Task: Recommend 3-5 academic journals for the following manuscript.
    
    CRITICAL INSTRUCTION:
    You must perform a ruthless, objective assessment of the "Scientific Level" of the text. 
    Do NOT suggest top-tier journals (Nature, Cell, NCB) just because the topic (Scope) matches.
    Only suggest them if the data quality, depth of mechanism, and conceptual novelty actually meet that bar.
    
    Tiers to consider:
    - **Top Tier (Nature, Cell, Science)**: Paradigm-shifting, massive in vivo data, broad interest.
    - **High Impact (NCB, Mol Cell, Dev Cell)**: Deep mechanism, complete story, strong novelty.
    - **Solid Mid-Tier (J Cell Sci, J Biol Chem, MBoC, J Cell Biol)**: Solid execution, incremental advance, or descriptive mechanism.
    - **Specialized/Reports**: Preliminary data or very niche focus.

    Manuscript Information:
    Title: "${title}"
    Abstract: "${abstract}"
    Full Manuscript Text (Intro/Results/Discussion):
    "${fullText.substring(0, 60000)}"
    
    If the paper appears to be a "Solid Mid-Tier" quality, primarily suggest those, perhaps with one "Reach" option, but explicitly state in the qualityAnalysis why it might fall short of top tier (e.g. "Lacks in vivo rescue", "Mechanism is correlative").

    Return a JSON array.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the journal" },
              matchScore: { type: Type.INTEGER, description: "0-100. Weighted heavily by quality fit, not just topic fit." },
              tier: { type: Type.STRING, description: "e.g. Top Tier, High Impact, Solid Mid-Tier, Specialized" },
              rationale: { type: Type.STRING, description: "Why does this topic fit the journal's scope? (Subject matter only)" },
              qualityAnalysis: { type: Type.STRING, description: "Critical assessment of why the paper's QUALITY fits this tier. Be specific about data depth/novelty." },
              advice: { type: Type.STRING, description: "Specific advice to improve acceptance odds." }
            },
            required: ["name", "matchScore", "tier", "rationale", "qualityAnalysis", "advice"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error("Error suggesting journals:", error);
    return [];
  }
};

export const evaluateJournalFit = async (title: string, abstract: string, fullText: string, journalName: string): Promise<JournalEvaluationResult | null> => {
  const ai = getAiClient();
  const prompt = `
    Act as a Senior Editor at the journal: "${journalName}".
    
    Your Task: Evaluate the suitability of the following manuscript for *your* specific journal.
    
    CRITICAL: You must distinguish between SCOPE (topic) and LEVEL (quality/impact).
    - A paper can be perfectly in scope (e.g., cell biology) but rejected because it is "incremental" or "lacks mechanism".
    - Be honest. If the text provided is not up to the standard of "${journalName}", say so.
    
    Manuscript:
    Title: "${title}"
    Abstract: "${abstract}"
    Partial Full Text: "${fullText.substring(0, 50000)}"

    Analyze:
    1. Scope Match.
    2. Novelty/Impact sufficiency for this tier.
    3. Rigor/Quality of data presented.

    Return a JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            journalName: { type: Type.STRING },
            matchScore: { type: Type.INTEGER, description: "0-100. If quality is too low for this journal, score must be low (<50)." },
            verdict: { type: Type.STRING, enum: ["Strong Candidate", "Worth Trying", "High Risk", "Out of Scope", "Insufficient Quality/Novelty"] },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3 key strengths" },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3 key weaknesses (e.g. lack of mechanism, limited novelty)" },
            editorComments: { type: Type.STRING, description: "Internal decision note focusing on whether the bar for impact/novelty is met." }
          },
          required: ["journalName", "matchScore", "verdict", "strengths", "weaknesses", "editorComments"]
        }
      }
    });
    
    if (response.text) {
      return JSON.parse(response.text) as JournalEvaluationResult;
    }
    return null;
  } catch (error) {
    console.error("Error evaluating journal fit:", error);
    return null;
  }
}