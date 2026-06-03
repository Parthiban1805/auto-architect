import { useState } from 'react';
import MermaidViewer from './MermaidViewer';
import { Button } from './components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Textarea } from './components/ui/Textarea';

function App() {
  const [transcript, setTranscript] = useState("Client: Hi, we want to build an Uber for dog walkers. Users should be able to see dog walkers on a map and book them.\nDeveloper: Okay, do we need an app or a website?\nClient: Definitely a mobile app, iOS and Android.\nDeveloper: How will payments be handled?\nClient: Oh, I haven't thought about that. Maybe credit cards?\nDeveloper: Okay, we'll look into Stripe. What about background checks for walkers?\nClient: Yes, we need a verified badge, but let's do that manually for now. We want to launch in 3 months.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [streamStatus, setStreamStatus] = useState("");
  
  // Human-in-the-Loop State Variables
  const [socket, setSocket] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [editableRequirements, setEditableRequirements] = useState([]);
  const [editableQuestions, setEditableQuestions] = useState([]);

  const generateBlueprint = () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setIsReviewing(false);
    setStreamStatus("Waking up architect agents...");

    const ws = new WebSocket("ws://localhost:8000/ws/generate-blueprint");
    setSocket(ws);

    ws.onopen = () => {
      ws.send(JSON.stringify({ transcript: transcript }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "status") {
          setStreamStatus(payload.message);
        } else if (payload.type === "interrupt") {
          setEditableRequirements(payload.data.missing_requirements || []);
          setEditableQuestions(payload.data.clarification_questions || []);
          setIsReviewing(true);
          setLoading(false);
        } else if (payload.type === "result") {
          setResult({
            execution_time_seconds: payload.execution_time_seconds,
            data: payload.data
          });
          setLoading(false);
          ws.close();
        } else if (payload.type === "error") {
          setError(payload.message);
          setLoading(false);
          ws.close();
        }
      } catch (err) {
        setError("Error reading updates from server.");
        setLoading(false);
        ws.close();
      }
    };

    ws.onerror = () => {
      setError("Failed to connect to backend WebSocket server.");
      setLoading(false);
    };

    ws.onclose = () => {
      // Don't disable loading if we transitioned to reviewing
      if (!ws.onmessage) {
        setLoading(false);
      }
    };
  };

  const approveAndContinue = () => {
    if (!socket) return;
    
    setLoading(true);
    setIsReviewing(false);
    setStreamStatus("Agent 3: Gathering Stakeholder Critiques...");
    
    socket.send(JSON.stringify({
      action: "continue",
      missing_requirements: editableRequirements.filter(r => r.trim() !== ""),
      clarification_questions: editableQuestions.filter(q => q.trim() !== "")
    }));
  };

  const addRequirement = () => {
    setEditableRequirements([...editableRequirements, ""]);
  };

  const updateRequirement = (index, value) => {
    const updated = [...editableRequirements];
    updated[index] = value;
    setEditableRequirements(updated);
  };

  const removeRequirement = (index) => {
    setEditableRequirements(editableRequirements.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    setEditableQuestions([...editableQuestions, ""]);
  };

  const updateQuestion = (index, value) => {
    const updated = [...editableQuestions];
    updated[index] = value;
    setEditableQuestions(updated);
  };

  const removeQuestion = (index) => {
    setEditableQuestions(editableQuestions.filter((_, i) => i !== index));
  };

  const exportToMarkdown = () => {
    if (!result) return;
    
    const { data, execution_time_seconds } = result;
    
    let backlogMarkdown = "";
    if (data.sprint_backlog?.epics) {
      data.sprint_backlog.epics.forEach((epic, epicIndex) => {
        backlogMarkdown += `### EPIC ${epicIndex + 1}: ${epic.epic_name}\n\n`;
        epic.stories.forEach((story) => {
          backlogMarkdown += `- **${story.title}** (${story.story_points} pts)\n  *"${story.description}"*\n\n`;
        });
      });
    }

    const mdContent = `# AI Solutions Architect Blueprint
Generated in ${execution_time_seconds}s

## 1. Project Summary Document
${data.project_summary}

## 2. Missing Requirements
${data.missing_requirements.map(req => `- ${req}`).join('\n')}

## 3. Clarification Questions
${data.clarification_questions.map(q => `- ${q}`).join('\n')}

## 4. Architectural Debate & Decision
${data.architecture_debate}

## 5. System Architecture (Mermaid)
\`\`\`mermaid
${data.architecture_diagram}
\`\`\`

## 6. Stakeholder Critiques (Proxy Board)
${data.stakeholder_feedback}

## 7. Agile Sprint Backlog
${backlogMarkdown}
`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `blueprint_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 selection:bg-brand-100 selection:text-brand-900">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
        
        {/* Header */}
        <header className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center p-3 bg-brand-100 rounded-2xl mb-4 shadow-sm text-brand-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            AI <span className="text-gradient">Solutions Architect</span> Squad
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Transform your rough meeting transcripts into comprehensive engineering blueprints in seconds.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-4 lg:sticky lg:top-8 h-fit space-y-6">
            <Card className="border-0 shadow-lg shadow-brand-500/5 ring-1 ring-slate-200/50">
              <CardHeader className="bg-white border-b-0 pb-4">
                <CardTitle className="text-brand-950">
                  <svg className="w-5 h-5 mr-2 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  Meeting Transcript
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <Textarea
                  className="h-80 md:h-96"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste Zoom transcript or meeting notes here..."
                  disabled={loading || isReviewing}
                />
                <Button
                  onClick={generateBlueprint}
                  disabled={loading || isReviewing || !transcript}
                  loading={loading}
                  className="w-full py-3 shadow-md shadow-brand-500/20 text-base"
                >
                  Generate Blueprint
                </Button>
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-start border border-red-100 animate-fade-in-up">
                    <svg className="w-5 h-5 mr-2 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8 space-y-8">
            {isReviewing ? (
              <Card className="border-brand-200 bg-brand-50/10 animate-fade-in-up shadow-lg">
                <CardHeader className="bg-brand-50 border-brand-200/50">
                  <div className="flex justify-between items-center w-full">
                    <CardTitle className="text-brand-950 text-xl font-bold flex items-center">
                      <span className="bg-brand-500 text-white text-xs px-2.5 py-1 rounded-lg mr-3 shadow-sm font-semibold">STAGE 2.5</span>
                      Human-in-the-Loop Review
                    </CardTitle>
                    <Badge variant="warning">Awaiting Approval</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-slate-600">
                    The requirements engine has finished analyzing your transcript. Please review, edit, add, or remove requirements and clarification questions below before continuing to debate architectures and building the backlog.
                  </p>

                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between border-b pb-2">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        Missing Requirements
                      </span>
                      <Button variant="ghost" className="text-brand-600 hover:text-brand-700 py-1 px-2 h-7 text-xs border border-brand-100 hover:bg-brand-50" onClick={addRequirement}>
                        + Add Requirement
                      </Button>
                    </h3>
                    
                    <div className="space-y-3">
                      {editableRequirements.map((req, i) => (
                        <div key={i} className="flex gap-2 items-center animate-fade-in-up">
                          <input
                            type="text"
                            value={req}
                            onChange={(e) => updateRequirement(i, e.target.value)}
                            placeholder="Enter requirement..."
                            className="flex-grow p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none text-sm text-slate-700 bg-white"
                          />
                          <button
                            onClick={() => removeRequirement(i)}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      ))}
                      {editableRequirements.length === 0 && (
                        <p className="text-slate-400 text-xs italic py-2">No requirements listed. Click '+ Add Requirement' to add one.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between border-b pb-2">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Clarification Questions
                      </span>
                      <Button variant="ghost" className="text-brand-600 hover:text-brand-700 py-1 px-2 h-7 text-xs border border-brand-100 hover:bg-brand-50" onClick={addQuestion}>
                        + Add Question
                      </Button>
                    </h3>
                    
                    <div className="space-y-3">
                      {editableQuestions.map((q, i) => (
                        <div key={i} className="flex gap-2 items-center animate-fade-in-up">
                          <input
                            type="text"
                            value={q}
                            onChange={(e) => updateQuestion(i, e.target.value)}
                            placeholder="Enter clarification question..."
                            className="flex-grow p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none text-sm text-slate-700 bg-white"
                          />
                          <button
                            onClick={() => removeQuestion(i)}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      ))}
                      {editableQuestions.length === 0 && (
                        <p className="text-slate-400 text-xs italic py-2">No clarification questions listed. Click '+ Add Question' to add one.</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t flex justify-end gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (socket) socket.close();
                        setIsReviewing(false);
                        setLoading(false);
                      }}
                    >
                      Cancel Run
                    </Button>
                    <Button
                      variant="primary"
                      onClick={approveAndContinue}
                      className="px-6 py-2.5 shadow-md shadow-brand-500/20"
                    >
                      Approve & Continue
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : result ? (
              <div className="space-y-8 animate-fade-in-up">
                
                {/* Time Badge and Export Options */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={exportToMarkdown}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                      Export Markdown
                    </Button>
                    <Button variant="secondary" onClick={exportToPDF}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                      </svg>
                      Export PDF / Print
                    </Button>
                  </div>
                  <Badge variant="success" className="shadow-sm">
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    Generated in {result.execution_time_seconds}s
                  </Badge>
                </div>

                {/* Section 1: Summary */}
                <Card className="overflow-visible">
                  <CardHeader>
                    <CardTitle>
                      <svg className="w-5 h-5 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      Project Summary Document
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-slate prose-sm md:prose-base max-w-none whitespace-pre-wrap">
                      {result.data.project_summary}
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: Gaps & Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader className="bg-transparent border-amber-200/50">
                      <CardTitle className="text-amber-800">
                        <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        Missing Requirements (Human Approved)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.data.missing_requirements.map((req, i) => (
                          <li key={i} className="flex items-start text-amber-900 text-sm bg-white/50 p-3 rounded-lg border border-amber-100">
                            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 mr-3"></span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-brand-200 bg-brand-50/30">
                    <CardHeader className="bg-transparent border-brand-200/50">
                      <CardTitle className="text-brand-800">
                        <svg className="w-5 h-5 mr-2 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Clarification Questions (Human Approved)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.data.clarification_questions.map((q, i) => (
                          <li key={i} className="flex items-start text-brand-900 text-sm bg-white/50 p-3 rounded-lg border border-brand-100">
                            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-brand-500 mt-1.5 mr-3"></span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Section 2.5: Architectural Debate */}
                {result.data.architecture_debate && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <svg className="w-5 h-5 mr-2 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        Architectural Debate & Decision
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-slate prose-sm md:prose-base max-w-none whitespace-pre-wrap">
                        {result.data.architecture_debate}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Section 3: Architecture Diagram */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <svg className="w-5 h-5 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
                      </svg>
                      System Architecture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 overflow-x-auto">
                      <MermaidViewer chart={result.data.architecture_diagram} />
                    </div>
                    
                    <details className="mt-4 group">
                      <summary className="text-xs text-slate-500 font-medium cursor-pointer hover:text-slate-700 flex items-center">
                        <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        View Raw Mermaid Code
                      </summary>
                      <pre className="mt-3 bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto shadow-inner border border-slate-800">
                        {result.data.architecture_diagram}
                      </pre>
                    </details>
                  </CardContent>
                </Card>

                {/* Section 4: Stakeholder Reviews */}
                <Card className="bg-slate-900 text-slate-50 border-slate-800 shadow-xl shadow-slate-900/10">
                  <CardHeader className="bg-slate-800/50 border-slate-700">
                    <CardTitle className="text-slate-100">
                      <svg className="w-5 h-5 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path>
                      </svg>
                      Stakeholder Critiques (Proxy Board)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert prose-sm md:prose-base max-w-none whitespace-pre-wrap text-slate-300">
                      {result.data.stakeholder_feedback}
                    </div>
                  </CardContent>
                </Card>

                {/* Section 5: Agile Sprint Backlog */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <svg className="w-5 h-5 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                      </svg>
                      Agile Sprint Backlog
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {result.data.sprint_backlog?.epics?.map((epic, epicIndex) => (
                        <div key={epicIndex} className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <Badge variant="purple" className="mr-3">EPIC {epicIndex + 1}</Badge>
                            {epic.epic_name}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {epic.stories.map((story, storyIndex) => (
                              <div key={storyIndex} className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col h-full group">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-semibold text-slate-800 text-sm group-hover:text-brand-600 transition-colors leading-tight">{story.title}</h4>
                                  <Badge variant="default" className="ml-2 shrink-0 bg-slate-100 font-bold">
                                    {story.story_points} pts
                                  </Badge>
                                </div>
                                <p className="text-slate-500 text-sm italic flex-grow mt-2 text-pretty">"{story.description}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-white/50 text-slate-400 min-h-[500px] p-8 text-center animate-fade-in-up">
                {loading ? (
                  <>
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-brand-200 rounded-full blur-xl animate-pulse"></div>
                      <div className="relative bg-white p-4 rounded-full shadow-sm border border-slate-100">
                        <svg className="w-10 h-10 text-brand-500 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="text-lg font-medium text-slate-700">{streamStatus}</div>
                    <p className="text-sm text-slate-500 mt-2">The architect board is building your blueprint in real time.</p>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-100 p-4 rounded-full mb-4">
                      <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002 2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                      </svg>
                    </div>
                    <div className="text-lg font-medium text-slate-700 mb-2">Ready for your input</div>
                    <p className="text-sm text-slate-500 max-w-sm">
                      Paste a transcript and click Generate to see the magic happen. The AI will analyze the text and build a complete blueprint.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;