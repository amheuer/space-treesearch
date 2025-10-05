import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Paper } from "../models/Paper";

// Reusable function for AI calls
async function callAI(prompt: string): Promise<string> {
  const ai = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY!);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const response = await model.generateContent(prompt);
  
  const text = response.response.text();
  return text.replace(/\*/g, "•");
}

export async function idiate(paper: Paper): Promise<string | undefined> {
  const prompt = `Based on the following summary of a research paper, describe 3 approaches a follow up paper could take. Answer in the form of 3 bullet points each describing a different approach, with each bullet point under 500 characters. It will be displayed as plaintext, NO MARKDOWN. ${paper.summary}`;
  
  try {
    return await callAI(prompt);
  } catch (error) {
    console.error('Error in idiate:', error);
    throw error;
  }
}

export async function compare(paper1: Paper, paper2: Paper): Promise<string | undefined> {
  const prompt = `Based on the following summarys of two research papers, describe the key differences between the two papers in 1000 characters or less of planetext, NO MARKDOWN, use the names of the papers you are talking about. This is a summary of the first paper ${paper1.title}: ${paper1.summary} This is a summary of the second paper ${paper2.title}: ${paper2.summary}' 

Paper 1: ${paper1.title}
Summary: ${paper1.summary}

Paper 2: ${paper2.title}
Summary: ${paper2.summary}`;
  
  try {
    return await callAI(prompt);
  } catch (error) {
    console.error('Error in compare:', error);
    throw error;
  }
}
