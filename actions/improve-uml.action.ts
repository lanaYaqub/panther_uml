'use server';

import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

export async function improveUMLAction({
  currentUML,
  userMessage,
  diagramType,
  originalStory,
}: {
  currentUML: string;
  userMessage: string;
  diagramType: string;
  originalStory: string;
}) {
  const prompt = `
You are a senior software engineer and UML assistant.

You will be given a PlantUML-based **${diagramType}** diagram along with:
- The original system description
- The current UML diagram
- A user request (modification or question)

TASK:
- If the user is asking a question, answer it clearly based on the diagram and story.
- If the user is asking for a change, apply it to the diagram using correct PlantUML syntax for a ${diagramType}.
- Always include a brief explanation first.
- If the UML was updated, return the updated diagram **inside a \`\`\`plantuml\`\`\` code block only**.

ORIGINAL SYSTEM DESCRIPTION:
"${originalStory}"

CURRENT UML CODE:
@startuml
${currentUML}
@enduml

USER REQUEST:
"${userMessage}"

Your response must contain:
1. A clear explanation of the change or answer.
2. The updated UML diagram in a \`\`\`plantuml\`\`\` code block if modified.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = completion.choices?.[0]?.message?.content ?? '';

    console.log('🧠 OpenAI Response:', responseText);

    const umlCode = extractPlantUMLCode(responseText);

    const explanation = responseText
      .replace(/```plantuml[\s\S]*?```/gi, '') 
      .replace(/```[\s\S]*?```/gi, '')         
      .trim();

    return {
      uml: umlCode,
      rawText: explanation || 'No explanation provided.',
    };
  } catch (error) {
    console.error('❌ Error improving UML:', error);
    return null;
  }
}


function extractPlantUMLCode(responseText: string): string | null {
  const plantUMLRegex = /```plantuml([\s\S]*?)```/i;
  const match = responseText.match(plantUMLRegex);

  if (match && match[1]) return match[1].trim();

  const fallbackRegex = /@startuml([\s\S]*?)@enduml/i;
  const fallbackMatch = responseText.match(fallbackRegex);

  if (fallbackMatch) {
    return `@startuml\n${fallbackMatch[1].trim()}\n@enduml`;
  }

  return null;
}
