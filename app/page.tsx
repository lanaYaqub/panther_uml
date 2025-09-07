'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import ConversationViewer from '@/components/ConversationViewer'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
	Download,
	Copy,
	Code,
	FileCode,
	Sparkles,
	RefreshCw,
	Zap,
	Lightbulb,
	LayoutTemplate,
	Moon,
	Sun,
	Check,
} from 'lucide-react'

import UMLViewer from '@/components/UMLViewer'
import { templates } from '@/constants'
import { generateUMLAction } from '@/actions/uml.action'
import { improveUMLAction } from '@/actions/improve-uml.action' // 👈 New import for conversation improvement


export default function UMLGenerator() {
	const [description, setDescription] = useState('')
	const [umlCode, setUmlCode] = useState('')
	const [isGenerating, setIsGenerating] = useState(false)
	const [isDarkMode, setIsDarkMode] = useState(false)
	const [activeTab, setActiveTab] = useState('editor')
	const editorRef = useRef<HTMLDivElement>(null)
	const [diagramType, setDiagramType] = useState('class')
	const [image, setImage] = useState('')
	const [isCopied, setIsCopied] = useState(false)
	const [chatInput, setChatInput] = useState('')
	const [originalStory, setOriginalStory] = useState('')
	const [conversationHistory, setConversationHistory] = useState<string[]>([])
	const [conversation, setConversation] = useState<{
	  story: string
	  diagramType: string
	  steps: {
		input: string
		umlCode: string
		rawResponse?: string
		basedOnStepIndex?: number // NEW FIELD
	  }[]
	} | null>(null)



	// Initialize editor with default template
	useEffect(() => {
		if (typeof window !== 'undefined' && editorRef.current) {
			// TODO: Implement ace editor initialization
			setUmlCode(templates.class)
		}
	}, [])

	// Toggle dark mode
	useEffect(() => {
		if (isDarkMode) {
			document.documentElement.classList.add('dark')
		} else {
			document.documentElement.classList.remove('dark')
		}
	}, [isDarkMode])

	// Mock AI generation function
	const generateUML = async () => {
	  if (!description.trim()) return

	  try {
		setIsGenerating(true)
		setOriginalStory(description)

		const uml = (await generateUMLAction(description, diagramType)) as string
		setUmlCode(uml)

		setConversation({
		  story: description,
		  diagramType,
		  steps: [
			{
			  input: description,
			  umlCode: uml,
			},
		  ],
		})
	  } catch (error) {
		console.error(error)
		alert('Something went wrong/Out of credits')
	  } finally {
		setIsGenerating(false)
	  }
	}

const handleImproveDiagram = async () => {
  if (!chatInput.trim()) return;

  try {
    setIsGenerating(true);

    const response = await improveUMLAction({
      currentUML: umlCode,
      userMessage: chatInput,
      diagramType,
      originalStory,
    });

    // Narrow the type: ensure it's a non-empty string
    if (!response || typeof response.uml !== 'string' || !response.uml.trim()) {
      alert('Failed to improve diagram.');
      return;
    }

    const nextUml = response.uml; // <- guaranteed string

    setUmlCode(nextUml);

    setConversation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        steps: [
          ...prev.steps,
          {
            input: chatInput,
            umlCode: nextUml,                // <- stays string
            rawResponse: response.rawText ?? '',
          },
        ],
      };
    });

    setChatInput('');
  } catch (error) {
    console.error(error);
    alert('Something went wrong');
  } finally {
    setIsGenerating(false);
  }
};
	
	const handleViewClick = (umlCode: string, sourceIndex: number) => {
	  if (!conversation) return

	  setConversation(prev => {
		if (!prev) return null

		return {
		  ...prev,
		  steps: [
			...prev.steps,
			{
			  input: `Viewed Step ${sourceIndex + 1}`,
			  umlCode,
			  rawResponse: 'User viewed this diagram.',
			  basedOnStepIndex: sourceIndex,
			},
		  ],
		}
	  })
	}

	
	const downloadConversation = (
	  data: typeof conversation, 
	  format: 'json' | 'csv'
	) => {
	  if (!conversation) return

	  if (format === 'json') {
		const jsonBlob = new Blob([JSON.stringify(conversation, null, 2)], {
		  type: 'application/json',
		})
		const url = URL.createObjectURL(jsonBlob)
		const link = document.createElement('a')
		link.href = url
		link.download = 'uml_conversation.json'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	  }

	  if (format === 'csv') {
		const headers = ['Step', 'Input', 'AI Comment', 'UML Code', 'Based On Step']
		const rows = conversation.steps.map((step, idx) => [
		  idx + 1,
		  step.input.replace(/\n/g, ' ').replace(/"/g, '""'),
		  (step.rawResponse || '').replace(/\n/g, ' ').replace(/"/g, '""'),
		  step.umlCode.replace(/\n/g, ' ').replace(/"/g, '""'),
		  step.basedOnStepIndex !== undefined ? step.basedOnStepIndex + 1 : ''
		])

		const csvContent =
		  [headers, ...rows]
			.map(row => row.map(field => `"${field}"`).join(','))
			.join('\n')

		const blob = new Blob([csvContent], { type: 'text/csv' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = 'uml_conversation.csv'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	  }
	}



	// Mock function to render UML diagram
	const renderUML = () => {
		return UMLViewer({ umlCode, isGenerating, setImage })
	}
	const handleTemplateChange = (type: string) => {
		setDiagramType(type)
	}

	const handleCopy = () => {
		setIsCopied(true)
		navigator.clipboard.writeText(umlCode)
		setTimeout(() => {
			setIsCopied(false)
		}, 2000)
	}

	const handleDownload = async () => {
		try {
			// Fetch the SVG content from the PlantUML URL
			const response = await fetch(image)
			if (!response.ok) {
				throw new Error('Failed to fetch the SVG content')
			}

			// Convert the response to a Blob
			const svgBlob = await response.blob()

			// Create a URL for the Blob
			const url = URL.createObjectURL(svgBlob)

			// Create a temporary anchor element to trigger the download
			const link = document.createElement('a')
			link.href = url
			link.download = 'uml.svg' // Set the filename for the downloaded file
			document.body.appendChild(link) // Append the link to the DOM (required for Firefox)
			link.click() // Trigger the download

			// Clean up by revoking the Blob URL and removing the link element
			URL.revokeObjectURL(url)
			document.body.removeChild(link)
		} catch (error) {
			console.error('Error downloading the SVG:', error)
		}
	}

	return (
		<div className={`min-h-screen bg-background text-foreground`}>
			<header className="border-b">
				<div className="container mx-auto px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<FileCode className="h-6 w-6 text-primary" />
						<h1 className="text-xl font-bold">AI UML Generator</h1>
						<Badge variant="outline" className="ml-2">
							Beta
						</Badge>
					</div>
					<div className="flex items-center gap-4">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex items-center gap-2">
										<Switch
											checked={isDarkMode}
											onCheckedChange={setIsDarkMode}
											id="dark-mode"
										/>
										<Label htmlFor="dark-mode" className="cursor-pointer">
											{isDarkMode ? (
												<Moon className="h-4 w-4" />
											) : (
												<Sun className="h-4 w-4" />
											)}
										</Label>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Toggle dark mode</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						{/* TODO: Add share and settings functionality */}
						{/* <Button variant="outline" size="sm">
							<Share2 className="h-4 w-4 mr-2" />
							Share
						</Button>

						<Button variant="outline" size="sm">
							<Settings className="h-4 w-4 mr-2" />
							Settings
						</Button> */}
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-6">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					{/* Sidebar */}
					<div className="lg:col-span-1">
						<Card>
							<CardContent className="p-4">
								<div className="space-y-4">
									<div>
										<h3 className="text-lg font-medium mb-2 flex items-center gap-2">
											<Sparkles className="h-4 w-4 text-primary" />
											AI Generation
										</h3>
										<div className="space-y-3">
											<Textarea
												placeholder="Describe your system in natural language..."
												value={description}
												onChange={e => setDescription(e.target.value)}
												className="min-h-[120px]"
											/>
											<Button
												onClick={generateUML}
												className="w-full"
												disabled={isGenerating || !description.trim()}
											>
												{isGenerating ? (
													<>
														<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
														Generating...
													</>
												) : (
													<>
														<Zap className="mr-2 h-4 w-4" />
														Generate UML
													</>
												)}
											</Button>
										</div>
									</div>

									<Separator />

									<div>
										<h3 className="text-lg font-medium mb-2 flex items-center gap-2">
											<LayoutTemplate className="h-4 w-4 text-primary" />
											Templates
										</h3>
										<div className="space-y-2">
											<Select
												value={diagramType}
												onValueChange={handleTemplateChange}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select template" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="class">Class Diagram</SelectItem>
													<SelectItem value="sequence">
														Sequence Diagram
													</SelectItem>
													<SelectItem value="usecase">
														Use Case Diagram
													</SelectItem>
													<SelectItem value="activity">
														Activity Diagram
													</SelectItem>
													<SelectItem value="component">
														Component Diagram
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>

									<Separator />

									<div>
										<h3 className="text-lg font-medium mb-2 flex items-center gap-2">
											<Lightbulb className="h-4 w-4 text-primary" />
											Tips
										</h3>
										<ul className="text-sm space-y-2 text-muted-foreground">
											<li>• Use natural language to describe your system</li>
											<li>• Mention entities and their relationships</li>
											<li>• Specify diagram type (class, sequence, etc.)</li>
											<li>• Edit the generated code for fine-tuning</li>
										</ul>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Main content */}
					<div className="lg:col-span-3">
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="w-full"
						>
							<div className="flex justify-between items-center mb-4">
								<TabsList>
									<TabsTrigger
										value="editor"
										className="flex items-center gap-2"
									>
										<Code className="h-4 w-4" />
										Editor
									</TabsTrigger>
									<TabsTrigger
										value="preview"
										className="flex items-center gap-2"
									>
										<FileCode className="h-4 w-4" />
										Preview
									</TabsTrigger>
									<TabsTrigger
										value="split"
										className="flex items-center gap-2"
									>
										<LayoutTemplate className="h-4 w-4" />
										Split View
									</TabsTrigger>
								</TabsList>

								<div className="flex items-center gap-2">
									<Button onClick={handleCopy} variant="outline" size="sm">
										{isCopied ? (
											<Check className="h-4 w-4 mr-2" />
										) : (
											<Copy className="h-4 w-4 mr-2" />
										)}
										Copy
									</Button>
									<Button onClick={handleDownload} variant="outline" size="sm">
										<Download className="h-4 w-4 mr-2" />
										Export
									</Button>
								</div>
							</div>

							<TabsContent value="editor" className="mt-0">
								<Card>
									<CardContent className="p-0">
										<div className="border rounded-md">
											<div className="bg-muted/50 p-2 border-b flex items-center justify-between">
												<div className="text-sm font-medium">PlantUML Code</div>
												<div className="text-xs text-muted-foreground">
													Syntax: PlantUML
												</div>
											</div>
											<div
												ref={editorRef}
												className="p-4 font-mono text-sm h-[500px] overflow-auto"
											>
												<Textarea
													value={umlCode}
													onChange={e => setUmlCode(e.target.value)}
													className="font-mono h-full border-0 focus-visible:ring-0 resize-none"
												/>
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="preview" className="mt-0">
							  <Card>
								<CardContent className="p-0">
								  <div className="border rounded-md">
									<div className="bg-muted/50 p-2 border-b flex items-center justify-between">
									  <div className="text-sm font-medium">Diagram Preview</div>
									  <div className="text-xs text-muted-foreground">
										{isGenerating ? 'Generating...' : 'Ready'}
									  </div>
									</div>

									{/* Diagram Viewport */}
									<div className="h-[500px] overflow-auto">
									  {renderUML()}
									</div>

									{/* Improve Diagram Section */}
									<div className="p-4 border-t space-y-4">
									  <h2 className="text-md font-semibold">Improve Diagram</h2>
									  <div className="flex gap-2">
										<Textarea
										  placeholder="Suggest an improvement..."
										  value={chatInput}
										  onChange={(e) => setChatInput(e.target.value)}
										  className="w-full"
										/>
										<Button onClick={handleImproveDiagram} disabled={!chatInput.trim()}>
										  Send
										</Button>
									  </div>
									</div>

									{/* Full Conversation Viewer */}
									{conversation && (
										<ConversationViewer
										  conversation={conversation}
										  setUmlCode={setUmlCode}
										  onViewClick={handleViewClick}
										/>

									)}
									{conversation && (
									  <div className="flex gap-2 px-4 pb-4">
										<Button
										  variant="outline"
										  size="sm"
										  onClick={() => downloadConversation(conversation, 'json')}
										>
										  💾 Download as JSON
										</Button>
										<Button
										  variant="outline"
										  size="sm"
										  onClick={() => downloadConversation(conversation, 'csv')}
										>
										  📊 Download as CSV
										</Button>
									  </div>
									)}

								  </div>
								</CardContent>
							  </Card>
							</TabsContent>


							<TabsContent value="split" className="mt-0">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Card>
										<CardContent className="p-0">
											<div className="border rounded-md">
												<div className="bg-muted/50 p-2 border-b flex items-center justify-between">
													<div className="text-sm font-medium">
														PlantUML Code
													</div>
													<div className="text-xs text-muted-foreground">
														Syntax: PlantUML
													</div>
												</div>
												<div className="p-4 font-mono text-sm h-[500px] overflow-auto">
													<Textarea
														value={umlCode}
														onChange={e => setUmlCode(e.target.value)}
														className="font-mono h-full border-0 focus-visible:ring-0 resize-none"
													/>
												</div>
											</div>
										</CardContent>
									</Card>

									<Card>
										<CardContent className="p-0">
											<div className="border rounded-md">
												<div className="bg-muted/50 p-2 border-b flex items-center justify-between">
													<div className="text-sm font-medium">
														Diagram Preview
													</div>
													<div className="text-xs text-muted-foreground">
														{isGenerating ? 'Generating...' : 'Ready'}
													</div>
												</div>
												<div className="h-[500px] border overflow-auto">
													{renderUML()}
												</div>
											</div>
										</CardContent>
									</Card>
								</div>
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</main>
		</div>
	)
}