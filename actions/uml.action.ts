'use server';
import { OpenAI } from 'openai';
import { diagramTemplates } from '@/constants';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateUMLAction(
  description: string,
  diagramType: string
): Promise<string | null> {
  const prompt = `
You are a senior software engineer and UML architect.

Your task is to read the following system description and generate a valid **${diagramType}** diagram using **PlantUML** syntax.

--- SYSTEM DESCRIPTION ---
"${description}"
--------------------------

INSTRUCTIONS:
- Generate only the PlantUML code, no explanations or markdown (no triple backticks).
- Start with @startuml and end with @enduml.
- Use PlantUML syntax conventions appropriate for the selected diagram type (${diagramType}).
- Make logical assumptions where the story lacks technical detail.
- Be consistent with naming and structure.
- Use best practices for clean and readable UML diagrams.

EXAMPLES of supported diagram types:
- Class Diagram: class definitions, inheritance, associations
- Sequence Diagram: participants, messages, activation bars
- Use Case Diagram: actors, use cases, relationships
- Activity Diagram: actions, decisions, flows
- Component Diagram: components, interfaces, dependencies

REFERENCE:
You can use the following format if helpful:
${JSON.stringify(diagramTemplates)}

Output only valid PlantUML code for a ${diagramType}.
  `;

  try {
    const result = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = result.choices[0].message.content || '';
    const umlCode = extractPlantUMLCode(responseText);

    // Validate presence of UML syntax
    if (!umlCode.includes('@startuml') || !umlCode.includes('@enduml')) {
      throw new Error('Generated UML does not include proper PlantUML syntax.');
    }

    return umlCode;
  } catch (error) {
    console.error('Error generating UML:', error);
    throw error;
  }
}

function extractPlantUMLCode(responseText: string): string | null {
  // Normalize markdown formatting (if GPT mistakenly includes it)
  const codeBlockMatch = responseText.match(/```(?:plantuml)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    responseText = codeBlockMatch[1].trim();
  }

  // Ensure UML boundaries are present
  if (!responseText.includes('@startuml')) {
    responseText = `@startuml\n${responseText}`;
  }
  if (!responseText.includes('@enduml')) {
    responseText = `${responseText}\n@enduml`;
  }

  return responseText.trim();
}
